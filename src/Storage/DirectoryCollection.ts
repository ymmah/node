import { inject, injectable } from 'inversify'
import { Collection, Db } from 'mongodb'

@injectable()
export class DirectoryCollection {
  private readonly db: Db
  private readonly collection: Collection

  constructor(@inject('DB') db: Db) {
    this.db = db
    this.collection = this.db.collection('storageDirectoryHashes')
  }

  addItems = async (hashes: ReadonlyArray<string>) =>
    await this.collection.insertMany(
      hashes.map(hash => ({
        hash,
        lastAttemptTime: null,
        successTime: null,
        attempts: 0,
      })),
      { ordered: false }
    )

  findItem = async ({
    currentTime = new Date().getTime(),
    retryDelay,
    maxAttempts,
  }: {
    currentTime?: number
    retryDelay: number
    maxAttempts: number
  }) =>
    await this.collection.findOne({
      claimId: null,
      ipfsHash: { $exists: true },
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
          $or: [
            { attempts: null },
            { attempts: { $exists: false } },
            { attempts: { $lte: maxAttempts } },
          ],
        },
      ],
    })

  setSuccessTime = async ({ hash, time = new Date().getTime() }: { hash: string; time?: number }) =>
    await this.collection.updateOne(
      { hash },
      {
        $set: { successTime: time },
      }
    )

  incDownloadAttempts = async ({ hash, time = new Date().getTime() }: { hash: string; time?: number }) =>
    await this.collection.updateOne(
      { hash },
      {
        $set: { lastAttemptTime: time },
        $inc: { attempts: 1 },
      }
    )
}
