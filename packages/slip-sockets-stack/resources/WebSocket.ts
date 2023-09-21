import { ApiGatewayv2DomainProperties } from 'aws-cdk-lib/aws-route53-targets'
import { Architecture } from 'aws-cdk-lib/aws-lambda'
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53'
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager'
import { Construct } from 'constructs'
import { DomainName, WebSocketApi, WebSocketStage } from '@aws-cdk/aws-apigatewayv2-alpha'
import { Aws, Duration } from 'aws-cdk-lib'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { WebSocketLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha'
import { Table } from 'aws-cdk-lib/aws-dynamodb'

export class WebSocket extends Construct {
  stage: WebSocketStage
  lambda: NodejsFunction

  constructor(scope: Construct, id: string, {
    targetUrl,
    jwtSecret,
    connectionsTable,
    domain,
  }: {
    targetUrl: string
    jwtSecret: string
    connectionsTable: Table
    domain?: string
  }) {
    super(scope, id)

    const eventHandler = new NodejsFunction(this, 'handler', {
      entry: __dirname + '/WebSocket.handler.js',
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.seconds(10),
      memorySize: 128,
      architecture: Architecture.ARM_64,
      environment: {
        TARGET_URL: targetUrl,
        JWT_SECRET: jwtSecret,
        DDB_CONNECTIONS_TABLE: connectionsTable.tableName,
      },
      logRetention: RetentionDays.THREE_MONTHS,
    })
    this.lambda = eventHandler
    connectionsTable.grantReadWriteData(eventHandler)

    let dn
    if (domain) {
      const hostedZone = HostedZone.fromLookup(this, 'hostedZone', {
        domainName: domain.split('.').slice(-2).join('.'),
      })

      dn = new DomainName(this, 'domain', {
        domainName: domain,
        certificate: new Certificate(this, 'cert', {
          domainName: domain,
          validation: CertificateValidation.fromDns(hostedZone),
        }),
      })
      new ARecord(this, 'apiDNS', {
        zone: hostedZone,
        recordName: domain.split('.').slice(0, -2).join('.'),
        target: RecordTarget.fromAlias(
          new ApiGatewayv2DomainProperties(dn.regionalDomainName, dn.regionalHostedZoneId),
        ),
      })
    }

    const webSocketApi = new WebSocketApi(this, 'websocket-api', {
      apiName: `${Aws.STACK_NAME}-apig`,
      connectRouteOptions: { integration: new WebSocketLambdaIntegration('ConnectIntegration', eventHandler) },
      disconnectRouteOptions: { integration: new WebSocketLambdaIntegration('DisconnectIntegration', eventHandler) },
      defaultRouteOptions: { integration: new WebSocketLambdaIntegration('DefaultIntegration', eventHandler) },
    })

    this.stage = new WebSocketStage(this, 'stage', {
      webSocketApi,
      stageName: '$default',
      autoDeploy: true,
      ...dn && {
        domainMapping: {
          domainName: dn,
        },
      },
    })

    this.stage.grantManagementApiAccess(eventHandler)
    eventHandler.addEnvironment('CALLBACK_URL', this.stage.callbackUrl)
  }

  registerControlLambda(controlLambda: NodejsFunction) {
    this.lambda.addEnvironment('CONTROL_LAMBDA_ARN', controlLambda.functionArn)
    controlLambda.grantInvoke(this.lambda)
  }
}

