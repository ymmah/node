import { PoetTimestamp } from '@po.et/poet-js'
import { inject, injectable } from 'inversify'
import * as Pino from 'pino'

import { childWithFileName } from 'Helpers/Logging'
import { ClaimIPFSHashPair } from 'Interfaces'
import { Exchange } from 'Messaging/Messages'
import { Messaging } from 'Messaging/Messaging'

import { WorkController } from './WorkController'

@injectable()
export class Router {
  private readonly logger: Pino.Logger
  private readonly messaging: Messaging
  private readonly workController: WorkController

  constructor(
    @inject('Logger') logger: Pino.Logger,
    @inject('Messaging') messaging: Messaging,
    @inject('WorkController') workController: WorkController
  ) {
    this.logger = childWithFileName(logger, __filename)
    this.messaging = messaging
    this.workController = workController
  }

  async start() {
    await this.messaging.consume(Exchange.NewClaim, this.onNewClaim)
    await this.messaging.consume(Exchange.ClaimIPFSHash, this.onClaimIPFSHash)
    await this.messaging.consume(Exchange.IPFSHashTxId, this.onIPFSHashTxId)
    await this.messaging.consumePoetTimestampsDownloaded(this.onPoetTimestampsDownloaded)
    await this.messaging.consumeClaimsDownloaded(this.onClaimsDownloaded)
    await this.messaging.consume(
      Exchange.BatchReaderReadNextDirectorySuccess,
      this.onBatchReaderReadNextDirectorySuccess
    )
    await this.messaging.consume(Exchange.BatchWriterCreateNextBatchSuccess, this.onBatchWriterCreateNextBatchSuccess)
  }

  onNewClaim = async (message: any) => {
    const messageContent = message.content.toString()

    await this.workController.createWork(JSON.parse(messageContent))
  }

  onClaimIPFSHash = async (message: any) => {
    const messageContent = message.content.toString()
    const { claimId, ipfsFileHash } = JSON.parse(messageContent)

    await this.workController.setIPFSHash(claimId, ipfsFileHash)
  }

  onBatchWriterCreateNextBatchSuccess = async (message: any): Promise<void> => {
    const logger = this.logger.child({ method: 'onBlockchainWriterRequestTimestampRequest' })

    const messageContent = message.content.toString()
    const { ipfsFileHashes, ipfsDirectoryHash } = JSON.parse(messageContent)

    logger.trace(
      {
        ipfsDirectoryHash,
        ipfsFileHashes,
      },
      'Adding IPFS Directory Hash to claims'
    )

    try {
      await this.workController.setDirectoryHashOnEntries({ ipfsDirectoryHash, ipfsFileHashes })
      logger.trace({ ipfsDirectoryHash, ipfsFileHashes }, 'IPFS Directory Hash set successfully')
    } catch (error) {
      logger.error(
        {
          ipfsDirectoryHash,
          ipfsFileHashes,
          error,
        },
        'Error setting IPFS Directory Hash'
      )
    }
  }

  onIPFSHashTxId = async (message: any) => {
    const messageContent = message.content.toString()
    const { ipfsDirectoryHash, txId } = JSON.parse(messageContent)

    await this.workController.setTxId(ipfsDirectoryHash, txId)
  }

  onPoetTimestampsDownloaded = async (poetTimestamps: ReadonlyArray<PoetTimestamp>) => {
    const logger = this.logger.child({ method: 'onPoetTimestampsDownloaded' })

    logger.trace({ poetTimestamps }, 'Downloaded Po.et Timestamp')

    await this.workController.upsertTimestamps(poetTimestamps)
  }

  onBatchReaderReadNextDirectorySuccess = async (message: any) => {
    const logger = this.logger.child({ method: 'onBatchReaderReadNextDirectorySuccess' })
    const messageContent = message.content.toString()
    const { ipfsFileHashes, ipfsDirectoryHash } = JSON.parse(messageContent)
    logger.info({ ipfsDirectoryHash, ipfsFileHashes }, 'Setting ipfsDirectoryHash on works')
    try {
      await this.workController.setFileHashesForDirectoryHash({ ipfsFileHashes, ipfsDirectoryHash })
    } catch (error) {
      logger.error({ error, ipfsFileHashes, ipfsDirectoryHash }, 'Failed to set ipfsDirectoryHash on works')
    }
  }

  onClaimsDownloaded = async (claimIPFSHashPairs: ReadonlyArray<ClaimIPFSHashPair>) => {
    const logger = this.logger.child({ method: 'onClaimsDownloaded' })

    logger.trace({ claimIPFSHashPairs }, 'Downloaded a (IPFS Hash, Claim Id) Pair')

    await this.workController.upsertClaimIPFSHashPair(claimIPFSHashPairs)
  }
}
