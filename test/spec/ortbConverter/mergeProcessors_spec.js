import {mergeProcessors} from '../../../libraries/ortbConverter/lib/mergeProcessors.js';
import {BID_RESPONSE, IMP, REQUEST, RESPONSE} from '../../../src/pbjsORTB.js';

describe('mergeProcessors', () => {
  it('can merge', () => {
    const result = mergeProcessors({
      [REQUEST]: {
        first: {
          priority: 0,
          fn: 'first'
        }
      },
      [RESPONSE]: {
        second: {
          priority: 1,
          fn: 'second'
        }
      }
    }, {
      [REQUEST]: {
        first: {
          fn: 'overriden'
        }
      },
      [IMP]: {
        third: {
          fn: 'third'
        }
      }
    }, {
      [IMP]: {
        third: {
          priority: 3,
          fn: 'overridden'
        }
      }
    });
    expect(result).to.eql({
      [REQUEST]: {
        first: {
          fn: 'overriden'
        }
      },
      [IMP]: {
        third: {
          priority: 3,
          fn: 'overridden'
        },
      },
      [RESPONSE]: {
        second: {
          priority: 1,
          fn: 'second'
        }
      },
      [BID_RESPONSE]: {}
    });
  });
});
