import { defineConfig } from 'astro/config'

export default defineConfig({
  vite: {
    resolve: {
      dedupe: ['@mickyballadelli/matrix']
    }
  }
})
