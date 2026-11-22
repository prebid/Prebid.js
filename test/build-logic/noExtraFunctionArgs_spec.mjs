import { RuleTester } from 'eslint';
import rule from '../../plugins/eslint/noExtraFunctionArgs.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
});

ruleTester.run('no-extra-function-args', rule, {
  valid: [
    {
      code: `
        function makeReader(value) {
          const read = () => arguments[0] || value;
          return read;
        }
        makeReader('one', 'two');
      `
    },
    {
      code: `
        function makeReader(value) {
          function read() {
            return arguments[0];
          }
          return read;
        }
        makeReader('one');
      `
    }
  ],
  invalid: [
    {
      code: `
        function makeReader(value) {
          function read() {
            return arguments[0];
          }
          return read;
        }
        makeReader('one', 'two');
      `,
      errors: [{ message: "Function 'makeReader' expects at most 1 argument, but 2 were provided." }]
    }
  ]
});
