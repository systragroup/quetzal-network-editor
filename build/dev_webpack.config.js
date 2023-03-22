'use strict'
const { VueLoaderPlugin } = require('vue-loader')
const HtmlWebPackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const WriteFilePlugin = require('write-file-webpack-plugin')
const path = require('path')
const Dotenv = require('dotenv-webpack')
module.exports = {
  mode: 'development',
  target: 'web',
  entry: [
    './src/main.js',
  ],
  output: {
    filename: 'build.js',
    publicPath: '/',
  },
  resolve: {
    alias: {
      'vue': 'vue/dist/vue.esm.js',
      '@src': path.resolve('src'),
      '@comp': path.resolve('src/components'),
      '@page': path.resolve('src/pages'),
      '@lang': path.resolve('src/languages'),
      '@scss': path.resolve('src/scss'),
      '@static': path.resolve('static'),
    },
    extensions: [
      '.wasm',
      '.mjs',
      '.js',
      '.jsx',
      '.json',
      '.vue',
    ],
  },
  devtool: 'source-map',
  devServer: {
    // to server index.html (in fact 'output.publicPath') instead of any 404 page
    historyApiFallback: true,
    hot: true,
    client: {
      // Enables a full-screen overlay in the browser when there are compiler errors or warnings
      overlay: true,
    },
    https: false,
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        use: 'vue-loader',
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              // Load variables for each <style> section of vue component
              additionalData: '@import "@scss/variables.scss";',
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
        type: 'asset',
      },
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      },
      {
        test: /\.geojson$/,
        use: 'json5-loader',
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebPackPlugin({
      template: './index.html',
      filename: './index.html',
      minify: false,
    }),
    new CopyPlugin({
      patterns: [
        { from: './*', to: '.', context: 'static/' },
      ],
    }),
    new WriteFilePlugin(),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: 'build.css',
      chunkFilename: '[id].css',
    }),
    new Dotenv({ path: './.env.development' }),
  ],
  optimization: {
    splitChunks: {
      cacheGroups: {
        config: {
          filename: 'config.js',
          test: path.resolve(process.cwd(), 'src/config.js'),
          chunks: 'initial',
          enforce: true,
        },
        vendor: {
          filename: 'vendor.js',
          test: path.resolve(process.cwd(), 'node_modules'),
          chunks: 'initial',
          enforce: true,
        },
      },
    },
  },
}
