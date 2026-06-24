import { RuleTester } from 'eslint';
import { describe, it } from 'mocha';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const prebid = require('../../plugins/eslint/index.js');

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
});

describe('prebid/no-implicit-operand-conversion', () => {
  ruleTester.run('no-implicit-operand-conversion', prebid.rules['no-implicit-operand-conversion'], {
    valid: [
      'const isReady = Boolean(value); if (isReady < 1) {}',
      'if (value < 1) {}',
      'if (!value === true) {}',
      'const value = 1; const label = `${value}`;',
      'const value = getValue(); const label = `${value}`;',
      'const value = undefined; const label = `${String(value)}`;',
      'function getLabel() {}; const label = `${getLabel()}`;',
      'const getLabel = () => {}; const label = `${getLabel()}`;'
    ],
    invalid: [
      {
        code: 'if (!value < 1) {}',
        errors: [{ message: 'Do not compare a negated value; compare the original operand explicitly instead.' }]
      },
      {
        code: 'if (value >= !limit) {}',
        errors: [{ message: 'Do not compare a negated value; compare the original operand explicitly instead.' }]
      },
      {
        code: 'const value = undefined; const label = `${value}`;',
        errors: [{ message: 'Avoid interpolating values that require implicit string conversion.' }]
      },
      {
        code: 'let value; const label = `${value}`;',
        errors: [{ message: 'Avoid interpolating values that require implicit string conversion.' }]
      },
      {
        code: 'function getLabel() {}; const label = `${getLabel}`;',
        errors: [{ message: 'Avoid interpolating values that require implicit string conversion.' }]
      },
      {
        code: 'const getLabel = () => {}; const label = `${getLabel}`;',
        errors: [{ message: 'Avoid interpolating values that require implicit string conversion.' }]
      },
      {
        code: 'const getLabel = function() {}; const label = `${getLabel}`;',
        errors: [{ message: 'Avoid interpolating values that require implicit string conversion.' }]
      },
      {
        code: 'const label = `${undefined}`;',
        errors: [{ message: 'Avoid interpolating values that require implicit string conversion.' }]
      }
    ]
  });
});
