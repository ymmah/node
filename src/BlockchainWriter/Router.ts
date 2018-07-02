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
    const { ipfsFileHashes, ipfsDirectoryHash } = JSON.parse(messageContent)
    try {
      if (ipfsFileHashes.length > 0)
        await this.messaging.publish(Exchange.BlockchainWriterTimestampRequest, { ipfsFileHashes, ipfsDirectoryHash })
    } catch (error) {
      logger.error({ ipfsFileHashes, ipfsDirectoryHash }, 'Failed to publish BlockchainWriterTimestampRequest')
    }
  }

  onBlockchainWriterTimestampRequest = async (message: any): Promise<void> => {
    const logger = this.logger.child({ method: 'onBlockchainWriterTimestampRequest' })

    const messageContent = message.content.toString()
    const { ipfsFileHashes, ipfsDirectoryHash } = JSON.parse(messageContent)

    logger.trace(
      {
        ipfsFileHashes,
        ipfsDirectoryHash,
      },
      'Timestamp request'
    )

    try {
      await this.createTimestampRequest({ ipfsFileHashes, ipfsDirectoryHash })
      logger.trace({ ipfsFileHashes, ipfsDirectoryHash }, 'Timestamp request success')
    } catch (error) {
      logger.error(
        {
          error,
          ipfsDirectoryHash,
          ipfsFileHashes,
        },
        'Timestamp request failure'
      )
    }
  }
  createTimestampRequest = async ({
    ipfsFileHashes,
    ipfsDirectoryHash,
  }: {
    ipfsFileHashes: ReadonlyArray<string>
    ipfsDirectoryHash: string
  }): Promise<void> => {
    try {
      await this.claimController.requestTimestamp(ipfsDirectoryHash)
      await this.messaging.publish(Exchange.BlockchainWriterTimestampSuccess, { ipfsFileHashes, ipfsDirectoryHash })
    } catch (error) {
      await this.messaging.publish(Exchange.BlockchainWriterTimestampFailure, { error, ipfsFileHashes, ipfsDirectoryHash })
    }
  }
}
