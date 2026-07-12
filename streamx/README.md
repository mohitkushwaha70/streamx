# StreamX — Premium OTT Platform

A Netflix/JioHotstar-quality streaming platform built with Next.js 16, TypeScript, Tailwind CSS, Prisma ORM, and PostgreSQL.

## Features

### Public
- **Home** — Hero banner, trending, continue watching, latest, top rated, movies, series, anime rows
- **Movies / TV Shows / Anime** — Genre filtering, sorting, pagination
- **Watch** — Detail page with trailer, episodes, cast, related content
- **Player** — Netflix-style: play/pause, seek, volume, speed, PiP, fullscreen, keyboard shortcuts, auto-play, episode navigation, playback position save
- **Search** — Real-time debounced search with genre/language/year/rating/type filters
- **Collections** — Curated content groups
- **Profile** — Watch history, bookmarks, watch later

### Admin
- **Dashboard** — Stats, quick actions, recent activity
- **Content** — Full CRUD for movies, series, anime with metadata (title, description, genres, cast, director, trailer, streaming URL, etc.)
- **Episodes** — Season/episode management for series
- **Users** — Search, filter, toggle plan, ban/unban, delete
- **Collections** — Create/edit collections, add/remove content
- **Analytics** — Content breakdown, ratings, top content
- **Settings** — Site name, tagline, logo, footer
- **Logs** — Activity log viewer with type filter
- **Sync** — HuggingFace auto-sync with manual trigger, history

### Auto-Sync (HuggingFace)
- Background service scans HF repository every 5 minutes
- Detects new video files (.mp4, .mkv, .webm, etc.)
- Creates content records with auto-generated metadata
- Never creates duplicates
- Detailed sync logs with retry support

### Security
- JWT authentication with HttpOnly cookies
- bcrypt password hashing (12 rounds)
- Role-based access control (USER / ADMIN)
- Rate limiting via middleware
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- CSRF protection

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js API Routes |
| Database | PostgreSQL + Prisma ORM v7 |
| Auth | JWT (jose) + bcryptjs |
| Icons | Lucide React |
| Animations | Framer Motion |
| Image CDN | Cloudinary (optional) |
| Video Storage | HuggingFace S3 |

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (or Supabase)
- HuggingFace account with API token

### Install

```bash
# Clone and install
cd streamx
npm install

# Set up environment
cp .env.example .env
# Edit .env with your values

# Initialize database
npx prisma db push
npx prisma generate

# Seed admin user
npx tsx prisma/seed.ts

# Start dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) |
| `HF_TOKEN` | HuggingFace API token |
| `HF_BUCKET` | HuggingFace repo ID (e.g. `user/streamx-storage`) |
| `TMDB_READ_ACCESS_TOKEN` | TMDB API read access token |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (optional) |
| `CLOUDINARY_API_KEY` | Cloudinary API key (optional) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret (optional) |

### Default Admin
- Email: `admin@streamx.com`
- Password: `admin123`

## Deployment

### Vercel (Frontend)
1. Push to GitHub
2. Import in Vercel
3. Set environment variables
4. Deploy

### Render (Backend + DB)
1. Create PostgreSQL database
2. Create Web Service
3. Build: `npm install && npx prisma generate && npx next build`
4. Start: `npx next start`

### Supabase (Database)
1. Create project at supabase.com
2. Copy connection string to `DATABASE_URL`

## Project Structure

```
streamx/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts             # Seed script
├── src/
│   ├── app/
│   │   ├── (auth)/         # Login, Register
│   │   ├── (main)/         # Public pages
│   │   ├── admin/          # Admin panel
│   │   ├── api/            # API routes
│   │   └── player/         # Video player
│   ├── components/
│   │   ├── layout/         # Header, Footer
│   │   ├── player/         # Video player
│   │   └── ui/             # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities, auth, db
│   ├── services/           # TMDB, HuggingFace sync
│   ├── store/              # State management
│   └── types/              # TypeScript types
├── next.config.ts
└── tailwind.config.ts
```

## License

MIT
