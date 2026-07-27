import path from 'path';
import { fileURLToPath } from 'url';
import { expect } from 'chai';
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import rule from '../../plugins/eslint/augmentationReachable.js';
import { checkFiles } from '../../plugins/augmentationReachable.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'augmentation');
// absolute, so that the rule resolves them independently of the working directory
const options = [{ roots: [FIXTURES], entryDirs: [path.join(FIXTURES, 'modules')] }];
const filename = path.join(FIXTURES, 'augmenting.ts');

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    sourceType: 'module'
  }
});

ruleTester.run('augmentation-reachable', rule, {
  valid: [
    {
      // fixtures/augmentation/importer.ts imports the target, so the augmentation applies
      code: `import './target.js';\ndeclare module './target' { interface Extensible { added?: number } }`,
      filename,
      options
    },
    {
      // module entry points are reachable through package.json "exports", without being imported
      code: `import './target.js';\ndeclare module './modules/entry' { interface EntryConfig { added?: number } }`,
      filename,
      options
    },
    {
      code: `import './target.js';\ndeclare module 'some-package' { interface Whatever { added?: number } }`,
      filename,
      options
    },
    {
      // a file with no imports or exports is not a module, so this declares an ambient module
      // instead of augmenting an existing one
      code: `declare module './orphan' { interface Orphan { added?: number } }`,
      filename: path.join(FIXTURES, 'ambient.d.ts'),
      options
    }
  ],
  invalid: [
    {
      code: `import './target.js';\ndeclare module './orphan' { interface Orphan { added?: number } }`,
      filename,
      options,
      errors: [{ messageId: 'unreachable' }]
    },
    {
      code: `import './target.js';\ndeclare module './nonexistent' { interface Nope { added?: number } }`,
      filename,
      options,
      errors: [{ messageId: 'unresolved' }]
    }
  ]
});

describe('checkFiles', () => {
  // the same policy, without eslint: this is what `gulp check-declarations` runs over the
  // generated declarations, where the imports that survived declaration emit can be seen
  function check(...files) {
    return checkFiles(files.map(name => path.join(FIXTURES, name)), options[0]);
  }

  it('accepts an augmentation whose target is imported', () => {
    expect(check('augmenting.ts')).to.eql([]);
  });

  it('reports an augmentation whose target nothing imports, with its position', () => {
    const problems = check('broken.ts');
    expect(problems.length).to.equal(1);
    expect(problems[0].file).to.equal(path.join(FIXTURES, 'broken.ts'));
    expect(problems[0].line).to.equal(5);
    expect(problems[0].message).to.contain('never applies');
  });

  it('ignores eslint disable directives, which do not apply to generated files', () => {
    expect(check('broken.ts').length).to.equal(1);
  });

  it('checks every file it is given', () => {
    expect(check('augmenting.ts', 'broken.ts', 'target.ts').length).to.equal(1);
  });
});
