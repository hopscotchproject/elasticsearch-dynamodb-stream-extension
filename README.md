# elasticsearch-dynamodb-stream-extension
Library facilitate sync-ing dynamodb stream records into elasticsearch


## Client Extension

All extension will be extended as `ddbStream.<extension function name>`

```typescript
import { Client } from '@elastic/elasticsearch';
import { extendClient } from 'elasticsearch-dynamodb-stream-extension';

const client = new Client({ node: 'http://localhost:9200' });

const extendedClient = extendClient(client, {
  keyGen: record => record.dynamodb.Keys.id.S,
  index: () => 'test'
});

const fakeRecord = {...}

extendedClient.ddbStream.handleRecord(fakeRecord)
  .then(console.log)
  .catch(console.error)

```
## Extension config
```typescript
export interface ExtensionConfiguration {
  /**
   * genereate id, by default it hashes unmarshalled 'record.dynamodb.Keys'
   */
  keyGen?: (record: Record) => string,

  /**
   * specify which index to sync the record to
   */
  index: (record: Record) => string
}
```

## Extension Functions

### `ddbStream.validateRecord(r: Record) => void`

Validate a single record, throw error when record misses new image

### `ddbStream.handleRecord(r: Record) => Promise // same promise es js client returns`

Handle sync-ing one single record

`INSERT` and `MODIFY` event corresponds to [creating/overwriting a document](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-index_.html)

`REMOVE` event means [deleting the document](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-delete.html)
