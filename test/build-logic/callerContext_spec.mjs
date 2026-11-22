import { describe, it } from 'mocha';
import { expect } from 'chai';
import callerContext from '../../plugins/callerContext.js';

const { countGvlids } = callerContext;

describe('callerContext countGvlids', () => {
  Object.entries({
    'a single component': [[{ gvlid: 1 }], 1],
    'components with the same GVL ID': [[{ gvlid: 1 }, { gvlid: 1 }], 1],
    'components with different GVL IDs': [[{ gvlid: 1 }, { gvlid: 2 }], 2],
    'a component without a GVL ID next to one with it': [[{ gvlid: 1 }, { gvlid: null }], 2],
    'components without GVL IDs': [[{ gvlid: null }, {}], 1],
    'components with the same list of GVL IDs': [[{ gvlid: [1, 2] }, { gvlid: [1, 2] }], 1],
    'components with the same GVL IDs in a different order': [[{ gvlid: [2, 1] }, { gvlid: [1, 2] }], 1],
    'components with different lists of GVL IDs': [[{ gvlid: [1, 2] }, { gvlid: [1, 3] }], 2],
    'a list next to a single GVL ID': [[{ gvlid: [1, 2] }, { gvlid: 1 }], 2],
  }).forEach(([t, [components, expected]]) => {
    it(`counts ${expected} for ${t}`, () => {
      expect(countGvlids(components)).to.equal(expected);
    });
  });
});
