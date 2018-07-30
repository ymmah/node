import { Container } from 'inversify'
import * as Pino from 'pino'

import { createModuleLogger } from 'Helpers/Logging'
import { Messaging } from 'Messaging/Messaging'

import { BatchReaderDatabase } from './BatchReaderDatabase'
import { BatchReaderDatabaseMongo, BatchReaderDatabaseMongoConfiguration } from './BatchReaderDatabaseMongo'
import { BatchReaderRequest } from './BatchReaderRequest'
import { BatchReaderRequestControl, BatchReaderRequestControlConfiguration } from './BatchReaderRequestControl'
import { BatchReaderRequestController } from './BatchReaderRequestController'
import { BatchReaderResponse } from './BatchReaderResponse'
import { BatchReaderResponsePresenter } from './BatchReaderResponsePresenter'
import { BatchReaderStorage } from './BatchReaderStorage'
import { BatchReaderStorageIPFS, BatchReaderStorageIPFSConfiguration } from './BatchReaderStorageIPFS'

import { LoggingConfiguration } from 'Configuration'

export interface BatchReaderConfiguration
  extends LoggingConfiguration,
    BatchReaderRequestControlConfiguration,
    BatchReaderStorageIPFSConfiguration,
    BatchReaderDatabaseMongoConfiguration {
  readonly rabbitmqUrl: string
}

export class BatchReader {
  private readonly logger: Pino.Logger
  private readonly configuration: BatchReaderConfiguration
  private readonly container = new Container()
  private database: BatchReaderDatabase
  private messaging: Messaging
  private control: BatchReaderRequest
  private controller: BatchReaderRequestController

  constructor(configuration: BatchReaderConfiguration) {
    this.configuration = configuration
    this.logger = createModuleLogger(configuration, __dirname)
  }

  async start() {
    this.logger.info({ configuration: this.configuration }, 'BatchReader Starting')

    this.messaging = new Messaging(this.configuration.rabbitmqUrl)
    await this.messaging.start()

    this.initializeContainer()

    this.controller = this.container.get('BatchReaderRequestController')
    await this.controller.start()

    this.control = this.container.get('BatchReaderRequest')
    await this.control.start()

    this.database = this.container.get('BatchReaderDatabase')
    await this.database.start()

    this.logger.info('BatchReader Started')
  }

  initializeContainer() {
    this.container.bind<Pino.Logger>('Logger').toConstantValue(this.logger)
    this.container.bind<BatchReaderRequest>('BatchReaderRequest').to(BatchReaderRequestControl)
    this.container.bind<BatchReaderRequestController>('BatchReaderRequestController').to(BatchReaderRequestController)
    this.container.bind<BatchReaderDatabase>('BatchReaderDatabase').to(BatchReaderDatabaseMongo)
    this.container.bind<BatchReaderStorage>('BatchReaderStorage').to(BatchReaderStorageIPFS)
    this.container.bind<BatchReaderResponse>('BatchReaderResponse').to(BatchReaderResponsePresenter)
    this.container.bind<Messaging>('Messaging').toConstantValue(this.messaging)
  }
}
