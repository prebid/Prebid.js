
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
    }
  },
  extends: 'standard',
  plugins: [
    'prebid',
    'import'
  ],
  globals: {
    '$$PREBID_GLOBAL$$': false,
    'BROWSERSTACK_USERNAME': false,
    'BROWSERSTACK_KEY': false
  },
  // use babel as parser for fancy syntax
  parser: '@babel/eslint-parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },

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
