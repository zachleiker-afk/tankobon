-- MangaShelf Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Manga catalog table
CREATE TABLE IF NOT EXISTS manga (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(255) DEFAULT 'Unknown',
  description TEXT,
  cover_image TEXT,
  genres TEXT[] DEFAULT '{}',
  status VARCHAR(50),
  chapters_count INTEGER DEFAULT 0,
  score DECIMAL(4, 2),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User's manga library (tracking)
CREATE TABLE IF NOT EXISTS user_manga (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manga_id INTEGER NOT NULL REFERENCES manga(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'plan_to_read',
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  chapters_read INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, manga_id)
);

-- Follow relationships
CREATE TABLE IF NOT EXISTS follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Activity feed
CREATE TABLE IF NOT EXISTS activity_feed (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  manga_id INTEGER REFERENCES manga(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_manga_user_id ON user_manga(user_id);
CREATE INDEX IF NOT EXISTS idx_user_manga_manga_id ON user_manga(manga_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manga_external_id ON manga(external_id);
CREATE INDEX IF NOT EXISTS idx_manga_score ON manga(score DESC);
