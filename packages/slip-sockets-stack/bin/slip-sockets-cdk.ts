#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { SlipSocketStack } from '../stacks/slip-socket-stack'

const { TARGET_URL, JWT_SECRET, STACK_NAME = 'slip-sockets', DOMAIN_NAME } = process.env

if (!TARGET_URL) {
  throw new Error('ENV var TARGET_URL needs to be set')
}

if (!JWT_SECRET) {
  throw new Error('ENV var JWT_SECRET needs to be set')
}

const app = new cdk.App()
new SlipSocketStack(app, STACK_NAME, {
  domain: DOMAIN_NAME,
  targetUrl: TARGET_URL,
  jwtSecret: JWT_SECRET,
  tags: {
    Name: STACK_NAME,
  },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
})
