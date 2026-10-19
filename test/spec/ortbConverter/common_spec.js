import { DEFAULT_PROCESSORS } from '../../../libraries/ortbConverter/processors/default.js';
import { BID_RESPONSE, IMP } from '../../../src/pbjsORTB.js';

describe('common processors', () => {
  describe('bid response properties', () => {
    const responseProps = DEFAULT_PROCESSORS[BID_RESPONSE].props.fn;
    let context;

    beforeEach(() => {
      context = {
        ortbResponse: {}
      };
    });

    describe('meta.dsa', () => {
      const MOCK_DSA = { transparency: 'info' };
      it('is not set if bid has no meta.dsa', () => {
        const resp = {};
        responseProps(resp, {}, context);
        expect(resp.meta?.dsa).to.not.exist;
      });
      it('is set to ext.dsa otherwise', () => {
        const resp = {};
        responseProps(resp, { ext: { dsa: MOCK_DSA } }, context);
        expect(resp.meta.dsa).to.eql(MOCK_DSA);
      });
    });

    describe('meta.deal', () => {
      function dealMetaFor(bid) {
        const resp = {};
        responseProps(resp, bid, context);
        return resp.meta.deal;
      }

      it('is not set if bid has no ext.prebid.deal', () => {
        expect(dealMetaFor({ dealid: 'deal-1' })).to.not.exist;
      });

      it('is not set if bid has no dealid', () => {
        expect(dealMetaFor({ ext: { prebid: { deal: { type: 1, cpm: 5 } } } })).to.not.exist;
      });

      it('is not set if ext.prebid.deal is not an object', () => {
        expect(dealMetaFor({ dealid: 'deal-1', ext: { prebid: { deal: 'sponsorship' } } })).to.not.exist;
      });

      it('is normalized from ext.prebid.deal', () => {
        expect(dealMetaFor({
          dealid: 'deal-1',
          ext: {
            prebid: {
              deal: { type: 2, cpm: 5, pacing_adjusted_cpm: 10, on_schedule: 0.8, priority: 3 }
            }
          }
        })).to.eql({ type: 2, cpm: 5, pacingAdjustedCpm: 10, onSchedule: 0.8, priority: 3 });
      });

      [
        [0, 0],
        [1, 1],
        [4, 4],
        [5, 5],
        ['1', 0],
        [1.5, 0],
        [undefined, 0]
      ].forEach(([type, expected]) => {
        it(`sets type ${expected} when ext.prebid.deal.type is ${typeof type} ${type}`, () => {
          expect(dealMetaFor({ dealid: 'deal-1', ext: { prebid: { deal: { type } } } }).type).to.equal(expected);
        });
      });

      it('drops fields that are not correctly typed', () => {
        expect(dealMetaFor({
          dealid: 'deal-1',
          ext: {
            prebid: {
              deal: { type: 1, cpm: -1, pacing_adjusted_cpm: Infinity, on_schedule: '0.5', priority: 1.5, extra: 'ignored' }
            }
          }
        })).to.eql({ type: 1 });
      });

      it('allows negative integer priority', () => {
        expect(dealMetaFor({ dealid: 'deal-1', ext: { prebid: { deal: { type: 4, priority: -1 } } } }).priority).to.equal(-1);
      });
    });
  });
  describe('bid imp fpd', () => {
    const impFpd = DEFAULT_PROCESSORS[IMP].secure.fn;

    it('should set secure as 1 if publisher did not set it', () => {
      const imp = {};
      impFpd(imp);
      expect(imp.secure).to.eql(1);
    });

    it('should not overwrite secure if set by publisher', () => {
      const imp = { secure: 0 };
      impFpd(imp);
      expect(imp.secure).to.eql(0);
    });
  });
});
