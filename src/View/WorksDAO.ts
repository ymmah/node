import { PoetTimestamp } from '@po.et/poet-js'
import { inject, injectable } from 'inversify'
import { Collection, UpdateWriteOpResult } from 'mongodb'

type upsertEntry = (x: PoetTimestamp) => Promise<UpdateWriteOpResult>

type upsertEntries = (xs: ReadonlyArray<PoetTimestamp>) => Promise<ReadonlyArray<UpdateWriteOpResult>>

type getEntry = (s: string) => Promise<PoetTimestamp>

@injectable()
export class RawEntryDAO {
  private readonly rawEntryCollection: Collection

  constructor(@inject('rawEntryCollection') rawEntryCollection: Collection) {
    this.rawEntryCollection = rawEntryCollection
  }

  upsertEntry: upsertEntry = timestamp =>
    this.rawEntryCollection.updateOne(
      { 'timestamp.ipfsHash': timestamp.ipfsHash },
      { $set: { timestamp } },
      { upsert: true }
    )

  upsertEntries: upsertEntries = timestamps => Promise.all(timestamps.map(this.upsertEntry))

  getEntry: getEntry = ipfsDirectoryHash => this.rawEntryCollection.findOne({ 'timestamp.ipfsHash': ipfsDirectoryHash })
}
