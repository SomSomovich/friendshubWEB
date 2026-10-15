import { create } from 'zustand'

export type HistoryProgress = {
  sourceDevice: number; pending: string[]; completed: string[]; received: number
  status: 'requesting' | 'receiving' | 'complete' | 'error'; error: string | null; updatedAt: number
}
type HistorySyncState = {
  accounts: Record<string, HistoryProgress>
  start: (accountId: string, sourceDevice: number, conversations: string[]) => void
  touch: (accountId: string, sourceDevice: number, conversationId: string, count?: number, complete?: boolean) => void
  fail: (accountId: string, error: string) => void
}
export const useHistorySyncStore = create<HistorySyncState>((set) => ({
  accounts: {},
  start: (accountId, sourceDevice, conversations) => set((state) => ({ accounts: { ...state.accounts,
    [accountId]: { sourceDevice, pending: conversations, completed: [], received: 0, status: 'requesting', error: null, updatedAt: Date.now() },
  } })),
  touch: (accountId, sourceDevice, conversationId, count = 0, complete = false) => set((state) => {
    const progress = state.accounts[accountId]
    if (!progress || progress.status === 'error' || progress.sourceDevice !== sourceDevice || !progress.pending.includes(conversationId)) return state
    const completed = complete ? [...new Set([...progress.completed, conversationId])] : progress.completed
    return { accounts: { ...state.accounts, [accountId]: { ...progress, completed,
      received: progress.received + count, updatedAt: Date.now(), error: null,
      status: completed.length === progress.pending.length ? 'complete' : 'receiving',
    } } }
  }),
  fail: (accountId, error) => set((state) => {
    const progress = state.accounts[accountId]
    if (!progress || progress.status === 'complete') return state
    return { accounts: { ...state.accounts, [accountId]: { ...progress, status: 'error', error } } }
  }),
}))
