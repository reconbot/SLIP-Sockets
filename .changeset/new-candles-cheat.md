---
"@slip-sockets/stack": major
"slip-sockets": major
---

This release revamped event types and added a stack side enqueuing method to allow for near immediate use of a new connection by enqueueing events to be sent on connection in a new lambda execution that polls for an available connection. This allows a connection to be accepted and events about the connection to be immediately enacted upon.

For example, the following is now possible;

```ts
if (event.type === 'OPEN') {
  connection.accept()
  connection.subscribe('cool-channel')
  connection.publishText('cool-channel', 'New connection has joined!')
  connection.sendText('Welcome to the cool channel, be nice or get out')
  continue
}
```

A lambda that polls is used to avoid needing a queuing infrastructure. If for some reason the connection doesn't become available in 1 second, the events for that connection will act like the connection has disconnected and silently fail. This is a tradeoff to avoid needing a queuing infrastructure. We still get ordered execution of events within one api call (websocket event callback or a call to the control api) and can immediately use the connection.

Metadata is now available on the connection object. This is useful for things like authentication and sessions. The metadata is set by the client library and is available on the websocket event callbacks. Metadata is also saved before a new connection is accepted so it should always be available on all events.
