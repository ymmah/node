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
    const messageContent = message.content.toString()
    const { fileHashes, directoryHash } = JSON.parse(messageContent)
    if (fileHashes.length > 0)
      this.messaging.publish(Exchange.BlockchainWriterTimestampRequest, { fileHashes, directoryHash })
  }

  onBlockchainWriterTimestampRequest = async (message: any): Promise<void> => {
    const logger = this.logger.child({ method: 'onClaimIPFSHash' })

    const messageContent = message.content.toString()
    const { fileHashes, directoryHash } = JSON.parse(messageContent)

    logger.trace(
      {
        fileHashes,
        directoryHash,
      },
      'Timestamping requested'
    )

    try {
      await this.claimController.requestTimestamp(directoryHash)
      this.messaging.publish(Exchange.BlockchainWriterTimestampSuccess, { fileHashes, directoryHash })
      logger.trace('time stamping success', { fileHashes, directoryHash })
    } catch (exception) {
      logger.error(
        {
          exception,
          directoryHash,
          fileHashes,
        },
        'Uncaught Exception while requesting timestamp'
      )
      this.messaging.publish(Exchange.BlockchainWriterTimestampFailure, { error: exception, fileHashes, directoryHash })
    }
  }
}
