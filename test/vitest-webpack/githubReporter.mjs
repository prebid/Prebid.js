// GitHub Actions annotations for the webpack-bundled specs, in place of Vitest's own GitHub reporter.
// That one anchors a failure at the first stack frame it can map to a repo file; the specs run from
// bundles without source maps, so it always landed on the Mocha shim in setup.mjs. This one anchors
// it at the failing test's `it(...)` line in the source spec instead (or at the file, when the title
// cannot be located uniquely, e.g. titles built in a loop).
import fs from 'node:fs';
import path from 'node:path';

const BUNDLES = 'build/vitest-bundles/';

// https://docs.github.com/actions/reference/workflow-commands-for-github-actions
const escapeData = (value) => String(value).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = (value) => escapeData(value).replace(/:/g, '%3A').replace(/,/g, '%2C');

/**
 * Source spec for a bundle: build.js writes build/vitest-bundles/<x>.js for test/spec/<x>.js.
 * @param {string} relativeModuleId test file path relative to the repository root
 * @returns {string} path of the source spec
 */
export function specPath(relativeModuleId) {
  const id = relativeModuleId.replace(/\\/g, '/');
  return id.startsWith(BUNDLES) ? 'test/spec/' + id.slice(BUNDLES.length) : id;
}

/**
 * Line of the `it(...)` call whose title is `name`, if exactly one line matches.
 * @param {string} source spec source
 * @param {string} name test title
 * @returns {number|null} 1-based line number, or null when absent or ambiguous
 */
export function testLine(source, name) {
  const hits = [];
  source.split(/\r?\n/).forEach((line, index) => {
    if (/\b(it|specify)(\.only|\.skip)?\s*\(/.test(line) && line.includes(name)) {
      hits.push(index + 1);
    }
  });
  return hits.length === 1 ? hits[0] : null;
}

/**
 * Format a GitHub Actions error annotation.
 * @param {object} annotation
 * @param {string} annotation.file path relative to the repository root
 * @param {number|null} [annotation.line] line to anchor at; the whole file when omitted
 * @param {string} annotation.title annotation title
 * @param {string} annotation.message annotation body
 * @returns {string} workflow command
 */
export function formatAnnotation({ file, line, title, message }) {
  const properties = [`file=${escapeProperty(file)}`];
  if (line) properties.push(`line=${line}`);
  properties.push(`title=${escapeProperty(title)}`);
  return `::error ${properties.join(',')}::${escapeData(message)}`;
}

const errorMessages = (errors, fallback) => (errors ?? []).map(error => error?.message).filter(Boolean).join('\n') || fallback;

export default class GithubSpecReporter {
  constructor({ write = (line) => process.stdout.write(line + '\n') } = {}) {
    this.write = write;
    this.root = process.cwd();
  }

  onInit(vitest) {
    this.root = vitest.config.root;
  }

  onTestCaseResult(testCase) {
    const result = testCase.result();
    if (result.state !== 'failed') return;
    const file = specPath(testCase.module.relativeModuleId);
    let line = null;
    try {
      line = testLine(fs.readFileSync(path.join(this.root, file), 'utf8'), testCase.name);
    } catch (e) {
      // spec not found: annotate the file only
    }
    this.write(formatAnnotation({ file, line, title: testCase.fullName, message: errorMessages(result.errors, 'Test failed') }));
  }

  onTestModuleEnd(testModule) {
    const errors = testModule.errors();
    if (errors.length === 0) return;
    this.write(formatAnnotation({
      file: specPath(testModule.relativeModuleId),
      title: 'Spec file failed to run',
      message: errorMessages(errors, 'Spec file failed to run'),
    }));
  }
}
