# SLIP Sockets

This library and CDK project creates a websocket server similar to PUSHPIN and the GRIP protocol. It will make HTTP requests to your backend app in response to events (connection, disconnection and text frames). It manages a pub sub infrastructure so you can publish events to all connected websockets, and it has a client library for communication.

- See the [`slip-sockets` README](./packages/slip-sockets/README.md) for the client library.
- See the [`@slip-sockets/stack` README](./packages/slip-sockets-stack/README.md) for the CDK project.

## Publishing

- run `pnpm changeset` to create a new changeset file in your PR. This will prompt you for the packages you want to bump versions for and the type of bump (major, minor, patch). Only bump the packages you have made changes to.
- A github action will run `pnpm changeset version` and keep a PR up to date with the next versions of the packages previously specified with pnpm changeset (and any dependents of those) and update the changelog files.
- Merge the PR and the [release workflow](https://github.com/reconbot/SLIP-Sockets/actions/workflows/release.yml) will run `pnpm publish -r`. Which will publish all packages that have bumped versions not yet present in the registry.
