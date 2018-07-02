import { inject, injectable } from 'inversify'
import { Collection, InsertOneWriteOpResult, UpdateWriteOpResult } from 'mongodb'

export interface Entry {
  _id?: string
  ipfsFileHash: string
  successTime?: number
}

type init = () => Promise<void>

type addEntry = (x: Entry) => Promise<InsertOneWriteOpResult>

type findNextEntries = () => Promise<ReadonlyArray<Entry>>

type setEntrySuccessTime = (x: Entry) => Promise<UpdateWriteOpResult>

type setEntrySuccessTimes = (xs: ReadonlyArray<Entry>) => Promise<ReadonlyArray<UpdateWriteOpResult>>

@injectable()
export class FileDAO {
  private readonly fileCollection: Collection

  constructor(@inject('fileCollection') fileCollection: Collection) {
    this.fileCollection = fileCollection
  }

  init: init = async () => {
    await this.fileCollection.createIndex({ ipfsFileHash: 1 }, { unique: true })
  }

  addEntry: addEntry = ({ ipfsFileHash }) => this.fileCollection.insertOne({ ipfsFileHash, successTime: null })

  findNextEntries: findNextEntries = () =>
    this.fileCollection.find({ successTime: null }, { fields: { _id: false, ipfsFileHash: true } }).toArray()

  setEntrySuccessTime: setEntrySuccessTime = ({ ipfsFileHash = '', successTime = new Date().getTime() }) =>
    this.fileCollection.updateOne({ ipfsFileHash }, { $set: { successTime } })

  setEntrySuccessTimes: setEntrySuccessTimes = (entries = []) =>
    Promise.all(
      entries.map(({ ipfsFileHash, successTime = new Date().getTime() }) =>
        this.setEntrySuccessTime({ ipfsFileHash, successTime })
      )
    )
}
