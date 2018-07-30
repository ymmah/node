import { inject, injectable } from 'inversify'
import fetch from 'node-fetch'

export interface StorageIPFSConfiguration {
  readonly ipfsUrl: string
}

enum Type {
  File = 'File',
  Directory = 'Directory',
}

interface ObjectIPFS {
  Name: string
  Hash: string
  Size: number
  Type: Type
  Links?: ReadonlyArray<Link>
}

interface Link {
  Name: string
  Hash: string
  Size: number
  Type: Type
}

export interface LSResult {
  Arguments: {
    [key: string]: string
  }
  Objects: {
    [key: string]: ObjectIPFS
  }
}

type getDirectoryFileHashes = (s: string) => Promise<ReadonlyArray<string>>

type ls = (s: string) => Promise<LSResult>

@injectable()
export class StorageIPFS implements StorageIPFS {
  private readonly url: string

  constructor(@inject('StorageIPFSConfiguration') configuration: StorageIPFSConfiguration) {
    this.url = configuration.ipfsUrl
  }

  getDirectoryFileHashes: getDirectoryFileHashes = async (hash: string) => {
    const response = await this.ls(hash)
    return response.Objects[hash].Links.map(x => x.Hash)
  }

  private ls: ls = async (hash: string) => {
    const response = await fetch(`${this.url}/api/v0/file/ls?arg=${hash}`)
    const json = await response.json()
    return json
  }
}
