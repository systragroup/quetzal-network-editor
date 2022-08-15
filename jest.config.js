const { defaults } = require('jest-config') // eslint-disable-line no-unused-vars
const path = require('path')
const webpackConfig = require('./build/webpack.config')
// build alias mapper from webpack config alias mapper
const aliasMapper = Object.fromEntries(
  Object.entries(
    webpackConfig.resolve.alias,
  ).filter(
    ([alias, _apath]) => alias.startsWith('@'),
  ).map(
    ([alias, apath]) => [`^${alias}/(.*)$`, `<rootDir>/${path.relative('.', apath)}/$1`],
  ),
)

module.exports = {
  moduleFileExtensions: [
    'js',
    'vue',
  ],
  moduleDirectories: [
    'test',
    'node_modules',
  ],
  testEnvironment: 'jsdom',
  transform: {
    '.*\\.vue$': 'vue-jest',
    '^.+\\.js$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(geojson|png|jpg|jpeg|css)$': '<rootDir>/test/staticMock.js',
    ...aliasMapper,
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  reporters: [
    'default',
    ['jest-junit', {
      suiteName: 'Frontend unittests',
      outputFile: 'reports/report.xunit',
      includeConsoleOutput: true,
    }],
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    'src/**/*.vue',
    '!src/store/index.js',
    '!src/main.js',
  ],
  coverageReporters: [
    ['cobertura', { file: '../reports/coverage.xml' }],
    ['html', { subdir: '../reports/coverage', skipEmpty: true }],
    ['text', { skipEmpty: true }],
  ],
}
