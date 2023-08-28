import { createBundle } from 'dts-buddy'

await createBundle({
  project: 'tsconfig.json',
  output: 'dist/index.d.ts',
  modules: {
    'slip-sockets-stack': './stacks/slip-socket-stack.ts',
  },
})

await createBundle({
  project: 'tsconfig.json',
  output: 'dist/index-esm.d.ts',
  modules: {
    'slip-sockets-stack': './stacks/slip-socket-stack.ts',
  },
})
