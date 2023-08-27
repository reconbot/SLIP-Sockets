# SLIP Sockets

This library and CDK project creates a websocket server similar to PUSHPIN and the GRIP protocol. It will make HTTP requests to your backend app in response to events (connection, disconnection and text frames). It manages a pub sub infrastructure so you can publish events to all connected websockets, and it has a client library for communication.

## HTTP API

The CDK stack will looks for an `TARGET_URL` env var and make post requests to this url. The requests will have the following events from from connected websockets;

- OpenEvent (with connection headers)
- CloseEvent
- TextEvent (with text data)

Clients can send the following events;

- AcceptEvent (necessary response to an OpenEvent)
- DisconnectEvent (Closes an open connection, prevents an Opening connection from opening)
- TextEvent (Send a text event to a channel)
- SubscribeEvent (subscribe a connection to a channel)
- UnsubscribeEvent (unsubscribe a connection from a channel)

## Client Library

The client library will take a `Request` object and help you craft a `Response` object. It will also make requests to the Control API for publishing messages and disconnecting connections.

## Behaviors and Limitations

- Due to API gateway limitations connections we can't send protocol level ping frames to clients. However it will respond to a ping frame with a pong.
- Timeouts of idle connections are 10, maximum lifetime of a connection is 2 hours. You can use the ping/pong events as a heartbeat to keep connections alive if you desire.
- Only text frames are supported
- Subprotocol headers are on the open event
- You cannot send data during the open event (API Gateway limitation we could work around it if needed)
- You cannot send data to a connection directly (copied behavior from pushpin, needs to be evaluated)
- You can only send a disconnect to a channel (copied behavior from pushpin, needs to be evaluated)
- Channel membership limits are based on the lambda timeout and there is no durability around sending messages or disconnections. There is no enforcement of limits and it needs to be managed by your backend. This should be improved.
- Close events don't support a code due to limitations of api gateway

## Database

This will create a DDB table called `Connections`

- partitionKey: connectionId
- sortKey: channel

It also has a GSI for fetching connections in a channel

- partitionKey: channel

## Todo

- maybe send heartbeats from the server with step functions
