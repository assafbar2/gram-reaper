import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import fs from 'fs'

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'gramreaper.db')

// Ensure directory exists
const dbDir = path.dirname(dbPath)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

export const db = new DatabaseSync(dbPath)

// WAL mode + foreign keys
db.exec("PRAGMA journal_mode = WAL")
db.exec("PRAGMA foreign_keys = ON")

// Initialize schema (node:sqlite requires statements separated, not all in one exec with multi-values INSERT)
db.exec(`
  CREATE TABLE IF NOT EXISTS foods (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    name_normalized TEXT    NOT NULL UNIQUE,
    protein_g       REAL    NOT NULL,
    calories        REAL,
    source          TEXT    NOT NULL DEFAULT 'ai',
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS log_entries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    food_id     INTEGER NOT NULL,
    logged_date TEXT    NOT NULL,
    logged_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    quantity    REAL    NOT NULL DEFAULT 1.0,
    protein_g   REAL    NOT NULL,
    raw_input   TEXT,
    FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_log_entries_date ON log_entries(logged_date);

  CREATE TABLE IF NOT EXISTS daily_summaries (
    date        TEXT    PRIMARY KEY,
    total_g     REAL    NOT NULL DEFAULT 0,
    goal_g      REAL    NOT NULL DEFAULT 90,
    goal_met    INTEGER NOT NULL DEFAULT 0,
    entry_count INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

// Seed defaults
db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run('daily_goal_g', '90')
db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run('timezone', 'America/Los_Angeles')

// ─── Summary helper ───────────────────────────────────────────────────────────
export function recomputeDailySummary(date: string): DailySummary {
  const goalRow = db.prepare("SELECT value FROM settings WHERE key = 'daily_goal_g'").get() as { value: string } | undefined
  const goal = parseFloat(goalRow?.value ?? '90')

  const agg = db.prepare(`
    SELECT
      COALESCE(SUM(protein_g), 0) AS total_g,
      COUNT(*) AS entry_count
    FROM log_entries
    WHERE logged_date = ?
  `).get(date) as { total_g: number; entry_count: number }

  const summary: DailySummary = {
    date,
    total_g: agg.total_g,
    goal_g: goal,
    goal_met: agg.total_g >= goal ? 1 : 0,
    entry_count: agg.entry_count,
    updated_at: new Date().toISOString()
  }

  db.prepare(`
    INSERT INTO daily_summaries (date, total_g, goal_g, goal_met, entry_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (date) DO UPDATE SET
      total_g     = excluded.total_g,
      goal_g      = excluded.goal_g,
      goal_met    = excluded.goal_met,
      entry_count = excluded.entry_count,
      updated_at  = excluded.updated_at
  `).run(summary.date, summary.total_g, summary.goal_g, summary.goal_met, summary.entry_count, summary.updated_at)

  return summary
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Food {
  id: number
  name: string
  name_normalized: string
  protein_g: number
  calories: number | null
  source: string
  created_at: string
}

export interface LogEntry {
  id: number
  food_id: number
  food_name: string
  logged_date: string
  logged_at: string
  quantity: number
  protein_g: number
  raw_input: string | null
}

export interface DailySummary {
  date: string
  total_g: number
  goal_g: number
  goal_met: number
  entry_count: number
  updated_at: string
}

export interface QuickAddCard {
  food_id: number
  name: string
  protein_g: number
  total_logs: number
  last_logged_at: string
  typical_hour: number
  score: number
  logged_today: boolean
}
