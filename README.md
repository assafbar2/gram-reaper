# Gram Reaper

> Harvest your daily protein.

A single-user protein tracking webapp. Log food by typing naturally or tapping quick-add cards. Track your streak toward a daily goal.

## Features

- **Natural language input** — "2 ping pong size chicken pieces", "in-n-out double-double", "2 eggs" — AI figures out the protein
- **Smart quick-add** — previously logged foods become large tappable cards, ranked by time-of-day relevance + frequency. Common foods = 1 tap
- **90g daily goal** — animated ring that fills to gold when you hit it
- **Streak tracking** — history calendar showing hits and misses
- **PWA** — installable on iOS/Android, no App Store needed
- **Open source**

## Stack

- Vue 3 + Vite + TypeScript
- Node.js + Express
- SQLite (better-sqlite3)
- Claude Haiku for food parsing
- Tailwind CSS

## Quick start

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

npm install
npm run dev
```

Opens at `http://localhost:5173` (Vite) with API proxy to `http://localhost:3001`.

## Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

1. Fork this repo
2. Connect to Render → New Web Service → select your fork
3. Add `ANTHROPIC_API_KEY` in Environment Variables
4. Deploy

The `render.yaml` handles everything else including a persistent disk for SQLite.

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | required |
| `DATABASE_PATH` | Path to SQLite file | `./data/gramreaper.db` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |

## License

MIT
