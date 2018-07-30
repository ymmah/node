export interface BatchReaderStorage {
  getDirectoryFileHashes: (directoryHash: string) => Promise<ReadonlyArray<string>>
}
