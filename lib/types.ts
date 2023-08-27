export interface Connection {
  connectionId: string
  channel: string
  ttl: number
}

interface OpenEvent {
  type: 'OPEN'
  headers: Record<string, string>
}

interface AcceptEvent {
  type: 'ACCEPT'
}

interface CloseEvent {
  type: 'CLOSE'
}

interface TextEvent {
  type: 'TEXT'
  data: string
}

interface DisconnectEvent {
  type: 'DISCONNECT'
}

interface SubscribeEvent {
  type: 'SUBSCRIBE'
  target: string
}

interface UnsubscribeEvent {
  type: 'UNSUBSCRIBE'
  target: string
}

export interface WithTarget<T> {
  target: string
  event: T
}

export type FromWebSocketServer = OpenEvent | CloseEvent | TextEvent
export type FromBackend = AcceptEvent | DisconnectEvent | TextEvent | SubscribeEvent | UnsubscribeEvent
export type ControlPlaneBackendEvents = DisconnectEvent | TextEvent | SubscribeEvent | UnsubscribeEvent
export type ControlPlaneEvent = WithTarget<ControlPlaneBackendEvents>
