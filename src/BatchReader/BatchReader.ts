import { Container } from 'inversify'
import * as Pino from 'pino'

import { createModuleLogger } from 'Helpers/Logging'
import { Messaging } from 'Messaging/Messaging'

import { ControllerRequest } from './ControllerRequest'
import { ControllerResponse } from './ControllerResponse'
import { DatabaseMongo, DatabaseMongoConfiguration } from './DatabaseMongo'
import { InteractorBatchReader, InteractorBatchReaderConfiguration } from './InteractorBatchReader'
import { InteractorDatabase } from './InteractorDatabase'
import { InteractorRequest } from './InteractorRequest'
import { InteractorResponse } from './InteractorResponse'
import { InteractorStorage } from './InteractorStorage'
import { StorageIPFS, StorageIPFSConfiguration } from './StorageIPFS'

import { LoggingConfiguration } from 'Configuration'

export interface BatchReaderConfiguration
  extends LoggingConfiguration,
    InteractorBatchReaderConfiguration,
    StorageIPFSConfiguration,
    DatabaseMongoConfiguration {
  readonly rabbitmqUrl: string
}

export class BatchReader {
  private readonly logger: Pino.Logger
  private readonly configuration: BatchReaderConfiguration
  private readonly container = new Container()
  private database: InteractorDatabase
  private messaging: Messaging
  private interactor: InteractorRequest
  private requestController: ControllerRequest

  constructor(configuration: BatchReaderConfiguration) {
    this.configuration = configuration
    this.logger = createModuleLogger(configuration, __dirname)
  }

  async start() {
    this.logger.info({ configuration: this.configuration }, 'BatchReader Starting')

    this.messaging = new Messaging(this.configuration.rabbitmqUrl)
    await this.messaging.start()

    this.initializeContainer()

    this.requestController = this.container.get('ControllerRequest')
    await this.requestController.start()

    this.interactor = this.container.get('InteractorRequest')
    await this.interactor.start()

    this.database = this.container.get('InteractorDatabase')
    await this.database.start()

    this.logger.info('BatchReader Started')
  }

  initializeContainer() {
    this.container.bind<Pino.Logger>('Logger').toConstantValue(this.logger)
    this.container.bind<InteractorRequest>('InteractorRequest').to(InteractorBatchReader)
    this.container.bind<ControllerRequest>('ControllerRequest').to(ControllerRequest)
    this.container.bind<InteractorDatabase>('InteractorDatabase').to(DatabaseMongo)
    this.container.bind<InteractorStorage>('InteractorStorage').to(StorageIPFS)
    this.container.bind<InteractorResponse>('InteractorResponse').to(ControllerResponse)
    this.container.bind<Messaging>('Messaging').toConstantValue(this.messaging)
  }
}
