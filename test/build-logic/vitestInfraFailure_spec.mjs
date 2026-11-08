import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import InfraFailureReporter, { MARKER, QUEUE_FULL, infrastructureFailure } from '../vitest/infraFailureReporter.mjs';

// shaped as Vitest 5 reports them, from runs whose page navigated away mid-file, and with a 1ms connectTimeout
const connectionClosed = () => ({
  type: 'Unhandled Error',
  name: 'Error',
  message: 'Failed to run the test /repo/dist/src/test/spec/a_spec.js.',
  cause: {
    name: 'Error',
    message: '[vitest] Browser connection was closed while running tests. Was the page closed unexpectedly?',
    code: 'VITEST_BROWSER_CONNECTION_CLOSED',
    cause: { name: 'Error', message: '[birpc] rpc is closed, cannot call "createTesters"' },
  },
});
const connectFailed = () => ({
  type: 'Unhandled Error',
  name: 'Error',
  message: 'Failed to connect to the browser session "eaa59b1f-7482-4f40-b3bb-8849033a5305" [chromium] within the timeout.',
});
// as webdriver throws it when BrowserStack refuses the session
const queueFull = () => ({
  type: 'Unhandled Error',
  name: 'Error',
  message: 'WebDriverError: [BROWSERSTACK_QUEUE_SIZE_EXCEEDED] All parallel tests are currently in use, and the number of sessions have exceeded the queue limit. Please wait to finish or upgrade your plan to add more sessions when running "https://hub.browserstack.com/wd/hub/session" with method "POST"',
});
const assertion = () => ({ name: 'AssertionError', message: 'expected 1 to equal 2', actual: '1', expected: '2' });

const testCase = (state, errors) => ({ result: () => ({ state, errors }) });
const testModule = ({ errors = [], tests = [] } = {}) => ({
  errors: () => errors,
  children: { * allTests() { yield * tests; } },
});
const pending = () => testModule({ tests: [testCase('pending', undefined)] });
const failed = () => testModule({ tests: [testCase('passed', []), testCase('failed', [assertion()])] });

describe('Vitest infrastructure failures', () => {
  it('retries a run whose browser connection closed', () => {
    expect(infrastructureFailure([pending()], [connectionClosed()], 'failed')).to.equal(true);
  });

  it('retries a run that could not connect to the browser', () => {
    expect(infrastructureFailure([testModule()], [connectFailed()], 'failed')).to.equal(true);
  });

  it('retries a run whose BrowserStack session was refused for a full queue', () => {
    expect(infrastructureFailure([testModule()], [queueFull()], 'failed')).to.equal(true);
    expect(infrastructureFailure([testModule()], [{ name: 'Error', message: 'Failed to open the browser', cause: queueFull() }], 'failed')).to.equal(true);
  });

  it('does not retry a run with a failed test, even if the connection also closed', () => {
    expect(infrastructureFailure([failed(), pending()], [connectionClosed()], 'failed')).to.equal(false);
  });

  it('does not retry failed tests', () => {
    expect(infrastructureFailure([failed()], [], 'failed')).to.equal(false);
  });

  it('does not retry a spec file that failed to load', () => {
    const module = testModule({ errors: [{ name: 'TypeError', message: "Cannot read properties of undefined (reading 'timeout')" }] });
    expect(infrastructureFailure([module], [connectionClosed()], 'failed')).to.equal(false);
  });

  it('does not retry other unhandled errors', () => {
    expect(infrastructureFailure([pending()], [connectionClosed(), { type: 'Unhandled Rejection', message: 'boom' }], 'failed')).to.equal(false);
  });

  it('does not retry a failure with nothing to show for it', () => {
    expect(infrastructureFailure([testModule({ tests: [testCase('failed', [])] })], [connectionClosed()], 'failed')).to.equal(false);
    expect(infrastructureFailure([testModule()], [], 'failed')).to.equal(false);
  });

  it('does not retry a run that passed', () => {
    expect(infrastructureFailure([testModule({ tests: [testCase('passed', [])] })], [], 'passed')).to.equal(false);
  });

  describe('reporter', () => {
    const run = (root, ...end) => {
      const reporter = new InfraFailureReporter();
      reporter.onInit({ config: { root } });
      if (end.length) reporter.onTestRunEnd(...end);
      return fs.existsSync(path.join(root, MARKER));
    };

    it('writes the marker only for an infrastructure failure, and clears a stale one', () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vitest-infra-'));
      try {
        expect(run(root, [pending()], [connectionClosed()], 'failed')).to.equal(true);
        expect(run(root)).to.equal(false);
        expect(run(root, [failed()], [], 'failed')).to.equal(false);
        expect(run(root, [], [], 'passed')).to.equal(false);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    it('marks a full BrowserStack queue, so the retry waits', () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vitest-infra-'));
      const marker = () => fs.readFileSync(path.join(root, MARKER), 'utf8');
      try {
        run(root, [testModule()], [queueFull()], 'failed');
        expect(marker()).to.equal(QUEUE_FULL);
        run(root, [pending()], [connectionClosed()], 'failed');
        expect(marker()).to.equal('');
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  });
});
