import { EventRequestData, EventResponseData, EventResponseEvent, FromSlipServer, JsonObject } from './types'

export class SlipSocketConnection {
  connectionId: string
  inEvents: FromSlipServer[]
  outEvents: EventResponseEvent[]
  accepted: boolean
  closed: boolean
  metadata: JsonObject | null
  newMetadata: undefined | JsonObject | null

  constructor({ connectionId, metadata, events }: EventRequestData) {
    this.connectionId = connectionId
    this.inEvents = events
    this.metadata = metadata as JsonObject
    this.newMetadata = undefined
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
    const { connectionId } = this
    this.queueEvent({ type: 'SUBSCRIBE', connectionId, channel: channel })
  }

  unsubscribe(channel: string) {
    const { connectionId } = this
    this.queueEvent({ type: 'UNSUBSCRIBE', connectionId, channel: channel })
  }

  sendText(data: string) {
    const { connectionId } = this
    this.queueEvent({ type: 'TEXT', connectionId, data })
  }

  publishText(channelId: string, data: string) {
    this.queueEvent({ type: 'PUBLISH_TEXT', channelId, data })
  }

  setMetadata(metadata: JsonObject | null) {
    this.newMetadata = metadata
  }

  queueEvent(event: EventResponseEvent) {
    this.outEvents.push(event)
  }

  endResponse(): Response {
    const events = [...this.outEvents]
    const { connectionId } = this
    if (this.accepted) {
      events.unshift({ type: 'ACCEPT', connectionId })
    }

    if (this.newMetadata !== undefined) {
      events.push({ type: 'SET_METADATA', connectionId, metadata: this.newMetadata })
    }

    if (this.closed) {
      events.push({ type: 'CLOSE', connectionId })
    }
    const data: EventResponseData = { events }
    return new Response(JSON.stringify(data), {
      status: 200,
    })
  }
}
