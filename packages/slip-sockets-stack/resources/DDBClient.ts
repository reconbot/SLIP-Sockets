import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument, QueryCommandInput } from '@aws-sdk/lib-dynamodb'
import { JsonValue } from 'slip-sockets'
import { consume, map, pipeline, transform } from 'streaming-iterables'

type Connection = {
  connectionId: string
  meta?: string
  ttl: number
}

type Subscription = {
  connectionId: string
  channel: string
  ttl: number
}

interface DDBRowWithoutIndex extends Record<string, string | number> {
  pk: string
  sk: string
}
interface DDBRowWithIndex extends Record<string, string | number> {
  pk: string
  sk: string
  gsi1pk: string
  gsi1sk: string
}

type DDBRow = DDBRowWithoutIndex | DDBRowWithIndex

const tableMeta = {
  // connection metadata
  Connection: {
    guidAttribute: 'pk',
    pk: 'connectionId',
    sk: 'connectionId',
    encodeKeys({ connectionId }: Pick<Connection, 'connectionId'>): { pk: string, sk: string } {
      return {
        pk: `Connection#${connectionId}`,
        sk: `Connection#${connectionId}`,
      }
    },
    parse(row: DDBRow): Connection {
      const { pk, sk: _, ...obj } = row
      const [, connectionId] = pk.split('#')
      return {
        connectionId,
        ...obj,
      } as Connection
    },
    encode({ connectionId, meta, ttl }: Connection): DDBRow {
      return {
        ...this.encodeKeys({ connectionId }),
        ...meta ? { meta } : {},
        ttl,
      }
    },
    instanceOf(row: DDBRow) {
      return row.sk.startsWith('Connection#')
    },
  },
  Subscription: {
    pk: 'connectionId',
    sk: 'channel',
    gsi1pk: 'channel',
    gsi1sk: 'connectionId',
    parse(row: DDBRow): Subscription {
      const { pk, sk, ttl } = row
      const [, connectionId] = pk.split('#')
      const [, channel] = sk.split('#')
      return {
        connectionId,
        channel,
        ttl,
      } as Subscription
    },
    encodeKeys({ connectionId, channel }: Pick<Subscription, 'channel' | 'connectionId'>): { pk: string, sk: string } {
      return {
        pk: `Connection#${connectionId}`,
        sk: `Subscription#${channel}`,
      }
    },
    encode({ connectionId, channel, ttl }: Subscription): DDBRowWithIndex {
      return {
        ...this.encodeKeys({ connectionId, channel }),
        gsi1pk: `Subscription#${channel}`,
        gsi1sk: `Connection#${connectionId}`,
        ttl,
      }
    },
    instanceOf(row: DDBRow) {
      return row.sk.startsWith('Subscription#')
    },
  },
}

export class DDBClient {
  client: DynamoDBClient
  ddbDocClient: DynamoDBDocument
  tableName: string

  constructor({ tableName, ddbClient }: { tableName: string, ddbClient?: DynamoDBClient }) {
    this.client = ddbClient ?? new DynamoDBClient({})
    this.ddbDocClient = DynamoDBDocument.from(this.client)
    this.tableName = tableName
  }

  async put(item: DDBRow) {
    await this.ddbDocClient.put({
      TableName: this.tableName,
      Item: item,
    })
    return item
  }

  async get({ pk, sk }: { pk: string, sk: string }): Promise<DDBRow | null> {
    try {
      const { Item } = await this.ddbDocClient.get({
        TableName: this.tableName,
        Key: { pk, sk },
      })
      return Item as DDBRow ?? null
    } catch (e) {
      if (e.name === 'ResourceNotFoundException') {
        return null
      }
      throw e
    }
  }

  async delete({ pk, sk }: { pk: string, sk: string }) {
    const { Attributes } = await this.ddbDocClient.delete({
      TableName: this.tableName,
      Key: { pk, sk },
      ReturnValues: 'ALL_OLD',
    })

    if (!Attributes) {
      return null
    }

    return Attributes as DDBRow
  }

  async queryOnce<T extends DDBRow>(options: Omit<QueryCommandInput, 'TableName'>) {
    const response = await this.ddbDocClient.query({
      Select: 'ALL_ATTRIBUTES',
      TableName: this.tableName,
      ...options,
    })

    const { Items, LastEvaluatedKey, Count } = response
    return {
      items: (Items ?? []) as T[],
      lastEvaluatedKey: LastEvaluatedKey,
      count: Count ?? 0,
    }
  }

  async *query<T extends DDBRow>(options: Omit<QueryCommandInput, 'TableName'>) {
    const results = await this.queryOnce(options)
    yield* results.items
    let lastEvaluatedKey = results.lastEvaluatedKey
    while (lastEvaluatedKey) {
      const results = await this.queryOnce<T>({ ...options, ExclusiveStartKey: lastEvaluatedKey })
      yield* results.items
      lastEvaluatedKey = results.lastEvaluatedKey
    }
  }

  async subscribe({ connectionId, channel }: { connectionId: string, channel: string }) {
    // upsert a connection's channel and ttl
    await this.put(tableMeta.Subscription.encode({
      connectionId,
      channel,
      ttl: Math.floor(Date.now() / 1000) + (130 * 60), // 2 hours connection limit + 10 minute latency buffer
    }))
  }

  async unsubscribe({ connectionId, channel }: { connectionId: string, channel: string }) {
    await this.delete(tableMeta.Subscription.encodeKeys({
      connectionId,
      channel,
    }))
  }

  async disconnect(connectionId: string) {
    await pipeline(
      () => this.query({
        KeyConditions: {
          pk: {
            AttributeValueList: [`Connection#${connectionId}`],
            ComparisonOperator: 'EQ',
          },
        },
      }),
      transform(10, i => this.delete(i)),
      consume,
    )
  }

  async setMetadata({ connectionId, metadata }: { connectionId: string, metadata: JsonValue }) {
    const connection = await this.get(tableMeta.Connection.encodeKeys({ connectionId }))
    const ttl = connection?.ttl as number || Math.floor(Date.now() / 1000) + (130 * 60) // 2 hours connection limit + 10 minute latency buffer
    await this.put(tableMeta.Connection.encode({
      connectionId,
      ...metadata === null ? {} : { meta: JSON.stringify(metadata) },
      ttl,
    }))
  }

  async getMetadata(connectionId: string): Promise<JsonValue | null> {
    const connection = await this.get(tableMeta.Connection.encodeKeys({ connectionId }))
    if (!connection) {
      return null
    }
    const { meta } = tableMeta.Connection.parse(connection)
    return meta ? JSON.parse(meta) : null
  }

  itrSubscriptionsByChannel(channel: string) {
    return pipeline(
      () => this.query({
        IndexName: 'gsi1',
        KeyConditions: {
          gsi1pk: {
            AttributeValueList: [`Subscription#${channel}`],
            ComparisonOperator: 'EQ',
          },
        },
      }),
      map(tableMeta.Subscription.parse),
    )
  }
}
