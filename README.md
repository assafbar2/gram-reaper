# Gram Reaper

> Harvest your daily protein.

A single-user protein tracking webapp. Log food by typing naturally or tapping quick-add cards. Track your streak toward a daily goal.

**Live demo:** [gram-reaper.fly.dev](https://gram-reaper.fly.dev) *(single-user — deploy your own instance below)*

## Features

- **Natural language input** — "2 ping pong size chicken pieces", "in-n-out double-double", "2 eggs" — AI figures out the protein
- **Smart quick-add** — previously logged foods become large tappable cards, ranked by time-of-day relevance + frequency
- **Animated ring** — fills and turns dark as you hit your daily goal
- **Streak tracking** — history calendar showing hits and misses
- **Installable** — works as a PWA on iOS/Android, no App Store needed

## Stack

Vue 3 + Vite + TypeScript · Node.js + Express · SQLite · Claude Haiku · Tailwind CSS · Fly.io

---

## Run locally

```bash
git clone https://github.com/assafbar2/gram-reaper
cd gram-reaper
npm install
cp .env.example .env
# Edit .env → add your ANTHROPIC_API_KEY
npm run dev
```

Opens at `http://localhost:5173`. API runs on port `3001`.

Get an API key at [console.anthropic.com](https://console.anthropic.com). A few dollars in credits lasts months at this usage rate (~$0.003/day).

---

## Self-host on Fly.io (free)

Fly.io free tier covers everything this app needs: 1 shared VM + 1GB persistent volume for SQLite.

```bash
# 1. Install flyctl
brew install flyctl        # macOS
# or: https://fly.io/docs/hands-on/install-flyctl/

# 2. Sign up / log in
fly auth login

# 3. Clone the repo
git clone https://github.com/assafbar2/gram-reaper
cd gram-reaper

# 4. Create the app (pick any name)
fly apps create your-app-name

# 5. Update fly.toml — change the app name at the top:
#    app = "your-app-name"

# 6. Create a persistent volume for SQLite
fly volumes create gram_reaper_data --size 1 --region <region>
# Pick a region close to you: ams, fra, lax, ord, sin, syd, etc.

# 7. Set your API key (never committed to git)
fly secrets set ANTHROPIC_API_KEY=sk-ant-...

# 8. Deploy
fly deploy
```

Your app is live at `https://your-app-name.fly.dev`.

### Auto-deploy on push (optional)

```bash
# Generate a deploy token
fly tokens create deploy -x 999999h
```

Add it as a GitHub secret named `FLY_API_TOKEN` → every push to `main` auto-deploys via the included GitHub Actions workflow.

---

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key — required | — |
| `DATABASE_PATH` | Path to SQLite file | `/data/gramreaper.db` |
| `PORT` | Server port | `8080` |
| `NODE_ENV` | Environment | `development` |

---

## License

MIT
