import { inject, injectable } from 'inversify'
import { Collection, InsertWriteOpResult } from 'mongodb'

import { ErrorCodes } from 'Helpers/MongoDB'
import { minutesToMiliseconds } from 'Helpers/Time'

export interface Entry {
  _id?: string
  attempts?: number
  ipfsDirectoryHash: string
  lastAttemptTime?: number
  successTime?: string
}

type start = () => Promise<void>

type addEntries = (xs: ReadonlyArray<Entry>) => Promise<InsertWriteOpResult>

type findNextEntry = (
  options?: {
    currentTime?: number
    retryDelay?: number
    maxAttempts?: number
  }
) => Promise<Entry>

type setEntrySuccessTime = (x: Entry) => Promise<any>

type incEntryAttempts = (x: Entry) => Promise<any>

@injectable()
export class DirectoryCollection {
  private readonly collection: Collection

  constructor(@inject('collection') collection: Collection) {
    this.collection = collection
  }

  readonly start: start = async () => {
    await this.collection.createIndex({ ipfsDirectoryHash: 1 }, { unique: true })
  }

  readonly addEntries: addEntries = async (entries = []) =>
    this.collection
      .insertMany(
        entries.map((entry: Entry) => ({
          ipfsDirectoryHash: entry.ipfsDirectoryHash,
          lastAttemptTime: null,
          successTime: null,
          attempts: 0,
        })),
        { ordered: false }
      )
      .ignoreError(error => error.code === ErrorCodes.DuplicateKey)

  readonly findNextEntry: findNextEntry = ({
    currentTime = new Date().getTime(),
    retryDelay = minutesToMiliseconds(20),
    maxAttempts = 20,
  } = {}) =>
    this.collection.findOne({
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

  readonly setEntrySuccessTime: setEntrySuccessTime = ({ ipfsDirectoryHash, successTime = new Date().getTime() }) =>
    this.collection.updateOne(
      { ipfsDirectoryHash },
      {
        $set: { successTime },
      }
    )

  readonly incEntryAttempts: incEntryAttempts = ({ ipfsDirectoryHash, lastAttemptTime = new Date().getTime() }) =>
    this.collection.updateOne(
      { ipfsDirectoryHash },
      {
        $set: { lastAttemptTime },
        $inc: { attempts: 1 },
      }
    )
}
