import { FlatCompat } from '@eslint/eslintrc'
import path from 'path'
import { fileURLToPath } from 'url'
const baseDirectory = path.dirname(fileURLToPath(import.meta.url))
const eslintrc = new FlatCompat({ baseDirectory })
import stylistic from '@stylistic/eslint-plugin'

export default [
  {
    ignores: [
      'node_modules',
      'dist',
      'reports',
      'docker',
    ],
  },
  // not migrated to eslint flat config yet:
  // https://github.com/vuejs/eslint-plugin-vue/pull/2319
  ...eslintrc.plugins('vue'),
  ...eslintrc.extends('plugin:vue/recommended'),
  // not migrated to eslint flat config yet. Won’t do until vue-cli support it:
  // https://github.com/vuejs/vue-cli/issues/6759
  ...eslintrc.plugins('vuetify'),
  ...eslintrc.extends('plugin:vuetify/base'),
  stylistic.configs['recommended-flat'],
  {
    files: [
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
      '**/*.vue',
    ],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest', // default
        sourceType: 'module', // default
        requireConfigFile: false,
      },
    },
    rules: {
      '@stylistic/semi': 'error',
      '@stylistic/indent': ['error', 2],
      '@stylistic/space-before-function-paren': 'off',
      '@stylistic/brace-style': 'off',
      '@stylistic/arrow-parens': 'off',
      'no-prototype-builtins': 'off',
      'comma-dangle': ['warn', 'always-multiline'],
      'no-irregular-whitespace': 'off',
      'quote-props': ['warn', 'as-needed', { unnecessary: false }],
      'max-len': ['warn', { code: 120 }],
      'no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '[iI]gnored',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^ignore',
          args: 'after-used',
        },
      ],
      'vue/one-component-per-file': 'off',
      'vue/custom-event-name-casing': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-arrow-functions-in-watch': 'off',
      'vue/no-custom-modifiers-on-v-model': 'off',
      'vue/no-dupe-v-else-if': 'off',
      'vue/no-multiple-template-root': 'off',
      'vue/no-mutating-props': 'off',
      'vue/no-v-for-template-key': 'off',
      'vue/no-v-model-argument': 'off',
      'vue/experimental-script-setup-vars': 'off',
      'vue/v-on-event-hyphenation': 'error',
      'vue/v-slot-style': 'off',
      'vue/valid-v-slot': ['error', { allowModifiers: true }],
      'vuetify/no-deprecated-classes': 'off',
    },
  },
]
