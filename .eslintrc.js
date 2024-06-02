
const allowedModules = require('./allowedModules.js');

module.exports = {
  env: {
    browser: true,
    commonjs: true
  },
  settings: {
    'import/resolver': {
      node: {
        moduleDirectory: ['node_modules', './']
      }
    },
    'jsdoc': {
      mode: 'typescript',
      tagNamePreference: {
        'tag constructor': 'constructor',
        extends: 'extends',
        method: 'method',
        return: 'return',
      }
    }
  },
  extends: [
    'standard',
    'plugin:jsdoc/recommended'
  ],
  plugins: [
    'prebid',
    'import',
    'jsdoc'
  ],
  globals: {
    'BROWSERSTACK_USERNAME': false,
    'BROWSERSTACK_KEY': false,
    'FEATURES': 'readonly',
  },
  // use babel as parser for fancy syntax
  parser: '@babel/eslint-parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
  ignorePatterns: ['libraries/creative-renderer*'],

  rules: {
    'comma-dangle': 'off',
    semi: 'off',
    'space-before-function-paren': 'off',
    'import/extensions': ['error', 'ignorePackages'],

    // Exceptions below this line are temporary, so that eslint can be added into the CI process.
    // Violations of these styles should be fixed, and the exceptions removed over time.
    //
    // See Issue #1111.
    eqeqeq: 'off',
    'no-return-assign': 'off',
    'no-throw-literal': 'off',
    'no-undef': 2,
    'no-useless-escape': 'off',
    'no-console': 'error',
    'jsdoc/check-types': 'off',
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
    'jsdoc/tag-lines': 'off'
  },
  overrides: Object.keys(allowedModules).map((key) => ({
    files: key + '/**/*.js',
    rules: {
      'prebid/validate-imports': ['error', allowedModules[key]],
      'no-restricted-globals': [
        'error',
        {
          name: 'require',
          message: 'use import instead'
        }
      ]
    }
  })).concat([{
    // code in other packages (such as plugins/eslint) is not "seen" by babel and its parser will complain.
    files: 'plugins/*/**/*.js',
    parser: 'esprima'
  }])
};
