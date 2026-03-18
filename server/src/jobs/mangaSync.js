const axios = require('axios');
const pool = require('../config/db');

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

// Upsert a manga into our database
const upsertManga = async (m) => {
  try {
    await pool.query(
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
         updated_at = NOW()`,
      [
        m.mal_id.toString(),
        m.title,
        m.authors?.[0]?.name || 'Unknown',
        m.synopsis || '',
        m.images?.jpg?.large_image_url || m.images?.jpg?.image_url || '',
        m.genres?.map(g => g.name) || [],
        m.status || 'Unknown',
        m.chapters || 0,
        m.score || 0
      ]
    );
    return true;
  } catch (error) {
    console.error(`Failed to upsert manga ${m.mal_id} (${m.title}):`, error.message);
    return false;
  }
};

// Main sync function
const syncManga = async () => {
  const startTime = Date.now();
  console.log(`[MangaSync] Starting sync at ${new Date().toISOString()}`);

  let totalFetched = 0;
  let totalSaved = 0;

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
      const saved = await upsertManga(m);
      if (saved) totalSaved++;
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
      const saved = await upsertManga(m);
      if (saved) totalSaved++;
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
      const saved = await upsertManga(m);
      if (saved) totalSaved++;
    }

    await delay(1000);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[MangaSync] Sync complete. Fetched: ${totalFetched}, Saved/Updated: ${totalSaved}, Duration: ${duration}s`);

  return { totalFetched, totalSaved, duration: `${duration}s` };
};

module.exports = { syncManga };
