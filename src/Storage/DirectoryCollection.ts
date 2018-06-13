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
        lastDownloadAttemptTime: null,
        downloadSuccessTime: null,
        downloadAttempts: 0,
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
            { lastDownloadAttemptTime: null },
            { lastDownloadAttemptTime: { $exists: false } },
            { lastDownloadAttemptTime: { $lt: currentTime - retryDelay } },
          ],
        },
        {
          $or: [{ downloadSuccessTime: null }, { downloadSuccessTime: { $exists: false } }],
        },
        {
          $or: [
            { downloadAttempts: null },
            { downloadAttempts: { $exists: false } },
            { downloadAttempts: { $lte: maxAttempts } },
          ],
        },
      ],
    })

  setDownloadSuccessTime = async ({ hash, time = new Date().getTime() }: { hash: string; time?: number }) =>
    await this.collection.updateOne(
      { hash },
      {
        $set: { downloadSuccessTime: time },
      }
    )

  incDownloadAttempts = async ({ hash, time = new Date().getTime() }: { hash: string; time?: number }) =>
    await this.collection.updateOne(
      { hash },
      {
        $set: { lastDownloadAttemptTime: time },
        $inc: { downloadAttempts: 1 },
      }
    )
}
