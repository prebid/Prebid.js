import * as videoCache from 'src/videoCache.js';

/**
 * Function which can be called from unit tests to stub out the video cache.
 *
 * @param {Object} responses
 * @param {} responses.store If this is an Error, we'll stub out the store function so that it fails.
 *   If it's anything else, the store function will succeed, sending that value into the callback.
 *
 * @return {function} A function which returns the current stubs for the mocked functions.
 */
export default function useVideoCacheStub(responses) {
  let storeStub;

  beforeEach(function () {
    storeStub = sinon.stub(videoCache, 'store');

    if (responses.store instanceof Error) {
      storeStub.callsArgWith(1, responses.store);
    } else {
      storeStub.callsArgWith(1, null, responses.store);
    }
  });

  afterEach(function () {
    videoCache.store.restore();
  });

  return function() {
    return {
      store: storeStub
    };
  }
}
