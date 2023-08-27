import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

export default {
  input: {
    index: './lib/index.ts',
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
  external: ['jsonwebtoken'],
}
