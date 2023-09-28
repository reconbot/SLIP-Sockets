import createServer from 'dynalite'
import { Server } from 'http'
import { CreateTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { getPortPromise } from 'portfinder'

export async function startDevDB({ verbose = false, debug = false, port: providedPort }: { verbose?: boolean, debug?: boolean, port?: number } = {}) {
  const tableName = 'SlipSockets'
  const server = createServer({ createTableMs: 0, deleteTableMs: 0, updateTableMs: 0, verbose, debug }) as Server
  const port = providedPort ?? await getPortPromise()

  await new Promise<void>((resolve) => server.listen(port, resolve))
  const endpoint = `http://localhost:${port}`
  if (verbose) {
    console.log(`Dynalite listening ${endpoint}`)
  }

  const ddbClient = new DynamoDBClient({ endpoint, region: 'us-east-2', credentials: { accessKeyId: 'asdf', secretAccessKey: 'asdf' } })

  const command = new CreateTableCommand({
    TableName: tableName,
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [
      {
        AttributeName: 'pk',
        KeyType: 'HASH',
      },
      {
        AttributeName: 'sk',
        KeyType: 'RANGE',
      },
    ],
    GlobalSecondaryIndexes: [{
      IndexName: 'GSI1',
      KeySchema: [
        {
          AttributeName: 'gsi1pk',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'gsi1sk',
          KeyType: 'RANGE',
        },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
    }],
    AttributeDefinitions: ['pk', 'sk', 'gsi1pk', 'gsi1sk'].map(name => ({ AttributeName: name, AttributeType: 'S' })),
  })

  const table = await ddbClient.send(command)

  if (verbose) {
    console.log(`Created table ${table.TableDescription?.TableName}`)
  }

  return {
    tableName,
    ddbClient,
    endpoint,
    server,
    close: async () => {
      const closePromise = new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()))
      server.closeAllConnections()
      await closePromise
    },
  }
}
