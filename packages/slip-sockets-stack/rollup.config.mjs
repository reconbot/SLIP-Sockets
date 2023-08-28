import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

export default {
  input: {
    index: './stacks/slip-socket-stack.ts',
  },
  plugins: [
    typescript(),
    nodeResolve(),
    commonjs(),
  ],
  output: [
    { format: 'esm', dir: './dist', entryFileNames: '[name].mjs' },
    { format: 'cjs', dir: './dist', entryFileNames: '[name].js' },
  ],
  external: [
    '@aws-cdk/aws-apigatewayv2-alpha',
    '@aws-cdk/aws-apigatewayv2-integrations-alpha',
    '@aws-sdk/client-apigatewaymanagementapi',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb',
    /aws-cdk-lib.*/,
    'aws-cdk',
    'constructs',
    'slip-sockets',
    'source-map-support',
  ],
}
