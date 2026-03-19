const axios = require('axios');
const pool = require('../config/db');
const { sendPushNotifications, buildNotification } = require('../services/pushService');

const JIKAN_BASE = 'https://api.jikan.moe/v4';

// Helper to wait between requests (Jikan rate limit: ~3 req/sec)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch a single page of manga from Jikan
const fetchMangaPage = async (endpoint, params = {}) => {
  try {
    const response = await axios.get(`${JIKAN_BASE}${endpoint}`, { params });
    return response.data.data || [];
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('Rate limited, waiting 2 seconds...');
      await delay(2000);
      return fetchMangaPage(endpoint, params);
    }
    console.error(`Failed to fetch ${endpoint}:`, error.message);
    return [];
  }
};

// Upsert a manga into our database, returning chapter change info
const upsertManga = async (m) => {
  try {
    const newChapters = m.chapters || 0;

    // Get old chapters_count before upserting
    const existing = await pool.query(
      'SELECT id, chapters_count FROM manga WHERE external_id = $1',
      [m.mal_id.toString()]
    );

    const oldChapters = existing.rows.length > 0 ? existing.rows[0].chapters_count : 0;

    const result = await pool.query(
      `INSERT INTO manga (external_id, title, author, description, cover_image, genres, status, chapters_count, score, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (external_id) DO UPDATE SET
         title = EXCLUDED.title,
         author = EXCLUDED.author,
         description = EXCLUDED.description,
         cover_image = EXCLUDED.cover_image,
         genres = EXCLUDED.genres,
         status = EXCLUDED.status,
         chapters_count = EXCLUDED.chapters_count,
         score = EXCLUDED.score,
         updated_at = NOW()
       RETURNING id`,
      [
        m.mal_id.toString(),
        m.title,
        m.authors?.[0]?.name || 'Unknown',
        m.synopsis || '',
        m.images?.jpg?.large_image_url || m.images?.jpg?.image_url || '',
        m.genres?.map(g => g.name) || [],
        m.status || 'Unknown',
        newChapters,
        m.score || 0
      ]
    );

    const mangaId = result.rows[0].id;

    // Return chapter change info if new chapters were detected
    if (newChapters > oldChapters && oldChapters > 0) {
      return { saved: true, chapterUpdate: { mangaId, externalId: m.mal_id.toString(), title: m.title, oldChapters, newChapters } };
    }

    return { saved: true, chapterUpdate: null };
  } catch (error) {
    console.error(`Failed to upsert manga ${m.mal_id} (${m.title}):`, error.message);
    return { saved: false, chapterUpdate: null };
  }
};

// Send push notifications for manga with new chapters
const notifyNewChapters = async (chapterUpdates) => {
  if (chapterUpdates.length === 0) return;

  console.log(`[MangaSync] ${chapterUpdates.length} manga have new chapters, sending notifications...`);

  for (const update of chapterUpdates) {
    try {
      // Find all users tracking this manga with status "reading"
      const trackingUsers = await pool.query(
        `SELECT DISTINCT pt.token
         FROM user_manga um
         JOIN push_tokens pt ON um.user_id = pt.user_id
         WHERE um.manga_id = $1 AND um.status = 'reading'`,
        [update.mangaId]
      );

      if (trackingUsers.rows.length === 0) continue;

      const newCount = update.newChapters - update.oldChapters;
      const messages = trackingUsers.rows.map((row) =>
        buildNotification(
          row.token,
          'New Chapters Available!',
          `${update.title} has ${newCount} new chapter${newCount > 1 ? 's' : ''} (now ${update.newChapters} total)`,
          { mangaId: update.mangaId, malId: update.externalId, type: 'new_chapters' }
        )
      );

      await sendPushNotifications(messages);
      console.log(`[MangaSync] Notified ${trackingUsers.rows.length} user(s) about ${update.title}`);
    } catch (error) {
      console.error(`[MangaSync] Failed to notify for ${update.title}:`, error.message);
    }
  }
};

// Main sync function
const syncManga = async () => {
  const startTime = Date.now();
  console.log(`[MangaSync] Starting sync at ${new Date().toISOString()}`);

  let totalFetched = 0;
  let totalSaved = 0;
  const chapterUpdates = [];

  // 1. Fetch top manga (pages 1-3, ~75 manga)
  console.log('[MangaSync] Fetching top manga...');
  for (let page = 1; page <= 3; page++) {
    const manga = await fetchMangaPage('/manga', {
      order_by: 'score',
      sort: 'desc',
      page,
      limit: 25,
      min_score: 7
    });
    totalFetched += manga.length;

    for (const m of manga) {
      const result = await upsertManga(m);
      if (result.saved) totalSaved++;
      if (result.chapterUpdate) chapterUpdates.push(result.chapterUpdate);
    }

    await delay(1000); // respect rate limit between pages
  }

  // 2. Fetch popular publishing (currently releasing) manga (pages 1-2)
  console.log('[MangaSync] Fetching currently publishing manga...');
  for (let page = 1; page <= 2; page++) {
    const manga = await fetchMangaPage('/manga', {
      order_by: 'popularity',
      sort: 'asc',
      status: 'publishing',
      page,
      limit: 25
    });
    totalFetched += manga.length;

    for (const m of manga) {
      const result = await upsertManga(m);
      if (result.saved) totalSaved++;
      if (result.chapterUpdate) chapterUpdates.push(result.chapterUpdate);
    }

    await delay(1000);
  }

  // 3. Fetch newest manga (pages 1-2)
  console.log('[MangaSync] Fetching newest manga...');
  for (let page = 1; page <= 2; page++) {
    const manga = await fetchMangaPage('/manga', {
      order_by: 'start_date',
      sort: 'desc',
      page,
      limit: 25
    });
    totalFetched += manga.length;

    for (const m of manga) {
      const result = await upsertManga(m);
      if (result.saved) totalSaved++;
      if (result.chapterUpdate) chapterUpdates.push(result.chapterUpdate);
    }

    await delay(1000);
  }

  // Send push notifications for manga with new chapters
  await notifyNewChapters(chapterUpdates);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[MangaSync] Sync complete. Fetched: ${totalFetched}, Saved/Updated: ${totalSaved}, New chapters: ${chapterUpdates.length}, Duration: ${duration}s`);

  return { totalFetched, totalSaved, newChapters: chapterUpdates.length, duration: `${duration}s` };
};

module.exports = { syncManga };
