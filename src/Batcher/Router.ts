import { isClaim, PoetTimestamp } from '@po.et/poet-js'
import { inject, injectable } from 'inversify'
import * as Pino from 'pino'

import { childWithFileName } from 'Helpers/Logging'
import { Exchange } from 'Messaging/Messages'
import { Messaging } from 'Messaging/Messaging'

import { FileCollection } from './FileCollection'

@injectable()
export class Router {
  private readonly logger: Pino.Logger
  private readonly messaging: Messaging
  private readonly fileHashCollection: FileCollection

  constructor(
    @inject('Logger') logger: Pino.Logger,
    @inject('Messaging') messaging: Messaging,
    @inject('FileCollection') fileHashCollection: FileCollection
  ) {
    this.logger = childWithFileName(logger, __filename)
    this.messaging = messaging
    this.fileHashCollection = fileHashCollection
  }

  async start() {
    await this.messaging.consume(Exchange.ClaimIPFSHash, this.onClaimIPFSHash)
    await this.messaging.consume(Exchange.BatcherGetHashesRequest, this.onBatcherGetHashesRequest)
    await this.messaging.consume(Exchange.BlockchainWriterTimestampSuccess, this.onBlockchainWriterTimestampSuccess)
    await this.messaging.consume(Exchange.BatcherCompleteHashesRequest, this.onBatcherCompleteHashesRequest)
  }

  onClaimIPFSHash = async (message: any): Promise<void> => {
    const messageContent = message.content.toString()
    const item = JSON.parse(messageContent)

    try {
      await this.fileHashCollection.addEntry({ ipfsHash: item.ipfsHash })
    } catch (error) {
      this.logger.error(
        {
          method: 'onClaimIPFSHash',
          error,
        },
        'Uncaught Exception while adding item to be batched'
      )
    }
  }

  onBatcherGetHashesRequest = async (): Promise<void> => {
    const logger = this.logger.child({ method: 'onBatcherGetHashesRequest' })
    try {
      logger.trace('Finding hashes for batching')
      const items = await this.fileHashCollection.findNextEntries()
      const fileHashes = items.map(x => x.ipfsHash)
      this.messaging.publish(Exchange.BatcherGetHashesSuccess, { fileHashes })
      logger.trace('Successfully found hashes for batching', { fileHashes })
    } catch (error) {
      this.logger.error(
        {
          error,
        },
        'Failed to find hashes for batching'
      )
      this.messaging.publish(Exchange.BatcherGetHashesFailure, { error })
    }
  }

  onBlockchainWriterTimestampSuccess = (message: any): void => {
    const messageContent = message.content.toString()
    const { fileHashes, directoryHash } = JSON.parse(messageContent)
    this.messaging.publish(Exchange.BatcherCompleteHashesRequest, { fileHashes, directoryHash })
  }

  onBatcherCompleteHashesRequest = async (message: any): Promise<void> => {
    const logger = this.logger.child({ method: 'onBatcherCompleteHashesRequest' })
    const messageContent = message.content.toString()
    const { fileHashes, directoryHash } = JSON.parse(messageContent)
    logger.trace('Marking hashes as complete', { fileHashes, directoryHash })
    try {
      await this.fileHashCollection.setEntrySuccessTimes(fileHashes.map((ipfsHash: string) => ({ ipfsHash })))
      this.messaging.publish(Exchange.BatcherCompleteHashesSuccess, { fileHashes, directoryHash })
      logger.trace('Successfully mark hashes as complete', { fileHashes, directoryHash })
    } catch (error) {
      logger.error({ error }, 'Failed to mark hashes as complete', { fileHashes, directoryHash })
      this.messaging.publish(Exchange.BatcherCompleteHashesFailure, { error, fileHashes, directoryHash })
    }
  }
}
