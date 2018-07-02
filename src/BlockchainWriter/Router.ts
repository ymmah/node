import { inject, injectable } from 'inversify'
import * as Pino from 'pino'

import { childWithFileName } from 'Helpers/Logging'
import { Exchange } from 'Messaging/Messages'
import { Messaging } from 'Messaging/Messaging'

import { ClaimController } from './ClaimController'

@injectable()
export class Router {
  private readonly logger: Pino.Logger
  private readonly messaging: Messaging
  private readonly claimController: ClaimController

  constructor(
    @inject('Logger') logger: Pino.Logger,
    @inject('Messaging') messaging: Messaging,
    @inject('ClaimController') claimController: ClaimController
  ) {
    this.logger = childWithFileName(logger, __filename)
    this.messaging = messaging
    this.claimController = claimController
  }

  async start() {
    await this.messaging.consume(Exchange.BatchWriterCreateNextBatchSuccess, this.onBatchWriterCreateNextBatchSuccess)
    await this.messaging.consume(Exchange.BlockchainWriterTimestampRequest, this.onBlockchainWriterTimestampRequest)
  }

  onBatchWriterCreateNextBatchSuccess = async (message: any): Promise<void> => {
    const logger = this.logger.child({ method: 'onBatchWriterCreateNextBatchSuccess' })
    const messageContent = message.content.toString()
    const { fileHashes, ipfsDirectoryHash } = JSON.parse(messageContent)
    try {
      if (fileHashes.length > 0)
        await this.messaging.publish(Exchange.BlockchainWriterTimestampRequest, { fileHashes, ipfsDirectoryHash })
    } catch (error) {
      logger.error({ fileHashes, ipfsDirectoryHash }, 'Failed to publish BlockchainWriterTimestampRequest')
    }
  }

  onBlockchainWriterTimestampRequest = async (message: any): Promise<void> => {
    const logger = this.logger.child({ method: 'onBlockchainWriterTimestampRequest' })

    const messageContent = message.content.toString()
    const { fileHashes, ipfsDirectoryHash } = JSON.parse(messageContent)

    logger.trace(
      {
        fileHashes,
        ipfsDirectoryHash,
      },
      'Timestamp request'
    )

    try {
      await this.createTimestampRequest({ fileHashes, ipfsDirectoryHash })
      logger.trace({ fileHashes, ipfsDirectoryHash }, 'Timestamp request success')
    } catch (error) {
      logger.error(
        {
          error,
          ipfsDirectoryHash,
          fileHashes,
        },
        'Timestamp request failure'
      )
    }
  }
  createTimestampRequest = async ({
    fileHashes,
    ipfsDirectoryHash,
  }: {
    fileHashes: ReadonlyArray<string>
    ipfsDirectoryHash: string
  }): Promise<void> => {
    try {
      await this.claimController.requestTimestamp(ipfsDirectoryHash)
      await this.messaging.publish(Exchange.BlockchainWriterTimestampSuccess, { fileHashes, ipfsDirectoryHash })
    } catch (error) {
      await this.messaging.publish(Exchange.BlockchainWriterTimestampFailure, { error, fileHashes, ipfsDirectoryHash })
    }
  }
}
