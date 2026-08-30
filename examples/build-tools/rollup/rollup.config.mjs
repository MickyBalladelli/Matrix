import { nodeResolve } from '@rollup/plugin-node-resolve'
import { defineConfig } from 'rollup'
import { matrixTreeShake } from './matrix-tree-shake.mjs'

export default defineConfig({
  input: 'app.js',
  output: {
    dir: 'dist',
    format: 'es'
  },
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false
  },
  plugins: [nodeResolve(), matrixTreeShake()]
})
