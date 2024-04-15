import {addBidResponseHook, setMetaDsa, reset} from '../../../modules/dsaControl.js';
import { REJECTION_REASON } from 'src/constants.js';
import {auctionManager} from '../../../src/auctionManager.js';
import {AuctionIndex} from '../../../src/auctionIndex.js';

describe('DSA transparency', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });
  afterEach(() => {
    sandbox.restore();
    reset();
  });

  describe('addBidResponseHook', () => {
    const auctionId = 'auction-id';
    let bid, auction, fpd, next, reject;
    beforeEach(() => {
      next = sinon.stub();
      reject = sinon.stub();
      fpd = {};
      bid = {
        auctionId
      }
      auction = {
        getAuctionId: () => auctionId,
        getFPD: () => ({global: fpd})
      }
      sandbox.stub(auctionManager, 'index').get(() => new AuctionIndex(() => [auction]));
    });

    function expectRejection(reason) {
      addBidResponseHook(next, 'adUnit', bid, reject);
      sinon.assert.calledWith(reject, reason);
      sinon.assert.notCalled(next);
    }

    function expectAcceptance() {
      addBidResponseHook(next, 'adUnit', bid, reject);
      sinon.assert.notCalled(reject);
      sinon.assert.calledWith(next, 'adUnit', bid, reject);
    }

    [2, 3].forEach(required => {
      describe(`when regs.ext.dsa.dsarequired is ${required} (required)`, () => {
        beforeEach(() => {
          fpd = {
            regs: {ext: {dsa: {dsarequired: required}}}
          };
        });

        it('should reject bids that have no meta.dsa', () => {
          expectRejection(REJECTION_REASON.DSA_REQUIRED);
        });

        it('should accept bids that do', () => {
          bid.meta = {dsa: {}};
          expectAcceptance();
        });

        describe('and pubrender = 0 (rendering by publisher not supported)', () => {
          beforeEach(() => {
            fpd.regs.ext.dsa.pubrender = 0;
          });

          it('should reject bids with adrender = 0 (advertiser will not render)', () => {
            bid.meta = {dsa: {adrender: 0}};
            expectRejection(REJECTION_REASON.DSA_MISMATCH);
          });

          it('should accept bids with adrender = 1 (advertiser will render)', () => {
            bid.meta = {dsa: {adrender: 1}};
            expectAcceptance();
          });
        });
        describe('and pubrender = 2 (publisher will render)', () => {
          beforeEach(() => {
            fpd.regs.ext.dsa.pubrender = 2;
          });

          it('should reject bids with adrender = 1 (advertiser will render)', () => {
            bid.meta = {dsa: {adrender: 1}};
            expectRejection(REJECTION_REASON.DSA_MISMATCH);
          });

          it('should accept bids with adrender = 0 (advertiser will not render)', () => {
            bid.meta = {dsa: {adrender: 0}};
            expectAcceptance();
          })
        })
      });
    });
    [undefined, 'garbage', 0, 1].forEach(required => {
      describe(`when regs.ext.dsa.dsarequired is ${required}`, () => {
        beforeEach(() => {
          if (required != null) {
            fpd = {
              regs: {ext: {dsa: {dsarequired: required}}}
            }
          }
        });

        it('should accept bids regardless of their meta.dsa', () => {
          addBidResponseHook(next, 'adUnit', bid, reject);
          sinon.assert.notCalled(reject);
          sinon.assert.calledWith(next, 'adUnit', bid, reject);
        })
      })
    })
    it('should accept bids regardless of dsa when "required" any other value')
  });
});
