import { Client } from '@elastic/elasticsearch'
import { Record } from 'aws-sdk/clients/dynamodbstreams'
import { Converter } from 'aws-sdk/clients/dynamodb'
const hash = require('object-hash')

/**
 * Extension config
 */
export interface ExtensionConfiguration {
  /**
   * genereate id
   */
  keyGen?: (record: Record) => string,

  /**
   * specify which index to sync the record to
   */
  index: (record: Record) => string
}

/**
 * Extended ES Client
 */
export interface ExtendedClient extends Client {
  ddbStream: {
    validateRecord: typeof validateRecord,
    handleRecord: typeof handleRecord,
  }
}

/**
 * Default extension config
 * 
 */
export const DEFAULT_EXTENSION_CONFIG: Partial<ExtensionConfiguration> = {
  /**
   * default keyGen function hash unmarshalled keys
   */
  keyGen: record => hash(Converter.unmarshall(record.dynamodb.Keys))
}

/**
 * 
 * Validate a record to make sure new image will always be there
 * 
 * @param record
 */
export const validateRecord = (record: Record): void => {
  if (!record.dynamodb.StreamViewType.includes('NEW')) {
    throw new Error('DynamoDB stream records have to have new image');
  }
}

/**
 * 
 * Handle one single dynamodb stream record
 * 
 * 'REMOVE' => https://www.elastic.co/guide/en/elasticsearch/reference/7.x/docs-delete.html
 * 'INSERVE'/`MODIFY` => https://www.elastic.co/guide/en/elasticsearch/reference/7.x/docs-index_.html
 * 
 * @param record 
 */
export async function handleRecord(record: Record): Promise<any | void> {
  validateRecord(record);

  if (record.eventName === 'REMOVE') {
    return this.client.delete({
      id: this.mergedConfig.keyGen(record),
      index: this.mergedConfig.index(record)
    })
  } else {
    return this.client.index({
      id: this.mergedConfig.keyGen(record),
      index: this.mergedConfig.index(record),
      body: Converter.unmarshall(record.dynamodb.NewImage)
    })
  }
}

export const extendClient = (client: Client, config: ExtensionConfiguration): ExtendedClient => {
  const mergedConfig: ExtensionConfiguration = Object.assign(DEFAULT_EXTENSION_CONFIG, config)
  const context = {
    client,
    mergedConfig
  }
  client.extend('ddbStream.validateRecord', () => validateRecord);

  client.extend('ddbStream.handleRecord', () => handleRecord.bind(context))

  return <ExtendedClient>client;
}

