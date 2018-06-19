# Batcher Module

Responsible for taking claim hashes and publishing groups of hashes on a timed interval. Other modules can listen for the published message and do as they wish with the grouped hashes.

## Configuration

The following configuration properties affect the Batcher Module:

```js
{
  "dbUrl": String,
  "rabbitmqUrl"; String,
  "batchIntervalInMinutes": Number // How often grouped claim hashes are published
}
```

## Files

#### `src/Batcher/Batcher.ts`   
The entry point for the module.

#### `src/Batcher/FileHashCollection.ts`   
Provides the necessary DB collection functions to store and manipulate file hashes.

#### `src/Batcher/Router.ts`   
Sort of the saga of the files handles the communication between the different modules.

This is where I have sort of deviated from the previous service structure. In the previous service structure, the router would subscribe to events and call methods on controllers. Those controllers would then publish new messages. I have moved all the subscribing/publishing and flow logic into the router to which it behaves more like a 'saga'. I believe this gives more clarity and flexibility.

#### `src/Batcher/Service.ts`
Fires messages based on intervals and provides the ability to stop/start the intervals.
