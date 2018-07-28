import { inject, injectable } from 'inversify'

import { asyncPipe } from 'Helpers/AsyncPipe'
import { Database } from './Database'
import { IPFS } from './IPFS'
import { ReadEntry } from './ReadEntry'

interface ReadFlowData {
  readEntry?: ReadEntry
  ipfsFileHashes?: ReadonlyArray<string>
}

type addEntries = (xs: ReadonlyArray<ReadEntry>) => Promise<void>

type readFlow = (x?: ReadFlowData) => Promise<ReadFlowData>

@injectable()
export class ClaimController {
  private readonly db: Database
  private readonly ipfs: IPFS

  constructor(@inject('Database') db: Database, @inject('IPFS') ipfs: IPFS) {
    this.db = db
    this.ipfs = ipfs
  }

  addEntries: addEntries = entries => this.db.readEntriesAdd(entries)

  private readonly findNextEntry: readFlow = async () => {
    const readEntry = await this.db.readEntryFindIncomplete()
    return { readEntry }
  }

  private readonly verifyEntryWasFound: readFlow = async x =>
    x.readEntry ? Promise.resolve(x) : Promise.reject('No entries remaining')

  private readonly incEntryAttempts: readFlow = async ({ readEntry, ...rest }) => {
    const updatedEntry = { ...readEntry, attempts: readEntry.attempts + 1 }
    await this.db.readEntryUpdate(updatedEntry)
    return { readEntry: updatedEntry, ...rest }
  }

  private readonly getDirectoriesFileHashes: readFlow = async ({ readEntry, ...rest }) => {
    const ipfsFileHashes = await this.ipfs.getDirectoryFileHashes(readEntry.ipfsDirectoryHash)
    return { readEntry, ipfsFileHashes, ...rest }
  }

  private readonly updateFileHashes: readFlow = async ({ readEntry, ipfsFileHashes, ...rest }) => {
    const updatedEntry = { ...readEntry, ipfsFileHashes, successTime: new Date().getTime() }
    await this.db.readEntryUpdate(updatedEntry)
    return { readEntry: updatedEntry, ipfsFileHashes, ...rest }
  }

  // tslint:disable-next-line
  public readonly readNextDirectory: readFlow = asyncPipe(
    this.findNextEntry,
    this.verifyEntryWasFound,
    this.incEntryAttempts,
    this.getDirectoriesFileHashes,
    this.updateFileHashes
  )
}
