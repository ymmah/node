# Batcher Module

Responsible for taking claim hashes and publishing groups of hashes on a timed interval and marking hashes complete after they have successfully been timmestamped. Other modules can listen for the published message and do as they wish with the grouped hashes.

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

#### `Batcher.ts`   
The entry point for the module.

#### `FileCollection.ts`   
`FileCollections.ts` is a facade, it provides simplified functions to store and manipulate file hashes in the database.

#### `Router.ts`   
Handles the communication between the different modules.

In the previous service structure, the router would subscribe to events and call methods on controllers. Those controllers would then publish new messages. In the new system, all the subscribing/publishing and flow logic behaves more like a [saga](https://github.com/redux-saga/redux-saga). This provides more clarity and flexibility.

#### `Service.ts`

Fires messages based on intervals and provides the ability to stop/start the intervals.
