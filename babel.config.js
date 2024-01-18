module.exports = function (api) {
  api.cache(true)
  return {
    env: {
      test: {
        plugins: [
          'babel-plugin-root-import',
          '@babel/plugin-transform-modules-commonjs',
        ],
      },
    },
  }
}
