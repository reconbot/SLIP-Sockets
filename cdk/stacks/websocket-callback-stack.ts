import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { WebSocket } from '../resources/WebSocket'
import { ControlApi } from '../resources/ControlApi'
import { DDB } from '../resources/DDB'

export class WebsocketCallback extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps & {
    domain?: string,
    targetUrl: string,
    jwtSecret: string,
  }) {
    super(scope, id, props)

    const { domain, targetUrl, jwtSecret } = props

    const ddb = new DDB(this, 'ddb')

    const webSocket = new WebSocket(this, 'websocket', {
      domain,
      targetUrl,
      jwtSecret,
      connectionsTable: ddb.connections,
    })

    const controlApi = new ControlApi(this, 'controller', {
      webSocket,
      jwtSecret,
      connectionsTable: ddb.connections,
    })

    new cdk.CfnOutput(this, 'region', {
      value: cdk.Stack.of(this).region,
    })
    new cdk.CfnOutput(this, 'websocketUrl', {
      value: domain ? `wss://${domain}/` : webSocket.stage.url,
      description: 'Websocket URL',
    })
    new cdk.CfnOutput(this, 'controlApi', {
      value: controlApi.url,
      description: 'Websocket Controller API Url',
    })
    new cdk.CfnOutput(this, 'targetUrl', {
      value: targetUrl,
      description: 'Url to send websocket events to',
    })
  }
}
