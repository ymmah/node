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

  addItem = ({ hash = '' }) => this.collection.insertOne({ hash, time: null })

  getItems = () => this.collection.find({ time: null }, { fields: { _id: false, hash: true } }).toArray()

  completeItem = ({ hash = '', time = new Date().getTime() }) => this.collection.updateOne({ hash }, { $set: { time } })

  completeItems = ({ hashes = [] as ReadonlyArray<string>, time = new Date().getTime() }) =>
    Promise.all(hashes.map(hash => this.completeItem({ hash, time })))
}
