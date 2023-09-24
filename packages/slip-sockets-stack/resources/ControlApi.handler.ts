import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { APIGWebSocketController } from './APIGWebSocketController'
import { processControlEvent } from './processControlEvent'
import { ControlEvent, JWT } from 'slip-sockets'
import { DDBClient } from './DDBClient'
import { parseBody } from './parseBody'
import { ControlEventRequestDataSchema } from 'slip-sockets/lib/types'
import { ControlAPIInvokeEvent } from './types'

const CALLBACK_URL = process.env.CALLBACK_URL
if (!CALLBACK_URL) {
  throw new Error('CALLBACK_URL is undefined')
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
const wsClient = new APIGWebSocketController({ callbackUrl: CALLBACK_URL })
const ddbClient = new DDBClient({ tableName: DDB_CONNECTIONS_TABLE })

const processEvents = async (events: ControlEvent[]) => {
  for (const event of events) {
    await processControlEvent({ ddbClient, wsClient, event })
  }
}

export const handler = async (event: APIGatewayProxyEventV2 | ControlAPIInvokeEvent): Promise<APIGatewayProxyResultV2> => {
  if ('type' in event) {
    console.log('websocket enqueue')
    await processEvents(event.events)
    return {
      statusCode: 200,
    }
  }
  if (!jwt.verifyAuthTokenFromHeader(event.headers.authorization || event.headers.Authorization, 'ControlEvent')) {
    return {
      statusCode: 403,
      body: 'Invalid token',
    }
  }
  const body = parseBody(event)
  const results = ControlEventRequestDataSchema.safeParse(body)
  if (!results.success) {
    console.error({ body, error: results.error })
    return {
      statusCode: 400,
      body: '{"message": "invalid commands"}',
    }
  }

  await processEvents(results.data.events)

  return {
    statusCode: 200,
    body: '{"message": "processed successfully"}',
  }
}
