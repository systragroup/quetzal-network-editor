export default {
  ignorePath: '.gitignore',
  ignoreFiles: ['src/scss/**'],
  extends: [
    'stylelint-config-standard-scss',
    'stylelint-config-recommended-vue/scss',
  ],
  rules: {
    'rule-empty-line-before': 'never-multi-line',
    'no-empty-source': null,
    'selector-class-pattern': ['^([a-z][a-z0-9]*(-[a-z][a-z0-9]*)*)?$', {
      message: (name) => `"${name}" should be kebab-case`,
      severity: 'warning',
    }],
  },
}
