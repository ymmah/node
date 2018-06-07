import { LoggingConfiguration } from 'Configuration'

import { ServiceConfiguration } from './ServiceConfiguration'

export interface BatcherConfiguration extends LoggingConfiguration, ServiceConfiguration {
  readonly dbUrl: string
  readonly rabbitmqUrl: string
}
