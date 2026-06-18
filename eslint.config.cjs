/*
 * @Author: 柳涤尘
 * @Email: liudichen@foxmail.com
 * @Website: https://www.iimm.ink
 * @Date: 2026-05-21 08:38:02
 * @LastEditTime: 2026-06-13 21:33:50
 * @Description: ESLint 9 flat config 格式
 */
const vuePlugin = require('eslint-plugin-vue')
const tsPlugin = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')
const vueParser = require('vue-eslint-parser')

module.exports = [
  {
    // 忽略的文件/目录
    ignores: [
      'node_modules/',
      'dist/',
      '*.config.*',
      'public/',
      'scripts/',
      '.claw/'
    ]
  },
  {
    // 适用于所有文件的配置
    files: ['**/*.js', '**/*.ts', '**/*.vue'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        // 浏览器全局变量
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        // Node.js 全局变量
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly'
      }
    },
    plugins: {
      vue: vuePlugin,
      '@typescript-eslint': tsPlugin
    },
    rules: {
      // Vue 规则
      'vue/multi-word-component-names': 'off',

      // TypeScript 规则
      '@typescript-eslint/no-unused-vars': ['warn', {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'off',

      // JavaScript 规则
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
    }
  },
  {
    // 针对 TypeScript 文件的额外配置
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser
    }
  },
  {
    // 针对 Vue 文件的配置
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser
    }
  }
]
