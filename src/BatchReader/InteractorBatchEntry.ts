import { InteractorBatch } from './InteractorBatch'
import { InteractorRetry } from './InteractorRetry'

export interface InteractorBatchEntry extends InteractorBatch, InteractorRetry {
  _id?: string
}
