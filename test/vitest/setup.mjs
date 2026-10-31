import sinon from 'sinon';

// Existing specs expect Sinon as a global; Karma's karma-sinon plugin supplies it.
// Vitest provides Mocha-style describe/it/hooks and Chai-style expect with globals:true.
globalThis.sinon = sinon;

// Karma uses Mocha's before()/after() names. Vitest exposes their
// beforeAll()/afterAll() equivalents, so keep these unchanged legacy suites
// executable without modifying their source.
globalThis.before = beforeAll;
globalThis.after = afterAll;

// The Karma bootstrap initializes this shared mock, which hooks request resets
// into Mocha at module evaluation time. With Vitest isolate:false, imports are
// cached across spec files, so those hooks are not re-registered for later files.
const { server } = await import('test/mocks/xhr.js');

// Vitest executes setupFiles before EACH spec even with isolate:false. Register
// the reset here rather than relying only on the imported mock's root hook.
// Otherwise server.requests[0] can refer to the preceding test's request and
// a test can time out waiting for a response sent to that stale request.
beforeEach(() => {
  server.reset();
});
