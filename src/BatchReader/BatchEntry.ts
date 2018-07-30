import { Batch } from './Batch'
import { Retry } from './Retry'

export interface BatchEntry extends Batch, Retry {
  _id?: string
}
