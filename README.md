# Gram Reaper

> Harvest your daily protein.

A single-user protein tracking webapp. Log food by typing naturally or tapping quick-add cards. Track your streak toward a daily goal.

**Live instance:** [gram-reaper.fly.dev](https://gram-reaper.fly.dev) *(private — access code required; deploy your own below)*

## Features

- **Natural language input** — "2 ping pong size chicken pieces", "in-n-out double-double", "2 eggs" — AI figures out the protein
- **Smart quick-add** — previously logged foods become large tappable cards, ranked by time-of-day relevance + frequency
- **Animated ring** — fills and turns dark as you hit your daily goal
- **Streak tracking** — history calendar showing hits and misses
- **Installable** — works as a PWA on iOS/Android, no App Store needed
- **Private** — access-code gate with brute-force lockout; unauthenticated
  visitors get a lock screen and never receive the app or its data

## Stack

Vue 3 + Vite + TypeScript · Node.js + Express · SQLite · Grok 4.5 via OpenRouter · Tailwind CSS · Fly.io

---

## Run locally

```bash
git clone https://github.com/assafbar2/gram-reaper
cd gram-reaper
npm install
cp .env.example .env
# Edit .env → add OPENROUTER_API_KEY, APP_ACCESS_CODE, SESSION_SECRET
npm run dev
```

Opens at `http://localhost:5173`. API runs on port `3001`.

Get an API key at [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys). A few dollars in credits lasts months at this usage rate.

Parsing uses `x-ai/grok-4.5` by default. Override it with `OPENROUTER_MODEL` — any OpenRouter model
that supports structured outputs will work.

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
fly secrets set OPENROUTER_API_KEY=sk-or-v1-... \
  APP_ACCESS_CODE=your-code \
  SESSION_SECRET="$(openssl rand -base64 32)"

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
| `APP_ACCESS_CODE` | Access code required to open the app — **required** | — |
| `SESSION_SECRET` | Signs the session cookie; `openssl rand -base64 32` — **required** | — |
| `OPENROUTER_API_KEY` | OpenRouter API key — required | — |
| `OPENROUTER_MODEL` | Model used for parsing | `x-ai/grok-4.5` |
| `OPENROUTER_SITE_URL` | Sent as `HTTP-Referer` for OpenRouter attribution | — |
| `DATABASE_PATH` | Path to SQLite file | `/data/gramreaper.db` |
| `PORT` | Server port | `8080` |
| `NODE_ENV` | Environment | `development` |

---

## License

MIT
