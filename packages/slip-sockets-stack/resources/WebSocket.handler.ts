import type { APIGatewayProxyWebsocketEventV2, APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda'
import { JWT, ControlPlaneBackendEvents, FromWebSocketServer } from 'slip-sockets'
import { parseBackendEvents, processCommand } from './commands'
import { APIGWebSocketController } from './APIGWebSocketController'
import { assertUnreachable } from './assertUnreachable'
import { DDBClient } from './DDBClient'

const CALLBACK_URL = process.env.CALLBACK_URL
if (!CALLBACK_URL) {
  throw new Error('CALLBACK_URL is undefined')
}

const TARGET_URL = process.env.TARGET_URL
if (!TARGET_URL) {
  throw new Error('TARGET_URL is undefined')
}

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is undefined')
}

const DDB_CONNECTIONS_TABLE = process.env.DDB_CONNECTIONS_TABLE
if (!DDB_CONNECTIONS_TABLE) {
  throw new Error('DDB_CONNECTIONS_TABLE is undefined')
}

const jwt = new JWT({ jwtSecret: JWT_SECRET })
const wsClient = new APIGWebSocketController(CALLBACK_URL)
const ddbClient = new DDBClient(DDB_CONNECTIONS_TABLE)

const buildEvent = (event: APIGatewayProxyWebsocketEventV2): FromWebSocketServer => {
  const { eventType } = event.requestContext
  const { body, headers } = event as unknown as { body?: string, headers: Record<string, string> }
  if (eventType === 'CONNECT') {
    return {
      type: 'OPEN',
      headers,
    }
  }
  if (eventType === 'DISCONNECT') {
    return {
      type: 'CLOSE',
    }
  }
  if (eventType === 'MESSAGE') {
    return {
      type: 'TEXT',
      data: body || '',
    }
  }
  return assertUnreachable(eventType)
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const { connectionId } = event.requestContext
  // const { identity: { sourceId } } = event.requestContext as any
  const token = jwt.generateToken({ audience: 'WebSocketEvent', expiresIn: '1m' })
  const wsEvent = buildEvent(event)
  console.log(JSON.stringify(event))
  console.log(JSON.stringify(wsEvent))
  const response = await fetch(TARGET_URL, {
    method: 'POST',
    body: JSON.stringify([wsEvent]),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/websocket-events',
      'x-connection-id': connectionId,
    },
  })
  if (!response.ok) {
    console.error({ message: 'Bad response from TARGET_URL', statusCode: response.status, statusText: response.statusText, body: await response.text()})
    return {
      statusCode: 500,
      body: 'Unhandled message',
    }
  }

  const body = await response.text()
  const events = parseBackendEvents(body)
  console.log({ events })
  if (!events) {
    return {
      statusCode: 400,
      body: '{"message": "invalid commands"}',
    }
  }

  // the first returned event should be "ACCEPT" if it's not disconnect
  if (event.requestContext.eventType === 'CONNECT') {
    const accept = events.shift()
    if (accept?.type !== 'ACCEPT') {
      return { statusCode: 400 }
    }
    if (events.find(event => event.type === 'DISCONNECT')) {
      return { statusCode: 406 }
    }
  }

  const controlPlaneBackendEvents = events.filter(event => event.type !== 'ACCEPT') as ControlPlaneBackendEvents[]

  for (const event of controlPlaneBackendEvents) {
    // how does this even work? Can I do this before this function returns?
    await processCommand({ ddbClient, wsClient, command: { event, target: connectionId } })
  }

  return { statusCode: 200 }
}
