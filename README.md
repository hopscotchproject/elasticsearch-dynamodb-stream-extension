# elasticsearch-dynamodb-stream-extension
Library facilitate sync-ing dynamodb stream into elasticsearch


## Client Extension

All extension will be extended as `ddbStream.<extension function name>`

```typescript
import { Client } from '@elastic/elasticsearch';
import { extendClient } from 'elasticsearch-dynamodb-stream-extension';

const client = new Client({ node: 'http://localhost:9200' });

const extendedClient = extendClient(client, {
  keyGen: record => record.dynamodb.Keys.id.S,
  index: () => 'test',
});

const fakeRecord = {...}

extendedClient.handleRecord(fakeRecord)
  .then(console.log)
  .catch(console.error)

```

### `ddbStream.validateRecord(r: Record) => void`
Validate a single record, throw error when record misses new image
