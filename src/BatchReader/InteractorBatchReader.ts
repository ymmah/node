import { Interval } from '@po.et/poet-js'
import { inject, injectable } from 'inversify'

import { asyncPipe } from 'Helpers/AsyncPipe'
import { secondsToMiliseconds } from 'Helpers/Time'

import { InteractorBatchEntry } from './InteractorBatchEntry'
import { InteractorDatabase } from './InteractorDatabase'
import { InteractorRequest } from './InteractorRequest'
import { InteractorResponse } from './InteractorResponse'
import { InteractorStorage } from './InteractorStorage'

interface ReadNextDirectoryArg {
  interactorBatchEntry?: InteractorBatchEntry
  ipfsFileHashes?: ReadonlyArray<string>
}

type readNextDirectory = (x?: ReadNextDirectoryArg) => Promise<ReadNextDirectoryArg>

export interface InteractorBatchReaderConfiguration {
  readonly readNextDirectoryIntervalInSeconds: number
}

@injectable()
export class InteractorBatchReader implements InteractorRequest {
  private readonly db: InteractorDatabase
  private readonly storage: InteractorStorage
  private readonly response: InteractorResponse
  private readNextBatchInterval: Interval

  constructor(
    @inject('InteractorDatabase') db: InteractorDatabase,
    @inject('InteractorStorage') storage: InteractorStorage,
    @inject('InteractorResponse') response: InteractorResponse,
    @inject('InteractorBatchReaderConfiguration') configuration: InteractorBatchReaderConfiguration
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
    return this.db.batchEntriesAdd(ipfsDirectoryHashes.map(this.directoryHashToInteractorBatchEntry))
  }

  private directoryHashToInteractorBatchEntry(ipfsDirectoryHash: string): InteractorBatchEntry {
    return {
      attempts: 0,
      ipfsDirectoryHash,
      ipfsFileHashes: [],
    }
  }

  private readonly findNextEntry: readNextDirectory = async () => {
    const interactorBatchEntry = await this.db.interactorBatchEntryFindIncomplete()
    return { interactorBatchEntry }
  }

  private readonly verifyEntryWasFound: readNextDirectory = async x =>
    x.interactorBatchEntry ? Promise.resolve(x) : Promise.reject('No entries remaining')

  private readonly incrementEntryAttempts: readNextDirectory = async ({ interactorBatchEntry, ...rest }) => {
    const updatedEntry = { ...interactorBatchEntry, attempts: interactorBatchEntry.attempts + 1 }
    await this.db.interactorBatchEntryUpdate(updatedEntry)
    return { interactorBatchEntry: updatedEntry, ...rest }
  }

  private readonly getFileHashesFromDirectory: readNextDirectory = async ({ interactorBatchEntry, ...rest }) => {
    const ipfsFileHashes = await this.storage.getDirectoryFileHashes(interactorBatchEntry.ipfsDirectoryHash)
    return { interactorBatchEntry, ipfsFileHashes, ...rest }
  }

  private readonly addFileHashesToEntry: readNextDirectory = async ({
    interactorBatchEntry,
    ipfsFileHashes,
    ...rest
  }) => {
    const updatedEntry = { ...interactorBatchEntry, ipfsFileHashes }
    await this.db.interactorBatchEntryUpdate(updatedEntry)
    return { interactorBatchEntry: updatedEntry, ipfsFileHashes, ...rest }
  }

  private readonly setEntryComplete: readNextDirectory = async ({ interactorBatchEntry, ...rest }) => {
    const updatedEntry = { ...interactorBatchEntry, successTime: new Date().getTime() }
    await this.db.interactorBatchEntryUpdate(updatedEntry)
    return { interactorBatchEntry, ...rest }
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
