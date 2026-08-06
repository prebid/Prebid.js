const {RuleTester} = require('eslint');
const rule = require('../noRedundantValidatedCondition.js');

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'script'
  }
});

ruleTester.run('no-redundant-validated-condition', rule, {
  valid: [
    `
      function example(foo, bar, maybeNull) {
        if (!foo) return;
        foo = maybeNull();
        if (foo && bar) bar();
      }
    `,
    `
      function example(foo, bar, maybeNull) {
        if (!foo) return;
        {
          let foo = maybeNull();
          if (foo && bar) bar();
        }
      }
    `,
    `
      function example(foo, bar) {
        if (!foo) return;
        try {
          bar();
        } catch (foo) {
          if (foo && bar) bar();
        }
      }
    `,
    `
      function example(foo, bar, maybeNull, cond) {
        if (!foo) return;
        if (cond) {
          foo = maybeNull();
        }
        if (foo && bar) bar();
      }
    `
  ],
  invalid: [
    {
      code: `
        function example(foo, bar) {
          if (!foo) return;
          if (foo && bar) bar();
        }
      `,
      errors: [{message: "Redundant conditional: 'foo' is already known to be truthy."}]
    }
  ]
});
