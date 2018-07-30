import { inject, injectable } from 'inversify'
import * as Pino from 'pino'

import { childWithFileName } from 'Helpers/Logging'
import { Exchange } from 'Messaging/Messages'
import { Messaging } from 'Messaging/Messaging'

import { InteractorResponse } from './InteractorResponse'

@injectable()
export class ControllerResponse implements InteractorResponse {
  private readonly logger: Pino.Logger
  private readonly messaging: Messaging

  constructor(@inject('Logger') logger: Pino.Logger, @inject('Messaging') messaging: Messaging) {
    this.logger = childWithFileName(logger, __filename)
    this.messaging = messaging
  }

  public batchReadResult: InteractorResponse['batchReadResult'] = async ({ ipfsDirectoryHash, ipfsFileHashes }) => {
    const logger = this.logger.child({ method: 'onBatchReaderReadNextDirectoryRequest' })
    try {
      await this.messaging.publish(Exchange.BatchReaderReadNextDirectorySuccess, { ipfsDirectoryHash, ipfsFileHashes })
      logger.info({ ipfsDirectoryHash, ipfsFileHashes }, 'Read next directory success')
    } catch (error) {
      logger.error({ error }, 'Read next directory failure')
    }
  }
}
