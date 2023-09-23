import { consume, pipeline, transform } from 'streaming-iterables'
import { ControlEvent, JsonValue } from 'slip-sockets/lib/types'
import { assertUnreachable } from './assertUnreachable'
import { DDBClient } from './DDBClient'
import { APIGWebSocketController, ignoreDisconnected } from './APIGWebSocketController'

export const processControlEvent = async ({ ddbClient, wsClient, event }: { ddbClient: DDBClient, wsClient: APIGWebSocketController; event: ControlEvent }) => {
  if (event.type === 'PUBLISH_TEXT') {
    await pipeline(
      () => ddbClient.itrSubscriptionsByChannel(event.channelId),
      transform(10, connection => wsClient.send(connection.connectionId, event.data).catch(ignoreDisconnected)),
      consume,
    )
    return
  }

  if (event.type === 'CLOSE_CHANNEL') {
    await pipeline(
      () => ddbClient.itrSubscriptionsByChannel(event.channelId),
      transform(10, connection => wsClient.disconnect(connection.connectionId).catch(ignoreDisconnected)),
      consume,
    )
    return
  }

  if (event.type === 'TEXT') {
    await wsClient.send(event.connectionId, event.data).catch(ignoreDisconnected)
    return
  }

  if (event.type === 'CLOSE') {
    await Promise.all([
      wsClient.disconnect(event.connectionId).catch(ignoreDisconnected),
      ddbClient.disconnect(event.connectionId),
    ])
    return
  }

  if (event.type === 'SUBSCRIBE') {
    await ddbClient.subscribe({ connectionId: event.connectionId, channel: event.channel })
    return
  }

  if (event.type === 'UNSUBSCRIBE') {
    await ddbClient.unsubscribe({ connectionId: event.connectionId, channel: event.channel })
    return
  }

  if (event.type === 'SET_METADATA') {
    await ddbClient.setMetadata({ connectionId: event.connectionId, metadata: event.metadata as JsonValue })
    return
  }

  if (event.type === 'POLL_FOR_CONNECTION') {
    const info = await wsClient.pollForConnection(event.connectionId, event.timeout)
    console.log({ POLL_FOR_CONNECTION: info })
    return
  }

  assertUnreachable(event)
}
