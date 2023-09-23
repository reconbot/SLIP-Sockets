import { Construct } from 'constructs'
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb'

export class DDB extends Construct {
  connections: Table
  constructor(scope: Construct, id: string) {
    super(scope, id)
    this.connections = new Table(this, 'SlipSockets', {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'pk',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: AttributeType.STRING,
      },
      timeToLiveAttribute: 'ttl',
    })

    this.connections.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: {
        name: 'gsi1pk',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'gsi1sk',
        type: AttributeType.STRING,
      },
    })
  }
}
