import { inject, injectable } from 'inversify'
import * as Pino from 'pino'

import { childWithFileName } from 'Helpers/Logging'
import { Exchange } from 'Messaging/Messages'
import { Messaging } from 'Messaging/Messaging'

import { FileDAO } from './FileDAO'
import { IPFS } from './IPFS'

@injectable()
export class Router {
  private readonly logger: Pino.Logger
  private readonly messaging: Messaging
  private readonly fileDAO: FileDAO
  private readonly ipfs: IPFS

  constructor(
    @inject('Logger') logger: Pino.Logger,
    @inject('Messaging') messaging: Messaging,
    @inject('FileDAO') fileDAO: FileDAO,
    @inject('IPFS') ipfs: IPFS
  ) {
    this.logger = childWithFileName(logger, __filename)
    this.messaging = messaging
    this.fileDAO = fileDAO
    this.ipfs = ipfs
  }

  async start() {
    await this.messaging.consume(Exchange.ClaimIPFSHash, this.onClaimIPFSHash)
    await this.messaging.consume(Exchange.BatchWriterCreateNextBatchRequest, this.onBatchWriterCreateNextBatchRequest)
    await this.messaging.consume(Exchange.BlockchainWriterTimestampSuccess, this.onBlockchainWriterTimestampSuccess)
    await this.messaging.consume(Exchange.BatchWriterCompleteHashesRequest, this.onBatchWriterCompleteHashesRequest)
  }

  onClaimIPFSHash = async (message: any): Promise<void> => {
    const messageContent = message.content.toString()
    const item = JSON.parse(messageContent)

    try {
      await this.fileDAO.addEntry({ ipfsHash: item.ipfsHash })
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

  onBatchWriterCreateNextBatchRequest = async (message: any) => {
    const logger = this.logger.child({ method: 'onBatchWriterCreateNextBatchRequest' })
    logger.info('Create next batch request')
    try {
      const { fileHashes, ipfsDirectoryHash } = await this.createNextBatch()
      logger.trace({ fileHashes, ipfsDirectoryHash }, 'Create next batch success')
    } catch (error) {
      logger.error({ error }, 'Create next batch failure')
    }
  }

  createNextBatch = async (): Promise<{ fileHashes: ReadonlyArray<string>; ipfsDirectoryHash: string }> => {
    try {
      const items = await this.fileDAO.findNextEntries()
      const fileHashes = items.map(x => x.ipfsHash)
      const emptyDirectoryHash = await this.ipfs.createEmptyDirectory()
      const ipfsDirectoryHash = await this.ipfs.addFilesToDirectory({
        ipfsDirectoryHash: emptyDirectoryHash,
        fileHashes,
      })
      await this.messaging.publish(Exchange.BatchWriterCreateNextBatchSuccess, { fileHashes, ipfsDirectoryHash })
      return { fileHashes, ipfsDirectoryHash }
    } catch (error) {
      await this.messaging.publish(Exchange.BatchWriterCreateNextBatchFailure, {
        error,
      })
    }
  }

  onBlockchainWriterTimestampSuccess = async (message: any): Promise<void> => {
    const logger = this.logger.child({ method: 'onBatchWriterCompleteHashesRequest' })
    const messageContent = message.content.toString()
    const { fileHashes, ipfsDirectoryHash } = JSON.parse(messageContent)
    try {
      await this.messaging.publish(Exchange.BatchWriterCompleteHashesRequest, { fileHashes, ipfsDirectoryHash })
    } catch (error) {
      logger.error({ fileHashes, ipfsDirectoryHash }, 'Failed to publish BatchWriterCompleteHashesRequest')
    }
  }

  onBatchWriterCompleteHashesRequest = async (message: any): Promise<void> => {
    const logger = this.logger.child({ method: 'onBatchWriterCompleteHashesRequest' })
    const messageContent = message.content.toString()
    const { fileHashes, ipfsDirectoryHash } = JSON.parse(messageContent)
    logger.trace({ fileHashes, ipfsDirectoryHash }, 'Mark hashes complete reqeust')
    try {
      await this.completeHashes({ fileHashes, ipfsDirectoryHash })
      await this.fileDAO.setEntrySuccessTimes(fileHashes.map((ipfsHash: string) => ({ ipfsHash })))
      logger.trace({ fileHashes, ipfsDirectoryHash }, 'Mark hashes complete success')
    } catch (error) {
      logger.error({ error, fileHashes, ipfsDirectoryHash }, 'Mark hashes complete failure')
    }
  }

  completeHashes = async ({
    fileHashes,
    ipfsDirectoryHash,
  }: {
    fileHashes: ReadonlyArray<string>
    ipfsDirectoryHash: string
  }): Promise<void> => {
    try {
      await this.fileDAO.setEntrySuccessTimes(fileHashes.map((ipfsHash: string) => ({ ipfsHash })))
      await this.messaging.publish(Exchange.BatchWriterCompleteHashesSuccess, { fileHashes, ipfsDirectoryHash })
    } catch (error) {
      await this.messaging.publish(Exchange.BatchWriterCompleteHashesFailure, { error, fileHashes, ipfsDirectoryHash })
    }
  }
}
