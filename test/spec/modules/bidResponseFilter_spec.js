import {
  addBidResponseHook,
  BID_ADV_DOMAINS_REJECTION_REASON,
  BID_ATTR_REJECTION_REASON,
  BID_CATEGORY_REJECTION_REASON,
  BID_MEDIA_TYPE_REJECTION_REASON,
  BID_UNAUTHORIZED_VIDEO_REJECTION_REASON,
  MODULE_NAME,
  reset
} from '../../../modules/bidResponseFilter/index.js';
import { scanMarkup, watchForVideo } from '../../../modules/bidResponseFilter/unauthorizedVideo.js';
import * as events from '../../../src/events.js';
import { EVENTS } from '../../../src/constants.js';
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
  describe('unauthorizedVideo', () => {
    const VIDEO_AD = '<div><video src="https://cdn.example/ad.mp4" autoplay muted></video></div>';
    let reject, next, onUnauthorized, requestBattr;

    function setFilterConfig(unauthorizedVideo, extra = {}) {
      config.setConfig({
        [MODULE_NAME]: {
          cat: { enforce: false, blockUnknown: false },
          adv: { enforce: false, blockUnknown: false },
          ...extra,
          ...(unauthorizedVideo ? { unauthorizedVideo } : {})
        }
      });
    }

    function makeBid(overrides = {}) {
      return {
        bidder: 'mockBidder',
        adUnitCode: 'au',
        mediaType: 'banner',
        ad: VIDEO_AD,
        ...overrides,
        meta: { mediaType: 'banner', ...(overrides.meta || {}) }
      };
    }

    function runHook(bid) {
      return addBidResponseHook(next, 'au', bid, reject, mockAuctionIndex);
    }

    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    beforeEach(() => {
      reject = sinon.stub();
      next = sinon.stub();
      onUnauthorized = sinon.stub();
      requestBattr = undefined;
      events.on(EVENTS.UNAUTHORIZED_VIDEO, onUnauthorized);
      mockAuctionIndex.getOrtb2 = () => ({});
      mockAuctionIndex.getBidRequest = () => ({
        mediaTypes: { banner: {} },
        ortb2Imp: requestBattr ? { banner: { battr: requestBattr } } : {}
      });
    });

    afterEach(() => {
      events.off(EVENTS.UNAUTHORIZED_VIDEO, onUnauthorized);
    });

    describe('markup scan', () => {
      it('is off by default', () => {
        setFilterConfig();
        runHook(makeBid());
        sinon.assert.notCalled(onUnauthorized);
        sinon.assert.notCalled(reject);
        sinon.assert.calledOnce(next);
      });

      it('is off when enabled is false', () => {
        setFilterConfig({ enabled: false, reject: true });
        runHook(makeBid());
        sinon.assert.notCalled(onUnauthorized);
        sinon.assert.calledOnce(next);
      });

      it('reports undeclared video without rejecting by default', () => {
        setFilterConfig({ enabled: true });
        const bid = makeBid({ meta: { attr: [1] } });
        runHook(bid);
        sinon.assert.calledOnce(onUnauthorized);
        sinon.assert.calledWith(onUnauthorized, {
          bid,
          adUnitCode: 'au',
          stage: 'bidResponse',
          reason: 'undeclared',
          signals: ['videoElement']
        });
        sinon.assert.notCalled(reject);
        sinon.assert.calledOnce(next);
      });

      it('reports undeclared video when meta.attr is missing', () => {
        setFilterConfig({ enabled: true });
        runHook(makeBid());
        sinon.assert.calledWithMatch(onUnauthorized, { reason: 'undeclared' });
      });

      it('reports video blocked by the ad unit battr', () => {
        requestBattr = [6, 7];
        setFilterConfig({ enabled: true });
        runHook(makeBid({ meta: { attr: [1] } }));
        sinon.assert.calledWithMatch(onUnauthorized, { reason: 'blocked', stage: 'bidResponse' });
      });

      it('reports video blocked by module-level attr.battr, even when declared', () => {
        setFilterConfig({ enabled: true }, { attr: { enforce: false, battr: [7] } });
        runHook(makeBid({ meta: { attr: [6] } }));
        sinon.assert.calledWithMatch(onUnauthorized, { reason: 'blocked' });
        sinon.assert.calledOnce(next);
      });

      it('does not report video that is declared and not blocked', () => {
        setFilterConfig({ enabled: true });
        runHook(makeBid({ meta: { attr: [6] } }));
        runHook(makeBid({ meta: { attr: ['7'] } }));
        sinon.assert.notCalled(onUnauthorized);
        sinon.assert.calledTwice(next);
      });

      it('rejects when reject is true', () => {
        setFilterConfig({ enabled: true, reject: true });
        runHook(makeBid());
        sinon.assert.calledOnce(onUnauthorized);
        sinon.assert.calledWith(reject, BID_UNAUTHORIZED_VIDEO_REJECTION_REASON);
        sinon.assert.notCalled(next);
      });

      it('keeps its decision when a listener changes the config', () => {
        setFilterConfig({ enabled: true, reject: true });
        onUnauthorized.callsFake(() => setFilterConfig({ enabled: false }));
        runHook(makeBid());
        sinon.assert.calledWith(reject, BID_UNAUTHORIZED_VIDEO_REJECTION_REASON);
        sinon.assert.notCalled(next);
      });

      it('does not reject display markup when reject is true', () => {
        setFilterConfig({ enabled: true, reject: true });
        runHook(makeBid({ ad: '<div class="video-promo"><img src="https://cdn.example/video.jpg" alt="video"></div>' }));
        sinon.assert.notCalled(onUnauthorized);
        sinon.assert.notCalled(reject);
        sinon.assert.calledOnce(next);
      });

      it('skips bids that only have adUrl', () => {
        setFilterConfig({ enabled: true, reject: true });
        runHook(makeBid({ ad: undefined, adUrl: 'https://cdn.example/creative.html' }));
        sinon.assert.notCalled(onUnauthorized);
        sinon.assert.calledOnce(next);
      });

      it('skips non-banner bids', () => {
        setFilterConfig({ enabled: true, reject: true }, { mediaTypes: { enforce: false } });
        runHook(makeBid({ mediaType: 'native', meta: { mediaType: 'native' } }));
        sinon.assert.notCalled(onUnauthorized);
        sinon.assert.calledOnce(next);
      });

      it('does not scan bids already rejected by another filter', () => {
        requestBattr = [6];
        setFilterConfig({ enabled: true });
        runHook(makeBid({ meta: { attr: [6] } }));
        sinon.assert.calledWith(reject, BID_ATTR_REJECTION_REASON);
        sinon.assert.notCalled(onUnauthorized);
      });

      it('reports at most once per bid', () => {
        setFilterConfig({ enabled: true });
        const bid = makeBid();
        runHook(bid);
        runHook(bid);
        sinon.assert.calledOnce(onUnauthorized);
      });

      describe('sampling', () => {
        let random;
        beforeEach(() => {
          random = sinon.stub(Math, 'random');
        });
        afterEach(() => {
          random.restore();
        });

        it('scans a bid when the random draw is below sampleRate', () => {
          random.returns(0.4);
          setFilterConfig({ enabled: true, sampleRate: 0.5 });
          runHook(makeBid());
          sinon.assert.calledOnce(onUnauthorized);
        });

        it('skips a bid when the random draw is not below sampleRate', () => {
          random.returns(0.5);
          setFilterConfig({ enabled: true, sampleRate: 0.5, reject: true });
          runHook(makeBid());
          sinon.assert.notCalled(onUnauthorized);
          sinon.assert.calledOnce(next);
        });

        it('scans nothing with sampleRate 0', () => {
          random.returns(0);
          setFilterConfig({ enabled: true, sampleRate: 0 });
          runHook(makeBid());
          sinon.assert.notCalled(onUnauthorized);
        });

        it('defaults to scanning every bid', () => {
          random.returns(0.999);
          setFilterConfig({ enabled: true });
          runHook(makeBid());
          sinon.assert.calledOnce(onUnauthorized);
        });

        it('clamps sampleRate to 1', () => {
          random.returns(0.999);
          setFilterConfig({ enabled: true, sampleRate: 5 });
          runHook(makeBid());
          sinon.assert.calledOnce(onUnauthorized);
        });

        it('does not draw for bids that cannot be unauthorized', () => {
          setFilterConfig({ enabled: true, sampleRate: 0.5 });
          runHook(makeBid({ meta: { attr: [6] } }));
          sinon.assert.notCalled(random);
        });
      });
    });

    describe('scanMarkup', () => {
      Object.entries({
        videoElement: '<video autoplay muted><source src="a.mp4" type="video/mp4"></video>',
        vast: '<script type="text/xml"><VAST version="4.0"><Ad></Ad></VAST></script>',
        imaSdk: '<script src="https://imasdk.googleapis.com/js/sdkloader/ima3.js"></script>'
      }).forEach(([signal, markup]) => {
        it(`detects ${signal}`, () => {
          expect(scanMarkup(markup)).to.eql([signal]);
        });
      });

      [
        '<div class="video"><img src="video.png"></div>',
        '<a href="https://example.com/videos">Watch videos</a>',
        '<videoplayer-poster></videoplayer-poster>',
        '<script>var vastness = 1;</script>'
      ].forEach(markup => {
        it(`does not flag ${markup}`, () => {
          expect(scanMarkup(markup)).to.eql([]);
        });
      });

      it('matches publisher patterns', () => {
        const re = /player\.example\/v\d+/g;
        const markup = '<script src="https://PLAYER.example/v2/load.js"></script>';
        expect(scanMarkup(markup, ['player.example/', re])).to.eql(['pattern:player.example/']);
        const lower = '<script src="https://player.example/v2/x.js"></script>';
        expect(scanMarkup(lower, [re])).to.eql([`pattern:${String(re)}`]);
        expect(scanMarkup(lower, [re])).to.eql([`pattern:${String(re)}`]);
      });

      it('reports configured patterns from the hook', () => {
        setFilterConfig({ enabled: true, patterns: ['player.example', '', 5] });
        runHook(makeBid({ ad: '<script src="https://player.example/p.js"></script>' }));
        sinon.assert.calledWithMatch(onUnauthorized, { signals: ['pattern:player.example'] });
      });
    });

    describe('post-render observation', () => {
      let frames;

      function makeFrame() {
        const frame = document.createElement('iframe');
        document.body.appendChild(frame);
        frames.push(frame);
        return frame;
      }

      function addVideo(doc) {
        doc.body.appendChild(doc.createElement('video'));
      }

      function emitRender(doc, bid) {
        events.emit(EVENTS.AD_RENDER_SUCCEEDED, { doc, bid, adId: 'adId' });
      }

      beforeEach(() => {
        frames = [];
      });

      afterEach(() => {
        frames.forEach(frame => frame.remove());
      });

      it('is off unless observe.sampleRate is set', async () => {
        setFilterConfig({ enabled: true });
        const doc = makeFrame().contentDocument;
        addVideo(doc);
        emitRender(doc, makeBid({ ad: '<div></div>' }));
        await delay(20);
        sinon.assert.notCalled(onUnauthorized);
      });

      it('detects a video element that is already present, after the event', async () => {
        setFilterConfig({ enabled: true, observe: { sampleRate: 1 } });
        const doc = makeFrame().contentDocument;
        addVideo(doc);
        const bid = makeBid({ ad: '<div></div>' });
        emitRender(doc, bid);
        sinon.assert.notCalled(onUnauthorized);
        await delay(20);
        sinon.assert.calledOnce(onUnauthorized);
        sinon.assert.calledWith(onUnauthorized, {
          bid,
          adUnitCode: 'au',
          stage: 'render',
          reason: 'undeclared',
          signals: ['videoElement']
        });
      });

      it('detects a video element added after render', async () => {
        setFilterConfig({ enabled: true, observe: { sampleRate: 1 } });
        const doc = makeFrame().contentDocument;
        emitRender(doc, makeBid({ ad: '<div></div>' }));
        await delay(20);
        sinon.assert.notCalled(onUnauthorized);
        addVideo(doc);
        await delay(20);
        sinon.assert.calledOnce(onUnauthorized);
      });

      it('detects video inside a same-origin child frame added after render', async () => {
        setFilterConfig({ enabled: true, observe: { sampleRate: 1 } });
        const doc = makeFrame().contentDocument;
        emitRender(doc, makeBid({ ad: '<div></div>' }));
        await delay(20);
        const child = doc.createElement('iframe');
        doc.body.appendChild(child);
        await delay(20);
        addVideo(child.contentDocument);
        await delay(20);
        sinon.assert.calledOnce(onUnauthorized);
      });

      it('reports blocked video using the module battr', async () => {
        setFilterConfig({ enabled: true, observe: { sampleRate: 1 } }, { attr: { enforce: false, battr: [6] } });
        const doc = makeFrame().contentDocument;
        addVideo(doc);
        emitRender(doc, makeBid({ meta: { attr: [6] } }));
        await delay(20);
        sinon.assert.calledWithMatch(onUnauthorized, { stage: 'render', reason: 'blocked' });
      });

      it('reports each stage once per bid', async () => {
        setFilterConfig({ enabled: true, observe: { sampleRate: 1 } });
        const bid = makeBid();
        runHook(bid);
        const doc = makeFrame().contentDocument;
        addVideo(doc);
        emitRender(doc, bid);
        emitRender(doc, bid);
        await delay(20);
        emitRender(doc, bid);
        addVideo(doc);
        await delay(20);
        expect(onUnauthorized.args.map(([data]) => data.stage)).to.eql(['bidResponse', 'render']);
      });

      it('skips declared video that is not blocked', async () => {
        setFilterConfig({ enabled: true, observe: { sampleRate: 1 } });
        const doc = makeFrame().contentDocument;
        addVideo(doc);
        emitRender(doc, makeBid({ meta: { attr: [7] } }));
        await delay(20);
        sinon.assert.notCalled(onUnauthorized);
      });

      it('skips non-banner bids', async () => {
        setFilterConfig({ enabled: true, observe: { sampleRate: 1 } });
        const doc = makeFrame().contentDocument;
        addVideo(doc);
        emitRender(doc, makeBid({ mediaType: 'native', meta: { mediaType: 'native' } }));
        await delay(20);
        sinon.assert.notCalled(onUnauthorized);
      });

      it('skips renders without a document', async () => {
        setFilterConfig({ enabled: true, observe: { sampleRate: 1 } });
        emitRender(null, makeBid());
        await delay(20);
        sinon.assert.notCalled(onUnauthorized);
      });

      it('skips the main document', async () => {
        setFilterConfig({ enabled: true, observe: { sampleRate: 1 } });
        const video = document.createElement('video');
        document.body.appendChild(video);
        try {
          emitRender(document, makeBid());
          await delay(20);
          sinon.assert.notCalled(onUnauthorized);
        } finally {
          video.remove();
        }
      });

      it('silently skips documents it cannot access', async () => {
        setFilterConfig({ enabled: true, observe: { sampleRate: 1 } });
        const crossOrigin = {
          get documentElement() {
            throw new Error('SecurityError');
          },
          querySelector() {
            throw new Error('SecurityError');
          }
        };
        emitRender(crossOrigin, makeBid());
        await delay(20);
        sinon.assert.notCalled(onUnauthorized);
      });

      it('respects observe.sampleRate', async () => {
        const random = sinon.stub(Math, 'random').returns(0.5);
        try {
          setFilterConfig({ enabled: true, sampleRate: 0, observe: { sampleRate: 0.5 } });
          const doc = makeFrame().contentDocument;
          addVideo(doc);
          emitRender(doc, makeBid());
          random.returns(0.1);
          emitRender(doc, makeBid());
          await delay(20);
          sinon.assert.calledOnce(onUnauthorized);
        } finally {
          random.restore();
        }
      });

      it('stops observing when the module is reset', async () => {
        setFilterConfig({ enabled: true, observe: { sampleRate: 1 } });
        reset();
        const doc = makeFrame().contentDocument;
        addVideo(doc);
        emitRender(doc, makeBid());
        await delay(20);
        sinon.assert.notCalled(onUnauthorized);
      });

      it('stops observing when observe is turned off', async () => {
        setFilterConfig({ enabled: true, observe: { sampleRate: 1 } });
        setFilterConfig({ enabled: true });
        const doc = makeFrame().contentDocument;
        addVideo(doc);
        emitRender(doc, makeBid());
        await delay(20);
        sinon.assert.notCalled(onUnauthorized);
      });

      it('cancels a pending check when observation is turned off', async () => {
        setFilterConfig({ enabled: true, observe: { sampleRate: 1 } });
        const doc = makeFrame().contentDocument;
        addVideo(doc);
        emitRender(doc, makeBid());
        setFilterConfig({ enabled: true });
        await delay(20);
        sinon.assert.notCalled(onUnauthorized);
      });

      it('stops active observers when the module is reset', async () => {
        setFilterConfig({ enabled: true, observe: { sampleRate: 1 } });
        const doc = makeFrame().contentDocument;
        emitRender(doc, makeBid());
        await delay(20);
        reset();
        addVideo(doc);
        await delay(20);
        sinon.assert.notCalled(onUnauthorized);
      });

      describe('watchForVideo', () => {
        it('stops watching after the duration', async () => {
          const onVideo = sinon.stub();
          const doc = makeFrame().contentDocument;
          const disconnect = sinon.spy(doc.defaultView.MutationObserver.prototype, 'disconnect');
          try {
            watchForVideo(doc, 10, onVideo);
            await delay(40);
            sinon.assert.called(disconnect);
            addVideo(doc);
            await delay(20);
            sinon.assert.notCalled(onVideo);
          } finally {
            disconnect.restore();
          }
        });

        it('calls back once and disconnects on first detection', async () => {
          const onVideo = sinon.stub();
          const doc = makeFrame().contentDocument;
          const disconnect = sinon.spy(doc.defaultView.MutationObserver.prototype, 'disconnect');
          try {
            watchForVideo(doc, 1000, onVideo);
            addVideo(doc);
            await delay(20);
            sinon.assert.calledOnce(onVideo);
            sinon.assert.called(disconnect);
            addVideo(doc);
            await delay(20);
            sinon.assert.calledOnce(onVideo);
          } finally {
            disconnect.restore();
          }
        });

        it('watches the new document when a child frame loads', async () => {
          const onVideo = sinon.stub();
          const doc = makeFrame().contentDocument;
          const child = doc.createElement('iframe');
          doc.body.appendChild(child);
          watchForVideo(doc, 1000, onVideo);
          child.srcdoc = '<html><body><video></video></body></html>';
          await delay(100);
          sinon.assert.calledOnce(onVideo);
        });

        it('can be stopped by the caller', async () => {
          const onVideo = sinon.stub();
          const doc = makeFrame().contentDocument;
          const stop = watchForVideo(doc, 1000, onVideo);
          stop();
          addVideo(doc);
          await delay(20);
          sinon.assert.notCalled(onVideo);
        });
      });
    });
  });
});
