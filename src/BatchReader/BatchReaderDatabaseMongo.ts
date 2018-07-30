import { inject, injectable } from 'inversify'
import { Db, MongoClient, Collection } from 'mongodb'

import { ErrorCodes } from 'Helpers/MongoDB'
import { minutesToMiliseconds } from 'Helpers/Time'

import { BatchEntry } from './BatchEntry'
import { BatchReaderDatabase } from './BatchReaderDatabase'

export interface BatchReaderDatabaseMongoConfiguration {
  readonly dbUrl: string
}

@injectable()
export class BatchReaderDatabaseMongo implements BatchReaderDatabase {
  private readonly configuration: BatchReaderDatabaseMongoConfiguration
  private db: Db
  private readEntries: Collection

  constructor(@inject('configuration') configuration: BatchReaderDatabaseMongoConfiguration) {
    this.configuration = configuration
  }

  readonly start = async (): Promise<void> => {
    const mongoClient = await MongoClient.connect(this.configuration.dbUrl)
    this.db = await mongoClient.db()
    this.readEntries = this.db.collection('batchReaderReadEntries')
    await this.readEntries.createIndex({ ipfsDirectoryHash: 1 }, { unique: true })
  }

  readonly batchEntriesAdd: BatchReaderDatabase['batchEntriesAdd'] = async (entries = []) => {
    await this.readEntries
      .insertMany(
        entries.map((entry: BatchEntry) => ({
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

  readonly batchEntryFindIncomplete: BatchReaderDatabase['batchEntryFindIncomplete'] = ({
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

  readonly batchEntryUpdate: BatchReaderDatabase['batchEntryUpdate'] = async BatchEntry => {
    await this.readEntries.updateOne(
      { _id: BatchEntry._id },
      {
        attempts: BatchEntry.attempts,
        ipfsDirectoryHash: BatchEntry.ipfsDirectoryHash,
        ipfsFileHashes: BatchEntry.ipfsFileHashes,
        successTime: BatchEntry.successTime,
        lastAttemptTime: BatchEntry.lastAttemptTime,
      }
    )
  }
}
