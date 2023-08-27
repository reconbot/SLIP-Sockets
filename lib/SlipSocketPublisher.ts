import { JWT } from './JWT'
import { ControlPlaneEvent } from './types'
import { parseWebSocketEvents } from './parseWebSocketEvents'
import { SlipSocketConnection } from './SlipSocketConnection'

export class SlipSocketPublisher {
  controlApi: string
  jwt: JWT

  constructor({ controlApi, jwt }: { controlApi: string, jwt: JWT }) {
    this.controlApi = controlApi
    this.jwt = jwt
  }

  async parseRequest(request: Request): Promise<SlipSocketConnection | null> {
    if (!this.jwt.verifyAuthTokenFromHeader(request.headers.get('authorization'), 'WebSocketEvent')) {
      console.error('bad token')
      return null
    }
    const connectionId = request.headers.get('x-connection-id')
    if (!connectionId) {
      console.error('no connection id')
      return null
    }
    const events = parseWebSocketEvents(await request.text())
    if (!events) {
      console.error('cannot parse events')
      return null
    }
    return new SlipSocketConnection(connectionId, events)
  }

  async publish(target: string, data: string) {
    const event: ControlPlaneEvent = { target, event: { type: 'TEXT', data } }
    const token = this.jwt.generateToken({ audience: 'ControlEvent', expiresIn: '1m' })
    const response = await fetch(this.controlApi, {
      method: 'POST',
      body: JSON.stringify([event]),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/websocket-events',
      },
    })
    if (!response.ok) {
      const text = await response.text()
      const { status, statusText } = response
      console.error({ target, data, token, status, statusText, text, body: JSON.stringify([event]), controlApi: this.controlApi })
      throw new Error(response.statusText)
    }
  }
}


