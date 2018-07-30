import { inject, injectable } from 'inversify'
import { Db, MongoClient, Collection } from 'mongodb'

import { ErrorCodes } from 'Helpers/MongoDB'
import { minutesToMiliseconds } from 'Helpers/Time'

import { InteractorBatchEntry } from './InteractorBatchEntry'
import { InteractorDatabase } from './InteractorDatabase'

export interface DatabaseMongoConfiguration {
  readonly dbUrl: string
}

@injectable()
export class DatabaseMongo implements InteractorDatabase {
  private readonly configuration: DatabaseMongoConfiguration
  private db: Db
  private readEntries: Collection

  constructor(@inject('configuration') configuration: DatabaseMongoConfiguration) {
    this.configuration = configuration
  }

  readonly start = async (): Promise<void> => {
    const mongoClient = await MongoClient.connect(this.configuration.dbUrl)
    this.db = await mongoClient.db()
    this.readEntries = this.db.collection('batchReaderReadEntries')
    await this.readEntries.createIndex({ ipfsDirectoryHash: 1 }, { unique: true })
  }

  readonly batchEntriesAdd: InteractorDatabase['batchEntriesAdd'] = async (entries = []) => {
    await this.readEntries
      .insertMany(
        entries.map((entry: InteractorBatchEntry) => ({
          attempts: 0,
          ipfsDirectoryHash: entry.ipfsDirectoryHash,
          ipfsFileHashes: [],
          lastAttemptTime: null,
          successTime: null,
        })),
        { ordered: false }
      )
      .ignoreError(error => error.code === ErrorCodes.DuplicateKey)
  }

  readonly interactorBatchEntryFindIncomplete: InteractorDatabase['interactorBatchEntryFindIncomplete'] = ({
    currentTime = new Date().getTime(),
    retryDelay = minutesToMiliseconds(20),
    maxAttempts = 20,
  } = {}) =>
    this.readEntries.findOne({
      ipfsDirectoryHash: { $exists: true },
      $and: [
        {
          $or: [
            { lastAttemptTime: null },
            { lastAttemptTime: { $exists: false } },
            { lastAttemptTime: { $lt: currentTime - retryDelay } },
          ],
        },
        {
          $or: [{ successTime: null }, { successTime: { $exists: false } }],
        },
        {
          $or: [{ attempts: null }, { attempts: { $exists: false } }, { attempts: { $lte: maxAttempts } }],
        },
      ],
    })

  readonly interactorBatchEntryUpdate: InteractorDatabase['interactorBatchEntryUpdate'] = async InteractorBatchEntry => {
    await this.readEntries.updateOne(
      { _id: InteractorBatchEntry._id },
      {
        attempts: InteractorBatchEntry.attempts,
        ipfsDirectoryHash: InteractorBatchEntry.ipfsDirectoryHash,
        ipfsFileHashes: InteractorBatchEntry.ipfsFileHashes,
        successTime: InteractorBatchEntry.successTime,
        lastAttemptTime: InteractorBatchEntry.lastAttemptTime,
      }
    )
  }
}
