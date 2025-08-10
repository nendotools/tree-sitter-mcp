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