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

## CDK

You may clone this repository and use the CDK cli to deploy the infrastructure with ENV varible configurations. It's name is defaults to `slip-sockets` but it can be configured with environment variables.

The following environment variables are used to configure the stack;

- `TARGET_URL` - the url to send events to (required)
- `JWT_SECRET` - the secret used to sign JWT tokens (required)
- `STACK_NAME` - the name of the stack (optional, defaults to `slip-sockets`)
- `DOMAIN_NAME` - the custom domain name to use for the websocket, the DNS must be managed by route53 (optional)

The stack has the following outputs, they are written to a file called `cdk-outputs.json` in the root of the project and output when deployed.

- `slip-sockets.controlApi` - URL of the controlApi for the `SlipSocketsPublisher`
- `slip-sockets.targetUrl` - URL of your backend app
- `slip-sockets.websocketUrl` - `wss://` url for clients to connect to
- `slip-sockets.region` - AWS region of the stack

### Useful commands

For most of these commands the required environment variables must be set

- `pnpm run deploy:production`   deploy this stack to your default AWS account/region
- `pnpm run deploy:staging`      deploy this stack to your default AWS account/region
- `pnpm cdk diff`                compare deployed stack with current state
- `pnpm cdk synth`               emits the synthesized CloudFormation template
- `pnpm npx wscat -c wss://your-url-hostname` connect to the websocket with wscat, first deploy might take a few minutes after deploy to respond
