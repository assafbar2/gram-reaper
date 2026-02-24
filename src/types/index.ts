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

export interface ParseResult {
  food: Food
  is_new: boolean
  confidence: number
  notes: string
}

export interface TodayResponse {
  today: string
  entries: LogEntry[]
  summary: DailySummary
  quickadd: QuickAddCard[]
}

export interface HistoryResponse {
  days: DailySummary[]
  streak: number
  best_day_g: number
  goal_days: number
  total_logged_days: number
}
