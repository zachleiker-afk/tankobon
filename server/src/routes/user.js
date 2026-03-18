const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// All user routes require authentication (middleware applied in index.js)

// IMPORTANT: Specific path routes must come BEFORE parameterized routes
// so Express doesn't treat "profile", "feed", etc. as a :userId

// GET /api/user/profile
// Get the logged-in user's profile with stats
router.get('/profile', async (req, res) => {
  try {
    const userId = req.userId;

    const user = await pool.query(
      'SELECT id, username, email, avatar_url, bio, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get stats
    const mangaCount = await pool.query(
      'SELECT COUNT(*) FROM user_manga WHERE user_id = $1',
      [userId]
    );

    const statusCounts = await pool.query(
      'SELECT status, COUNT(*) as count FROM user_manga WHERE user_id = $1 GROUP BY status',
      [userId]
    );

    const avgRating = await pool.query(
      'SELECT ROUND(AVG(rating), 1) as avg_rating FROM user_manga WHERE user_id = $1 AND rating IS NOT NULL',
      [userId]
    );

    const followersCount = await pool.query(
      'SELECT COUNT(*) FROM follows WHERE following_id = $1',
      [userId]
    );

    const followingCount = await pool.query(
      'SELECT COUNT(*) FROM follows WHERE follower_id = $1',
      [userId]
    );

    res.json({
      user: user.rows[0],
      stats: {
        total_manga: parseInt(mangaCount.rows[0].count),
        by_status: statusCounts.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {}),
        avg_rating: avgRating.rows[0].avg_rating ? parseFloat(avgRating.rows[0].avg_rating) : null,
        followers: parseInt(followersCount.rows[0].count),
        following: parseInt(followingCount.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// PUT /api/user/profile
// Update the logged-in user's profile
router.put('/profile', async (req, res) => {
  try {
    const userId = req.userId;
    const { username, bio, avatar_url } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (username !== undefined) {
      if (typeof username !== 'string' || username.trim().length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
      }
      const existing = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username.trim(), userId]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updates.push(`username = $${paramIndex++}`);
      values.push(username.trim());
    }

    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`);
      values.push(bio);
    }

    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(avatar_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, email, avatar_url, bio, created_at`,
      values
    );

    res.json({ message: 'Profile updated', user: result.rows[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/user/feed
// Get activity feed from people you follow
router.get('/feed', async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const feed = await pool.query(
      `SELECT af.*, u.username, u.avatar_url, m.title as manga_title, m.cover_image as manga_cover, m.external_id as manga_external_id
       FROM activity_feed af
       JOIN users u ON af.user_id = u.id
       LEFT JOIN manga m ON af.manga_id = m.id
       WHERE af.user_id IN (
         SELECT following_id FROM follows WHERE follower_id = $1
       )
       ORDER BY af.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({ feed: feed.rows });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Failed to get feed' });
  }
});

// GET /api/user/search?q=username
// Search for users to follow
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.userId;

    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const users = await pool.query(
      `SELECT id, username, avatar_url, bio FROM users
       WHERE username ILIKE $1 AND id != $2
       LIMIT 20`,
      [`%${q.trim()}%`, currentUserId]
    );

    res.json({ users: users.rows });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// GET /api/user/followers
// Get list of users who follow you
router.get('/followers', async (req, res) => {
  try {
    const userId = req.userId;

    const followers = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.bio
       FROM follows f JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ followers: followers.rows });
  } catch (error) {
    console.error('Followers error:', error);
    res.status(500).json({ error: 'Failed to get followers' });
  }
});

// GET /api/user/following
// Get list of users you follow
router.get('/following', async (req, res) => {
  try {
    const userId = req.userId;

    const following = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.bio
       FROM follows f JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ following: following.rows });
  } catch (error) {
    console.error('Following error:', error);
    res.status(500).json({ error: 'Failed to get following' });
  }
});

// --- Parameterized routes BELOW this line ---

// GET /api/user/:userId/profile
// Get another user's public profile
router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    const user = await pool.query(
      'SELECT id, username, avatar_url, bio, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const mangaCount = await pool.query(
      'SELECT COUNT(*) FROM user_manga WHERE user_id = $1',
      [userId]
    );

    const statusCounts = await pool.query(
      'SELECT status, COUNT(*) as count FROM user_manga WHERE user_id = $1 GROUP BY status',
      [userId]
    );

    const avgRating = await pool.query(
      'SELECT ROUND(AVG(rating), 1) as avg_rating FROM user_manga WHERE user_id = $1 AND rating IS NOT NULL',
      [userId]
    );

    const followersCount = await pool.query(
      'SELECT COUNT(*) FROM follows WHERE following_id = $1',
      [userId]
    );

    const followingCount = await pool.query(
      'SELECT COUNT(*) FROM follows WHERE follower_id = $1',
      [userId]
    );

    // Check if current user follows this user
    const isFollowing = await pool.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [currentUserId, userId]
    );

    // Get their library (public)
    const library = await pool.query(
      `SELECT um.status, um.rating, m.title, m.cover_image, m.external_id
       FROM user_manga um JOIN manga m ON um.manga_id = m.id
       WHERE um.user_id = $1 ORDER BY um.updated_at DESC LIMIT 20`,
      [userId]
    );

    res.json({
      user: user.rows[0],
      stats: {
        total_manga: parseInt(mangaCount.rows[0].count),
        by_status: statusCounts.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {}),
        avg_rating: avgRating.rows[0].avg_rating ? parseFloat(avgRating.rows[0].avg_rating) : null,
        followers: parseInt(followersCount.rows[0].count),
        following: parseInt(followingCount.rows[0].count)
      },
      is_following: isFollowing.rows.length > 0,
      library: library.rows
    });
  } catch (error) {
    console.error('User profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// POST /api/user/:userId/follow
// Follow a user
router.post('/:userId/follow', async (req, res) => {
  try {
    const targetId = parseInt(req.params.userId);
    const currentUserId = req.userId;

    if (targetId === currentUserId) {
      return res.status(400).json({ error: "You can't follow yourself" });
    }

    // Check target user exists
    const targetUser = await pool.query('SELECT id, username FROM users WHERE id = $1', [targetId]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const existing = await pool.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [currentUserId, targetId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    await pool.query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
      [currentUserId, targetId]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_feed (user_id, action_type, details)
       VALUES ($1, $2, $3)`,
      [currentUserId, 'follow', JSON.stringify({ followed_user_id: targetId, followed_username: targetUser.rows[0].username })]
    );

    res.json({ message: `Now following ${targetUser.rows[0].username}` });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// DELETE /api/user/:userId/follow
// Unfollow a user
router.delete('/:userId/follow', async (req, res) => {
  try {
    const targetId = parseInt(req.params.userId);
    const currentUserId = req.userId;

    const result = await pool.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING id',
      [currentUserId, targetId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Not following this user' });
    }

    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

module.exports = router;
