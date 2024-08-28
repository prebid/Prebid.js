import { BID_ADV_DOMAINS_REJECTION_REASON, BID_ATTR_REJECTION_REASON, BID_CATEGORY_REJECTION_REASON, MODULE_NAME, PUBLISHER_FILTER_REJECTION_REASON, addBidResponseHook } from '../../../modules/bidResponseFilter';
import { config } from '../../../src/config';

describe('bidResponseFilter', () => {
  let mockAuctionIndex
  beforeEach(() => {
    config.resetConfig();
    mockAuctionIndex = {
      getBidRequest: () => {},
      getAdUnit: () => {}
    };
  });

  it('should pass the bid after successful ortb2 rules validation', () => {
    const call = sinon.stub();

    mockAuctionIndex.getOrtb2 = () => ({
      badv: [], bcat: ['BANNED_CAT1', 'BANNED_CAT2']
    });

    const bid = {
      meta: {
        advertiserDomains: ['domain1.com', 'domain2.com'],
        primaryCatId: 'EXAMPLE-CAT-ID',
        attr: 'attr'
      }
    };

    addBidResponseHook(call, 'adcode', bid, () => {}, mockAuctionIndex);
    sinon.assert.calledOnce(call);
  });

  it('should reject the bid after failed ortb2 cat rule validation', () => {
    const reject = sinon.stub();
    const call = sinon.stub();
    const bid = {
      meta: {
        advertiserDomains: ['domain1.com', 'domain2.com'],
        primaryCatId: 'BANNED_CAT1',
        attr: 'attr'
      }
    };
    mockAuctionIndex.getOrtb2 = () => ({
      badv: [], bcat: ['BANNED_CAT1', 'BANNED_CAT2']
    });

    addBidResponseHook(call, 'adcode', bid, reject, mockAuctionIndex);
    sinon.assert.calledWith(reject, BID_CATEGORY_REJECTION_REASON);
  });

  it('should reject the bid after failed ortb2 adv domains rule validation', () => {
    const rejection = sinon.stub();
    const call = sinon.stub();
    const bid = {
      meta: {
        advertiserDomains: ['domain1.com', 'domain2.com'],
        primaryCatId: 'VALID_CAT',
        attr: 'attr'
      }
    };
    mockAuctionIndex.getOrtb2 = () => ({
      badv: ['domain2.com'], bcat: ['BANNED_CAT1', 'BANNED_CAT2']
    });

    addBidResponseHook(call, 'adcode', bid, rejection, mockAuctionIndex);
    sinon.assert.calledWith(rejection, BID_ADV_DOMAINS_REJECTION_REASON);
  });

  it('should reject the bid after failed ortb2 attr rule validation', () => {
    const reject = sinon.stub();
    const call = sinon.stub();
    const bid = {
      meta: {
        advertiserDomains: ['validdomain1.com', 'validdomain2.com'],
        primaryCatId: 'VALID_CAT',
        attr: 'BANNED_ATTR'
      },
      mediaType: 'video'
    };
    mockAuctionIndex.getOrtb2 = () => ({
      badv: ['domain2.com'], bcat: ['BANNED_CAT1', 'BANNED_CAT2']
    });

    mockAuctionIndex.getBidRequest = () => ({
      ortb2Imp: {
        video: {
          battr: 'BANNED_ATTR'
        }
      }
    })

    addBidResponseHook(call, 'adcode', bid, reject, mockAuctionIndex);
    sinon.assert.calledWith(reject, BID_ATTR_REJECTION_REASON);
  });

  it('should omit the validation if the flag is set to false', () => {
    const call = sinon.stub();
    const bid = {
      meta: {
        advertiserDomains: ['validdomain1.com', 'validdomain2.com'],
        primaryCatId: 'BANNED_CAT1',
        attr: 'valid_attr'
      }
    };

    mockAuctionIndex.getOrtb2 = () => ({
      badv: ['domain2.com'], bcat: ['BANNED_CAT1', 'BANNED_CAT2']
    });

    config.setConfig({[MODULE_NAME]: {cat: {enforce: false}}});

    addBidResponseHook(call, 'adcode', bid, () => {}, mockAuctionIndex);
    sinon.assert.calledOnce(call);
  });

  it('should allow bid for unknown flag set to false', () => {
    const call = sinon.stub();
    const bid = {
      meta: {
        advertiserDomains: ['validdomain1.com', 'validdomain2.com'],
        primaryCatId: undefined,
        attr: 'valid_attr'
      }
    };

    mockAuctionIndex.getOrtb2 = () => ({
      badv: ['domain2.com'], bcat: ['BANNED_CAT1', 'BANNED_CAT2']
    });

    config.setConfig({[MODULE_NAME]: {cat: {blockUnknown: false}}});

    addBidResponseHook(call, 'adcode', bid, () => {});
    sinon.assert.calledOnce(call);
  });
})
