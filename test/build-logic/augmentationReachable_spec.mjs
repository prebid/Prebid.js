import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { expect } from 'chai';
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import rule from '../../plugins/eslint/augmentationReachable.js';
import { checkFiles } from '../../plugins/augmentationReachable.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'augmentation');

function fixture(name) {
  return path.join(FIXTURES, name);
}

// the fixtures stand in for a repository: core.ts is the entry point every consumer's program is
// rooted at. Absolute, so that the check resolves them independently of the working directory.
const options = [{ coreEntry: fixture('core.ts') }];

/**
 * Fixture contents are the code under test: whether an augmentation applies depends on what the
 * augmenting file itself imports, and the check reads that from disk - so an inline snippet that
 * did not match its fixture would not be the thing being answered about.
 */
function read(name) {
  return fs.readFileSync(fixture(name), 'utf8');
}

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    sourceType: 'module'
  }
});

ruleTester.run('augmentation-reachable', rule, {
  valid: [
    {
      // augments what core pulls in, directly and transitively
      code: read('augmentsCore.ts'),
      filename: fixture('augmentsCore.ts'),
      options
    },
    {
      // core does not have the target, but the augmenting file imports it itself
      code: read('pullsInTarget.ts'),
      filename: fixture('pullsInTarget.ts'),
      options
    },
    {
      // only relative augmentations are this rule's business
      code: `export {};\ndeclare module 'some-package' { interface Whatever { added?: number } }`,
      filename: fixture('augmentsCore.ts'),
      options
    },
    {
      // a file with no imports or exports is not a module, so this declares an ambient module
      // instead of augmenting an existing one
      code: `declare module './orphan' { interface Orphan { added?: number } }`,
      filename: fixture('ambient.d.ts'),
      options
    },
    {
      // declared conditional on purpose, with the tag declaration emit keeps
      code: read('optional.ts'),
      filename: fixture('optional.ts'),
      options
    },
    {
      // an augmentation under an ignored directory is nobody's business either
      code: read('ignored/broken.ts'),
      filename: fixture('ignored/broken.ts'),
      options: [{ ...options[0], ignore: [fixture('ignored')] }]
    }
  ],
  invalid: [
    {
      code: read('broken.ts'),
      filename: fixture('broken.ts'),
      options,
      errors: [{ messageId: 'unreachable' }]
    },
    {
      // the tag in a line comment does not survive declaration emit, so it must not suppress here
      code: read('optionalLineComment.ts'),
      filename: fixture('optionalLineComment.ts'),
      options,
      errors: [{ messageId: 'unreachable' }]
    },
    {
      code: `export {};\ndeclare module './nonexistent' { interface Nope { added?: number } }`,
      filename: fixture('augmentsCore.ts'),
      options,
      errors: [{ messageId: 'unresolved' }]
    }
  ]
});

describe('checkFiles', () => {
  // the same policy, without eslint: this is what `gulp check-declarations` runs over the
  // generated declarations, where the imports that survived declaration emit can be seen
  function check(...files) {
    return checkFiles(files.map(fixture), options[0]);
  }

  it('accepts an augmentation of a file core pulls in', () => {
    expect(check('augmentsCore.ts')).to.eql([]);
  });

  it('accepts an augmentation whose target the augmenting file pulls in itself', () => {
    expect(check('pullsInTarget.ts')).to.eql([]);
  });

  it('reports an augmentation of a file that only an unrelated module imports, with its position', () => {
    const problems = check('broken.ts');
    const augmentedAt = read('broken.ts')
      .split('\n').findIndex(line => line.startsWith('declare module')) + 1;
    expect(problems.length).to.equal(1);
    expect(problems[0].file).to.equal(fixture('broken.ts'));
    expect(problems[0].line).to.equal(augmentedAt);
    expect(problems[0].message).to.contain('never applies');
  });

  it('accepts an augmentation marked @augmentationOptional', () => {
    expect(check('optional.ts')).to.eql([]);
    // the tag is the only difference between this fixture and broken.ts
    expect(check('broken.ts').length).to.equal(1);
  });

  it('honours the tag only in JSDoc, which is what declaration emit keeps', () => {
    expect(check('optionalLineComment.ts').length).to.equal(1);
  });

  it('ignores eslint disable directives, which do not apply to generated files', () => {
    expect(check('directiveDisabled.ts').length).to.equal(1);
  });

  it('checks every file it is given', () => {
    expect(check('augmentsCore.ts', 'broken.ts', 'orphan.ts', 'directiveDisabled.ts', 'optional.ts').length).to.equal(2);
  });

  it('does not check files under an ignored directory', () => {
    const ignored = fixture('ignored/broken.ts');
    expect(checkFiles([ignored], options[0]).length).to.equal(1);
    expect(checkFiles([ignored], { ...options[0], ignore: [fixture('ignored')] })).to.eql([]);
  });

  it('refuses to run without a core entry point it can find', () => {
    expect(() => checkFiles([fixture('broken.ts')], {})).to.throw('coreEntry');
    expect(() => checkFiles([fixture('broken.ts')], { coreEntry: fixture('nonexistent.ts') }))
      .to.throw('core entry point');
  });
});
