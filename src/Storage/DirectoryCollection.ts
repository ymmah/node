import { inject, injectable } from 'inversify'
import { Collection, Db } from 'mongodb'

import { minutesToMiliseconds } from 'Helpers/Time'

@injectable()
export class DirectoryCollection {
  private readonly db: Db
  private readonly collection: Collection

  constructor(@inject('DB') db: Db) {
    this.db = db
    this.collection = this.db.collection('storageDirectoryHashes')
  }

  addItems = (hashes: ReadonlyArray<string>) =>
    this.collection.insertMany(
      hashes.map(hash => ({
        hash,
        lastAttemptTime: null,
        successTime: null,
        attempts: 0,
      })),
      { ordered: false }
    )

  findItem = ({ currentTime = new Date().getTime(), retryDelay = minutesToMiliseconds(10), maxAttempts = 20 } = {}) =>
    this.collection.findOne({
      hash: { $exists: true },
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

  setSuccessTime = ({ hash = '', time = new Date().getTime() }) =>
    this.collection.updateOne(
      { hash },
      {
        $set: { successTime: time },
      }
    )

  incAttempts = ({ hash = '', time = new Date().getTime() }) =>
    this.collection.updateOne(
      { hash },
      {
        $set: { lastAttemptTime: time },
        $inc: { attempts: 1 },
      }
    )
}
