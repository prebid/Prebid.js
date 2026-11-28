import { expect } from 'chai';
import sinon from 'sinon';
import { analyticsAuctionOrtb2, eidsSources, eidValue } from '../../../libraries/eidUtils/eidUtils.js';
import { auctionManager } from '../../../src/auctionManager.js';
import { registerActivityControl } from '../../../src/activities/rules.js';
import { ACTIVITY_TRANSMIT_EIDS } from '../../../src/activities/activities.js';
import { MODULE_TYPE_ANALYTICS } from '../../../src/activities/modules.js';

describe('eidUtils', () => {
  const ORTB2 = {
    user: {
      eids: [
        { source: 'a.com', uids: [{ id: 'a-1' }, { id: 'a-2' }] },
        { source: 'b.com', uids: [{ id: 'b-1' }] }
      ],
      ext: {
        eids: [
          { source: 'b.com', uids: [{ id: 'b-2' }] },
          { source: 'c.com', uids: [{ id: 'c-1' }] },
          { uids: [{ id: 'no-source' }] }
        ]
      }
    }
  };

  describe('eidsSources', () => {
    it('lists unique sources across user.eids and user.ext.eids', () => {
      expect(eidsSources(ORTB2)).to.eql(['a.com', 'b.com', 'c.com']);
    });

    [undefined, {}, { user: {} }, { user: { ext: {} } }, { user: { eids: [], ext: { eids: [] } } }].forEach(ortb2 => {
      it(`returns an empty list for ${JSON.stringify(ortb2)}`, () => {
        expect(eidsSources(ortb2)).to.eql([]);
      });
    });
  });

  describe('eidValue', () => {
    it('returns the first id of the first EID with the given source', () => {
      expect(eidValue(ORTB2, 'a.com')).to.equal('a-1');
      expect(eidValue(ORTB2, 'b.com')).to.equal('b-1');
    });

    it('looks in user.ext.eids', () => {
      expect(eidValue(ORTB2, 'c.com')).to.equal('c-1');
    });

    it('returns undefined when there is no EID with that source', () => {
      expect(eidValue(ORTB2, 'd.com')).to.equal(undefined);
    });

    [undefined, {}, { user: { ext: { eids: [{ source: 'a.com' }] } } }, { user: { ext: { eids: [{ source: 'a.com', uids: [] }] } } }].forEach(ortb2 => {
      it(`returns undefined for ${JSON.stringify(ortb2)}`, () => {
        expect(eidValue(ortb2, 'a.com')).to.equal(undefined);
      });
    });
  });

  describe('analyticsAuctionOrtb2', () => {
    let sandbox;
    const GLOBAL_FPD = { user: { ext: { eids: [{ source: 'a.com', uids: [{ id: 'a-1' }] }] } } };

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(auctionManager.index, 'getAuction').callsFake(({ auctionId }) => {
        if (auctionId === 'auction-1') {
          return { getFPD: () => ({ global: GLOBAL_FPD, bidder: {} }) };
        }
      });
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("returns the auction's global FPD", () => {
      expect(analyticsAuctionOrtb2('auction-1', 'testAnalytics')).to.equal(GLOBAL_FPD);
    });

    it('returns undefined for an unknown auction', () => {
      expect(analyticsAuctionOrtb2('other', 'testAnalytics')).to.equal(undefined);
    });

    it('returns undefined when transmitEids is denied to the analytics adapter', () => {
      const unregister = registerActivityControl(ACTIVITY_TRANSMIT_EIDS, 'test', (params) => {
        if (params.componentType === MODULE_TYPE_ANALYTICS && params.componentName === 'testAnalytics') {
          return { allow: false };
        }
      });
      try {
        expect(analyticsAuctionOrtb2('auction-1', 'testAnalytics')).to.equal(undefined);
        expect(analyticsAuctionOrtb2('auction-1', 'otherAnalytics')).to.equal(GLOBAL_FPD);
      } finally {
        unregister();
      }
    });
  });
});
