import {
  addBidResponseHook,
  BID_ADV_DOMAINS_REJECTION_REASON,
  BID_ATTR_REJECTION_REASON,
  BID_CATEGORY_REJECTION_REASON,
  BID_MEDIA_TYPE_REJECTION_REASON,
  MODULE_NAME,
  reset
} from '../../../modules/bidResponseFilter/index.js';
import { addBidResponse } from '../../../src/auction.js';
import { config } from '../../../src/config.js';

describe('bidResponseFilter', () => {
  let mockAuctionIndex
  beforeEach(() => {
    mockAuctionIndex = {
      getBidRequest: () => {
      },
      getAdUnit: () => {
      }
    };
  });
  afterEach(() => {
    config.resetConfig();
    reset();
  })

  describe('enable/disable', () => {
    let reject, dispatch;

    beforeEach(() => {
      reject = sinon.stub();
      dispatch = sinon.stub();
    });

    it('should not run if not configured', () => {
      reset();
      addBidResponse.call({dispatch}, 'au', {}, reject);
      sinon.assert.notCalled(reject);
      sinon.assert.called(dispatch);
    });

    it('should run if configured', () => {
      config.setConfig({
        bidResponseFilter: {}
      });
      addBidResponse.call({dispatch}, 'au', {}, reject);
      sinon.assert.called(reject);
      sinon.assert.notCalled(dispatch);
    })
  });

  it('should pass the bid after successful ortb2 rules validation', () => {
    const call = sinon.stub();

    mockAuctionIndex.getOrtb2 = () => ({
      badv: [], bcat: ['BANNED_CAT1', 'BANNED_CAT2']
    });

    mockAuctionIndex.getBidRequest = () => ({
      mediaTypes: {
        banner: {}
      },
      ortb2Imp: {}
    })

    const bid = {
      meta: {
        advertiserDomains: ['domain1.com', 'domain2.com'],
        primaryCatId: 'EXAMPLE-CAT-ID',
        attr: 'attr',
        mediaType: 'banner'
      }
    };

    addBidResponseHook(call, 'adcode', bid, () => {
    }, mockAuctionIndex);
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
        attr: 'valid_attr',
        mediaType: 'banner',
      }
    };

    mockAuctionIndex.getBidRequest = () => ({
      mediaTypes: {
        banner: {}
      },
      ortb2Imp: {}
    })

    mockAuctionIndex.getOrtb2 = () => ({
      badv: ['domain2.com'], bcat: ['BANNED_CAT1', 'BANNED_CAT2']
    });

    config.setConfig({[MODULE_NAME]: {cat: {enforce: false}}});

    addBidResponseHook(call, 'adcode', bid, () => {
    }, mockAuctionIndex);
    sinon.assert.calledOnce(call);
  });

  it('should allow bid for unknown flag set to false', () => {
    const call = sinon.stub();
    const bid = {
      meta: {
        advertiserDomains: ['validdomain1.com', 'validdomain2.com'],
        primaryCatId: undefined,
        attr: 'valid_attr',
        mediaType: 'banner'
      }
    };

    mockAuctionIndex.getOrtb2 = () => ({
      badv: ['domain2.com'], bcat: ['BANNED_CAT1', 'BANNED_CAT2']
    });

    mockAuctionIndex.getBidRequest = () => ({
      mediaTypes: {
        banner: {}
      },
      ortb2Imp: {}
    })

    config.setConfig({[MODULE_NAME]: {cat: {blockUnknown: false}}});

    addBidResponseHook(call, 'adcode', bid, () => {
    }, mockAuctionIndex);
    sinon.assert.calledOnce(call);
  });

  it('should reject bid for meta.mediaType not present on adunit', () => {
    const reject = sinon.stub();
    const call = sinon.stub();
    const bid = {
      meta: {
        advertiserDomains: ['validdomain1.com', 'validdomain2.com'],
        primaryCatId: 'VALID_CAT',
        attr: 6,
        mediaType: 'audio'
      },
    };

    mockAuctionIndex.getOrtb2 = () => ({
      badv: [], bcat: []
    });

    mockAuctionIndex.getBidRequest = () => ({
      ortb2Imp: {
        banner: {
        },
        video: {
        },
      }
    })

    mockAuctionIndex.getBidRequest = () => ({
      mediaTypes: {
        banner: {},
      },
      ortb2Imp: {}
    })

    addBidResponseHook(call, 'adcode', bid, reject, mockAuctionIndex);
    sinon.assert.calledWith(reject, BID_MEDIA_TYPE_REJECTION_REASON);
  });
})
