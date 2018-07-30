import { InteractorBatchEntry } from './InteractorBatchEntry'

export interface InteractorDatabase {
  start: () => Promise<void>
  batchEntriesAdd: (xs: ReadonlyArray<InteractorBatchEntry>) => Promise<void>
  interactorBatchEntryFindIncomplete: (
    options?: { currentTime?: number; retryDelay?: number; maxAttempts?: number }
  ) => Promise<InteractorBatchEntry>
  interactorBatchEntryUpdate: (x: InteractorBatchEntry) => Promise<void>
}
