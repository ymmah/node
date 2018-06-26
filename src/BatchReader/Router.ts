import { PoetTimestamp } from '@po.et/poet-js'
import { inject, injectable } from 'inversify'
import * as Pino from 'pino'

import { childWithFileName } from 'Helpers/Logging'
import { Exchange } from 'Messaging/Messages'
import { Messaging } from 'Messaging/Messaging'

import { DirectoryCollection } from './DirectoryCollection'
import { IPFS } from './IPFS'

@injectable()
export class Router {
  private readonly logger: Pino.Logger
  private readonly messaging: Messaging
  private readonly directoryCollection: DirectoryCollection
  private readonly ipfs: IPFS

  constructor(
    @inject('Logger') logger: Pino.Logger,
    @inject('Messaging') messaging: Messaging,
    @inject('DirectoryCollection') directoryCollection: DirectoryCollection,
    @inject('IPFS') ipfs: IPFS
  ) {
    this.logger = childWithFileName(logger, __filename)
    this.messaging = messaging
    this.directoryCollection = directoryCollection
    this.ipfs = ipfs
  }

  async start() {
    await this.messaging.consumePoetTimestampsDownloaded(this.onPoetTimestampsDownloaded)
    await this.messaging.consume(Exchange.BatchReaderReadNextDirectoryRequest, this.onBatchReaderReadNextDirectoryRequest)
  }

  onPoetTimestampsDownloaded = async (poetTimestamps: ReadonlyArray<PoetTimestamp>): Promise<void> => {
    const logger = this.logger.child({ method: 'onPoetTimestampsDownloaded' })
    logger.trace(
      {
        poetTimestamps,
      },
      'Downloading Claims from IPFS'
    )
    try {
      await this.directoryCollection.addEntries(poetTimestamps)
    } catch (error) {
      logger.error({ error, poetTimestamps }, 'Failed to add directory hash to DB collection')
    }
  }

  onBatchReaderReadNextDirectoryRequest = async (message: any) => {
    const logger = this.logger.child({ method: 'onBatchReaderReadNextDirectoryRequest' })
    logger.trace('Downloading IPFS claim hashes from IPFS Directory hash')
    try {
      const collectionItem = await this.directoryCollection.findNextEntry()
      if (!collectionItem) return
      const { ipfsHash: directoryHash } = collectionItem
      await this.directoryCollection.incEntryAttempts({ ipfsHash: directoryHash })
      const fileHashes = await this.ipfs.getDirectoryFileHashes(directoryHash)
      await this.directoryCollection.setEntrySuccessTime({ ipfsHash: directoryHash })
      this.messaging.publish(Exchange.BatchReaderReadNextDirectorySuccess, { directoryHash, fileHashes })
    } catch (error) {
      logger.error({ error }, 'Error downloading IPFS claim hashes from IPFS Directory hash')
      this.messaging.publish(Exchange.BatchReaderReadNextDirectoryFailure, { error })
    }
  }
}
