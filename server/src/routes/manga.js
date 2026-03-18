const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const JIKAN_BASE = 'https://api.jikan.moe/v4';

// GET /api/manga/library/me
// Protected route - get user's manga library
// MUST be defined BEFORE /:malId to avoid "library" being treated as a malId
router.get('/library/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { status } = req.query;

    let query = `
      SELECT um.*, m.title, m.author, m.cover_image, m.external_id, m.genres, m.chapters_count, m.score as global_score
      FROM user_manga um
      JOIN manga m ON um.manga_id = m.id
      WHERE um.user_id = $1
    `;
    const params = [userId];

    if (status) {
      query += ' AND um.status = $2';
      params.push(status);
    }

    query += ' ORDER BY um.updated_at DESC';

    const result = await pool.query(query, params);
    res.json({ library: result.rows });
  } catch (error) {
    console.error('Library error:', error.message);
    res.status(500).json({ error: 'Failed to get library' });
  }
});

// POST /api/manga/sync
// Protected route - manually trigger manga sync (admin-like feature)
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const { syncManga } = require('../jobs/mangaSync');
    res.json({ message: 'Sync started. This may take a few minutes.' });
    // Run sync in background (don't await it so the response returns immediately)
    syncManga().then(result => {
      console.log('[ManualSync] Result:', result);
    }).catch(err => {
      console.error('[ManualSync] Error:', err.message);
    });
  } catch (error) {
    console.error('Sync trigger error:', error);
    res.status(500).json({ error: 'Failed to start sync' });
  }
});

// GET /api/manga/trending
// Public route - get top-rated manga from our database
router.get('/trending', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const result = await pool.query(
      `SELECT id, external_id, title, author, cover_image, genres, status, chapters_count, score
       FROM manga
       WHERE score > 0
       ORDER BY score DESC, updated_at DESC
       LIMIT $1`,
      [Math.min(parseInt(limit), 50)]
    );
    res.json({ manga: result.rows });
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ error: 'Failed to get trending manga' });
  }
});

// GET /api/manga/search?q=one+piece&page=1
// Public route - search manga via Jikan API
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1 } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const response = await axios.get(`${JIKAN_BASE}/manga`, {
      params: { q: q.trim(), page, limit: 15, order_by: 'popularity', sort: 'asc' }
    });

    const manga = response.data.data.map(m => ({
      mal_id: m.mal_id,
      title: m.title,
      title_english: m.title_english,
      author: m.authors?.[0]?.name || 'Unknown',
      description: m.synopsis,
      cover_image: m.images?.jpg?.large_image_url || m.images?.jpg?.image_url,
      genres: m.genres?.map(g => g.name) || [],
      status: m.status,
      chapters: m.chapters,
      score: m.score,
      popularity: m.popularity
    }));

    res.json({
      manga,
      pagination: {
        current_page: response.data.pagination.current_page,
        has_next: response.data.pagination.has_next_page,
        total: response.data.pagination.items?.total || 0
      }
    });
  } catch (error) {
    console.error('Search error:', error.message);
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
    }
    res.status(500).json({ error: 'Failed to search manga' });
  }
});

// GET /api/manga/:malId
// Public route - get manga details (from Jikan, and save to our DB)
router.get('/:malId', async (req, res) => {
  try {
    const { malId } = req.params;

    // Check if we already have it in our database
    let manga = await pool.query('SELECT * FROM manga WHERE external_id = $1', [malId.toString()]);

    if (manga.rows.length === 0) {
      // Fetch from Jikan
      const response = await axios.get(`${JIKAN_BASE}/manga/${malId}`);
      const m = response.data.data;

      // Save to our database
      const result = await pool.query(
        `INSERT INTO manga (external_id, title, author, description, cover_image, genres, status, chapters_count, score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (external_id) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           cover_image = EXCLUDED.cover_image,
           chapters_count = EXCLUDED.chapters_count,
           score = EXCLUDED.score,
           updated_at = NOW()
         RETURNING *`,
        [
          m.mal_id.toString(),
          m.title,
          m.authors?.[0]?.name || 'Unknown',
          m.synopsis,
          m.images?.jpg?.large_image_url || m.images?.jpg?.image_url,
          m.genres?.map(g => g.name) || [],
          m.status,
          m.chapters || 0,
          m.score
        ]
      );
      manga = { rows: [result.rows[0]] };
    }

    res.json({ manga: manga.rows[0] });
  } catch (error) {
    console.error('Manga detail error:', error.message);
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Manga not found' });
    }
    res.status(500).json({ error: 'Failed to get manga details' });
  }
});

// POST /api/manga/:malId/track
// Protected route - add manga to user's library
router.post('/:malId/track', authMiddleware, async (req, res) => {
  try {
    const { malId } = req.params;
    const { status = 'plan_to_read' } = req.body;
    const userId = req.userId;

    const validStatuses = ['reading', 'completed', 'plan_to_read', 'dropped', 'on_hold'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Make sure manga exists in our DB (fetch from Jikan if needed)
    let manga = await pool.query('SELECT id FROM manga WHERE external_id = $1', [malId.toString()]);

    if (manga.rows.length === 0) {
      // Fetch and save
      const response = await axios.get(`${JIKAN_BASE}/manga/${malId}`);
      const m = response.data.data;

      const result = await pool.query(
        `INSERT INTO manga (external_id, title, author, description, cover_image, genres, status, chapters_count, score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (external_id) DO NOTHING
         RETURNING id`,
        [
          m.mal_id.toString(), m.title, m.authors?.[0]?.name || 'Unknown',
          m.synopsis, m.images?.jpg?.large_image_url || m.images?.jpg?.image_url,
          m.genres?.map(g => g.name) || [], m.status, m.chapters || 0, m.score
        ]
      );

      if (result.rows.length === 0) {
        manga = await pool.query('SELECT id FROM manga WHERE external_id = $1', [malId.toString()]);
      } else {
        manga = result;
      }
    }

    const mangaId = manga.rows[0].id;

    // Upsert user_manga
    const tracked = await pool.query(
      `INSERT INTO user_manga (user_id, manga_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, manga_id) DO UPDATE SET status = $3, updated_at = NOW()
       RETURNING *`,
      [userId, mangaId, status]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_feed (user_id, action_type, manga_id, details)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'track', mangaId, JSON.stringify({ status })]
    );

    res.json({ message: `Manga tracked as "${status}"`, tracking: tracked.rows[0] });
  } catch (error) {
    console.error('Track error:', error.message);
    res.status(500).json({ error: 'Failed to track manga' });
  }
});

// PUT /api/manga/:malId/progress
// Protected route - update chapters read
router.put('/:malId/progress', authMiddleware, async (req, res) => {
  try {
    const { malId } = req.params;
    const { chapters_read } = req.body;
    const userId = req.userId;

    if (chapters_read === undefined || !Number.isInteger(chapters_read) || chapters_read < 0) {
      return res.status(400).json({ error: 'chapters_read must be a non-negative integer' });
    }

    const manga = await pool.query('SELECT id FROM manga WHERE external_id = $1', [malId.toString()]);
    if (manga.rows.length === 0) {
      return res.status(404).json({ error: 'Manga not found' });
    }

    const mangaId = manga.rows[0].id;

    const result = await pool.query(
      'UPDATE user_manga SET chapters_read = $1, updated_at = NOW() WHERE user_id = $2 AND manga_id = $3 RETURNING *',
      [chapters_read, userId, mangaId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'You must track this manga before updating progress' });
    }

    await pool.query(
      `INSERT INTO activity_feed (user_id, action_type, manga_id, details)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'progress', mangaId, JSON.stringify({ chapters_read })]
    );

    res.json({ message: `Progress updated to ${chapters_read} chapters`, tracking: result.rows[0] });
  } catch (error) {
    console.error('Progress error:', error.message);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// DELETE /api/manga/:malId/track
// Protected route - remove manga from user's library
router.delete('/:malId/track', authMiddleware, async (req, res) => {
  try {
    const { malId } = req.params;
    const userId = req.userId;

    const manga = await pool.query('SELECT id FROM manga WHERE external_id = $1', [malId.toString()]);
    if (manga.rows.length === 0) {
      return res.status(404).json({ error: 'Manga not found' });
    }

    const mangaId = manga.rows[0].id;

    const result = await pool.query(
      'DELETE FROM user_manga WHERE user_id = $1 AND manga_id = $2 RETURNING *',
      [userId, mangaId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Manga not in your library' });
    }

    res.json({ message: 'Manga removed from library' });
  } catch (error) {
    console.error('Remove track error:', error.message);
    res.status(500).json({ error: 'Failed to remove manga' });
  }
});

// PUT /api/manga/:malId/rate
// Protected route - rate a manga (1-10)
router.put('/:malId/rate', authMiddleware, async (req, res) => {
  try {
    const { malId } = req.params;
    const { rating } = req.body;
    const userId = req.userId;

    if (!rating || rating < 1 || rating > 10 || !Number.isInteger(rating)) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 10' });
    }

    // Find manga in our DB
    const manga = await pool.query('SELECT id FROM manga WHERE external_id = $1', [malId.toString()]);

    if (manga.rows.length === 0) {
      return res.status(404).json({ error: 'Manga not found. Track it first.' });
    }

    const mangaId = manga.rows[0].id;

    // Check if user is tracking this manga
    const tracking = await pool.query(
      'SELECT id FROM user_manga WHERE user_id = $1 AND manga_id = $2',
      [userId, mangaId]
    );

    if (tracking.rows.length === 0) {
      return res.status(400).json({ error: 'You must track this manga before rating it' });
    }

    // Update rating
    const result = await pool.query(
      'UPDATE user_manga SET rating = $1, updated_at = NOW() WHERE user_id = $2 AND manga_id = $3 RETURNING *',
      [rating, userId, mangaId]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_feed (user_id, action_type, manga_id, details)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'rate', mangaId, JSON.stringify({ rating })]
    );

    res.json({ message: `Rated ${rating}/10`, tracking: result.rows[0] });
  } catch (error) {
    console.error('Rate error:', error.message);
    res.status(500).json({ error: 'Failed to rate manga' });
  }
});

module.exports = router;
