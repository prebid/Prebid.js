import { expect } from 'chai';
import { describe, it } from 'mocha';
import GithubSpecReporter, { formatAnnotation, locateTest, specPath, testLine } from '../vitest-webpack/githubReporter.mjs';

describe('Vitest trial GitHub annotations', () => {
  it('maps a bundle back to its source spec', () => {
    expect(specPath('build/vitest-bundles/libraries/consentManagement/consentUtils_spec.js'))
      .to.equal('test/spec/libraries/consentManagement/consentUtils_spec.js');
    expect(specPath('build\\vitest-bundles\\modules\\aSpec_spec.js')).to.equal('test/spec/modules/aSpec_spec.js');
    expect(specPath('test/spec/other_spec.js')).to.equal('test/spec/other_spec.js');
  });

  it('finds the line of a uniquely titled test', () => {
    const source = [
      "describe('suite', function () {",
      "  it('returns true when granted', function () {",
      '  });',
      "  it.skip('returns false otherwise', () => {});",
      '});'
    ].join('\r\n');
    expect(testLine(source, 'returns true when granted')).to.equal(2);
    expect(testLine(source, 'returns false otherwise')).to.equal(4);
    expect(testLine(source, 'not here')).to.equal(null);
    // a describe() with the same text is not a test
    expect(testLine(source, 'suite')).to.equal(null);
  });

  it('does not guess between duplicate titles', () => {
    const source = "it('same', () => {});\nit('same', () => {});";
    expect(testLine(source, 'same')).to.equal(null);
  });

  it('formats escaped workflow commands', () => {
    expect(formatAnnotation({ file: 'test/spec/a_spec.js', line: 3, title: 'a > b, c: d', message: '50% off\nnext' }))
      .to.equal('::error file=test/spec/a_spec.js,line=3,title=a > b%2C c%3A d::50%25 off%0Anext');
    expect(formatAnnotation({ file: 'test/spec/a_spec.js', line: null, title: 't', message: 'm' }))
      .to.equal('::error file=test/spec/a_spec.js,title=t::m');
  });

  it('annotates only failed tests and failed modules', () => {
    const lines = [];
    const reporter = new GithubSpecReporter({ write: (line) => lines.push(line), groups: {} });
    const module = { relativeModuleId: 'build/vitest-bundles/does/not_exist_spec.js', errors: () => [] };
    reporter.onTestCaseResult({ module, name: 'ok', fullName: 'ok', result: () => ({ state: 'passed' }) });
    reporter.onTestModuleEnd(module);
    expect(lines).to.eql([]);

    reporter.onTestCaseResult({
      module,
      name: 'bad',
      fullName: 'suite > bad',
      result: () => ({ state: 'failed', errors: [{ message: 'expected false to be true' }] })
    });
    reporter.onTestModuleEnd({ ...module, errors: () => [{ message: 'SyntaxError' }] });
    expect(lines).to.eql([
      '::error file=test/spec/does/not_exist_spec.js,title=suite > bad::expected false to be true',
      '::error file=test/spec/does/not_exist_spec.js,title=Spec file failed to run::SyntaxError'
    ]);
  });

  it('locates a failure among the specs of a chunk', () => {
    const candidates = [
      { file: 'test/spec/a_spec.js', source: "it('other', () => {});" },
      { file: 'test/spec/b_spec.js', source: "describe('b', () => {\n  it('fails here', () => {});\n});" },
      { file: 'test/spec/c_spec.js', source: "it('shared', () => {});" },
      { file: 'test/spec/d_spec.js', source: "it('shared', () => {});" },
    ];
    expect(locateTest(candidates, 'fails here')).to.eql({ file: 'test/spec/b_spec.js', line: 2 });
    // the same title in two specs: no file to point at
    expect(locateTest(candidates, 'shared')).to.eql({ file: null, line: null });
    expect(locateTest(candidates, 'missing')).to.eql({ file: null, line: null });
    // a single-spec test file still annotates its spec
    expect(locateTest([candidates[0]], 'missing')).to.eql({ file: 'test/spec/a_spec.js', line: null });
  });

  it('uses groups.json to annotate chunk test files', () => {
    const lines = [];
    const reporter = new GithubSpecReporter({
      write: (line) => lines.push(line),
      groups: { 'build/vitest-bundles/chunks/chunk-1_spec.js': ['test/spec/a_spec.js', 'test/spec/b_spec.js'] }
    });
    reporter.read = (file) => (file === 'test/spec/b_spec.js' ? "it('bad', () => {});" : '');
    const module = { relativeModuleId: 'build/vitest-bundles/chunks/chunk-1_spec.js', errors: () => [{ message: 'boom' }] };
    reporter.onTestCaseResult({
      module, name: 'bad', fullName: 'b > bad', result: () => ({ state: 'failed', errors: [{ message: 'nope' }] })
    });
    reporter.onTestModuleEnd(module);
    expect(lines).to.eql([
      '::error file=test/spec/b_spec.js,line=1,title=b > bad::nope',
      '::error title=build/vitest-bundles/chunks/chunk-1_spec.js failed to run::boom'
    ]);
  });
});
