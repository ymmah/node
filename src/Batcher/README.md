# Batcher Module

Responsible for taking claim hashes, and publishing groups of hashes on a timed interval for other modules to do as they wish with the grouped hashes.

In the future this module might apply some rules to the interval method. For example, it might wait until (transaction cost / claim count <= dollar amount) to publish grouped hashes.

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