import { collect } from 'streaming-iterables'
import { DDBClient } from './DDBClient'
import { describe, test, beforeEach, afterEach } from 'node:test'
import { startDevDB } from './startDevDB'
import assert, { deepStrictEqual, rejects } from 'node:assert'

let dbInfo: Awaited<ReturnType<typeof startDevDB>>
let ddbClient: DDBClient

beforeEach(async () => {
  dbInfo = await startDevDB()
  dbInfo.server.on('error', console.error)
  ddbClient = new DDBClient({ tableName: dbInfo.tableName, ddbClient: dbInfo.ddbClient })
})

afterEach(async () => {
  await dbInfo.close()
})

describe('DDB', () => {
  describe('put', () => {
    test('puts an object and returns it', async () => {
      const item = { pk: 'Widget#5', sk: 'Widget#5', ttl: 5 }
      deepStrictEqual(await ddbClient.put(item), item)
    })
  })

  describe('get', () => {
    test('gets an item by id', async () => {
      const item = { pk: 'Widget#5', sk: 'Widget#5', ttl: 5 }
      await ddbClient.put(item)
      deepStrictEqual(await ddbClient.get(item), item)
    })
    test('gets null if no item', async () => {
      deepStrictEqual(await ddbClient.get({ sk: 'asd', pk: 'asdf' }), null)
    })
  })

  describe('delete', () => {
    test('deletes an object', async () => {
      const item = { pk: 'Widget#5', sk: 'Widget#5', ttl: 5 }
      await ddbClient.put(item)
      deepStrictEqual(await ddbClient.delete(item), item)
      deepStrictEqual(await ddbClient.get(item), null)
    })

    test('returns null when deleting nothing', async () => {
      deepStrictEqual(await ddbClient.delete({ pk: '4', sk: '4' }), null)
    })
  })

  describe('query', () => {
    test('queries', async () => {
      let count = 0
      const items = await Promise.all([
        ddbClient.put({ pk: 'Item', sk: `${count++}` }),
        ddbClient.put({ pk: 'Item', sk: `${count++}` }),
        ddbClient.put({ pk: 'Item', sk: `${count++}` }),
        ddbClient.put({ pk: 'Item', sk: `${count++}` }),
        ddbClient.put({ pk: 'Item', sk: `${count++}` }),
      ])

      const results = ddbClient.query({
        KeyConditions: {
          pk: {
            AttributeValueList: ['Item'],
            ComparisonOperator: 'EQ',
          },
        },
      })
      deepStrictEqual(await collect(results), items)
    })
  })
  describe('subscribe', () => {
    test('subscribes', async () => {
      const connectionId = 'asdf'
      const channel = '234'
      await ddbClient.subscribe({ connectionId, channel })
      deepStrictEqual(
        await collect(ddbClient.itrSubscriptionsByChannel(channel)),
        [{ channel, connectionId, ttl: Math.floor(Date.now() / 1000) + (130 * 60) }],
      )
    })
  })
  describe('unsubscribe', () => {
    test('unsubscribes', async () => {
      const connectionId = 'asdf'
      const channel = '234'
      await ddbClient.subscribe({ connectionId, channel })
      await ddbClient.unsubscribe({ connectionId, channel })
      deepStrictEqual(
        await collect(ddbClient.itrSubscriptionsByChannel(channel)),
        [],
      )
    })
  })
  describe('disconnect', () => {
    test('disconnects', async () => {
      const connectionId = 'asdf'
      const channel = '234'
      await ddbClient.subscribe({ connectionId, channel })
      await ddbClient.disconnect(connectionId)
      deepStrictEqual(
        await collect(ddbClient.itrSubscriptionsByChannel(channel)),
        [],
      )
    })
  })
  describe('setMetadata', () => {
    test('sets metadata', async () => {
      const connectionId = 'asdf'
      const metadata = { foo: 'bar' }
      await ddbClient.setMetadata({ connectionId, metadata })
      deepStrictEqual(
        await ddbClient.getMetadata(connectionId),
        metadata,
      )
    })
    test('sets metadata to null', async () => {
      const connectionId = 'asdf'
      const metadata = null
      await ddbClient.setMetadata({ connectionId, metadata })
      deepStrictEqual(
        await ddbClient.getMetadata(connectionId),
        metadata,
      )
    })
    test('deletes metadata on disconnect', async () => {
      const connectionId = 'asdf'
      const metadata = { foo: 'bar' }
      await ddbClient.setMetadata({ connectionId, metadata })
      await ddbClient.disconnect(connectionId)
      deepStrictEqual(
        await ddbClient.getMetadata(connectionId),
        null,
      )
    })
  })
})
