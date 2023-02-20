module.exports = {
  parserOptions: {
    parser: 'babel-eslint',
  },
  extends: [
    'plugin:vue/recommended',
    'standard',
  ],
  env: {
  },
  rules: {
    'no-prototype-builtins': 'off',
    'comma-dangle': ['warn', 'always-multiline'],
    'vue/one-component-per-file': 'off',
    'vue/custom-event-name-casing': 'off',
    'vue/no-arrow-functions-in-watch': 'off',
    'vue/no-custom-modifiers-on-v-model': 'off',
    'vue/no-dupe-v-else-if': 'off',
    'vue/no-multiple-template-root': 'off',
    'vue/no-mutating-props': 'off',
    'vue/no-v-for-template-key': 'off',
    'vue/no-v-model-argument': 'off',
    'vue/experimental-script-setup-vars': 'off',
    'vue/v-slot-style': 'off',
    'vue/script-setup-uses-vars': 'off',
    'no-irregular-whitespace': 'off',
    'quote-props': ['warn', 'consistent-as-needed'],
    'max-len': ['warn', { code: 120 }],
  },
}
