import { FromWebSocketServer } from './types'

export function parseWebSocketEvents(body: string | undefined): FromWebSocketServer[] | null {
  if (!body) {
    console.log('no body')
    return null
  }
  let data
  try {
    data = JSON.parse(body)
  } catch (error) {
    console.log('cannot json parse')
    return null
  }
  if (!Array.isArray(data)) {
    console.log('is not array')
    return null
  }

  for (const event of data as FromWebSocketServer[]) {
    if (event.type === 'OPEN') {
      if (typeof event.headers !== 'object') {
        return null
      }
      continue
    }
    if (event.type === 'TEXT') {
      if (typeof event.data !== 'string') {
        return null
      }
      continue
    }
    if (event.type === 'CLOSE') {
      continue
    }
    console.log('unknown event', event)
    return null
  }
  return data as FromWebSocketServer[]
}
