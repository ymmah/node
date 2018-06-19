# Batcher Module

Responsible for taking claim hashes, and publishing groups of hashes on a timed interval for other modules to do as thye wish with the grouped hashes.

In the future this module might apply some rules to the interval method. For example, it might wait until (transaction cost / claim count <= $1) to publish grouped hashes.

## Files

#### `src/Batcher/Batcher.ts`   
The entry point for the service.

#### `src/Batcher/Database.ts`   
Provides the necessary DB collection functions.

#### `src/Batcher/Router.ts`   
Sort of the saga of the files handles the communication between the different modules.

This is where I have sort of deviated from the previous service structure. In the previous service structure, the router would subscribe to events and call methods on controllers. Those controllers would then publish new messages. I have moved all the subscribing/publishing and flow logic into the router to which it behaves more like a 'saga'. I believe this gives more clarity and flexibility.

#### `src/Batcher/Service.ts`
Fires messages based on intervals and provides the ability to stop/start the intervals.

#### `src/BlockchainWriter/Router.ts`
Changed this file to watch for the `StorageAddFilesToDirectorySuccess` message instead of `onClaimIPFSHash`. Tweaked the handler to also publish a message on success and failure of writing to the blockchain.

#### `src/Configuration.ts`
Bumped the node version up. This allows us to read only directory timestamps from the block chain and ignore timestamps from previous versions. This simplifies the logic required to sync the nodes because we now simply ignore hashes that were generated in previous versions and were not batched.

Also added a few more configuration items.

#### `src/Messaging/Messages.ts`
Added more message types. Message types are global at the moment.

#### `src/Storage/ClaimController.ts`

#### `src/Storage/DirectoryCollection.ts`
Functions for managing the db collection of directory hashes.

