import { consume, pipeline, transform } from 'streaming-iterables'
import { ControlPlaneEvent, FromBackend } from './types'
import { assertUnreachable } from './utils'
import { DDBClient } from './DDBClient'
import { APIGWebSocketController, ignoreDisconnected } from './APIGWebSocketController'

export function parseControlPlaneCommands(body: string | undefined): ControlPlaneEvent[] | null {
  if (!body) {
    return null
  }
  let data
  try {
    data = JSON.parse(body)
  } catch (error) {
    console.error({ error, body })
    return null
  }
  if (!Array.isArray(data)) {
    return null
  }

  for (const command of data as ControlPlaneEvent[]) {
    const { target, event } = command
    if (!target) {
      return null
    }
    if (event.type === 'TEXT') {
      if (typeof event.data !== 'string') {
        return null
      }
      continue
    }
    if (event.type === 'DISCONNECT') {
      continue
    }
    if (event.type === 'SUBSCRIBE') {
      if (!event.target) {
        return null
      }
      continue
    }
    if (event.type === 'UNSUBSCRIBE') {
      if (!event.target) {
        return null
      }
      continue
    }
    assertUnreachable(event)
  }

  return data as ControlPlaneEvent[]
}

export function parseBackendEvents(body: string | undefined): FromBackend[] | null {
  if (!body) {
    return null
  }
  let data
  try {
    data = JSON.parse(body)
  } catch (error) {
    return null
  }
  if (!Array.isArray(data)) {
    return null
  }

  for (const event of data as FromBackend[]) {
    if (event.type === 'ACCEPT') {
      continue
    }
    if (event.type === 'TEXT') {
      if (typeof event.data !== 'string') {
        return null
      }
      continue
    }
    if (event.type === 'DISCONNECT') {
      continue
    }
    if (event.type === 'SUBSCRIBE') {
      if (!event.target) {
        return null
      }
      continue
    }
    if (event.type === 'UNSUBSCRIBE') {
      if (!event.target) {
        return null
      }
      continue
    }
    assertUnreachable(event)
  }

  return data as FromBackend[]
}

export const processCommand = async ({ ddbClient, wsClient, command }: { ddbClient: DDBClient, wsClient: APIGWebSocketController; command: ControlPlaneEvent; }) => {
  const { target, event } = command
  if (event.type === 'TEXT') {
    await pipeline(
      () => ddbClient.itrConnectionsByChannel(target),
      transform(10, connection => wsClient.send(connection.connectionId, event.data).catch(ignoreDisconnected)),
      consume,
    )
    return
  }
  if (event.type === 'DISCONNECT') {
    await Promise.all([
      wsClient.disconnect(target).catch(ignoreDisconnected),
      ddbClient.disconnect(target),
    ])
    return
  }
  if (event.type === 'SUBSCRIBE') {
    await ddbClient.subscribe({ connectionId: target, channel: event.target })
    return
  }
  if (event.type === 'UNSUBSCRIBE') {
    await ddbClient.unsubscribe({ connectionId: target, channel: event.target })
    return
  }
  assertUnreachable(event)
}
