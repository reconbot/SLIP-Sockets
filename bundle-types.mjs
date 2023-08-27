import { createBundle } from 'dts-buddy'

await createBundle({
  project: 'tsconfig.json',
  output: 'dist/index.d.ts',
  modules: {
    'slip-sockets': './lib/index.ts',
  },
})

await createBundle({
  project: 'tsconfig.json',
  output: 'dist/index-esm.d.ts',
  modules: {
    'slip-sockets': './lib/index.ts',
  },
})
