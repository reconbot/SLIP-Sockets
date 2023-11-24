import { JWT } from './JWT'
import { ControlEvent, EventRequestDataSchema } from './types'
import { SlipSocketConnection } from './SlipSocketConnection'

export interface SlipSocketPublisherOptions {
  controlApi: string
  jwtSecret: string
}

export class SlipSocketPublisher {
  controlApi: string
  jwt: JWT

  constructor({ controlApi, jwtSecret }: SlipSocketPublisherOptions) {
    this.controlApi = controlApi
    this.jwt = new JWT({ jwtSecret })
  }

  async parseRequest(request: Request): Promise<SlipSocketConnection | null> {
    if (!this.jwt.verifyAuthTokenFromHeader(request.headers.get('authorization'), 'WebSocketEvent')) {
      console.error('".parseRequest" bad JWT token')
      return null
    }

    const events = EventRequestDataSchema.safeParse(await request.json())
    if (!events.success) {
      console.error('".parseRequest" cannot parse events', events.error)
      return null
    }
    return new SlipSocketConnection(events.data)
  }

  async send(events: ControlEvent[]) {
    const token = this.jwt.generateToken({ audience: 'ControlEvent', expiresIn: '1m' })
    const response = await fetch(this.controlApi, {
      method: 'POST',
      body: JSON.stringify({events}),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/websocket-events',
      },
    }).catch((err) => {
      throw new Error(`".send" ControlAPI failure: ${err.message}`, { cause: err })
    })
    if (!response.ok) {
      const text = await response.text()
      const { status, statusText } = response
      console.error({ token, status, statusText, text, body: JSON.stringify(events), controlApi: this.controlApi })
      throw new Error(`".send" ControlAPI failure: ${response.statusText}`)
    }
  }
}


