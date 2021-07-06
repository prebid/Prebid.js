
const allowedModules = require("./allowedModules");

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
    "prebid",
    "import"
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
    "import/extensions": ["error", "ignorePackages"],

    // Exceptions below this line are temporary, so that eslint can be added into the CI process.
    // Violations of these styles should be fixed, and the exceptions removed over time.
    //
    // See Issue #1111.
    "eqeqeq": "off",
    "no-return-assign": "off",
    "no-throw-literal": "off",
    "no-undef": 2,
    "no-useless-escape": "off",
    "no-console": "error"
  },
  "overrides": Object.keys(allowedModules).map((key) => ({
    "files": key + "/**/*.js",
    "rules": {
      "prebid/validate-imports": ["error", allowedModules[key]]
    }
  }))
};
