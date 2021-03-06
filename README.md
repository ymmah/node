# The Po.et Node

[![Build Status](https://travis-ci.org/poetapp/node.svg?branch=master)](https://travis-ci.org/poetapp/node)
[![Greenkeeper badge](https://badges.greenkeeper.io/poetapp/node.svg)](https://greenkeeper.io/)
[![Docker Automated build](https://img.shields.io/docker/automated/poetapp/node.svg?style=flat)](https://hub.docker.com/r/poetapp/node/)

The Po.et Node allows you to timestamp documents in a decentralized manner.

It's built on top of the Bitcoin's blockchain and [IPFS](https://ipfs.io/).

## Index

- [How to Run the Po.et Node](#how-to-run-the-poet-node)
    - [Install](#install)
    - [Docker Compose](#docker-compose)
    - [Makefile](#makefile)
    - [Dependencies](#dependencies)
    - [Configuration](#configuration)
- [API](#api)
    - [Building Claims](#building-claims)
    - [Running as a Daemon](#running-as-a-daemon)
    - [Supported Platforms](#supported-platforms)
- [Contributing](#contributing)
    - [Compiling](#compiling)
    - [Tests](#tests)
    - [Coverage](#coverage)
    - [Branches and Pull Requests](#branches-and-pull-requests)
    - [Code Style](#code-style)


## Gitter
For any questions about developing an application that integrates with the Po.et Node or contributing to Po.et that aren't answered here check out our Gitter community at https://gitter.im/poetapp.

## How to Run the Po.et Node
To run the Po.et Node, you need to clone this repo, make sure you have NodeJS installed and just `npm start`.
You also need to have RabbitMQ, IPFS and MongoDB installed. See [Dependencies](#dependencies) down below.

### Install
```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash

# Activate NVM
. ~/.nvm/nvm.sh

# Clone The Po.et Node
git clone https://github.com/poetapp/node.git

# Build The Po.et Node
cd node

# Install NodeJS (will install node version in .nvmrc)
nvm install

npm i
npm run build

# Run The Po.et Node
npm start
```

### docker-compose
You need to have [Docker](https://docs.docker.com/install/) and [docker-compose](https://docs.docker.com/compose/install/) installed
```bash
git clone https://github.com/poetapp/node.git
cd node
docker-compose up
```

### Makefile
```bash
# Clone The Po.et Node
git clone https://github.com/poetapp/node.git

cd node

make all

# to clean up and stop processes:
make stop
make clean
```

Make Commands available:
```bash
make all # makes all dependancies
make stop # stops the docker containers
make clean # removes node_modules and all stopped containers
make setup # setups the api nodejs deps
make containers # creates the dependant docker containers for mongodb, rabbitmq and ipfs
```

### Dependencies
The Po.et Node depends on RabbitMQ, IPFS, MongoDB and InsightAPI. By default, it looks for all these things in localhost, except for the InsightAPI, which defaults to https://test-insight.bitpay.com/.

For a quick startup, we provide `make` commands that build and run these dependencies in Docker containers.
You just need to `sudo make mongo rabbit ipfs` once to create the Docker images, and `sudo make start-all` to start them when they shut down.

You can also `sudo make sh-mongo` and `sudo make sh-ipfs` to run the mongo shell or ssh into the IPFS container.

You'll need to have Docker installed and running for this. See [How to Install Docker CE](https://docs.docker.com/engine/installation/linux/docker-ce/ubuntu/#install-docker-ce).

No Docker image is provided for InsightAPI since Bitpay offers a usable InsightAPI publicly.

In a production environment, you may want to run these applications natively installed on the OS rather than dockerized. If you choose to run IPFS dockerized, make sure it's able to communicate with other IPFS nodes outside your network.

### Configuration
The Po.et Node comes with a default configuration that works out of the box.

By default, timestamping to the blockchain is disabled, and RabbitMQ, IPFS and MongoDB are expected to be running in localhost with their default ports.

You can change any configuration by placing a json file in `~/.po.et/configuration.json`. Po.et will look for this file upon startup and, if found, merge its contents with the default configuration.

> **Note**: Po.et will NOT reload the configuration while it's running if you change it. You'll need to restart the Node for configuration changes to apply.

This is what the default configuration looks like:

```
{
  rabbitmqUrl: 'amqp://localhost',
  mongodbUrl: 'mongodb://localhost:27017/poet',
  ipfsUrl: 'http://localhost:5001',
  insightUrl: 'https://test-insight.bitpay.com/api',

  apiPort: 18080,
  poetNetwork: 'BARD',
  poetVersion: [0, 0, 0, 2],
  minimumBlockHeight: 1253828,
  blockchainReaderIntervalInSeconds: 5,

  enableTimestamping: false,
  bitcoinAddress: '',
  bitcoinAddressPrivateKey: '',
  timestampIntervalInSeconds: 30,
  batchCreationIntervalInSeconds: 600
  readNextDirectoryIntervalInSeconds: 30
}
```

To enable timestamping to the Bitcoin blockchain, you need to set `enableTimestamping` to `true` and provide a valid `bitcoinAddress` and the `bitcoinAddressPrivateKey` that owns it.

You can create a valid bitcoin address using [Ian Coleman's Mnemonic Code Converter](https://iancoleman.io/bip39/), creating and exporting the private keys and addresses from bitcoin-cli or wallets that support this or use any other means that work for you.

You'll also need some bitcoins in that address. In testnet, you can get some for free using a [testnet faucet](https://www.google.com.ar/search?q=testnet+faucet). We've found [flyingkiwi's one](https://testnet.manu.backend.hamburg/faucet) particularly nice.

Right now, Po.et is timestamping to Testnet, so just make sure your address is a valid Testnet address.

## API
Currently, the Node exposes three endpoints.

### `GET /works/:id`
Returns a single claim by its Id.

For simplicity, this endpoint adds a `.timestamp` in the response, which is not a real part of the claim, but provides valuable information such as the id of the transaction in which this claim has been timestamped, the IPFS hash by which it can be found, etc.

Returns 404 if the claim isn't found in this Node's database. This doesn't strictly mean the claim doesn't exist in the Po.et network — it just doesn't exist in this Node.

### `GET /works?publicKey=...`
Returns an array of claims — all the claims belonging to the passed public key.

### `GET /works`
Retrieving all works isn't supported yet. The Node will assumme you intended to call `GET /works?publicKey=undefined`, which will normally return an empty array. Support for this endpoint will be added in the future.

### `POST /works`
Publish a work.

This endpoint is async — unless an immediate error can be detected (such as a malformed claim), the endpoint will return an ACK. There's no guarantee that the work has actually been processed, timestamped an sent to IPFS. To check that, you'll need to `GET /works/:id` and check the `.timestamp` attribute.

This endpoint expects a fully constructed claim — with the correct `.id`, `.publicKey`, `.signature` and `.dateCreated`. See [Building Claims](#building-claims) for information on how to correctly create these attributes.

## Building Claims
A Po.et Claim is a JSON object that holds arbitrary information plus a few attributes that allow the network to verify that the claim has actually been created by a certain person, that the claim has not been modified since its creation, and a special field `type` which will allow more features in the future.

For example, a claim could look like this:
```js
{
  id: '15867401b92567b4f7ea83e39a646ab9eb581b560bc78488b7a0c1b586c70215',
  publicKey: '02badf4650ba545608242c2d303d587cf4f778ae3cf2b3ef99fbda37555a400fd2',
  signature: '304402201824b78d3703162eb7f240341968ebfecad1f002f988dbc9ec80c1317e49d6290220470124c7425a5d8024778991863f0a25931a7e45fb72223bea81728a08e30b50',
  type: ClaimType.Work,
  dateCreated: new Date('2017-12-11T22:58:11.375Z'),
  attributes: {
    name: 'The Murders in the Rue Morgue',
    author: 'Edgar Allan Poe',
    tags: 'short story, detective story, detective',
    dateCreated: '1841-01-01T00:00:00.000Z',
    datePublished: '1841-01-01T00:00:00.000Z',
    content: 'The mental features discoursed of as the analytical, are, in themselves, but little susceptible of analysis...'
  }
}

```

The `publicKey` field must be set to the public part of a key pair you own. You'll need the corresponding private key to prove this claim was generated by you.

The `signature` must be set to the result of cryptographically signing the `id` field with the private key you own using the elliptic curve DSA signature scheme. This signature is currently being validated with [bitcore.Crypto.ECDSA.verify](https://github.com/bitpay/bitcore-lib/blob/master/lib/crypto/ecdsa.js#L270), and we're using [bitcore.Crypto.ECDSA.sign](https://github.com/bitpay/bitcore-lib/blob/master/lib/crypto/ecdsa.js#L279) to sign our claims.

The `id` field is the `sha256` of the claim, excluding the `id` and `signature` fields, so `getId(claim) == getId(getId(claim))`. We're using [decodeIO's implementation of](https://github.com/dcodeIO/protobuf.js) Google's [Protobuf library](https://github.com/google/protobuf) in order to serialize the claims to a byte buffer deterministically and hashing this byte buffer. The `.proto` file we're using can be found in [src/Serialization/PoetProto.json](./src/Serialization/PoetProto.json). There's a [poet.proto](./src/Serialization/poet.proto) file that you can use in any other programming language.

All this logic is abstracted away in [poet-js](https://github.com/poetapp/poet-js), so if you're working with JavaScript or TypeScript you can simply use the `createClaim(privateKey, claimType, attributes)` function like so:

```ts
import { ClaimType, createClaim } from '@po.et/poet-js'

const privateKey = 'L1mptZyB6aWkiJU7dvAK4UUjLSaqzcRNYJn3KuAA7oEVyiNn3ZPF'

const claim = createClaim(privateKey, ClaimType.Work, {
  name: 'The Murders in the Rue Morgue',
  author: 'Edgar Allan Poe',
  tags: 'short story, detective story, detective',
  dateCreated: '1841-01-01T00:00:00.000Z',
  datePublished: '1841-01-01T00:00:00.000Z',
  content: 'The mental features discoursed of as the analytical, are, in themselves, but little susceptible of analysis...'
})

```

> You can find more examples on how to build and publish claims in the integration tests in [test/Integration/PostWork](./test/Integration/PostWork.ts).

### Running as a Daemon
Create a file with the following contents and place it in `~/.config/systemd/user/poet-node.service`:

```
[Unit]
Description=Po.et Node Daemon
After=network.target

[Service]
ExecStart=/home/ubuntu/.nvm/versions/node/v9.3.0/bin/node /home/ubuntu/node/dist/babel/src/index.js daemon
WorkingDirectory=/home/ubuntu/node/dist/babel/src/
Restart=always
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=poet-node

[Install]
WantedBy=default.target
```

Make sure the paths to NodeJS and Po.et in the `ExecStart` and `WorkingDirectory` entries are correct.

You can then use the following commands to handle the daemon:
```
systemctl --user start poet-node
systemctl --user stop poet-node
systemctl --user about poet-node
systemctl --user restart poet-node
```

And `journalctl -f --user-unit poet-node` to tail the logs, or without the `-f` to just `less` them.

### Supported Platforms
The Po.et Node has been tested in Ubuntu, Linux Mint and Mac OS.

The `npm run build` command depends on `npm run build-clear` and `npm run copy-json`, which use bash' `rm` and `cp`, so building under Windows may require some tweaking.

## Contributing

### Compiling
Run `npm run build` to compile the source. This will run TypeScript on the source files and place the output in `dist/ts`, and then it'll run Babel and place the output in `dist/babel`.

Currently, we're only using Babel to support [absolute import paths](https://github.com/tleunen/babel-plugin-module-resolver).

During development, you can also run `npm run watch` to automatically watch for file changes, build the changed files and restart the application on the fly.

### Tests
Both unit and integration tests live in this same repo. You can run both with `npm test` or separately with `npm run test:unit` and `npm run test:integration`.

The integration tests are hard-coded to hit the `http://localhost:18080`. In the future, this will be picked up from an environment variable and defaulted to that same url.

> **Warning:** Running the integration tests wipes out the entire `db.poet.works` collection and inserts testing data. This is done by the `test/integration/PrepareDB.ts` file. In the future, a less invasive mechanism will be developed. Meanwhile, make sure you're comfortable with this before running the integration tests!

Currently, Po.et Node is lacking some tests. The most critical paths that aren't being tested right now are:
- Broadcasting of transactions in a single Node (submit work, wait a bit, get work and expect transactionId to be set and valid)
- Replication across nodes (submit WORK to Node A, get WORK in Node B)

See issues [#21][i21], [#22][i22], [#25][i25] and [#27][i27] for more info on this topic.

### Coverage
Coverage is generated with [Istanbul](https://github.com/istanbuljs/nyc).
A more complete report can be generated by running `npm run coverage`, this command will run the `npm run coverage:unit` and `npm run coverage:integration` together. Also you will be able to execute these commands separately.

Coverage for unit test

`npm run coverage:unit`

Coverage for integration test

`npm run coverage:integration`

> Note: we're using our own forks of [nyc](https://github.com/istanbuljs/nyc) and [istanbul-lib-instrument](https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-lib-instrument) that add better support for TypeScript. We intend to contribute our forks back to nyc and istanbul-lib-instrument in order to make our solution available for all the community.
You can follow the issues in this [PR](https://github.com/poetapp/node/pull/230), and check the new PRs for [istanbul-lib-instrument](https://github.com/istanbuljs/istanbuljs/pull/204)


### Branches and Pull Requests
The master branch is blocked - no one can commit to it directly. To contribute changes, branch off from master and make a PR back to it.

TravisCI will run all tests automatically for all pull requests submitted.

### Code Style
Please run `npm run lint`. The linting configuration still needs some tweaking, and it'll be added to Travis in the future.
