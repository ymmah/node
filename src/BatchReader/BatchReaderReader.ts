import { Interval } from '@po.et/poet-js'
import { inject, injectable } from 'inversify'

import { asyncPipe } from 'Helpers/AsyncPipe'
import { secondsToMiliseconds } from 'Helpers/Time'

import { BatchEntry } from './BatchEntry'
import { BatchReaderDatabase } from './BatchReaderDatabase'
import { BatchReaderRequest } from './BatchReaderRequest'
import { BatchReaderResponse } from './BatchReaderResponse'
import { BatchReaderStorage } from './BatchReaderStorage'

interface ReadNextDirectoryArg {
  BatchEntry?: BatchEntry
  ipfsFileHashes?: ReadonlyArray<string>
}

type readNextDirectory = (x?: ReadNextDirectoryArg) => Promise<ReadNextDirectoryArg>

export interface BatchReaderReaderConfiguration {
  readonly readNextDirectoryIntervalInSeconds: number
}

@injectable()
export class BatchReaderReader implements BatchReaderRequest {
  private readonly db: BatchReaderDatabase
  private readonly storage: BatchReaderStorage
  private readonly response: BatchReaderResponse
  private readNextBatchInterval: Interval

  constructor(
    @inject('BatchReaderDatabase') db: BatchReaderDatabase,
    @inject('BatchReaderStorage') storage: BatchReaderStorage,
    @inject('BatchReaderResponse') response: BatchReaderResponse,
    @inject('BatchReaderReaderConfiguration') configuration: BatchReaderReaderConfiguration
  ) {
    this.db = db
    this.storage = storage
    this.response = response
    this.readNextBatchInterval = new Interval(
      this.readNextDirectory,
      secondsToMiliseconds(configuration.readNextDirectoryIntervalInSeconds)
    )
  }

  public start = async () => {
    await this.readNextBatchInterval.start()
  }

  public stop = async () => {
    await this.readNextBatchInterval.stop()
  }

  public addBatches(ipfsDirectoryHashes: ReadonlyArray<string>) {
    return this.db.batchEntriesAdd(ipfsDirectoryHashes.map(this.directoryHashToBatchEntry))
  }

  private directoryHashToBatchEntry(ipfsDirectoryHash: string): BatchEntry {
    return {
      attempts: 0,
      ipfsDirectoryHash,
      ipfsFileHashes: [],
    }
  }

  private readonly findNextEntry: readNextDirectory = async () => {
    const BatchEntry = await this.db.batchEntryFindIncomplete()
    return { BatchEntry }
  }

  private readonly verifyEntryWasFound: readNextDirectory = async x =>
    x.BatchEntry ? Promise.resolve(x) : Promise.reject('No entries remaining')

  private readonly incrementEntryAttempts: readNextDirectory = async ({ BatchEntry, ...rest }) => {
    const updatedEntry = { ...BatchEntry, attempts: BatchEntry.attempts + 1 }
    await this.db.batchEntryUpdate(updatedEntry)
    return { BatchEntry: updatedEntry, ...rest }
  }

  private readonly getFileHashesFromDirectory: readNextDirectory = async ({ BatchEntry, ...rest }) => {
    const ipfsFileHashes = await this.storage.getDirectoryFileHashes(BatchEntry.ipfsDirectoryHash)
    return { BatchEntry, ipfsFileHashes, ...rest }
  }

  private readonly addFileHashesToEntry: readNextDirectory = async ({ BatchEntry, ipfsFileHashes, ...rest }) => {
    const updatedEntry = { ...BatchEntry, ipfsFileHashes }
    await this.db.batchEntryUpdate(updatedEntry)
    return { BatchEntry: updatedEntry, ipfsFileHashes, ...rest }
  }

  private readonly setEntryComplete: readNextDirectory = async ({ BatchEntry, ...rest }) => {
    const updatedEntry = { ...BatchEntry, successTime: new Date().getTime() }
    await this.db.batchEntryUpdate(updatedEntry)
    return { BatchEntry, ...rest }
  }

  // tslint:disable-next-line
  private readonly readNextDirectory: readNextDirectory = asyncPipe(
    this.findNextEntry,
    this.verifyEntryWasFound,
    this.incrementEntryAttempts,
    this.getFileHashesFromDirectory,
    this.addFileHashesToEntry,
    this.setEntryComplete,
    this.response.batchReadResult
  )
}
