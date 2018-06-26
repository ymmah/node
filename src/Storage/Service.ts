import { Interval } from '@po.et/poet-js'
import { inject, injectable } from 'inversify'
import * as Pino from 'pino'

import { childWithFileName } from 'Helpers/Logging'

import { ClaimController } from './ClaimController'
import { ServiceConfiguration } from './ServiceConfiguration'

@injectable()
export class Service {
  private readonly logger: Pino.Logger
  private readonly claimController: ClaimController
  private readonly downloadNextHashInterval: Interval
  private readonly getFilesFromNextDirecotryInterval: Interval

  constructor(
    @inject('Logger') logger: Pino.Logger,
    @inject('ClaimController') claimController: ClaimController,
    @inject('ServiceConfiguration') configuration: ServiceConfiguration
  ) {
    this.logger = childWithFileName(logger, __filename)
    this.claimController = claimController
    this.downloadNextHashInterval = new Interval(this.downloadNextHash, 1000 * configuration.downloadIntervalInSeconds)
  }

  async start() {
    this.downloadNextHashInterval.start()
    this.getFilesFromNextDirecotryInterval.start()
  }

  stop() {
    this.downloadNextHashInterval.stop()
    this.getFilesFromNextDirecotryInterval.start()
  }

  private downloadNextHash = async () => {
    try {
      await this.claimController.downloadNextHash()
    } catch (error) {
      this.logger.error(
        {
          method: 'downloadNextFileHash',
          error,
        },
        'Uncaught Error Downloading Next Hash'
      )
    }
  }
}
