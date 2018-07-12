# View

## Flows

### Reader Flow

- timestamp event
- batch reader event, multiple file hashes from one directory hash
- storage reader, claim and ipfs hash combo

### Writing Flow

- new claim
- store claim, filsh hash and claim id
- batch wrtier, directory hash and file hash
- block chain writer, creates a tx id and directory hash
- Reader then reads block after tx has been added.