import { api } from './client.js'
import type {
  TodayResponse,
  HistoryResponse,
  LogEntry,
  DailySummary,
  ParseResult,
  Food
} from '@/types/index.js'

export const endpoints = {
  // Today
  getToday: () => api.get<TodayResponse>('/today'),

  // Log
  logFood: (body: { food_id?: number; raw_input?: string; quantity?: number; date?: string }) =>
    api.post<{ entry: LogEntry; summary: DailySummary }>('/log', body),

  deleteLog: (id: number) =>
    api.delete<{ summary: DailySummary }>(`/log/${id}`),

  // Parse (preview before logging)
  parseFood: (input: string) =>
    api.post<ParseResult>('/parse', { input }),

  // History
  getHistory: (limit = 60) =>
    api.get<HistoryResponse>(`/history?limit=${limit}`),

  getHistoryDay: (date: string) =>
    api.get<{ date: string; entries: LogEntry[]; summary: DailySummary | null }>(`/history/${date}`),

  // Foods catalog
  getFoods: () => api.get<{ foods: Food[] }>('/foods'),

  patchFood: (id: number, body: { name?: string; protein_g?: number }) =>
    api.patch<{ food: Food }>(`/foods/${id}`, body),

  // Settings
  getSettings: () => api.get<{ settings: Record<string, string> }>('/settings'),

  updateSettings: (body: { daily_goal_g?: number; timezone?: string }) =>
    api.patch<{ settings: Record<string, string> }>('/settings', body),

  resetData: () => api.delete<{ ok: boolean }>('/settings/reset')
}
