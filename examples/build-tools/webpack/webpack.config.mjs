import path from 'node:path'
import { fileURLToPath } from 'node:url'
import webpack from 'webpack'

const root = path.dirname(fileURLToPath(import.meta.url))
const { ModuleFederationPlugin } = webpack.container

export default {
  mode: 'production',
  entry: './app.jsx',
  output: {
    filename: 'app.js',
    path: path.resolve(root, 'dist'),
    publicPath: 'auto',
    clean: true
  },
  module: {
    rules: [{
      test: /\.jsx$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [[
            '@babel/preset-react',
            { runtime: 'automatic', importSource: '@mickyballadelli/matrix' }
          ]]
        }
      }
    }]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  plugins: [new ModuleFederationPlugin({
    name: 'matrixHost',
    shared: {
      '@mickyballadelli/matrix': {
        singleton: true,
        requiredVersion: false
      }
    }
  })]
}
