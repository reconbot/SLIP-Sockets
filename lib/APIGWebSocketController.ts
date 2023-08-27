import { ApiGatewayManagementApiClient, DeleteConnectionCommand, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi'

export class APIGWebSocketController {
  client: ApiGatewayManagementApiClient

  constructor(callbackUrl: string) {
    this.client = new ApiGatewayManagementApiClient({ endpoint: callbackUrl })
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
}

export const ignoreDisconnected = (err: Error) => {
  if (err.name !== 'GoneException') {
    throw err
  }
}
