import pluginVue from 'eslint-plugin-vue'
import stylistic from '@stylistic/eslint-plugin'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import parser from 'vue-eslint-parser'
export default [
  // add more generic rulesets here, such as:
  // js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  stylistic.configs['recommended-flat'],
  {
    files: ['*.vue', '**/*.vue', '**/*.js'],
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser',

      },
    },
    rules: {
      '@stylistic/max-statements-per-line': ['error', { max: 2 }],
      '@stylistic/semi': 'error',
      '@stylistic/indent': ['error', 2],
      '@stylistic/space-before-function-paren': 'off',
      '@stylistic/brace-style': 'off',
      '@stylistic/arrow-parens': 'off',
      'no-prototype-builtins': 'off',
      'no-undef': 'error',
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
      'vue/v-on-event-hyphenation': 'warn',
      'vue/v-slot-style': 'off',
      'vue/valid-v-slot': ['error', { allowModifiers: true }],
      'vuetify/no-deprecated-classes': 'off',
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: parser,
      parserOptions: {
        parser: '@typescript-eslint/parser',

      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules, // Apply recommended rules
      '@stylistic/max-statements-per-line': ['error', { max: 2 }],
      '@stylistic/semi': 'error',
      '@stylistic/indent': ['error', 2],
      '@stylistic/space-before-function-paren': 'off',
      '@stylistic/brace-style': 'off',
      '@stylistic/arrow-parens': 'off',
      'no-prototype-builtins': 'off',
      'no-undef': 'error',
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
      'vue/v-on-event-hyphenation': 'warn',
      'vue/v-slot-style': 'off',
      'vue/valid-v-slot': ['error', { allowModifiers: true }],
      'vuetify/no-deprecated-classes': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface', // Default for all identifiers
          format: ['PascalCase'],
        },
        {
          selector: 'property', // Allow properties to have any naming style
          format: ['camelCase', 'snake_case'],
        },
      ],
    },
  },
]
