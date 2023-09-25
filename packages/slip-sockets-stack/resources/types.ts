import { ControlEvent } from 'slip-sockets'

export interface ControlAPIInvokeEvent {
  events: ControlEvent[]
  type: 'EnqueueEvents'
}
