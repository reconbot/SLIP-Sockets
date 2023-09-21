import { JWT } from './JWT'
import { ControlEvent, EventRequestDataSchema } from './types'
import { SlipSocketEvent } from './SlipSocketConnection'

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

  async parseRequest(request: Request): Promise<SlipSocketEvent | null> {
    if (!this.jwt.verifyAuthTokenFromHeader(request.headers.get('authorization'), 'WebSocketEvent')) {
      console.error('bad token')
      return null
    }

    const events = EventRequestDataSchema.safeParse(await request.text())
    if (!events.success) {
      console.error('cannot parse events', events.error)
      return null
    }
    return new SlipSocketEvent(events.data)
  }

  async send(events: ControlEvent[]) {
    const token = this.jwt.generateToken({ audience: 'ControlEvent', expiresIn: '1m' })
    const response = await fetch(this.controlApi, {
      method: 'POST',
      body: JSON.stringify(events),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/websocket-events',
      },
    })
    if (!response.ok) {
      const text = await response.text()
      const { status, statusText } = response
      console.error({ token, status, statusText, text, body: JSON.stringify(events), controlApi: this.controlApi })
      throw new Error(response.statusText)
    }
  }
}


