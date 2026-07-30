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
  let mockAuctionIndex;
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
  });

  describe('enable/disable', () => {
    let reject, dispatch;

    beforeEach(() => {
      reject = sinon.stub();
      dispatch = sinon.stub();
    });

    it('should not run if not configured', () => {
      reset();
      addBidResponse.call({ dispatch }, 'au', {}, reject);
      sinon.assert.notCalled(reject);
      sinon.assert.called(dispatch);
    });

    it('should run if configured', () => {
      config.setConfig({
        bidResponseFilter: {}
      });
      addBidResponse.call({ dispatch }, 'au', {}, reject);
      sinon.assert.called(reject);
      sinon.assert.notCalled(dispatch);
    });
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
    });

    const bid = {
      meta: {
        advertiserDomains: ['domain1.com', 'domain2.com'],
        primaryCatId: 'EXAMPLE-CAT-ID',
        attr: ['attr'],
        mediaType: 'banner',
        cattax: 1
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
        attr: ['attr'],
        cattax: 1
      }
    };
    mockAuctionIndex.getOrtb2 = () => ({
      badv: [], bcat: ['BANNED_CAT1', 'BANNED_CAT2']
    });

    addBidResponseHook(call, 'adcode', bid, reject, mockAuctionIndex);
    sinon.assert.calledWith(reject, BID_CATEGORY_REJECTION_REASON);
  });

  describe('cattax (category taxonomy) match', () => {
    it('should reject with BID_CATEGORY_REJECTION_REASON when cattax matches and primaryCatId is in bcat blocklist', () => {
      const reject = sinon.stub();
      const call = sinon.stub();
      const bid = {
        meta: {
          advertiserDomains: ['domain1.com'],
          primaryCatId: 'BANNED_CAT1',
          attr: [1],
          mediaType: 'banner',
          cattax: 1
        }
      };
      mockAuctionIndex.getOrtb2 = () => ({
        badv: [], bcat: ['BANNED_CAT1'], cattax: 1
      });
      mockAuctionIndex.getBidRequest = () => ({
        mediaTypes: { banner: {} },
        ortb2Imp: {}
      });

      addBidResponseHook(call, 'adcode', bid, reject, mockAuctionIndex);
      sinon.assert.calledWith(reject, BID_CATEGORY_REJECTION_REASON);
      sinon.assert.notCalled(call);
    });

    it('should pass when cattax matches and primaryCatId is not in bcat blocklist', () => {
      const reject = sinon.stub();
      const call = sinon.stub();
      const bid = {
        meta: {
          advertiserDomains: ['domain1.com'],
          primaryCatId: 'ALLOWED_CAT',
          attr: [1],
          mediaType: 'banner',
          cattax: 1
        }
      };
      mockAuctionIndex.getOrtb2 = () => ({
        badv: [], bcat: ['BANNED_CAT1'], cattax: 1
      });
      mockAuctionIndex.getBidRequest = () => ({
        mediaTypes: { banner: {} },
        ortb2Imp: {}
      });

      addBidResponseHook(call, 'adcode', bid, reject, mockAuctionIndex);
      sinon.assert.notCalled(reject);
      sinon.assert.calledOnce(call);
    });

    it('should reject with BID_CATEGORY_REJECTION_REASON when cattax does not match (treat primaryCatId as unknown)', () => {
      const reject = sinon.stub();
      const call = sinon.stub();
      const bid = {
        meta: {
          advertiserDomains: ['domain1.com'],
          primaryCatId: 'ALLOWED_CAT',
          attr: [1],
          mediaType: 'banner',
          cattax: 2
        }
      };
      mockAuctionIndex.getOrtb2 = () => ({
        badv: [], bcat: ['BANNED_CAT1'], cattax: 1
      });
      mockAuctionIndex.getBidRequest = () => ({
        mediaTypes: { banner: {} },
        ortb2Imp: {}
      });

      addBidResponseHook(call, 'adcode', bid, reject, mockAuctionIndex);
      sinon.assert.calledWith(reject, BID_CATEGORY_REJECTION_REASON);
      sinon.assert.notCalled(call);
    });

    it('should pass when cattax does not match and blockUnknown is false (do not treat as unknown)', () => {
      const reject = sinon.stub();
      const call = sinon.stub();
      const bid = {
        meta: {
          advertiserDomains: ['domain1.com'],
          primaryCatId: 'BANNED_CAT1',
          attr: [1],
          mediaType: 'banner',
          cattax: 2
        }
      };
      mockAuctionIndex.getOrtb2 = () => ({
        badv: [], bcat: ['BANNED_CAT1'], cattax: 1
      });
      mockAuctionIndex.getBidRequest = () => ({
        mediaTypes: { banner: {} },
        ortb2Imp: {}
      });
      config.setConfig({ [MODULE_NAME]: { cat: { blockUnknown: false } } });

      addBidResponseHook(call, 'adcode', bid, reject, mockAuctionIndex);
      sinon.assert.notCalled(reject);
      sinon.assert.calledOnce(call);
    });
  });

  describe('module config and request two-pass validation', () => {
    [
      {
        field: 'bcat',
        bid: {
          meta: {
            advertiserDomains: ['domain1.com'],
            primaryCatId: 'CONFIG_BANNED_CAT',
            attr: [1],
            mediaType: 'banner',
            cattax: 1
          }
        },
        ortb2: { badv: [], bcat: ['REQUEST_BANNED_CAT'], cattax: 1 },
        bidRequest: { mediaTypes: { banner: {} }, ortb2Imp: {} },
        moduleConfig: { cat: { bcat: ['CONFIG_BANNED_CAT'] } },
        rejectionReason: BID_CATEGORY_REJECTION_REASON
      },
      {
        field: 'cattax',
        bid: {
          meta: {
            advertiserDomains: ['domain1.com'],
            primaryCatId: 'ALLOWED_CAT',
            attr: [1],
            mediaType: 'banner',
            cattax: 2
          }
        },
        ortb2: { badv: [], bcat: [], cattax: 1 },
        bidRequest: { mediaTypes: { banner: {} }, ortb2Imp: {} },
        moduleConfig: { cat: { cattax: 2 } },
        rejectionReason: BID_CATEGORY_REJECTION_REASON
      },
      {
        field: 'badv',
        bid: {
          meta: {
            advertiserDomains: ['blocked.com'],
            primaryCatId: 'VALID_CAT',
            attr: [1],
            mediaType: 'banner',
            cattax: 1
          }
        },
        ortb2: { badv: ['other.com'], bcat: [], cattax: 1 },
        bidRequest: { mediaTypes: { banner: {} }, ortb2Imp: {} },
        moduleConfig: { adv: { badv: ['blocked.com'] } },
        rejectionReason: BID_ADV_DOMAINS_REJECTION_REASON
      },
      {
        field: 'battr',
        bid: {
          mediaType: 'video',
          meta: {
            advertiserDomains: ['domain1.com'],
            primaryCatId: 'VALID_CAT',
            attr: ['CONFIG_BANNED_ATTR'],
            mediaType: 'video',
            cattax: 1
          }
        },
        ortb2: { badv: [], bcat: [], cattax: 1 },
        bidRequest: {
          mediaTypes: { video: {} },
          ortb2Imp: { video: { battr: ['REQUEST_BANNED_ATTR'] } }
        },
        moduleConfig: { attr: { battr: ['CONFIG_BANNED_ATTR'] } },
        rejectionReason: BID_ATTR_REJECTION_REASON
      }
    ].forEach(({ field, bid, ortb2, bidRequest, moduleConfig, rejectionReason }) => {
      it(`should reject using module config ${field} in the first validation pass`, () => {
        const reject = sinon.stub();
        const call = sinon.stub();
        mockAuctionIndex.getOrtb2 = () => ortb2;
        mockAuctionIndex.getBidRequest = () => bidRequest;
        config.setConfig({ [MODULE_NAME]: moduleConfig });

        addBidResponseHook(call, 'adcode', bid, reject, mockAuctionIndex);

        sinon.assert.calledWith(reject, rejectionReason);
        sinon.assert.notCalled(call);
      });
    });

    it('should reject in the request pass when only the request blocklist matches', () => {
      const reject = sinon.stub();
      const call = sinon.stub();
      const bid = {
        meta: {
          advertiserDomains: ['domain1.com'],
          primaryCatId: 'REQUEST_BANNED_CAT',
          attr: [1],
          mediaType: 'banner',
          cattax: 1
        }
      };
      mockAuctionIndex.getOrtb2 = () => ({
        badv: [], bcat: ['REQUEST_BANNED_CAT'], cattax: 1
      });
      mockAuctionIndex.getBidRequest = () => ({
        mediaTypes: { banner: {} },
        ortb2Imp: {}
      });
      config.setConfig({
        [MODULE_NAME]: {
          cat: { bcat: ['CONFIG_BANNED_CAT'] }
        }
      });

      addBidResponseHook(call, 'adcode', bid, reject, mockAuctionIndex);

      sinon.assert.calledWith(reject, BID_CATEGORY_REJECTION_REASON);
      sinon.assert.notCalled(call);
    });

    it('should pass when bid satisfies both module config and request blocklists', () => {
      const reject = sinon.stub();
      const call = sinon.stub();
      const bid = {
        meta: {
          advertiserDomains: ['domain1.com'],
          primaryCatId: 'ALLOWED_CAT',
          attr: [1],
          mediaType: 'banner',
          cattax: 1
        }
      };
      mockAuctionIndex.getOrtb2 = () => ({
        badv: [], bcat: ['REQUEST_BANNED_CAT'], cattax: 1
      });
      mockAuctionIndex.getBidRequest = () => ({
        mediaTypes: { banner: {} },
        ortb2Imp: {}
      });
      config.setConfig({
        [MODULE_NAME]: {
          cat: { bcat: ['CONFIG_BANNED_CAT'], cattax: 1 }
        }
      });

      addBidResponseHook(call, 'adcode', bid, reject, mockAuctionIndex);

      sinon.assert.notCalled(reject);
      sinon.assert.calledOnce(call);
    });
  });

  it('should reject the bid after failed ortb2 adv domains rule validation', () => {
    const rejection = sinon.stub();
    const call = sinon.stub();
    const bid = {
      meta: {
        advertiserDomains: ['domain1.com', 'domain2.com'],
        primaryCatId: 'VALID_CAT',
        attr: ['attr'],
        cattax: 1
      }
    };
    mockAuctionIndex.getOrtb2 = () => ({
      badv: ['domain2.com'], bcat: ['BANNED_CAT1', 'BANNED_CAT2']
    });

    addBidResponseHook(call, 'adcode', bid, rejection, mockAuctionIndex);
    sinon.assert.calledWith(rejection, BID_ADV_DOMAINS_REJECTION_REASON);
  });

  describe('attr validation', () => {
    let reject, call;

    function makeBid(attr) {
      return {
        meta: {
          advertiserDomains: ['validdomain1.com', 'validdomain2.com'],
          primaryCatId: 'VALID_CAT',
          attr,
          cattax: 1,
          mediaType: 'video',
        },
        mediaType: 'video'
      };
    }

    beforeEach(() => {
      mockAuctionIndex.getOrtb2 = () => ({
        badv: ['domain2.com'], bcat: ['BANNED_CAT1', 'BANNED_CAT2']
      });

      mockAuctionIndex.getBidRequest = () => ({
        mediaTypes: {
          video: {}
        },
        ortb2Imp: {
          video: {
            battr: ['BANNED_ATTR']
          }
        }
      });
      reject = sinon.stub();
      call = sinon.stub();
    });

    it(`should reject the bid when its attr is banned`, () => {
      addBidResponseHook(call, 'adcode', makeBid(['BANNED_ATTR', 'OTHER_ATTR']), reject, mockAuctionIndex);
      sinon.assert.calledWith(reject, BID_ATTR_REJECTION_REASON);
      sinon.assert.notCalled(call);
    });

    Object.entries({
      'missing': null,
      'empty': [],
      'invalid': 'attr',
    }).forEach(([t, attr]) => {
      it(`should reject when attr is ${t}, and blockUnknown is set`, () => {
        config.setConfig({ [MODULE_NAME]: { attr: { enforce: true, blockUnknown: true } } });
        addBidResponseHook(call, 'adcode', makeBid(attr), reject, mockAuctionIndex);
        sinon.assert.calledWith(reject, BID_ATTR_REJECTION_REASON);
        sinon.assert.notCalled(call);
      });
      it(`it should not reject when its attr is ${t}, but blockUnknown is false`, () => {
        config.setConfig({ [MODULE_NAME]: { attr: { enforce: true, blockUnknown: false } } });
        addBidResponseHook(call, 'adcode', makeBid(attr), reject, mockAuctionIndex);
        sinon.assert.notCalled(reject);
        sinon.assert.called(call);
      });
    });
  });

  it('should omit the validation if the flag is set to false', () => {
    const call = sinon.stub();
    const bid = {
      meta: {
        advertiserDomains: ['validdomain1.com', 'validdomain2.com'],
        primaryCatId: 'BANNED_CAT1',
        attr: ['valid_attr'],
        mediaType: 'banner',
        cattax: 1
      }
    };

    mockAuctionIndex.getBidRequest = () => ({
      mediaTypes: {
        banner: {}
      },
      ortb2Imp: {}
    });

    mockAuctionIndex.getOrtb2 = () => ({
      badv: ['domain2.com'], bcat: ['BANNED_CAT1', 'BANNED_CAT2']
    });

    config.setConfig({ [MODULE_NAME]: { cat: { enforce: false } } });

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
        attr: ['valid_attr'],
        mediaType: 'banner',
        cattax: 1
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
    });

    config.setConfig({ [MODULE_NAME]: { cat: { blockUnknown: false } } });

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
        attr: [6],
        mediaType: 'audio',
        cattax: 1
      },
    };

    mockAuctionIndex.getOrtb2 = () => ({
      badv: [], bcat: []
    });

    mockAuctionIndex.getBidRequest = () => ({
      mediaTypes: {
        banner: {},
      },
      ortb2Imp: {}
    });

    addBidResponseHook(call, 'adcode', bid, reject, mockAuctionIndex);
    sinon.assert.calledWith(reject, BID_MEDIA_TYPE_REJECTION_REASON);
  });

  it('should preserve default behavior for banner IBV bids on multi-format ad units', () => {
    const reject = sinon.stub();
    const call = sinon.stub();
    const bid = {
      meta: {
        advertiserDomains: ['validdomain1.com'],
        primaryCatId: 'VALID_CAT',
        attr: [6],
        mediaType: 'banner',
        cattax: 1
      },
      mediaType: 'banner'
    };

    mockAuctionIndex.getOrtb2 = () => ({
      badv: [], bcat: []
    });

    mockAuctionIndex.getBidRequest = () => ({
      mediaTypes: {
        banner: {},
        video: {
          context: 'inbanner'
        }
      },
      ortb2Imp: {}
    });

    addBidResponseHook(call, 'adcode', bid, reject, mockAuctionIndex);
    sinon.assert.notCalled(reject);
    sinon.assert.calledOnce(call);
  });

  it('should reject banner IBV bids on multi-format ad units when optional filter is enabled', () => {
    const reject = sinon.stub();
    const call = sinon.stub();
    const bid = {
      meta: {
        advertiserDomains: ['validdomain1.com'],
        primaryCatId: 'VALID_CAT',
        attr: [6],
        mediaType: 'banner',
        cattax: 1
      },
      mediaType: 'banner'
    };

    mockAuctionIndex.getOrtb2 = () => ({
      badv: [], bcat: []
    });

    mockAuctionIndex.getBidRequest = () => ({
      mediaTypes: {
        banner: {},
        video: {
          context: 'inbanner'
        }
      },
      ortb2Imp: {}
    });

    config.setConfig({ [MODULE_NAME]: { mediaTypes: { rejectIbvBannerOnMultiFormat: true } } });

    addBidResponseHook(call, 'adcode', bid, reject, mockAuctionIndex);
    sinon.assert.calledWith(reject, BID_MEDIA_TYPE_REJECTION_REASON);
    sinon.assert.notCalled(call);
  });
});
