
const sharedWhiteList = [
  "core-js/library/fn/array/find", // no ie11
  "core-js/library/fn/array/includes", // no ie11
  "core-js/library/fn/set", // ie11 supports Set but not Set#values
  "core-js/library/fn/string/includes", // no ie11
  "core-js/library/fn/number/is-integer", // no ie11,
  "core-js/library/fn/array/from" // no ie11
];

module.exports = {
  "env": {
    "browser": true,
    "commonjs": true
  },
  "settings": {
    "import/resolver": {
      "node": {
        "moduleDirectory": ["node_modules", "./"]
      }
    }
  },
  "extends": "standard",
  "plugins": [
    "prebid"
  ],
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
    "eqeqeq": "off",
    "no-return-assign": "off",
    "no-throw-literal": "off",
    "no-undef": "off",
    "no-useless-escape": "off",
  },
  "overrides": [{
    "files": "modules/**/*.js",
    "rules": {
      "prebid/validate-imports": ["error", [
        ...sharedWhiteList,
        "jsencrypt",
        "crypto-js"
      ]]
    }
  }, {
    "files": "src/**/*.js",
    "rules": {
      "prebid/validate-imports": ["error", [
        ...sharedWhiteList,
        "fun-hooks/no-eval",
        "just-clone",
        "dlv",
        "dset"
      ]]
    }
  }]
};
