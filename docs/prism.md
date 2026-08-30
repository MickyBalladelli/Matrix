# Prism integration

Prism uses Matrix as a peer dependency. This keeps one reactive runtime in the final application.

```json
{
  "peerDependencies": {
    "@mickyballadelli/matrix": "^0.1.0-alpha.0"
  },
  "devDependencies": {
    "@mickyballadelli/matrix": "0.1.0-alpha.0"
  }
}
```

Applications install both packages:

```bash
npm install prism-ui @mickyballadelli/matrix
```

Vite JSX configuration:

```js
const matrixJsx = {
  runtime: 'automatic',
  importSource: '@mickyballadelli/matrix'
}

export default {
  oxc: {
    jsx: matrixJsx
  },
  optimizeDeps: {
    rolldownOptions: {
      transform: {
        jsx: matrixJsx
      }
    }
  },
  resolve: {
    dedupe: ['@mickyballadelli/matrix']
  }
}
```

Do not publish Prism with `file:../Matrix` or deploy it with a required sibling-repository alias. Local source aliases may live in a separate local-only Vite configuration.

For History API routes on Vercel, rewrite application paths to `index.html` in the deployed application:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
