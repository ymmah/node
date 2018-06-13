export enum Exchange {
  BatcherGetHashesRequest = 'BATCHER::GET_HASHES_REQEUST',
  BatcherGetHashesSuccess = 'BATCHER::GET_HASHES_SUCCESS',
  BatcherGetHashesFailure = 'BATCHER::GET_HASHES_FAILURE',
  BatcherCompleteHashesRequest = 'BATCHER::COMPLETE_HASHES_REQEUST',
  BatcherCompleteHashesSuccess = 'BATCHER::COMPLETE_HASHES_SUCCESS',
  BatcherCompleteHashesFailure = 'BATCHER::COMPLETE_HASHES_FAILURE',
  StorageAddFilesToDirectoryRequest = 'STORAGE::ADD_FILES_TO_DIRECTORY_REQUEST',
  StorageAddFilesToDirectorySuccess = 'STORAGE::ADD_FILES_TO_DIRECTORY_SUCCESS',
  StorageAddFilesToDirectoryFailure = 'STORAGE::ADD_FILES_TO_DIRECTORY_FAILURE',
  StorageGetFilesHashesFromNextDirectoryRequest = 'STORAGE::GET_FILES_HASHES_FROM_NEXT_DIRECTORY_REQUEST',
  StorageGetFilesHashesFromNextDirectorySuccess = 'STORAGE::GET_FILES_HASHES_FROM_NEXT_DIRECTORY_SUCCESS',
  StorageGetFilesHashesFromNextDirectoryFailure = 'STORAGE::GET_FILES_HASHES_FROM_NEXT_DIRECTORY_FAILURE',
  BlockchainWriterTimestampSuccess = 'BLOCKCHAINWRITER::TIMESTAMP_SUCCESS',
  BlockchainWriterTimestampFailure = 'BLOCKCHAINWRITER::TIMESTAMP_FAILURE',

  // Event, a new claim has been submitted by a client
  NewClaim = 'NEW_CLAIM',
  // Event, the IPFS hash of a claim has been discovered
  ClaimIPFSHash = 'CLAIM_IPFS_HASH',
  // Event, the ID of the blockchain transaction in which this IPFS hash
  // was stored has been discovered
  IPFSHashTxId = 'IPFS_HAS_TX_ID',
  PoetTimestampDownloaded = 'POET_TIMESTAMP_DOWNLOADED',
  ClaimsDownloaded = 'CLAIMS_DOWNLOADED',
}
