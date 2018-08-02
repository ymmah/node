# BatchReader Module
Reads IPFS files from IPFS directories.

## Responsiblites
- Watches for messages from the BlockchainReader that contain directory hashes and stores the hashes to be read.
- On a set interval, it finds and attempts to read file hashes from an IPFS directory and then publish a message containing the file hashes found for each directory

## Configuration

The following configuration properties affect the BatchReader Module:

```ts
{
  "dbUrl": string,
  "rabbitmqUrl": string,
  "readNextDirectoryIntervalInSeconds": number
}
```

## Files

#### `BatchReader.ts`   
The entry point for the module.

#### `ControllerRequest.ts`
Takes requests and passes them to the Interactor.

#### `ControllerResponse.ts`
Recieves responses from the Interactor and publishes them.

#### `InteractorBatchReader.ts`
Business Logic, no direct dependencies, everything else should be a plugin and plugin into here. Implements the InteractorRequest interface.

#### `InteractorInteractorRetry.ts`
InteractorRetry properties

#### `InteractorRequest.ts`
Request Interface

#### `InteractorResponse.ts`
Response Interface

#### `InteractorStorage.ts`
Storage Interface

#### `InteractorDatabase.ts`
Database Interface

#### `DatabaseMongo.ts`
A Mongo database mapper that implements the InteractorDatabase interface.

#### `StorageIPFS.ts`
IPFS storage mapper that implements the InteractorStorage interface.
