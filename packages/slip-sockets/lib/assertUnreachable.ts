export const assertUnreachable = (_: never) => {
  throw new Error('Unreachable code reached')
}
