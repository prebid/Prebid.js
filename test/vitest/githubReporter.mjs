// GitHub Actions annotations for the unit tests, in place of Vitest's own GitHub reporter: a failure is anchored at
// the failing test's `it(...)` line in the source spec (test/spec/...), not in the precompiled copy (dist/src/...)
// that ran. When the title can't be located uniquely (e.g. titles built in a loop), the annotation falls back to
// the spec file.
import fs from 'node:fs';
import path from 'node:path';

// https://docs.github.com/actions/reference/workflow-commands-for-github-actions
const escapeData = (value) => String(value).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = (value) => escapeData(value).replace(/:/g, '%3A').replace(/,/g, '%2C');

/**
 * Source spec for a test file: test/spec/<x> runs as its precompiled copy, dist/src/test/spec/<x>.
 * @param {string} relativeModuleId test file path relative to the repository root
 * @returns {string} path of the source spec
 */
export function specPath(relativeModuleId) {
  const id = relativeModuleId.replace(/\\/g, '/');
  const at = id.indexOf('test/spec/');
  return at > 0 ? id.slice(at) : id;
}

/**
 * Lines of the `it(...)` calls whose title is `name`.
 * @param {string} source spec source
 * @param {string} name test title
 * @returns {number[]} 1-based line numbers
 */
function testLines(source, name) {
  const hits = [];
  source.split(/\r?\n/).forEach((line, index) => {
    if (/\b(it|specify)(\.only|\.skip)?\s*\(/.test(line) && line.includes(name)) {
      hits.push(index + 1);
    }
  });
  return hits;
}

/**
 * Line of the `it(...)` call whose title is `name`, if exactly one line matches.
 * @param {string} source spec source
 * @param {string} name test title
 * @returns {number|null} 1-based line number, or null when absent or ambiguous
 */
export function testLine(source, name) {
  const hits = testLines(source, name);
  return hits.length === 1 ? hits[0] : null;
}

/**
 * Where to annotate a failing test, given the source specs its test file runs.
 * @param {{file: string, source: string}[]} candidates source specs (one, or a whole chunk)
 * @param {string} name test title
 * @returns {{file: string|null, line: number|null}} a unique file and line when possible
 */
export function locateTest(candidates, name) {
  const matches = candidates
    .map(({ file, source }) => ({ file, lines: testLines(source, name) }))
    .filter(({ lines }) => lines.length > 0);
  if (matches.length === 1) {
    const [{ file, lines }] = matches;
    return { file, line: lines.length === 1 ? lines[0] : null };
  }
  return { file: candidates.length === 1 ? candidates[0].file : null, line: null };
}

/**
 * Format a GitHub Actions error annotation.
 * @param {object} annotation
 * @param {string|null} [annotation.file] path relative to the repository root; none when unknown
 * @param {number|null} [annotation.line] line to anchor at; the whole file when omitted
 * @param {string} annotation.title annotation title
 * @param {string} annotation.message annotation body
 * @returns {string} workflow command
 */
export function formatAnnotation({ file, line, title, message }) {
  const properties = [];
  if (file) properties.push(`file=${escapeProperty(file)}`);
  if (file && line) properties.push(`line=${line}`);
  properties.push(`title=${escapeProperty(title)}`);
  return `::error ${properties.join(',')}::${escapeData(message)}`;
}

const errorMessages = (errors, fallback) => (errors ?? []).map(error => error?.message).filter(Boolean).join('\n') || fallback;

export default class GithubSpecReporter {
  constructor({ write = (line) => process.stdout.write(line + '\n'), root = process.cwd() } = {}) {
    this.write = write;
    this.root = root;
  }

  onInit(vitest) {
    this.root = vitest.config.root;
  }

  /**
   * Source specs a test file runs (one).
   * @param {string} relativeModuleId test file path relative to the repository root
   * @returns {string[]} spec paths
   */
  specsFor(relativeModuleId) {
    return [specPath(relativeModuleId)];
  }

  read(file) {
    try {
      return fs.readFileSync(path.join(this.root, file), 'utf8');
    } catch (e) {
      return '';
    }
  }

  onTestCaseResult(testCase) {
    const result = testCase.result();
    if (result.state !== 'failed') return;
    const candidates = this.specsFor(testCase.module.relativeModuleId).map(file => ({ file, source: this.read(file) }));
    const { file, line } = locateTest(candidates, testCase.name);
    this.write(formatAnnotation({ file, line, title: testCase.fullName, message: errorMessages(result.errors, 'Test failed') }));
  }

  onTestModuleEnd(testModule) {
    const errors = testModule.errors();
    if (errors.length === 0) return;
    const specs = this.specsFor(testModule.relativeModuleId);
    this.write(formatAnnotation({
      file: specs.length === 1 ? specs[0] : null,
      title: specs.length === 1 ? 'Spec file failed to run' : `${testModule.relativeModuleId} failed to run`,
      message: errorMessages(errors, 'Spec file failed to run'),
    }));
  }
}
