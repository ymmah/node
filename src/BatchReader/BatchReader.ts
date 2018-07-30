import { Container } from 'inversify'
import * as Pino from 'pino'

import { createModuleLogger } from 'Helpers/Logging'
import { Messaging } from 'Messaging/Messaging'

import { BatchReaderController } from './BatchReaderController'
import { BatchReaderDatabase } from './BatchReaderDatabase'
import { BatchReaderDatabaseMongo, BatchReaderDatabaseMongoConfiguration } from './BatchReaderDatabaseMongo'
import { BatchReaderPresenter } from './BatchReaderPresenter'
import { BatchReaderReader, BatchReaderReaderConfiguration } from './BatchReaderReader'
import { BatchReaderRequest } from './BatchReaderRequest'
import { BatchReaderResponse } from './BatchReaderResponse'
import { BatchReaderStorage } from './BatchReaderStorage'
import { BatchReaderStorageIPFS, BatchReaderStorageIPFSConfiguration } from './BatchReaderStorageIPFS'

import { LoggingConfiguration } from 'Configuration'

export interface BatchReaderConfiguration
  extends LoggingConfiguration,
    BatchReaderReaderConfiguration,
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
  private controller: BatchReaderController

  constructor(configuration: BatchReaderConfiguration) {
    this.configuration = configuration
    this.logger = createModuleLogger(configuration, __dirname)
  }

  async start() {
    this.logger.info({ configuration: this.configuration }, 'BatchReader Starting')

    this.messaging = new Messaging(this.configuration.rabbitmqUrl)
    await this.messaging.start()

    this.initializeContainer()

    this.controller = this.container.get('BatchReaderController')
    await this.controller.start()

    this.control = this.container.get('BatchReaderRequest')
    await this.control.start()

    this.database = this.container.get('BatchReaderDatabase')
    await this.database.start()

    this.logger.info('BatchReader Started')
  }

  initializeContainer() {
    this.container.bind<Pino.Logger>('Logger').toConstantValue(this.logger)
    this.container.bind<BatchReaderRequest>('BatchReaderRequest').to(BatchReaderReader)
    this.container.bind<BatchReaderController>('BatchReaderController').to(BatchReaderController)
    this.container.bind<BatchReaderDatabase>('BatchReaderDatabase').to(BatchReaderDatabaseMongo)
    this.container.bind<BatchReaderStorage>('BatchReaderStorage').to(BatchReaderStorageIPFS)
    this.container.bind<BatchReaderResponse>('BatchReaderResponse').to(BatchReaderPresenter)
    this.container.bind<Messaging>('Messaging').toConstantValue(this.messaging)
  }
}
