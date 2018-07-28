import { ReadEntry } from './ReadEntry'

export interface Database {
  readEntriesAdd: (xs: ReadonlyArray<ReadEntry>) => Promise<void>
  readEntryFindIncomplete: (
    options?: { currentTime?: number; retryDelay?: number; maxAttempts?: number }
  ) => Promise<ReadEntry>
  readEntryUpdate: (x: ReadEntry) => Promise<void>
}
