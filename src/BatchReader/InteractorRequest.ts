type DirectoryHashes = ReadonlyArray<string>

export interface InteractorRequest {
  addBatches: (xs: DirectoryHashes) => Promise<void>
  start: () => Promise<void>
  stop: () => Promise<void>
}
