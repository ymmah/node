import { isClaim, PoetTimestamp } from '@po.et/poet-js'
import { inject, injectable } from 'inversify'
import * as Pino from 'pino'

import { childWithFileName } from 'Helpers/Logging'
import { Exchange } from 'Messaging/Messages'
import { Messaging } from 'Messaging/Messaging'

import { Database } from './Database'

@injectable()
export class Router {
  private readonly logger: Pino.Logger
  private readonly messaging: Messaging
  private readonly database: Database

  constructor(
    @inject('Logger') logger: Pino.Logger,
    @inject('Messaging') messaging: Messaging,
    @inject('Database') database: Database
  ) {
    this.logger = childWithFileName(logger, __filename)
    this.messaging = messaging
    this.database = database
  }

  async start() {
    await this.messaging.consume(Exchange.ClaimIPFSHash, this.onClaimIPFSHash)
    await this.messaging.consume(Exchange.BatcherGetHashesRequest, this.onBatcherGetHashesRequest)
    await this.messaging.consume(Exchange.BlockchainWriterTimestampSuccess, this.onBlockchainWriterTimestampSuccess)
    await this.messaging.consume(Exchange.BatcherCompleteHashesRequest, this.onBatcherCompleteHashesRequest)
  }

  onClaimIPFSHash = async (message: any): Promise<void> => {
    const messageContent = message.content.toString()
    const hash = JSON.parse(messageContent)

    try {
      await this.database.addItem({ item: hash })
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
    try {
      const fileHashes = await this.database.getItems()
      this.messaging.publish(Exchange.BatcherGetHashesSuccess, { fileHashes })
    } catch (error) {
      this.logger.error(
        {
          method: 'onBatcherGetHashesRequest',
          error,
        },
        'Uncaught Exception while getting hashes to be batched'
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
    const messageContent = message.content.toString()
    const { fileHashes, directoryHash } = JSON.parse(messageContent)
    try {
      await this.database.completeItems(fileHashes)
      this.messaging.publish(Exchange.BatcherCompleteHashesSuccess, { fileHashes, directoryHash })
    } catch (error) {
      this.logger.error(
        {
          method: 'onBatcherCompleteHashesRequest',
          error,
        },
        'Uncaught Exception while adding item to be batched'
      )
      this.messaging.publish(Exchange.BatcherCompleteHashesFailure, { error, fileHashes, directoryHash })
    }
  }
}
