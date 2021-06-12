module.exports = {
  "env": {
    "browser": true,
    "mocha": true
  },
  "extends": "standard",
  "globals": {
    "$$PREBID_GLOBAL$$": false
  },
  "parserOptions": {
    "sourceType": "module"
  },
  "rules": {
    "comma-dangle": "off",
    "semi": "off",
    "space-before-function-paren": "off",

    // Exceptions below this line are temporary, so that eslint can be added into the CI process.
    // Violations of these styles should be fixed, and the exceptions removed over time.
    //
    // See Issue #1111.
    "camelcase": "off",
    "eqeqeq": "off",
    "no-mixed-spaces-and-tabs": "off",
    "no-tabs": "off",
    "no-unused-expressions": "off",
    "import/no-duplicates": "off",
    "no-template-curly-in-string": "off",
    "no-global-assign": "off",
    "no-path-concat": "off",
    "no-redeclare": "off",
    "node/no-deprecated-api": "off",
    "no-return-assign": "off",
    "no-undef": "off",
    "no-unused-vars": "off",
    "no-use-before-define": "off",
    "no-useless-escape": "off",
    "one-var": "off"
  }
};
