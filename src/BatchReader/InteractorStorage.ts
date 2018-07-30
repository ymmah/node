export interface InteractorStorage {
  getDirectoryFileHashes: (directoryHash: string) => Promise<ReadonlyArray<string>>
}
