import sinon from 'sinon';

/**
 * Function which can be called from inside a describe() block to make sure that each test runs in a sandbox.
 *
 * @return {function} A function which can be called from it() blocks to return the current sandbox.
 */
export default function useSandbox() {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  return function() {
    return sandbox;
  }
}
