# SLIP Sockets

This library and CDK project creates a websocket server similar to PUSHPIN and the GRIP protocol. It will make HTTP requests to your backend app in response to events (connection, disconnection and text frames). It manages a pub sub infrastructure so you can publish events to all connected websockets, and it has a client library for communication.

See the [`slip-sockets` package README](./packages/slip-sockets/README.md) for some good reading.

## Publishing

- Run `pnpm changeset version`. This will bump the versions of the packages previously specified with pnpm changeset (and any dependents of those) and update the changelog files.
- Run pnpm install. This will update the lockfile and rebuild packages.
- Commit the changes.
- Push main to github, the [release workflow](https://github.com/reconbot/SLIP-Sockets/actions/workflows/release.yml) will run `pnpm publish -r`. This command will publish all packages that have bumped versions not yet present in the registry.
