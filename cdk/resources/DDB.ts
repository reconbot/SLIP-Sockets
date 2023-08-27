import { Construct } from 'constructs'
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb'

export class DDB extends Construct {
  connections: Table
  constructor(scope: Construct, id: string) {
    super(scope, id)
    this.connections = new Table(this, 'Connections', {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'connectionId',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'channel',
        type: AttributeType.STRING,
      },
      timeToLiveAttribute: 'ttl',
    })

    this.connections.addGlobalSecondaryIndex({
      indexName: 'byChannel',
      partitionKey: {
        name: 'channel',
        type: AttributeType.STRING,
      },
    })
  }
}
