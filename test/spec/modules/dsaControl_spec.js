import {addBidResponseHook, setMetaDsa, reset} from '../../../modules/dsaControl.js';
import CONSTANTS from 'src/constants.json';
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

    [2, 3].forEach(required => {
      describe(`when regs.ext.dsa.required is ${required} (required)`, () => {
        beforeEach(() => {
          fpd = {
            regs: {ext: {dsa: {required}}}
          };
        });

        it('should reject bids that have no meta.dsa', () => {
          addBidResponseHook(next, 'adUnit', bid, reject);
          sinon.assert.calledWith(reject, CONSTANTS.REJECTION_REASON.DSA_REQUIRED);
          sinon.assert.notCalled(next);
        });

        it('should accept bids that do', () => {
          bid.meta = {dsa: {}};
          addBidResponseHook(next, 'adUnit', bid, reject);
          sinon.assert.notCalled(reject);
          sinon.assert.calledWith(next, 'adUnit', bid, reject);
        });
      });
    });
    [undefined, 'garbage', 0, 1].forEach(required => {
      describe(`when regs.ext.dsa is ${required}`, () => {
        beforeEach(() => {
          if (required != null) {
            fpd = {
              regs: {ext: {dsa: {required}}}
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

  describe('setMetaDsa', () => {
    it('does nothing if bid has no ext.dsa', () => {
      const resp = {};
      setMetaDsa(resp, {});
      expect(resp).to.eql({});
    });

    it('carries over ext.dsa into meta.dsa', () => {
      const dsa = {transparency: 'info'};
      const resp = {meta: {}};
      setMetaDsa(resp, {ext: {dsa}});
      expect(resp.meta.dsa).to.eql(dsa);
    })
  })
});
