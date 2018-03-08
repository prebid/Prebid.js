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
    "comma-dangle": ["error", "always"],
    "semi": "off",
    "space-before-function-paren": "off",
  }
};
