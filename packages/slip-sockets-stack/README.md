# SLIP Sockets Stack

This [library](../slip-sockets/README.md) and CDK project creates a websocket server similar to PUSHPIN and the GRIP protocol. It will make HTTP requests to your backend app in response to events (connection, disconnection and text frames). It manages a pub sub infrastructure so you can publish events to all connected websockets, and it has a client library for communication.

This is the CDK Stack for slip-sockets. It will create the aws infrastructure needed to run the Slip Socket websocket server.

## Database

This will create a DDB table called `Connections`

- partitionKey: connectionId
- sortKey: channel

It also has a GSI for fetching connections in a channel

- partitionKey: channel

## CDK Stack / CLI

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
