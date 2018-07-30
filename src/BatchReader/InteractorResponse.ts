type FileHash = ReadonlyArray<string>
type DirectoryHash = string

export interface BatchReadResult {
  ipfsDirectoryHash: DirectoryHash
  ipfsFileHashes: FileHash
}

export interface InteractorResponse {
  batchReadResult: (xs: BatchReadResult) => Promise<void>
}
