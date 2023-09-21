import type { APIGatewayProxyWebsocketEventV2, APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda'
import { JWT, ControlEvent, EventRequestData, EventResponseDataSchema, FromSlipServer, WebSocketOpenEventResponse, SetMetaDataEvent } from 'slip-sockets'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { processControlEvent } from './commands'
import { APIGWebSocketController } from './APIGWebSocketController'
import { assertUnreachable } from './assertUnreachable'
import { DDBClient } from './DDBClient'
import { ControlAPIInvokeEvent } from './types'

const { CALLBACK_URL, TARGET_URL, JWT_SECRET, DDB_CONNECTIONS_TABLE, CONTROL_LAMBDA_ARN } = process.env
if (!CALLBACK_URL) {
  throw new Error('CALLBACK_URL is undefined')
}

if (!TARGET_URL) {
  throw new Error('TARGET_URL is undefined')
}

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is undefined')
}

if (!DDB_CONNECTIONS_TABLE) {
  throw new Error('DDB_CONNECTIONS_TABLE is undefined')
}

if (!CONTROL_LAMBDA_ARN) {
  throw new Error('CONTROL_LAMBDA_ARN is undefined')
}

const jwt = new JWT({ jwtSecret: JWT_SECRET })
const wsClient = new APIGWebSocketController(CALLBACK_URL)
const ddbClient = new DDBClient(DDB_CONNECTIONS_TABLE)
const lambdaClient = new LambdaClient()

const invokeControlLambdaAsync = async (events: ControlEvent[]) => {
  const payload: ControlAPIInvokeEvent = {
    type: 'EnqueueEvents',
    events,
  }

  await lambdaClient.send(new InvokeCommand({
    InvocationType: 'Event',
    FunctionName: CONTROL_LAMBDA_ARN,
    Payload: JSON.stringify(payload),
  }))
}


const buildEvent = (event: APIGatewayProxyWebsocketEventV2): FromSlipServer => {
  const { eventType, connectionId } = event.requestContext
  const { body } = event as unknown as { body?: string }
  if (eventType === 'CONNECT') {
    return {
      type: 'OPEN',
      connectionId,
    }
  }
  if (eventType === 'DISCONNECT') {
    return {
      type: 'CLOSE',
      connectionId,
    }
  }
  if (eventType === 'MESSAGE') {
    return {
      type: 'TEXT',
      connectionId,
      data: body || '',
    }
  }
  return assertUnreachable(eventType)
}

const fetchOrBuildMetadata = async (event: APIGatewayProxyWebsocketEventV2, ddb: DDBClient) => {
  const { eventType, connectionId } = event.requestContext

  if (eventType !== 'CONNECT') {
    return ddb.getMetadata(connectionId)
  }

  const { headers } = event as unknown as { body?: string, headers: Record<string, string> }
  const { identity: { sourceId } } = event.requestContext as unknown as { identity: { sourceId: string } }

  return { headers, ip: sourceId }
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const { connectionId } = event.requestContext
  const token = jwt.generateToken({ audience: 'WebSocketEvent', expiresIn: '1m' })
  const wsEvent = buildEvent(event)
  const metadata = await fetchOrBuildMetadata(event, ddbClient)
  const wsRequest: EventRequestData = {
    connectionId,
    metadata,
    events: [wsEvent],
  }

  if (event.requestContext.eventType === 'DISCONNECT') {
    // TODO cleanup ddb
  }

  const response = await fetch(TARGET_URL, {
    method: 'POST',
    body: JSON.stringify(wsRequest),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/websocket-events',
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

  const results = EventResponseDataSchema.safeParse(body)
  if (!results.success) {
    console.error({ body, error: results.error })
    return {
      statusCode: 400,
      body: '{"message": "invalid commands"}',
    }
  }

  // if the state of the websocket is opening we want to process the ACCEPT event and SET_METADATA events
  // then async process the rest of the events once the socket is open
  // this allows for an ordered of events that makes sense to the developer

  if (event.requestContext.eventType !== 'CONNECT') {
    const controlPlaneBackendEvents = results.data.events.filter(event => event.type !== 'ACCEPT') as ControlEvent[]

    for (const event of controlPlaneBackendEvents) {
      // TODO how does this even work? Can I do this before this function returns?
      await processControlEvent({ ddbClient, wsClient, event })
    }
    return {
      statusCode: 200,
    }
  }

  const openEvents: WebSocketOpenEventResponse[] = []
  const controlEvents: ControlEvent[] = []

  for (const event of results.data.events) {
    if (event.type === 'ACCEPT') {
      openEvents.push(event)
      continue
    }
    if (event.type == 'SET_METADATA' && event.connectionId === connectionId) {
      openEvents.push(event)
      continue
    }
    controlEvents.push(event)
  }

  // the first returned event should be "ACCEPT" if it's not disconnect
  const accept = openEvents.shift()
  if (accept?.type !== 'ACCEPT' ) {
    return { statusCode: 400 }
  }

  // the last SET_METADATA event if any exist should get saved to the db
  const lastMetadataEvent = openEvents.filter(event => event.type === 'SET_METADATA').pop() as SetMetaDataEvent | undefined
  if (lastMetadataEvent) {
    await processControlEvent({ ddbClient, wsClient, event: lastMetadataEvent })
  } else {
    await ddbClient.setMetadata({ connectionId, metadata })
  }

  if (controlEvents.length > 0) {
    controlEvents.unshift({
      type: 'POLL_FOR_CONNECTION',
      connectionId,
      timeout: 1000,
    })
    console.log({ invoking: controlEvents })
    await invokeControlLambdaAsync(controlEvents)
  }
  return { statusCode: 200 }
}
