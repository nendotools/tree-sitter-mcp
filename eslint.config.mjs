// @ts-check
import globals from 'globals'

import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import ts from 'typescript-eslint'

export default ts.config(
  js.configs.recommended,
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: { 
      globals: { ...globals.node, ...globals.es2023 }
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    plugins: { js },
  },
  // @ts-expect-error upstream delay correcting package definitions
  ...ts.configs.recommended,
  stylistic.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' }
      ],
      'no-console': ['warn', { 
        allow: ['warn', 'error', 'info'] 
      }],
      '@stylistic/indent-binary-ops': 'off',
      '@stylistic/semi': 'off',
      '@stylistic/member-delimiter-style': 'off',
      '@stylistic/comma-dangle': 'off',
      '@stylistic/brace-style': 'off',
      '@stylistic/arrow-parens': 'off',
      '@stylistic/operator-linebreak': 'off',
      '@stylistic/quote-props': 'off',
    },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      '*.d.ts',
      'coverage/',
    ],
  },
)