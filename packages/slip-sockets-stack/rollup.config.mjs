import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

const handlerDependencies = [
  // all of these need a json import or something
  /@aws-sdk\/.*/,
]

export default [{
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
},
// had to separate out the two handlers because rollup will chunk out the common js
// this isn't necessarily a problem but but I don't want to deal with cdk esbuild issues
{
  input: {
    'ControlApi.handler': './resources/ControlApi.handler.ts',
  },
  plugins: [
    typescript(),
    nodeResolve(),
    commonjs(),
  ],
  output: {
    format: 'esm',
    dir: './dist/',
  },
  external: handlerDependencies,
},
{
  input: {
    'WebSocket.handler': './resources/WebSocket.handler.ts',
  },
  plugins: [
    typescript(),
    nodeResolve(),
    commonjs(),
  ],
  output: {
    format: 'esm',
    dir: './dist/',
  },
  external: handlerDependencies,
},
]
