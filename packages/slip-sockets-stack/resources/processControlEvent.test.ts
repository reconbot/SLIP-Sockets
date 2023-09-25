/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, beforeEach, afterEach, mock } from 'node:test'
import { deepStrictEqual, ok } from 'node:assert'
import { processControlEvent } from './processControlEvent'
import { DDBClient } from './DDBClient'
import { startDevDB } from './startDevDB'
import { APIGWebSocketController } from './APIGWebSocketController'
import { ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi'

let dbInfo: Awaited<ReturnType<typeof startDevDB>>
let ddbClient: DDBClient
let wsClient: APIGWebSocketController

describe('processControlEvent', () => {
  beforeEach(async () => {
    dbInfo = await startDevDB()
    dbInfo.server.on('error', console.error)
    ddbClient = new DDBClient({ tableName: dbInfo.tableName, ddbClient: dbInfo.ddbClient })
    wsClient = new APIGWebSocketController({ client: new ApiGatewayManagementApiClient() })
    mock.method(wsClient.client, 'send', () => Promise.resolve())
  })

  afterEach(async () => {
    mock.reset()
    await dbInfo.close()
  })

  test('processes a CLOSE event', async () => {
    mock.method(wsClient, 'send', () => Promise.resolve())
    const channelId = '123'
    await ddbClient.subscribe({ connectionId: '1', channel: channelId })
    await ddbClient.subscribe({ connectionId: '2', channel: channelId })
    await processControlEvent({
      ddbClient,
      wsClient,
      event: {
        type: 'PUBLISH_TEXT',
        channelId,
        data: 'foo',
      },
    })
    ok((wsClient.send as any).mock.calls.length === 2)
    deepStrictEqual((wsClient.send as any).mock.calls[0].arguments, ['1', 'foo'])
    deepStrictEqual((wsClient.send as any).mock.calls[1].arguments, ['2', 'foo'])
  })

  test('processes a CLOSE event', async () => {
    mock.method(wsClient, 'disconnect', () => Promise.resolve())
    mock.method(ddbClient, 'disconnect', () => Promise.resolve())
    const connectionId = '123'
    await processControlEvent({
      ddbClient,
      wsClient,
      event: {
        type: 'CLOSE',
        connectionId,
      },
    })
    ok((wsClient.disconnect as any).mock.calls.length === 1)
    ok((ddbClient.disconnect as any).mock.calls.length === 1)
  })

  test('processes a SET_METADATA event', async () => {
    mock.method(ddbClient, 'setMetadata', () => Promise.resolve())
    const connectionId = '123'

    await processControlEvent({
      ddbClient,
      wsClient,
      event: {
        type: 'SET_METADATA',
        connectionId,
        metadata: { foo: 'bar' },
      },
    })
    ok((ddbClient.setMetadata as any).mock.calls.length === 1)
  })

})
