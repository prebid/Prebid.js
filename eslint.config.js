const jsdoc = require('eslint-plugin-jsdoc')
const lintImports = require('eslint-plugin-import')
const neostandard = require('neostandard')
const globals = require('globals');
const prebid = require('./plugins/eslint/index.js');
const chaiFriendly = require('eslint-plugin-chai-friendly');
const {includeIgnoreFile} = require('@eslint/compat');
const path = require('path');
const _ = require('lodash');
const tseslint = require('typescript-eslint');
const {getSourceFolders} = require('./gulpHelpers.js');

function jsPattern(name) {
  return [`${name}/**/*.js`, `${name}/**/*.mjs`]
}

function tsPattern(name) {
  return [`${name}/**/*.ts`]
}

function sourcePattern(name) {
  return jsPattern(name).concat(tsPattern(name));
}

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
  // [false] means disallow ANY import outside of modules/debugging
  // this is because debugging also gets built as a standalone module,
  // and importing global state does not work as expected.
  // in theory imports that do not involve global state are fine, but
  // even innocuous imports can become problematic if the source changes,
  // and it's too easy to forget this is a problem for debugging-standalone.
  'modules/debugging': [false],
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


module.exports = [
  includeIgnoreFile(path.resolve(__dirname, '.gitignore')),
  {
    ignores: [
      'integrationExamples/**/*',
      // do not lint build-related stuff
      '*.js',
      '*.mjs',
      'metadata/**/*',
      'customize/**/*',
      ...jsPattern('plugins'),
      ...jsPattern('.github'),
    ],
  },
  jsdoc.configs['flat/recommended'],
  ...tseslint.configs.recommended,
  ...neostandard({
    files: getSourceFolders().flatMap(jsPattern),
    ts: true,
    filesTs: getSourceFolders().flatMap(tsPattern)
  }),
  {
    files: getSourceFolders().flatMap(sourcePattern),
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
      'no-undef': 2,
      'no-console': 'error',
      'space-before-function-paren': 'off',
      'import/extensions': ['error', 'ignorePackages'],
      'no-restricted-syntax': [
        'error',
        {
          selector: "FunctionDeclaration[id.name=/^log(Message|Info|Warn|Error|Result)$/]",
          message: "Defining a function named 'logResult, 'logMessage', 'logInfo', 'logWarn', or 'logError' is not allowed."
        },
        {
          selector: "VariableDeclarator[id.name=/^log(Message|Info|Warn|Error|Result)$/][init.type=/FunctionExpression|ArrowFunctionExpression/]",
          message: "Assigning a function to 'logResult, 'logMessage', 'logInfo', 'logWarn', or 'logError' is not allowed."
        },
      ],

      // Exceptions below this line are temporary (TM), so that eslint can be added into the CI process.
      // Violations of these styles should be fixed, and the exceptions removed over time.
      //
      // See Issue #1111.
      // also see: reality. These are here to stay.
      // we're working on them though :)

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
      'no-void': 'off',
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
      '@stylistic/comma-dangle': 'off',
      '@stylistic/object-curly-newline': 'off',
      '@stylistic/object-property-newline': 'off',
    }
  },
  ...Object.entries(allowedImports).map(([path, allowed]) => {
    const {globals, props} = noGlobals({
      require: 'use import instead',
      ...Object.fromEntries(['localStorage', 'sessionStorage'].map(k => [k, 'use storageManager instead'])),
      XMLHttpRequest: 'use ajax.js instead'
    })
    return {
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
    }
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
  {
    files: sourcePattern('test'),
    plugins: {
      'chai-friendly': chaiFriendly
    },
    languageOptions: {
      globals: {
        ...globals.mocha,
        ...globals.chai,
        'sinon': false
      }
    },
    rules: {
      'no-template-curly-in-string': 'off',
      'no-unused-expressions': 'off',
      'chai-friendly/no-unused-expressions': 'error',
      // tests were not subject to many rules and they are now a nightmare. rules below this line should be removed over time
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-useless-escape': 'off',
      'no-return-assign': 'off',
      'camelcase': 'off'
    }
  },
  {
    files: getSourceFolders().flatMap(tsPattern),
    rules: {
      // turn off no-undef for TS files - type checker does better
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    files: getSourceFolders().flatMap(jsPattern),
    rules: {
      // turn off typescript rules on js files - just too many violations
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
]
