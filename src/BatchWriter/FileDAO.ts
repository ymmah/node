import { inject, injectable } from 'inversify'
import { Collection } from 'mongodb'

export interface Entry {
  _id?: string
  ipfsHash: string
  successTime?: number
}

type init = () => Promise<void>

type addEntry = (x: Entry) => Promise<any>

type findNextEntries = () => Promise<ReadonlyArray<Entry>>

type setEntrySuccessTime = (x: Entry) => Promise<any>

type setEntrySuccessTimes = (xs: ReadonlyArray<Entry>) => Promise<any>

@injectable()
export class FileDAO {
  private readonly fileCollection: Collection

  constructor(@inject('fileCollection') fileCollection: Collection) {
    this.fileCollection = fileCollection
  }

  init: init = async () => {
    await this.fileCollection.createIndex({ ipfsHash: 1 }, { unique: true })
  }

  addEntry: addEntry = ({ ipfsHash = '' }) => this.fileCollection.insertOne({ ipfsHash, successTime: null })

  findNextEntries: findNextEntries = () =>
    this.fileCollection.find({ successTime: null }, { fields: { _id: false, ipfsHash: true } }).toArray()

  setEntrySuccessTime: setEntrySuccessTime = ({ ipfsHash = '', successTime = new Date().getTime() }) =>
    this.fileCollection.updateOne({ ipfsHash }, { $set: { successTime } })

  setEntrySuccessTimes: setEntrySuccessTimes = (entries = []) =>
    Promise.all(
      entries.map(({ ipfsHash, successTime = new Date().getTime() }) =>
        this.setEntrySuccessTime({ ipfsHash, successTime })
      )
    )
}
