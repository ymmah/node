type DirectoryHashes = ReadonlyArray<string>

export interface BatchReaderRequest {
  addBatches: (xs: DirectoryHashes) => Promise<void>
  start: () => Promise<void>
  stop: () => Promise<void>
}
