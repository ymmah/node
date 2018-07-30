import { BatchEntry } from './BatchEntry'

export interface BatchReaderDatabase {
  start: () => Promise<void>
  batchEntriesAdd: (xs: ReadonlyArray<BatchEntry>) => Promise<void>
  batchEntryFindIncomplete: (
    options?: { currentTime?: number; retryDelay?: number; maxAttempts?: number }
  ) => Promise<BatchEntry>
  batchEntryUpdate: (x: BatchEntry) => Promise<void>
}
