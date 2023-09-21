import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument, QueryCommandInput } from '@aws-sdk/lib-dynamodb'
import { Connection, JsonValue } from 'slip-sockets/lib/types'
import { consume, pipeline, transform } from 'streaming-iterables'

export class DDBClient<T extends Connection = Connection> {
  client: DynamoDBClient
  ddbDocClient: DynamoDBDocument
  ddbTable: string

  constructor(ddbTable: string) {
    this.client = new DynamoDBClient({})
    this.ddbDocClient = DynamoDBDocument.from(this.client)
    this.ddbTable = ddbTable
  }

  async queryOnce(options: QueryCommandInput) {
    const response = await this.ddbDocClient.query({
      Select: 'ALL_ATTRIBUTES',
      ...options,
    })

    const { Items, LastEvaluatedKey, Count } = response
    return {
      items: (Items ?? []) as T[],
      lastEvaluatedKey: LastEvaluatedKey,
      count: Count ?? 0,
    }
  }

  async *query(options: QueryCommandInput) {
    const results = await this.queryOnce(options)
    yield* results.items
    let lastEvaluatedKey = results.lastEvaluatedKey
    while (lastEvaluatedKey) {
      const results = await this.queryOnce({ ...options, ExclusiveStartKey: lastEvaluatedKey })
      yield* results.items
      lastEvaluatedKey = results.lastEvaluatedKey
    }
  }

  async subscribe({ connectionId, channel } : { connectionId: string, channel: string}) {
    // upsert a connection's channel and ttl
    await this.ddbDocClient.put({
      TableName: this.ddbTable,
      Item: {
        connectionId,
        channel,
        ttl: Math.floor(Date.now() / 1000) + (2 * 62 * 60), // 2 hours connection limit + 2 minute latency allowance
      },
    })
  }

  async unsubscribe({ connectionId, channel } : { connectionId: string, channel: string }) {
    await this.ddbDocClient.delete({
      TableName: this.ddbTable,
      Key: {
        connectionId: connectionId,
        channel: channel,
      },
    })
  }

  async disconnect(connectionId: string) {
    await pipeline(
      () => this.query({
        TableName: this.ddbTable,
        KeyConditions: {
          connectionId: {
            AttributeValueList: [connectionId],
            ComparisonOperator: 'EQ',
          },
        },
      }),
      transform(10, this.unsubscribe),
      consume,
    )
  }

  async setMetadata({ connectionId, metadata }: { connectionId: string, metadata: JsonValue }): Promise<JsonValue> {
    throw new Error('not implemented')
    if (metadata === null) {
      // delete the metadata
      return null
    }
  }

  async getMetadata(connectionId: string): Promise<JsonValue | null> {
    throw new Error('not implemented')
  }

  itrConnectionsByChannel(channel: string) {
    return this.query({
      TableName: this.ddbTable,
      IndexName: 'byChannel',
      KeyConditions: {
        channel: {
          AttributeValueList: [channel],
          ComparisonOperator: 'EQ',
        },
      },
    })
  }
}
