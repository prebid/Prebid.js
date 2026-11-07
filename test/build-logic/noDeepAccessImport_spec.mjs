import { RuleTester } from 'eslint';
import rule from '../../plugins/eslint/noDeepAccessImport.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' }
});

ruleTester.run('no-deep-access-import', rule, {
  valid: [
    "import { deepAccess as access } from '../src/other.js';",
    "import { deepClone } from '../src/utils.js';",
    'const deepAccess = value => value;',
    "import { deepAccess } from './utils.js';"
  ],
  invalid: [
    {
      code: "import { deepAccess } from '../src/utils.js';",
      errors: [{message: 'Prefer optional chaining over deepAccess when the property path is statically known.'}]
    },
    {
      code: "import { deepAccess, deepClone } from '../../src/utils.js';",
      errors: [{message: 'Prefer optional chaining over deepAccess when the property path is statically known.'}]
    }
  ]
});
