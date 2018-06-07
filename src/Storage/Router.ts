import { isClaim, PoetTimestamp } from '@po.et/poet-js'
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
    await this.messaging.consume(Exchange.NewClaim, this.onNewClaim)
    await this.messaging.consumePoetTimestampsDownloaded(this.onPoetTimestampsDownloaded)
    await this.messaging.consume(Exchange.StorageAddFilesToDirectoryRequest, this.onStorageAddFilesToDirectoryRequest)
    await this.messaging.consume(Exchange.BatcherGetHashesSuccess, this.onBatcherGetHashesSuccess)
  }

  onNewClaim = async (message: any): Promise<void> => {
    const messageContent = message.content.toString()

    const claim = JSON.parse(messageContent)

    if (!isClaim(claim)) throw new Error(`Received a ${Exchange.NewClaim} message, but the content isn't a claim.`)

    try {
      await this.claimController.create(claim)
    } catch (error) {
      this.logger.error(
        {
          method: 'onNewClaim',
          error,
        },
        'Uncaught Exception while Storing Claim'
      )
    }
  }

  onPoetTimestampsDownloaded = async (poetTimestamps: ReadonlyArray<PoetTimestamp>): Promise<void> => {
    this.logger.trace(
      {
        method: 'onPoetTimestampsDownloaded',
        poetTimestamps,
      },
      'Downloading Claims from IPFS'
    )

    await this.claimController.download(poetTimestamps.map(_ => _.ipfsHash))
  }

  // TODO:: still needs to be modified to get the correct info from message and publish the correct data.
  onBatcherGetHashesSuccess = async (message: any) => {
    const messageContent = message.content.toString()
    const hashes = JSON.parse(messageContent)
    this.messaging.publish(Exchange.StorageAddFilesToDirectoryRequest, hashes)
  }

  // TODO:: still needs to be modified to get the correct info from message and publish the correct data.
  onStorageAddFilesToDirectoryRequest = async (message: any) => {
    const messageContent = message.content.toString()
    const fileHashes = JSON.parse(messageContent)

    try {
      const { directoryHash } = await this.claimController.addFilesToDirectory({ fileHashes })
      this.messaging.publish(Exchange.StorageAddFilesToDirectorySuccess, { fileHashes, directoryHash })
    } catch (error) {
      this.logger.error(
        {
          method: 'onStorageAddFilesToDirectoryRequest',
          error,
        },
        'Uncaught Exception while adding file hashes to a directory Claim'
      )
      this.messaging.publish(
        Exchange.StorageAddFilesToDirectoryFailure,
        'Uncaught Exception while adding file hashes to a directory Claim'
      )
    }
  }
}
