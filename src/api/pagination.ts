/** Exclusive server boundary. Continuations always carry both fields. */
export type HistoryCursor = { before: number; beforeId: string }
export type HistoryQuery = Partial<HistoryCursor> & { limit?: number }
