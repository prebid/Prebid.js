module.exports = {
  "rules": {
    // This rule restricts import of other modules within the module directory
    // and also ensures use of relative path when importing from src/
    "no-restricted-imports": ["error", {
      "patterns": ["./*", "src/*"]
    }],
    // Needed to support CommonJS style require statements.
    "no-restricted-modules": ["error", {
      "patterns": ["./*", "src/*"]
    }]
  }
}

