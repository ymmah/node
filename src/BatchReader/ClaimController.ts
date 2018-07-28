import { inject, injectable } from 'inversify'
import { InsertWriteOpResult } from 'mongodb'

import { asyncPipe } from 'Helpers/AsyncPipe'
import { DirectoryDAO } from './DirectoryDAO'
import { IPFS } from './IPFS'

interface ReadFlowData {
  ipfsDirectoryHash?: string
  ipfsFileHashes?: ReadonlyArray<string>
}

type addEntries = (xs: ReadonlyArray<{ ipfsDirectoryHash: string }>) => Promise<InsertWriteOpResult>

type readFlow = (x?: ReadFlowData) => Promise<ReadFlowData>

@injectable()
export class ClaimController {
  private readonly directoryDAO: DirectoryDAO
  private readonly ipfs: IPFS

  constructor(@inject('DirectoryDAO') directoryDAO: DirectoryDAO, @inject('IPFS') ipfs: IPFS) {
    this.directoryDAO = directoryDAO
    this.ipfs = ipfs
  }

  addEntries: addEntries = entries => this.directoryDAO.addEntries(entries)

  private readonly findNextEntry: readFlow = async () => {
    const { ipfsDirectoryHash } = await this.directoryDAO.findNextEntry()
    return { ipfsDirectoryHash }
  }

  private readonly verifyEntryWasFound: readFlow = async x =>
    x.ipfsDirectoryHash ? Promise.resolve(x) : Promise.reject('No entries remaining')

  private readonly incEntryAttempts: readFlow = async ({ ipfsDirectoryHash, ...rest }) => {
    await this.directoryDAO.incEntryAttempts({ ipfsDirectoryHash })
    return { ipfsDirectoryHash, ...rest }
  }

  private readonly getDirectoriesFileHashes: readFlow = async ({ ipfsDirectoryHash, ...rest }) => {
    const ipfsFileHashes = await this.ipfs.getDirectoryFileHashes(ipfsDirectoryHash)
    return { ipfsDirectoryHash, ipfsFileHashes, ...rest }
  }

  private readonly updateFileHashes: readFlow = async ({ ipfsDirectoryHash, ipfsFileHashes, ...rest }) => {
    await this.directoryDAO.updateFileHashes({ ipfsDirectoryHash, ipfsFileHashes })
    return { ipfsDirectoryHash, ipfsFileHashes, ...rest }
  }

  private readonly setEntrySuccessTime: readFlow = async ({ ipfsDirectoryHash, ...rest }) => {
    await this.directoryDAO.setEntrySuccessTime({ ipfsDirectoryHash })
    return { ipfsDirectoryHash, ...rest }
  }

  // tslint:disable-next-line
  readNextDirectory: readFlow = asyncPipe(
    this.findNextEntry,
    this.verifyEntryWasFound,
    this.incEntryAttempts,
    this.getDirectoriesFileHashes,
    this.updateFileHashes,
    this.setEntrySuccessTime
  )
}
