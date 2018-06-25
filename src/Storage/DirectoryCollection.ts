import { inject, injectable } from 'inversify'
import { Collection } from 'mongodb'

import { minutesToMiliseconds } from 'Helpers/Time'

export interface Entry {
  _id?: string
  attempts?: number
  ipfsHash: string
  lastAttemptTime?: number
  successTime?: string
}

type init = () => Promise<void>

type addEntries = (xs: ReadonlyArray<{ ipfsHash: string }>) => Promise<any>

type findNextEntry = (
  options?: {
    currentTime?: number
    retryDelay?: number
    maxAttempts?: number
  }
) => Promise<Entry>

type setEntrySuccessTime = (x: { ipfsHash: string; successTime?: number }) => Promise<any>

type incEntryAttempts = (x: { ipfsHash: string; lastAttemptTime?: number }) => Promise<any>

@injectable()
export class DirectoryCollection {
  private readonly collection: Collection

  constructor(@inject('collection') collection: Collection) {
    this.collection = collection
  }

  init: init = async () => {
    await this.collection.createIndex({ ipfsHash: 1 }, { unique: true })
  }

  addEntries: addEntries = (entries = []) =>
    this.collection.insertMany(
      entries.map((entry: Entry) => ({
        ipfsHash: entry.ipfsHash,
        lastAttemptTime: null,
        successTime: null,
        attempts: 0,
      })),
      { ordered: false }
    )

  findNextEntry: findNextEntry = ({
    currentTime = new Date().getTime(),
    retryDelay = minutesToMiliseconds(20),
    maxAttempts = 20,
  } = {}) =>
    this.collection.findOne({
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
          $or: [{ attempts: null }, { attempts: { $exists: false } }, { attempts: { $lte: maxAttempts } }],
        },
      ],
    })

  setEntrySuccessTime: setEntrySuccessTime = ({ ipfsHash, successTime = new Date().getTime() }) =>
    this.collection.updateOne(
      { ipfsHash },
      {
        $set: { successTime },
      }
    )

  incEntryAttempts: incEntryAttempts = ({ ipfsHash, lastAttemptTime = new Date().getTime() }) =>
    this.collection.updateOne(
      { ipfsHash },
      {
        $set: { lastAttemptTime },
        $inc: { attempts: 1 },
      }
    )
}
