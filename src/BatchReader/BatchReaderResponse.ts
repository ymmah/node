type FileHash = ReadonlyArray<string>
type DirectoryHash = string

export interface BatchReadResult {
  ipfsDirectoryHash: DirectoryHash
  ipfsFileHashes: FileHash
}

export interface BatchReaderResponse {
  batchReadResult: (xs: BatchReadResult) => Promise<void>
}
