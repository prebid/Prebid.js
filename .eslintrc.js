module.exports = {
  "env": {
    "browser": true,
    "commonjs": true,
  },
  "extends": "standard",
  "globals": {
    "$$PREBID_GLOBAL$$": false,
  },
  "parserOptions": {
    "sourceType": "module",
  },
  "rules": {
    "comma-dangle": "off",
    "semi": "off",
    "space-before-function-paren": "off",

    // Exceptions below this line are temporary, so that eslint can be added into the CI process.
    // Violations of these styles should be fixed, and the exceptions removed over time.
    //
    // See Issue #1111.
    "import/first": "off",
    "no-multiple-empty-lines": "off",
    "valid-typeof": "off",
    "one-var": "off",
    "camelcase": "off",
    "no-mixed-operators": "off",
    "no-throw-literal": "off",
    "no-useless-escape": "off",
    "brace-style": "off",
    "no-return-assign": "off",
    "no-undef": "off",
    "eqeqeq": "off",
    "no-control-regex": "off",
    "standard/no-callback-literal": "off",
    "no-redeclare": "off",
    "no-use-before-define": "off",
    "no-unused-vars": "off"
  },
};
