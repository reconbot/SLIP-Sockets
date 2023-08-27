import type { APIGatewayProxyEventV2 } from 'aws-lambda'

export const assertUnreachable = (_: never) => {
  throw new Error('Unreachable code reached')
}

export const parseBody = (event: APIGatewayProxyEventV2): string | undefined => {
  const { body, isBase64Encoded } = event
  if (isBase64Encoded && body !== undefined) {
    return atob(body)
  }
  return body
}
