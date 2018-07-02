import { PoetTimestamp } from '@po.et/poet-js'
import { inject, injectable } from 'inversify'
import * as Pino from 'pino'

import { childWithFileName } from 'Helpers/Logging'
import { Exchange } from 'Messaging/Messages'
import { Messaging } from 'Messaging/Messaging'

import { DirectoryDAO } from './DirectoryDAO'
import { IPFS } from './IPFS'

@injectable()
export class Router {
  private readonly logger: Pino.Logger
  private readonly messaging: Messaging
  private readonly directoryDAO: DirectoryDAO
  private readonly ipfs: IPFS

  constructor(
    @inject('Logger') logger: Pino.Logger,
    @inject('Messaging') messaging: Messaging,
    @inject('DirectoryDAO') directoryDAO: DirectoryDAO,
    @inject('IPFS') ipfs: IPFS
  ) {
    this.logger = childWithFileName(logger, __filename)
    this.messaging = messaging
    this.directoryDAO = directoryDAO
    this.ipfs = ipfs
  }

  async start() {
    await this.messaging.consumePoetTimestampsDownloaded(this.onPoetTimestampsDownloaded)
    await this.messaging.consume(
      Exchange.BatchReaderReadNextDirectoryRequest,
      this.onBatchReaderReadNextDirectoryRequest
    )
  }

  onPoetTimestampsDownloaded = async (poetTimestamps: ReadonlyArray<PoetTimestamp>): Promise<void> => {
    const logger = this.logger.child({ method: 'onPoetTimestampsDownloaded' })
    logger.trace(
      {
        poetTimestamps,
      },
      'Storing directory hashes from timestamps'
    )

    try {
      const entries = poetTimestamps.map(x => ({ ipfsDirectoryHash: x.ipfsHash }))
      await this.directoryDAO.addEntries(entries)
    } catch (error) {
      logger.error({ error, poetTimestamps }, 'Failed to store directory hashes to DB collection')
    }
  }

  onBatchReaderReadNextDirectoryRequest = async () => {
    const logger = this.logger.child({ method: 'onBatchReaderReadNextDirectoryRequest' })
    logger.trace('Read next directory request')
    try {
      const { fileHashes, ipfsDirectoryHash } = await this.readNextDirectory()
      logger.trace({ ipfsDirectoryHash, fileHashes }, 'Read next directory success')
    } catch (error) {
      logger.error({ error }, 'Read next directory failure')
    }
  }

  readNextDirectory = async (): Promise<{ ipfsDirectoryHash: string; fileHashes: ReadonlyArray<string> }> => {
    try {
      const collectionItem = await this.directoryDAO.findNextEntry()
      if (!collectionItem) return
      const { ipfsDirectoryHash } = collectionItem
      await this.directoryDAO.incEntryAttempts({ ipfsDirectoryHash })
      const fileHashes = await this.ipfs.getDirectoryFileHashes(ipfsDirectoryHash)
      await this.directoryDAO.setEntrySuccessTime({ ipfsDirectoryHash })
      await this.messaging.publish(Exchange.BatchReaderReadNextDirectorySuccess, { ipfsDirectoryHash, fileHashes })
      return { ipfsDirectoryHash, fileHashes }
    } catch (error) {
      await this.messaging.publish(Exchange.BatchReaderReadNextDirectoryFailure, { error })
    }
  }
}
