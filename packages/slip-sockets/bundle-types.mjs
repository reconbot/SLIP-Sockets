import { createBundle } from 'dts-buddy'

await createBundle({
  output: 'dist/index.d.ts',
  modules: {
    'slip-sockets': './lib/index.ts',
  },
})

await createBundle({
  output: 'dist/index-esm.d.ts',
  modules: {
    'slip-sockets': './lib/index.ts',
  },
})
