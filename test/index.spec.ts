import 'mocha';
import { expect } from 'chai';
import { Client } from '@elastic/elasticsearch'
import { Record, AttributeMap, OperationType } from 'aws-sdk/clients/dynamodbstreams'
import { extendClient } from '../src/index'
require('dotenv').config()

const {
  ES_DOMAIN
} = process.env 

const generateRecord = (eventName: OperationType, id: string, newImage?: AttributeMap): Record => ({
  "eventID": "fake-event-id",
  "eventName": eventName,
  "eventVersion": "fake-version",
  "eventSource": "aws:dynamodb",
  "awsRegion": "fake-region",
  "dynamodb": {
    "Keys": {
      "id": {
        "S": id
      }
    },
    "NewImage": newImage,
    "SequenceNumber": "fake-seq-number",
    "SizeBytes": 42,
    "StreamViewType": "NEW_IMAGE"
  },
})


describe('An integration test suite', () => {
  const extendedClient = extendClient(new Client({
    node: ES_DOMAIN
  }), {
    keyGen: record => record.dynamodb.Keys.id.S,
    index: () => 'test-index'
  });

  before(async () => await extendedClient.indices.create({
    index: 'test-index'
  }))

  after(async () => await extendedClient.indices.delete({
    index: 'test-index'
  }))

  it('should create the document with correct id', async () => {
    await extendedClient.ddbStream.handleRecord(generateRecord('INSERT', 'test-id-0', {
      id: { S: 'test-id-0' },
      key: { S: 'value-0' }
    }));
    const {
      body: {
        _source
      }
    } = await extendedClient.get({
      index: 'test-index',
      id: 'test-id-0'
    })
    expect(_source).to.deep.equal({
      id: 'test-id-0',
      key: 'value-0'
    })
  });

  it('should update the item', async () => {
    await extendedClient.ddbStream.handleRecord(generateRecord('MODIFY', 'test-id-0', {
      id: { S: 'test-id-0' },
      key: { S: 'value-1' }
    }));

    const {
      body: {
        _source
      }
    } = await extendedClient.get({
      index: 'test-index',
      id: 'test-id-0'
    })
    expect(_source).to.deep.equal({
      id: 'test-id-0',
      key: 'value-1'
    })
  });

  it('should delete the item', async () => {
    await extendedClient.ddbStream.handleRecord(generateRecord('REMOVE', 'test-id-0'));
    const {
      body: { found }
    } = await extendedClient.get({
      index: 'test-index',
      id: 'test-id-0'
    }, {
      ignore: [404]
    })    
    expect(found).to.be.false;
  });
})