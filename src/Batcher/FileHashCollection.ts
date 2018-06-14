import { inject, injectable } from 'inversify'
import { Collection, Db } from 'mongodb'

@injectable()
export class FileHashCollection {
  private readonly db: Db
  private readonly collection: Collection

  constructor(@inject('DB') db: Db) {
    this.db = db
    this.collection = this.db.collection('batcher')
  }

  addItem = async ({ hash }: { hash: string }) => await this.collection.insertOne({ hash, time: null })

  getItems = async (): Promise<any> =>
    await this.collection.find({ time: null }, { fields: { _id: false, hash: true } }).toArray()

  completeItem = async ({ hash = '', time = new Date().getTime() }: { hash?: string; time?: number }): Promise<any> =>
    await this.collection.updateOne({ hash }, { time })

  completeItems = async ({
    hashes = [],
    time = new Date().getTime(),
  }: {
    hashes?: string[]
    time?: number
  }): Promise<any> => await Promise.all(hashes.map(hash => this.completeItem({ hash, time })))
}
