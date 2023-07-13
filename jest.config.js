const path = require('path')
const webpackConfig = require('./build/dev_webpack.config')
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
    '\\.js$': 'babel-jest',
    '\\.vue$': 'vue-jest',
    '\\.(sass|scss)$': 'jest-transform-stub',
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!vuetify)',
  ],
  moduleNameMapper: {
    '\\.(geojson|png|jpg|jpeg|css)$': '<rootDir>/test/staticMock.js',
    ...aliasMapper,
    '^@test(.*)$': '<rootDir>/test/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  reporters: [
    'default',
    ['jest-junit', {
      suiteName: 'Myapp frontend unittests',
      outputFile: 'reports/report.xunit',
      includeConsoleOutput: true,
    }],
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,vue}',
  ],
  coverageReporters: [
    ['cobertura', { file: '../reports/coverage.xml' }],
    ['html', { subdir: '../reports/coverage', skipEmpty: true }],
    ['text', { skipEmpty: true }],
  ],
}
