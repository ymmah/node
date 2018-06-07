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
    await this.messaging.consume(Exchange.StorageAddFilesToDirectorySuccess, this.onStorageAddFilesToDirectorySuccess)
    await this.messaging.consume(Exchange.BlockChainWriterTimestampRequest, this.onBlockChainWriterTimestampRequest)
  }

  // TODO:: still needs to be modified to get the correct info from message and publish the correct data.
  onStorageAddFilesToDirectorySuccess = async (message: any): Promise<void> => {
    const messageContent = message.content.toString()
    const { claimId, ipfsHash } = JSON.parse(messageContent)
    this.messaging.publish(Exchange.BlockChainWriterTimestampRequest, { claimId, ipfsHash })
  }

  // TODO:: still needs to be modified to get the correct info from message and publish the correct data.
  onBlockChainWriterTimestampRequest = async (message: any): Promise<void> => {
    const logger = this.logger.child({ method: 'onClaimIPFSHash' })

    const messageContent = message.content.toString()
    const { claimId, ipfsHash } = JSON.parse(messageContent)

    logger.trace(
      {
        claimId,
        ipfsHash,
      },
      'Timestamping requested'
    )

    try {
      await this.claimController.requestTimestamp(ipfsHash)
      // PUBLISH THE TIMESTAMPED DIRECTORY HASH AND FILE HASHES SO THEY CAN BE UPDATED. MIGHT ALSO NEED TO PUBLISH EACH FILES CLAIM ID?
      this.messaging.publish(Exchange.BlockchainWriterTimestampSuccess, { claimId, ipfsHash })
    } catch (exception) {
      logger.error(
        {
          exception,
          claimId,
          ipfsHash,
        },
        'Uncaught Exception while requesting timestamp'
      )
      this.messaging.publish(Exchange.BlockchainWriterTimestampFailure, {})
    }
  }
}
