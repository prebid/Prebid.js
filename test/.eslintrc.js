module.exports = {
  env: {
    browser: true,
    mocha: true
  },
  extends: 'standard',
  globals: {
    '$$PREBID_GLOBAL$$': false
  },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018
  },
  rules: {
    'comma-dangle': 'off',
    semi: 'off',
    'space-before-function-paren': 'off',

    // Exceptions below this line are temporary, so that eslint can be added into the CI process.
    // Violations of these styles should be fixed, and the exceptions removed over time.
    //
    // See Issue #1111.
    camelcase: 'off',
    eqeqeq: 'off',
    'no-mixed-spaces-and-tabs': 'off', // this is a good rule, but we have a lot of violations
    'no-tabs': 'off',
    'no-unused-expressions': 'off', // this is a good rule, but we have a lot of violations
    'import/no-duplicates': 'off',
    'import/extensions': 'off',
    'no-template-curly-in-string': 'off',
    'no-global-assign': 'off',
    'no-path-concat': 'off',
    'no-redeclare': 'off',
    'node/no-deprecated-api': 'off',
    'no-return-assign': 'off',
    'no-undef': 'off',
    'no-unused-vars': 'off',
    'no-use-before-define': 'off',
    'no-useless-escape': 'off',
    'one-var': 'off',
    // added with latest eslint upgrade
    'array-bracket-spacing': 'off',
    'no-prototype-builtins': 'off',
    'object-curly-spacing': 'off',
    'object-curly-newline': 'off',
    'object-shorthand': 'off',
    'prefer-const': 'off',
    'no-var': 'off',
    'no-loss-of-precision': 'warn', // this is a good rule, but we have a lot of violations
    'no-multiple-empty-lines': 'off',
    'computed-property-spacing': 'off',
    'import/no-absolute-path': 'off',
    'import/no-named-default': 'warn', // this is a good rule, but we have a lot of violations
    'multiline-ternary': 'off',
    'no-void': 'off',
    'no-case-declarations': 'off',
    'quote-props': 'off',
    'dot-notation': 'off',
    'quotes': 'off',
    'prefer-regex-literals': 'off',
    'array-callback-return': 'off', // this is a good rule, but we have a lot of violations
    'no-array-constructor': 'off', // this is a good rule, but we have a lot of violations
  }
};
