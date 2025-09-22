import {resetWinDimensions} from '../../../src/utils.js';
import * as extraWinDimensions from '../../../libraries/extraWinDimensions/extraWinDimensions.js';

describe('extraWinDimensions', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.stub()
  })

  it('should reset together with basic dimensions', () => {
    const resetSpy = sinon.spy(extraWinDimensions.internal, 'fetchExtraDimensions');
    resetWinDimensions();
    sinon.assert.called(resetSpy);
  })
});
