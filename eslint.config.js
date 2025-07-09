const jsdoc = require('eslint-plugin-jsdoc')
const lintImports = require('eslint-plugin-import')
const neostandard = require('neostandard')
const babelParser = require('@babel/eslint-parser');
const globals = require('globals');
const prebid = require('./plugins/eslint/index.js');
const {includeIgnoreFile} = require('@eslint/compat');
const path = require('path');
const _ = require('lodash');

function sourcePattern(name) {
  return [`${name}/**/*.js`, `${name}/**/*.mjs`]
}

const sources = ['src', 'modules', 'libraries', 'creative'].flatMap(sourcePattern)
const autogen = 'libraries/creative-renderer-*/**/*'

const allowedImports = {
  modules: [
    'crypto-js',
    'live-connect' // Maintained by LiveIntent : https://github.com/liveintent-berlin/live-connect/
  ],
  src: [
    'fun-hooks/no-eval',
    'klona',
    'dlv',
    'dset'
  ],
  libraries: [],
  creative: [],
}

function noGlobals(names) {
  return {
    globals: Object.entries(names).map(([name, message]) => ({
      name,
      message
    })),
    props: Object.entries(names).map(([name, message]) => ({
      object: 'window',
      property: name,
      message
    }))
  }
}

function commonConfig(overrides) {
  return _.merge({
    plugins: {
      jsdoc,
      import: lintImports,
      prebid
    },
    settings: {
      jsdoc: {
        tagNamePreference: {
          return: 'return'
        }
      }
    },
    languageOptions: {
      parser: babelParser,
      sourceType: 'module',
      ecmaVersion: 2018,
      globals: {
        BROWSERSTACK_USERNAME: false,
        BROWSERSTACK_KEY: false,
        FEATURES: 'readonly',
        ...globals.browser
      },
    },
    rules: {
      'comma-dangle': 'off',
      semi: 'off',
      'space-before-function-paren': 'off',
      'import/extensions': ['error', 'ignorePackages'],

      // Exceptions below this line are temporary (TM), so that eslint can be added into the CI process.
      // Violations of these styles should be fixed, and the exceptions removed over time.
      //
      // See Issue #1111.
      // also see: reality. These are here to stay.

      eqeqeq: 'off',
      'no-return-assign': 'off',
      'no-throw-literal': 'off',
      'no-undef': 2,
      'no-useless-escape': 'off',
      'no-console': 'error',
      'jsdoc/check-types': 'off',
      'jsdoc/no-defaults': 'off',
      'jsdoc/newline-after-description': 'off',
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-param-name': 'off',
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-property': 'off',
      'jsdoc/require-property-description': 'off',
      'jsdoc/require-property-name': 'off',
      'jsdoc/require-property-type': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-check': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-returns-type': 'off',
      'jsdoc/require-yields': 'off',
      'jsdoc/require-yields-check': 'off',
      'jsdoc/tag-lines': 'off',
      'no-var': 'off',
      'no-empty': 'off',
      'no-void': 'off',
      'array-callback-return': 'off',
      'import-x/no-named-default': 'off',
      'prefer-const': 'off',
      'no-prototype-builtins': 'off',
      'object-shorthand': 'off',
      'prefer-regex-literals': 'off',
      'no-case-declarations': 'off',
      'no-useless-catch': 'off',
      '@stylistic/quotes': 'off',
      '@stylistic/quote-props': 'off',
      '@stylistic/array-bracket-spacing': 'off',
      '@stylistic/object-curly-spacing': 'off',
      '@stylistic/semi': 'off',
      '@stylistic/space-before-function-paren': 'off',
      '@stylistic/multiline-ternary': 'off',
      '@stylistic/computed-property-spacing': 'off',
      '@stylistic/lines-between-class-members': 'off',
      '@stylistic/indent': 'off',
      '@stylistic/comma-dangle': 'off',
      '@stylistic/object-curly-newline': 'off',
      '@stylistic/object-property-newline': 'off',
      '@stylistic/no-multiple-empty-lines': 'off',

    }
  }, overrides);
}

module.exports = [
  includeIgnoreFile(path.resolve(__dirname, '.gitignore')),
  {
    ignores: [
      autogen,
      'integrationExamples/**/*',
      // do not lint build-related stuff
      '*.js',
      ...sourcePattern('plugins'),
      ...sourcePattern('.github'),
    ],
  },
  jsdoc.configs['flat/recommended'],
  ...neostandard({
    files: sources,
  }),
  commonConfig({
    files: sources,
  }),
  ...Object.entries(allowedImports).map(([path, allowed]) => {
    const {globals, props} = noGlobals({
      require: 'use import instead',
      ...Object.fromEntries(['localStorage', 'sessionStorage'].map(k => [k, 'use storageManager instead'])),
      XMLHttpRequest: 'use ajax.js instead'
    })
    return commonConfig({
      files: sourcePattern(path),
      plugins: {
        prebid,
      },
      rules: {
        'prebid/validate-imports': ['error', allowed],
        'no-restricted-globals': [
          'error',
          ...globals
        ],
        'no-restricted-properties': [
          'error',
          ...props,
          {
            property: 'cookie',
            object: 'document',
            message: 'use storageManager instead'
          },
          {
            property: 'sendBeacon',
            object: 'navigator',
            message: 'use ajax.js instead'
          },
          ...['outerText', 'innerText'].map(property => ({
            property,
            message: 'use .textContent instead'
          })),
          {
            property: 'getBoundingClientRect',
            message: 'use libraries/boundingClientRect instead'
          },
          ...['scrollTop', 'scrollLeft', 'innerHeight', 'innerWidth', 'visualViewport'].map((property) => ({
            object: 'window',
            property,
            message: 'use utils/getWinDimensions instead'
          }))
        ]
      }
    })
  }),
  {
    files: ['**/*BidAdapter.js'],
    rules: {
      'no-restricted-imports': [
        'error', {
          patterns: [
            '**/src/events.js',
            '**/src/adloader.js'
          ]
        }
      ]
    }
  },
  commonConfig({
    files: sourcePattern('test'),
    languageOptions: {
      globals: {
        ...globals.mocha,
        ...globals.chai,
        'sinon': false
      }
    },
    rules: {
      // tests were not subject to many rules and they are now a nightmare
      'no-template-curly-in-string': 'off',
      'no-unused-expressions': 'off',
      'one-var': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'import/extensions': 'off',
      'camelcase': 'off',
      'no-array-constructor': 'off',
      'import-x/no-duplicates': 'off',
      'import-x/no-absolute-path': 'off',
      'no-loss-of-precision': 'off',
      'no-redeclare': 'off',
      'no-global-assign': 'off',
      'default-case-last': 'off',
      '@stylistic/no-mixed-spaces-and-tabs': 'off',
      '@stylistic/no-tabs': 'off',
      '@stylistic/no-trailing-spaces': 'off'
    }
  })
]
