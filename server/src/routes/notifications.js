const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// POST /api/notifications/register
// Save user's Expo push token
router.post('/register', async (req, res) => {
  try {
    const userId = req.userId;
    const { token, platform } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Push token is required' });
    }

    if (!platform || !['ios', 'android', 'web'].includes(platform)) {
      return res.status(400).json({ error: 'Valid platform is required (ios, android, web)' });
    }

    await pool.query(
      `INSERT INTO push_tokens (user_id, token, platform)
       VALUES ($1, $2, $3)
       ON CONFLICT (token) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         platform = EXCLUDED.platform,
         created_at = NOW()`,
      [userId, token, platform]
    );

    res.json({ message: 'Push token registered successfully' });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

// POST /api/notifications/unregister
// Remove push token on logout
router.post('/unregister', async (req, res) => {
  try {
    const userId = req.userId;
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Push token is required' });
    }

    await pool.query(
      'DELETE FROM push_tokens WHERE user_id = $1 AND token = $2',
      [userId, token]
    );

    res.json({ message: 'Push token unregistered successfully' });
  } catch (error) {
    console.error('Unregister push token error:', error);
    res.status(500).json({ error: 'Failed to unregister push token' });
  }
});

module.exports = router;
