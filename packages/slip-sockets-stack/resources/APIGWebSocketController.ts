import { ApiGatewayManagementApiClient, DeleteConnectionCommand, GetConnectionCommand, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi'
import { setTimeout } from 'timers/promises'

export class APIGWebSocketController {
  client: ApiGatewayManagementApiClient

  constructor({ callbackUrl, client }: { callbackUrl: string, client?: undefined } | { callbackUrl?: undefined, client: ApiGatewayManagementApiClient }) {
    this.client = client ?? new ApiGatewayManagementApiClient({ endpoint: callbackUrl })
  }

  async send(connectionId: string, data: string) {
    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: data,
    })

    await this.client.send(command)
  }

  async disconnect(connectionId: string) {
    const command = new DeleteConnectionCommand({
      ConnectionId: connectionId,
    })
    await this.client.send(command)
  }

  async info(connectionId: string) {
    const command = new GetConnectionCommand({
      ConnectionId: connectionId,
    })
    return this.client.send(command)
  }

  async pollForConnection(connectionId: string, timeout: number) {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      try {
        return this.info(connectionId)
      } catch (err) {
        if (err.name !== 'GoneException') {
          throw err
        }
        await setTimeout(100)
      }
    }
    return null
  }
}

export const ignoreDisconnected = (err: Error) => {
  if (err.name !== 'GoneException') {
    throw err
  }
}
