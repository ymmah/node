import { inject, injectable } from 'inversify'

import { FileDAO } from './FileDAO'
import { IPFS } from './IPFS'

@injectable()
export class ClaimController {
  private readonly fileDAO: FileDAO
  private readonly ipfs: IPFS

  constructor(@inject('FileDAO') fileDAO: FileDAO, @inject('IPFS') ipfs: IPFS) {
    this.fileDAO = fileDAO
    this.ipfs = ipfs
  }

  addEntry = (entry: { ipfsFileHash: string }) => this.fileDAO.addEntry(entry)

  createNextBatch = async (): Promise<{ ipfsFileHashes: ReadonlyArray<string>; ipfsDirectoryHash: string }> => {
    const items = await this.fileDAO.findNextEntries()
    const ipfsFileHashes = items.map(x => x.ipfsFileHash)
    const emptyDirectoryHash = await this.ipfs.createEmptyDirectory()
    const ipfsDirectoryHash = await this.ipfs.addFilesToDirectory({
      ipfsDirectoryHash: emptyDirectoryHash,
      ipfsFileHashes,
    })
    return { ipfsFileHashes, ipfsDirectoryHash }
  }

  completeHashes = async (ipfsFileHashes: ReadonlyArray<string>) =>
    this.fileDAO.setEntrySuccessTimes(ipfsFileHashes.map((ipfsFileHash: string) => ({ ipfsFileHash })))
}
