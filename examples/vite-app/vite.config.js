import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'matrix'
  },
  resolve: {
    preserveSymlinks: true
  }
})
