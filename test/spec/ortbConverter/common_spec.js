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
              deal: { type: 2, cpm: 5, priority_adjusted_cpm: 10, on_schedule: 0.8, priority: 3, source: 'adserver' }
            }
          }
        })).to.eql({ type: 2, cpm: 5, priorityAdjustedCpm: 10, onSchedule: 0.8, priority: 3, source: 'adserver' });
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
              deal: { type: 1, cpm: -1, priority_adjusted_cpm: Infinity, on_schedule: '0.5', priority: 1.5, source: 1, extra: 'ignored' }
            }
          }
        })).to.eql({ type: 1 });
      });

      it('drops an empty source', () => {
        expect(dealMetaFor({ dealid: 'deal-1', ext: { prebid: { deal: { type: 1, source: '' } } } })).to.eql({ type: 1 });
      });

      it('allows negative integer priority', () => {
        expect(dealMetaFor({ dealid: 'deal-1', ext: { prebid: { deal: { type: 4, priority: -1 } } } }).priority).to.equal(-1);
      });

      describe('takeover', () => {
        function takeoverFor(takeover) {
          return dealMetaFor({ dealid: 'deal-1', ext: { prebid: { deal: { type: 3, takeover } } } }).takeover;
        }

        it('is normalized from ext.prebid.deal.takeover', () => {
          expect(takeoverFor({
            mode: 'viewport',
            min_slots: 3,
            exclusivity: { adomain: ['opponent.com'], cat: ['IAB11-4'] }
          })).to.eql({
            mode: 'viewport',
            minSlots: 3,
            exclusivity: { adomain: ['opponent.com'], cat: ['IAB11-4'] }
          });
        });

        it('is not set when missing or not an object', () => {
          expect(takeoverFor(undefined)).to.not.exist;
          expect(takeoverFor('all')).to.not.exist;
        });

        ['all', 'max', 'viewport'].forEach(mode => {
          it(`keeps mode ${mode}`, () => {
            expect(takeoverFor({ mode }).mode).to.equal(mode);
          });
        });

        [undefined, 'page', 1].forEach(mode => {
          it(`defaults mode to max when it is ${mode}`, () => {
            expect(takeoverFor({ mode }).mode).to.equal('max');
          });
        });

        it('drops fields that are not correctly typed', () => {
          expect(takeoverFor({
            mode: 'all',
            min_slots: 0,
            exclusivity: { adomain: 'opponent.com', cat: [1, ''] },
            groupId: 'from-bidder'
          })).to.eql({ mode: 'all' });
        });

        it('keeps only the valid entries of exclusivity lists', () => {
          expect(takeoverFor({ exclusivity: { adomain: ['a.com', 2, ''] } })).to.eql({
            mode: 'max',
            exclusivity: { adomain: ['a.com'] }
          });
        });

        it('drops a non-integer min_slots', () => {
          expect(takeoverFor({ min_slots: 2.5 }).minSlots).to.not.exist;
        });
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
