import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { APIGWebSocketController } from './APIGWebSocketController'
import { parseControlPlaneCommands, processCommand } from './commands'
import { JWT } from 'slip-sockets'
import { DDBClient } from './DDBClient'
import { parseBody } from './parseBody'

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
const wsClient = new APIGWebSocketController(CALLBACK_URL)
const ddbClient = new DDBClient(DDB_CONNECTIONS_TABLE)

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (!jwt.verifyAuthTokenFromHeader(event.headers.authorization || event.headers.Authorization, 'ControlEvent')) {
    return {
      statusCode: 403,
      body: 'Invalid token',
    }
  }
  const body = parseBody(event)
  const commands = parseControlPlaneCommands(body)
  if (!commands) {
    console.error({ body, commands })
    return {
      statusCode: 400,
      body: '{"message": "invalid commands"}',
    }
  }

  for (const command of commands) {
    await processCommand({ ddbClient, wsClient, command })
  }

  return {
    statusCode: 200,
    body: '{"message": "processed successfully"}',
  }
}
