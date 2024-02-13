export default {
  ignorePath: '.gitignore',
  extends: [
    'stylelint-config-standard-scss',
    'stylelint-config-recommended-vue/scss',
  ],
  rules: {
    'rule-empty-line-before': 'never-multi-line',
  },
}
