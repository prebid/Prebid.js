// Writes MARKER when a run failed only because the browser connection did (CI retries those runs; see the
// workflows' "Run specs" steps). A failing test, or any other error, leaves it out. The marker reads QUEUE_FULL when
// BrowserStack refused the session, so the retry waits for one to free up.
import fs from 'node:fs';
import path from 'node:path';

export const MARKER = 'build/vitest-infra-failure';
export const QUEUE_FULL = 'queue-full';

function * causes(error) {
  for (let e = error, depth = 0; e && depth < 10; e = e.cause, depth++) yield e;
}

/**
 * Whether an error, or one of its causes, is BrowserStack refusing a new session because its queue is full.
 * @param {object} error an Error or a SerializedError
 * @returns {boolean}
 */
export function isQueueFull(error) {
  return [...causes(error)].some(e => (e.message ?? '').includes('BROWSERSTACK_QUEUE_SIZE_EXCEEDED'));
}

/**
 * Whether an error, or one of its causes, is a lost or never established browser connection.
 * @param {object} error an Error or a SerializedError
 * @returns {boolean}
 */
export function isInfrastructureError(error) {
  return isQueueFull(error) || [...causes(error)].some(e =>
    e.code === 'VITEST_BROWSER_CONNECTION_CLOSED' ||
    /^Failed to connect to the browser session\b/.test(e.message ?? '')
  );
}

/**
 * Whether a run failed, and only for infrastructure reasons, so that running it again could pass.
 * @param {ReadonlyArray<object>} testModules Vitest's TestModules
 * @param {ReadonlyArray<object>} unhandledErrors
 * @param {'passed'|'failed'|'interrupted'} reason
 * @returns {boolean}
 */
export function infrastructureFailure(testModules, unhandledErrors, reason) {
  if (reason === 'passed') return false;
  const errors = [...unhandledErrors];
  for (const testModule of testModules) {
    errors.push(...testModule.errors());
    for (const test of testModule.children.allTests()) {
      const result = test.result();
      if (result.state !== 'failed') continue;
      // a failed test with no error to show for it is no evidence of a lost connection
      if (!result.errors?.length) return false;
      errors.push(...result.errors);
    }
  }
  return errors.length > 0 && errors.every(isInfrastructureError);
}

export default class InfraFailureReporter {
  onInit(vitest) {
    this.marker = path.join(vitest.config.root, MARKER);
    fs.rmSync(this.marker, { force: true });
  }

  onTestRunEnd(testModules, unhandledErrors, reason) {
    if (!infrastructureFailure(testModules, unhandledErrors, reason)) return;
    fs.mkdirSync(path.dirname(this.marker), { recursive: true });
    fs.writeFileSync(this.marker, unhandledErrors.some(isQueueFull) ? QUEUE_FULL : '');
  }
}
