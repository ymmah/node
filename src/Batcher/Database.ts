import { inject, injectable } from 'inversify'
import { Collection, Db } from 'mongodb'

@injectable()
export class Database {
  private readonly db: Db
  private readonly collection: Collection

  constructor(@inject('DB') db: Db) {
    this.db = db
    this.collection = this.db.collection('batcher')
  }

  addItem = async ({ item }: { item: string }) => await this.collection.insertOne({ item, time: null })

  getItems = async (): Promise<any> => await this.collection.find({ time: null })

  completeItem = async ({ item = '', time = new Date().getTime() }: { item?: string; time?: number }): Promise<any> =>
    await this.collection.updateOne({ item }, { time })

  completeItems = async ({
    items = [],
    time = new Date().getTime(),
  }: {
    items?: string[]
    time?: number
  }): Promise<any> => await Promise.all(items.map(item => this.completeItem({ item, time })))
}
