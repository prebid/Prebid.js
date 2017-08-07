module.exports = {
  "env": {
    "browser": true,
    "commonjs": true
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
    "brace-style": "off",
    "camelcase": "off",
    "eqeqeq": "off",
    "no-control-regex": "off",
    "no-return-assign": "off",
    "no-throw-literal": "off",
    "no-undef": "off",
    "no-use-before-define": "off",
    "no-useless-escape": "off",
    "standard/no-callback-literal": "off",
  }
};
