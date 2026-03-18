# Tankobon

A social manga tracking app built with React Native/Expo and Express.js + PostgreSQL.

Search for manga, track your reading progress, rate titles, and follow other readers to see what they're into.

## Features

- **Manga Search** — Search thousands of manga via the Jikan (MyAnimeList) API
- **Library Tracking** — Organize manga by status: Reading, Completed, Plan to Read, On Hold, Dropped
- **Ratings** — Rate manga 1-10
- **Chapter Progress** — Track how many chapters you've read
- **Social** — Follow other users, see their activity in your feed
- **User Profiles** — View stats, library, followers/following
- **Trending** — Discover top-rated manga from the community
- **Auto-Sync** — Daily scheduled sync pulls top manga from Jikan

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native, Expo, React Navigation |
| Backend | Express.js 5, Node.js |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| External API | [Jikan v4](https://jikan.moe/) (MyAnimeList) |

## Project Structure

```
tankobon/
├── app/                    # React Native / Expo frontend
│   └── src/
│       ├── config/         # API configuration
│       ├── context/        # Auth context (React Context API)
│       ├── navigation/     # Stack & tab navigators
│       └── screens/        # App screens (Home, Search, Profile, etc.)
├── server/                 # Express.js backend
│   └── src/
│       ├── config/         # Database connection
│       ├── db/             # SQL schema
│       ├── jobs/           # Scheduled manga sync
│       ├── middleware/     # JWT auth middleware
│       └── routes/         # API routes (auth, manga, user)
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) (v15+)
- [Expo CLI](https://docs.expo.dev/)

### 1. Set Up the Database

```bash
# Create the database
createdb -U postgres tankobon

# Run the schema
psql -U postgres -d tankobon -f server/src/db/init.sql
```

### 2. Configure Environment

Create `server/.env`:

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/tankobon
JWT_SECRET=your_secret_key
PORT=3000
```

### 3. Start the Server

```bash
cd server
npm install
npm run dev     # starts with nodemon (auto-restart on changes)
```

### 4. Start the App

```bash
cd app
npm install
npx expo start
```

Press `w` for web, `a` for Android emulator, or `i` for iOS simulator.

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login (returns JWT) |

### Manga
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/manga/search?q=` | Search manga via Jikan |
| GET | `/api/manga/trending` | Get top-rated manga |
| GET | `/api/manga/:malId` | Get manga details |
| POST | `/api/manga/:malId/track` | Add to library |
| DELETE | `/api/manga/:malId/track` | Remove from library |
| PUT | `/api/manga/:malId/rate` | Rate manga (1-10) |
| PUT | `/api/manga/:malId/progress` | Update chapters read |

### Users (authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Your profile + stats |
| PUT | `/api/user/profile` | Update bio/username/avatar |
| GET | `/api/user/feed` | Activity feed |
| GET | `/api/user/search?q=` | Find users |
| POST | `/api/user/:id/follow` | Follow a user |
| DELETE | `/api/user/:id/follow` | Unfollow a user |
