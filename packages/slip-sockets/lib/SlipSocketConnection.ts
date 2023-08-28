import { FromBackend, FromWebSocketServer } from './types'

export class SlipSocketConnection {
  connectionId: string
  inEvents: FromWebSocketServer[]
  outEvents: FromBackend[]
  accepted: boolean
  closed: boolean

  constructor(connectionId: string, events: FromWebSocketServer[]) {
    this.connectionId = connectionId
    this.inEvents = events
    this.outEvents = []
    this.accepted = false
    this.closed = false
  }

  isOpening() {
    return this.inEvents.length > 0 && this.inEvents[0].type === 'OPEN'
  }

  accept() {
    this.accepted = true
  }

  close() {
    this.closed = true
  }

  subscribe(channel: string) {
    this.outEvents.push({ type: 'SUBSCRIBE', target: channel })
  }

  unsubscribe(channel: string) {
    this.outEvents.push({ type: 'UNSUBSCRIBE', target: channel })
  }

  endResponse(): Response {
    const events: FromBackend[] = [...this.outEvents]
    if (this.accepted) {
      events.unshift({ type: 'ACCEPT' })
    }

    if (this.closed) {
      events.push({ type: 'DISCONNECT' })
    }
    return new Response(JSON.stringify(events), {
      status: 200,
    })
  }
}
