# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:all

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["node", "--experimental-sqlite", "dist/server/index.js"]
