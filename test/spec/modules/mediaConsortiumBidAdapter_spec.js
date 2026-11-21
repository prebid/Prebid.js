import { expect } from 'chai';
import sinon from 'sinon';
import { spec, OPTIMIZATIONS_STORAGE_KEY, getOptimizationsFromLocalStorage } from 'modules/mediaConsortiumBidAdapter.js';
import { config } from '../../../src/config.js';
import { getGlobal } from '../../../src/prebidGlobal.js';

const BANNER_BID = {
  adUnitCode: 'dfp_ban_atf',
  bidId: '2f0d9715f60be8',
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250]
      ]
    }
  }
};

const VIDEO_BID = {
  adUnitCode: 'video',
  bidId: '2f0d9715f60be8',
  mediaTypes: {
    video: {
      playerSize: [
        [300, 250]
      ],
      context: 'outstream'
    }
  }
};

const VIDEO_BID_WITH_CONFIG = {
  adUnitCode: 'video',
  bidId: '2f0d9715f60be8',
  mediaTypes: {
    video: {
      playerSize: [
        [300, 250]
      ],
      context: 'outstream'
    }
  },
  params: {
    video: {
      maxWidth: 640,
      isReplayable: true
    }
  }
};

const VIDEO_BID_WITH_MISSING_CONTEXT = {
  adUnitCode: 'video',
  bidId: '2f0d9715f60be8',
  mediaTypes: {
    video: {
      playerSize: [
        [300, 250]
      ]
    }
  }
};

const MULTI_MEDIATYPES_BID = {
  adUnitCode: 'multi_type',
  bidId: '2f0d9715f60be8',
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250]
      ]
    },
    video: {
      playerSize: [
        [300, 250]
      ],
      context: 'outstream'
    }
  }
};

const MULTI_MEDIATYPES_WITH_INVALID_VIDEO_CONTEXT = {
  adUnitCode: 'multi_type',
  bidId: '2f0d9715f60be8',
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250]
      ]
    },
    video: {
      playerSize: [
        [300, 250]
      ],
      context: 'instream'
    }
  }
};

function buildRenderableVideoBid(videoParams = {}) {
  const bidRequest = { ...VIDEO_BID_WITH_CONFIG, params: { video: videoParams } };

  const serverResponse = {
    body: {
      id: 'requestId',
      bids: [{
        id: 'bid-123',
        impressionId: bidRequest.bidId,
        price: { cpm: 1, currency: 'JPY' },
        ad: {
          creative: {
            id: 'CREATIVE_ID',
            mediaType: 'video',
            size: { width: 320, height: 250 },
            markup: '<VAST></VAST>'
          }
        }
      }]
    }
  };

  const params = {
    data: { impressions: [{ id: bidRequest.bidId, adUnitCode: 'video' }] },
    internal: { bidRequests: { [bidRequest.bidId]: bidRequest } }
  };

  const [bid] = spec.interpretResponse(serverResponse, params);

  bid.renderer.loaded = true;

  return bid;
}

describe('Media Consortium Bid Adapter', function () {
  before(function () {
    // The local storage variable is not cleaned in some other test so we need to do it ourselves here
    localStorage.removeItem('ope_fpid');
  });

  beforeEach(function () {
    getGlobal().bidderSettings = {
      mediaConsortium: {
        storageAllowed: true
      }
    };
  });

  afterEach(function () {
    getGlobal().bidderSettings = {};
  });

  describe('buildRequests', function () {
    const bidderRequest = {
      auctionId: '98bb5f61-4140-4ced-8b0e-65a33d792ab8',
      ortb2: {
        device: {
          w: 1200,
          h: 400,
          dnt: 0
        },
        site: {
          page: 'http://localhost.com',
          domain: 'localhost.com'
        }
      }
    };

    it('should build a banner request', function () {
      const builtSyncRequest = {
        gdpr: false,
        ad_unit_codes: BANNER_BID.adUnitCode
      };

      const builtBidRequest = {
        id: '98bb5f61-4140-4ced-8b0e-65a33d792ab8',
        impressions: [{
          id: BANNER_BID.bidId,
          adUnitCode: BANNER_BID.adUnitCode,
          mediaTypes: BANNER_BID.mediaTypes
        }],
        device: {
          w: 1200,
          h: 400,
          dnt: 0
        },
        site: {
          page: 'http://localhost.com',
          domain: 'localhost.com'
        },
        user: {
          ids: {}
        },
        options: {
          useProfileApi: false
        },
        regulations: {
          gdpr: {
            applies: false,
            consentString: undefined
          }
        },
        timeout: 3600
      };

      const bids = [BANNER_BID];
      const [syncRequest, auctionRequest] = spec.buildRequests(bids, { ...bidderRequest, bids });

      expect(syncRequest.data).to.deep.equal(builtSyncRequest);
      expect(auctionRequest.data).to.deep.equal(builtBidRequest);
      expect(auctionRequest.internal).to.deep.equal({
        bidRequests: {
          [BANNER_BID.bidId]: BANNER_BID
        }
      });
    });

    it('should build a video request', function () {
      const builtSyncRequest = {
        gdpr: false,
        ad_unit_codes: VIDEO_BID.adUnitCode
      };

      const builtBidRequest = {
        id: '98bb5f61-4140-4ced-8b0e-65a33d792ab8',
        impressions: [{
          id: VIDEO_BID.bidId,
          adUnitCode: VIDEO_BID.adUnitCode,
          mediaTypes: VIDEO_BID.mediaTypes
        }],
        device: {
          w: 1200,
          h: 400,
          dnt: 0
        },
        site: {
          page: 'http://localhost.com',
          domain: 'localhost.com'
        },
        user: {
          ids: {}
        },
        options: {
          useProfileApi: false
        },
        regulations: {
          gdpr: {
            applies: false,
            consentString: undefined
          }
        },
        timeout: 3600
      };

      const bids = [VIDEO_BID];
      const [syncRequest, auctionRequest] = spec.buildRequests(bids, { ...bidderRequest, bids });

      expect(syncRequest.data).to.deep.equal(builtSyncRequest);
      expect(auctionRequest.data).to.deep.equal(builtBidRequest);
      expect(auctionRequest.internal).to.deep.equal({
        bidRequests: {
          [VIDEO_BID.bidId]: VIDEO_BID
        }
      });
    });

    it('should build a request with multiple mediatypes', function () {
      const builtSyncRequest = {
        gdpr: false,
        ad_unit_codes: MULTI_MEDIATYPES_BID.adUnitCode
      };

      const builtBidRequest = {
        id: '98bb5f61-4140-4ced-8b0e-65a33d792ab8',
        impressions: [{
          id: MULTI_MEDIATYPES_BID.bidId,
          adUnitCode: MULTI_MEDIATYPES_BID.adUnitCode,
          mediaTypes: MULTI_MEDIATYPES_BID.mediaTypes
        }],
        device: {
          w: 1200,
          h: 400,
          dnt: 0
        },
        site: {
          page: 'http://localhost.com',
          domain: 'localhost.com'
        },
        user: {
          ids: {}
        },
        options: {
          useProfileApi: false
        },
        regulations: {
          gdpr: {
            applies: false,
            consentString: undefined
          }
        },
        timeout: 3600
      };

      const bids = [MULTI_MEDIATYPES_BID];
      const [syncRequest, auctionRequest] = spec.buildRequests(bids, { ...bidderRequest, bids });

      expect(syncRequest.data).to.deep.equal(builtSyncRequest);
      expect(auctionRequest.data).to.deep.equal(builtBidRequest);
      expect(auctionRequest.internal).to.deep.equal({
        bidRequests: {
          [MULTI_MEDIATYPES_BID.bidId]: MULTI_MEDIATYPES_BID
        }
      });
    });

    it('should not build a request if optimizations are there for the adunit code', function () {
      const bids = [BANNER_BID];
      const optimizations = {
        [bids[0].adUnitCode]: { isEnabled: false, expiresAt: Date.now() + 600000 }
      };

      localStorage.setItem(OPTIMIZATIONS_STORAGE_KEY, JSON.stringify(optimizations));

      const requests = spec.buildRequests(bids, { ...bidderRequest, bids });

      localStorage.removeItem(OPTIMIZATIONS_STORAGE_KEY);

      expect(requests).to.be.undefined;
    });

    it('should match optimizations on the placement code when there is one, and on the adunit code otherwise', function () {
      const bidWithPlacementCode = { ...BANNER_BID, bidId: 'a', adUnitCode: 'random_1', params: { placementCode: 'banner-1' } };
      const bidWithoutPlacementCode = { ...BANNER_BID, bidId: 'b', adUnitCode: 'banner-2' };
      const bids = [bidWithPlacementCode, bidWithoutPlacementCode];
      const expiresAt = Date.now() + 600000;

      const buildImpressionIds = (optimizations) => {
        localStorage.setItem(OPTIMIZATIONS_STORAGE_KEY, JSON.stringify(optimizations));

        try {
          const requests = spec.buildRequests(bids, { ...bidderRequest, bids });

          return requests ? requests[1].data.impressions.map(({ id }) => id) : [];
        } finally {
          localStorage.removeItem(OPTIMIZATIONS_STORAGE_KEY);
        }
      };

      // optimization on the placement code only disables the bid having it
      expect(buildImpressionIds({ 'banner-1': { isEnabled: false, expiresAt } })).to.deep.equal(['b']);
      // optimization on the adunit code is ignored when the bid has a placement code
      expect(buildImpressionIds({ random_1: { isEnabled: false, expiresAt } })).to.deep.equal(['a', 'b']);
      // optimization on the placement code is ignored when the bid has none
      expect(buildImpressionIds({ 'banner-2': { isEnabled: false, expiresAt }, 'banner-1': { isEnabled: true, expiresAt } })).to.deep.equal(['a']);
      // optimization on the adunit code still applies to bids without placement code
      expect(buildImpressionIds({ 'banner-2': { isEnabled: false, expiresAt } })).to.deep.equal(['a']);
    });

    it('should exclude video requests where context is missing or not equal to outstream', function () {
      const builtSyncRequest = {
        gdpr: false,
        ad_unit_codes: MULTI_MEDIATYPES_WITH_INVALID_VIDEO_CONTEXT.adUnitCode
      };

      const builtBidRequest = {
        id: '98bb5f61-4140-4ced-8b0e-65a33d792ab8',
        impressions: [{
          id: MULTI_MEDIATYPES_WITH_INVALID_VIDEO_CONTEXT.bidId,
          adUnitCode: MULTI_MEDIATYPES_WITH_INVALID_VIDEO_CONTEXT.adUnitCode,
          mediaTypes: { banner: MULTI_MEDIATYPES_WITH_INVALID_VIDEO_CONTEXT.mediaTypes.banner }
        }],
        device: {
          w: 1200,
          h: 400,
          dnt: 0
        },
        site: {
          page: 'http://localhost.com',
          domain: 'localhost.com'
        },
        user: {
          ids: {}
        },
        options: {
          useProfileApi: false
        },
        regulations: {
          gdpr: {
            applies: false,
            consentString: undefined
          }
        },
        timeout: 3600
      };

      const invalidVideoBids = [VIDEO_BID_WITH_MISSING_CONTEXT];
      const multiMediatypesBidWithInvalidVideo = [MULTI_MEDIATYPES_WITH_INVALID_VIDEO_CONTEXT];

      expect(spec.buildRequests(invalidVideoBids, { ...bidderRequest, bids: invalidVideoBids })).to.be.undefined;

      const [syncRequest, auctionRequest] = spec.buildRequests(multiMediatypesBidWithInvalidVideo, { ...bidderRequest, bids: multiMediatypesBidWithInvalidVideo });

      expect(syncRequest.data).to.deep.equal(builtSyncRequest);
      expect(auctionRequest.data).to.deep.equal(builtBidRequest);
    });

    it('should accept any bid request as valid', function () {
      expect(spec.isBidRequestValid({})).to.equal(true);
    });

    it('should send the consent string, the profile api option and the 1plusX id when enabled', function () {
      const bids = [BANNER_BID];
      const gdprConsent = { gdprApplies: true, consentString: 'CONSENT_STRING' };

      localStorage.setItem('ope_fpid', 'FP_ID');
      config.setConfig({ useProfileApi: true, readOnePlusXId: true });

      try {
        const [syncRequest, auctionRequest] = spec.buildRequests(bids, { ...bidderRequest, bids, gdprConsent });

        expect(syncRequest.data).to.deep.equal({ gdpr: true, ad_unit_codes: BANNER_BID.adUnitCode, gdpr_consent: 'CONSENT_STRING' });
        expect(auctionRequest.data.regulations.gdpr).to.deep.equal({ applies: true, consentString: 'CONSENT_STRING' });
        expect(auctionRequest.data.options.useProfileApi).to.equal(true);
        expect(auctionRequest.data.user.ids).to.deep.equal({ '1plusX': 'FP_ID' });
      } finally {
        localStorage.removeItem('ope_fpid');
        config.setConfig({ useProfileApi: false, readOnePlusXId: false });
      }
    });

    it('should ignore stored optimizations that cannot be parsed', function () {
      localStorage.setItem(OPTIMIZATIONS_STORAGE_KEY, 'NOT_JSON');

      try {
        expect(getOptimizationsFromLocalStorage()).to.deep.equal({});
      } finally {
        localStorage.removeItem(OPTIMIZATIONS_STORAGE_KEY);
      }
    });

    describe('placementCode', function () {
      it('should forward a valid placementCode for banner impressions', function () {
        const bids = [
          { ...BANNER_BID, bidId: 'a', adUnitCode: 'slot_1', params: { placementCode: 'article-inline' } },
          { ...BANNER_BID, bidId: 'b', adUnitCode: 'slot_2', params: { placementCode: 'article-inline' } },
          { ...BANNER_BID, bidId: 'c', adUnitCode: 'slot_3', params: { placementCode: 'Article-Top' } }
        ];

        const [syncRequest, auctionRequest] = spec.buildRequests(bids, { ...bidderRequest, bids });

        expect(auctionRequest.data.impressions.map(({ id, adUnitCode, placementCode }) => ({ id, adUnitCode, placementCode }))).to.deep.equal([
          { id: 'a', adUnitCode: 'slot_1', placementCode: 'article-inline' },
          { id: 'b', adUnitCode: 'slot_2', placementCode: 'article-inline' },
          { id: 'c', adUnitCode: 'slot_3', placementCode: 'Article-Top' }
        ]);
        expect(syncRequest.data.ad_unit_codes).to.equal('slot_1,slot_2,slot_3');
        expect(syncRequest.data.placement_codes).to.equal('article-inline,Article-Top');
      });

      it('should not set placementCode when it is absent or invalid', function () {
        const invalidValues = [undefined, null, '', '   ', 42, {}, ['a']];

        invalidValues.forEach((placementCode) => {
          const bids = [{ ...BANNER_BID, params: { placementCode } }];
          const [syncRequest, auctionRequest] = spec.buildRequests(bids, { ...bidderRequest, bids });

          expect(auctionRequest.data.impressions[0]).to.not.have.property('placementCode');
          expect(syncRequest.data).to.not.have.property('placement_codes');
        });

        const bidsWithoutParams = [BANNER_BID];
        const [, auctionRequest] = spec.buildRequests(bidsWithoutParams, { ...bidderRequest, bids: bidsWithoutParams });

        expect(auctionRequest.data.impressions[0]).to.not.have.property('placementCode');
      });
    });
  });

  describe('interpretResponse', function () {
    it('should return an empty array if the response is invalid', function () {
      expect(spec.interpretResponse({ body: 'INVALID_BODY' }, {})).to.deep.equal([]);
    });

    it('should return a formatted banner bid', function () {
      const serverResponse = {
        body: {
          id: 'requestId',
          bids: [{
            id: 'bid-123',
            impressionId: '2f0d9715f60be8',
            price: {
              cpm: 1,
              currency: 'JPY'
            },
            dealId: 'TEST_DEAL_ID',
            ad: {
              creative: {
                id: 'CREATIVE_ID',
                mediaType: 'banner',
                size: { width: 320, height: 250 },
                markup: '<html><body><div>1</div></body></html>'
              }
            },
            ttl: 3600
          }],
          optimizations: [
            {
              adUnitCode: 'test_ad_unit_code',
              isEnabled: false,
              ttl: 12000
            },
            {
              adUnitCode: 'test_ad_unit_code_2',
              isEnabled: true,
              ttl: 12000
            },
            {
              placementCode: 'test_placement_code',
              isEnabled: false,
              ttl: 12000
            }
          ]
        }
      };

      const formattedBid = {
        requestId: '2f0d9715f60be8',
        cpm: 1,
        currency: 'JPY',
        dealId: 'TEST_DEAL_ID',
        ttl: 3600,
        netRevenue: true,
        creativeId: 'CREATIVE_ID',
        mediaType: 'banner',
        width: 320,
        height: 250,
        ad: '<html><body><div>1</div></body></html>',
        adUrl: null
      };

      const formattedResponse = spec.interpretResponse(serverResponse, {});
      const storedOptimizations = getOptimizationsFromLocalStorage();

      localStorage.removeItem(OPTIMIZATIONS_STORAGE_KEY);

      expect(formattedResponse).to.deep.equal([formattedBid]);

      expect(storedOptimizations['test_ad_unit_code']).to.exist;
      expect(storedOptimizations['test_ad_unit_code'].isEnabled).to.equal(false);
      expect(storedOptimizations['test_ad_unit_code'].expiresAt).to.be.a('number');

      expect(storedOptimizations['test_ad_unit_code_2']).to.exist;
      expect(storedOptimizations['test_ad_unit_code_2'].isEnabled).to.equal(true);
      expect(storedOptimizations['test_ad_unit_code_2'].expiresAt).to.be.a('number');

      expect(storedOptimizations['test_placement_code']).to.exist;
      expect(storedOptimizations['test_placement_code'].isEnabled).to.equal(false);
      expect(storedOptimizations['test_placement_code'].expiresAt).to.be.a('number');
    });

    it('should return a formatted video bid with renderer', function () {
      const serverResponse = {
        body: {
          id: 'requestId',
          bids: [{
            id: 'bid-123',
            impressionId: '2f0d9715f60be8',
            price: {
              cpm: 1,
              currency: 'JPY'
            },
            dealId: 'TEST_DEAL_ID',
            ad: {
              creative: {
                id: 'CREATIVE_ID',
                mediaType: 'video',
                size: { width: 320, height: 250 },
                markup: '<VAST>...</VAST>',
                rendering: {
                  video: {
                    player: {
                      maxWidth: 800,
                      isReplayable: false
                    }
                  }
                }
              }
            },
            ttl: 3600
          }]
        }
      };

      const params = {
        data: {
          impressions: [{
            id: '2f0d9715f60be8',
            adUnitCode: 'video'
          }]
        },
        internal: {
          bidRequests: {
            '2f0d9715f60be8': VIDEO_BID_WITH_CONFIG
          }
        }
      };

      const formattedResponse = spec.interpretResponse(serverResponse, params);

      expect(formattedResponse).to.have.length(1);
      expect(formattedResponse[0]).to.have.property('renderer');
      expect(formattedResponse[0].renderer).to.have.property('id', 'bid-123');
      expect(formattedResponse[0].renderer).to.have.property('url', 'https://cdn.hubvisor.io/big/player.js');
      expect(formattedResponse[0].renderer).to.have.property('config');
      expect(formattedResponse[0].renderer.config).to.have.property('selector', '#video');
      expect(formattedResponse[0].renderer.config).to.have.property('maxWidth', 640); // local config takes precedence
      expect(formattedResponse[0].renderer.config).to.have.property('isReplayable', true); // local config takes precedence
    });

    it('should handle video bid with missing impression request', function () {
      const serverResponse = {
        body: {
          id: 'requestId',
          bids: [{
            id: 'bid-123',
            impressionId: '2f0d9715f60be8',
            price: {
              cpm: 1,
              currency: 'JPY'
            },
            ad: {
              creative: {
                id: 'CREATIVE_ID',
                mediaType: 'video',
                size: { width: 320, height: 250 },
                markup: '<VAST>...</VAST>'
              }
            },
            ttl: 3600
          }]
        }
      };

      const params = {
        data: {
          impressions: []
        },
        internal: {
          bidRequests: {}
        }
      };

      const formattedResponse = spec.interpretResponse(serverResponse, params);

      expect(formattedResponse).to.have.length(1);
      expect(formattedResponse[0]).to.not.have.property('renderer');
    });

    it('should handle video bid with missing bid request', function () {
      const serverResponse = {
        body: {
          id: 'requestId',
          bids: [{
            id: 'bid-123',
            impressionId: '2f0d9715f60be8',
            price: {
              cpm: 1,
              currency: 'JPY'
            },
            ad: {
              creative: {
                id: 'CREATIVE_ID',
                mediaType: 'video',
                size: { width: 320, height: 250 },
                markup: '<VAST>...</VAST>'
              }
            },
            ttl: 3600
          }]
        }
      };

      const params = {
        data: {
          impressions: [{
            id: '2f0d9715f60be8',
            adUnitCode: 'video'
          }]
        },
        internal: {
          bidRequests: {}
        }
      };

      const formattedResponse = spec.interpretResponse(serverResponse, params);

      expect(formattedResponse).to.have.length(1);
      expect(formattedResponse[0]).to.not.have.property('renderer');
    });
  });

  describe('getUserSyncs', function () {
    it('should return an empty response if the response is invalid or missing data', function () {
      expect(spec.getUserSyncs(null, [{ body: 'INVALID_BODY' }])).to.be.undefined;
      expect(spec.getUserSyncs(null, [{ body: 'INVALID_BODY' }, { body: 'INVALID_BODY' }])).to.be.undefined;
    });

    it('should return an array of user syncs', function () {
      const serverResponses = [
        {
          body: {
            bidders: [
              { type: 'image', url: 'https://test-url.com' },
              { type: 'redirect', url: 'https://test-url.com' },
              { type: 'iframe', url: 'https://test-url.com' }
            ]
          }
        },
        {
          body: 'BID-RESPONSE-DATA'
        }
      ];

      const formattedUserSyncs = [
        { type: 'image', url: 'https://test-url.com' },
        { type: 'image', url: 'https://test-url.com' },
        { type: 'iframe', url: 'https://test-url.com' }
      ];

      expect(spec.getUserSyncs(null, serverResponses)).to.deep.equal(formattedUserSyncs);
    });

    it('should ignore user syncs with an unknown type or without url', function () {
      const serverResponses = [
        {
          body: {
            bidders: [
              { type: 'unknown', url: 'https://test-url.com' },
              { type: 'image' }
            ]
          }
        },
        {
          body: 'BID-RESPONSE-DATA'
        }
      ];

      expect(spec.getUserSyncs(null, serverResponses)).to.deep.equal([]);
    });
  });

  describe('renderer integration', function () {
    it('should create renderer with correct configuration when video bid is processed', function () {
      const serverResponse = {
        body: {
          id: 'requestId',
          bids: [{
            id: 'bid-123',
            impressionId: '2f0d9715f60be8',
            price: {
              cpm: 1,
              currency: 'JPY'
            },
            ad: {
              creative: {
                id: 'CREATIVE_ID',
                mediaType: 'video',
                size: { width: 320, height: 250 },
                markup: '<VAST>...</VAST>',
                rendering: {
                  video: {
                    player: {
                      maxWidth: 800,
                      isReplayable: false
                    }
                  }
                }
              }
            },
            ttl: 3600
          }]
        }
      };

      const params = {
        data: {
          impressions: [{
            id: '2f0d9715f60be8',
            adUnitCode: 'video'
          }]
        },
        internal: {
          bidRequests: {
            '2f0d9715f60be8': VIDEO_BID_WITH_CONFIG
          }
        }
      };

      const formattedResponse = spec.interpretResponse(serverResponse, params);

      expect(formattedResponse).to.have.length(1);
      expect(formattedResponse[0]).to.have.property('renderer');
      expect(formattedResponse[0].renderer).to.have.property('id', 'bid-123');
      expect(formattedResponse[0].renderer).to.have.property('url', 'https://cdn.hubvisor.io/big/player.js');
      expect(formattedResponse[0].renderer).to.have.property('config');
      expect(formattedResponse[0].renderer.config).to.have.property('selector', '#video');
      expect(formattedResponse[0].renderer.config).to.have.property('maxWidth', 640); // local config takes precedence
      expect(formattedResponse[0].renderer.config).to.have.property('isReplayable', true); // local config takes precedence
    });

    it('should merge local and remote configurations correctly', function () {
      const serverResponse = {
        body: {
          id: 'requestId',
          bids: [{
            id: 'bid-123',
            impressionId: '2f0d9715f60be8',
            price: {
              cpm: 1,
              currency: 'JPY'
            },
            ad: {
              creative: {
                id: 'CREATIVE_ID',
                mediaType: 'video',
                size: { width: 320, height: 250 },
                markup: '<VAST>...</VAST>',
                rendering: {
                  video: {
                    player: {
                      maxWidth: 800,
                      isReplayable: false
                    }
                  }
                }
              }
            },
            ttl: 3600
          }]
        }
      };

      const params = {
        data: {
          impressions: [{
            id: '2f0d9715f60be8',
            adUnitCode: 'video'
          }]
        },
        internal: {
          bidRequests: {
            '2f0d9715f60be8': {
              ...VIDEO_BID_WITH_CONFIG,
              params: {
                video: {
                  maxWidth: 640,
                  isReplayable: true
                }
              }
            }
          }
        }
      };

      const formattedResponse = spec.interpretResponse(serverResponse, params);

      expect(formattedResponse).to.have.length(1);
      expect(formattedResponse[0].renderer.config).to.have.property('maxWidth', 640); // local config takes precedence
      expect(formattedResponse[0].renderer.config).to.have.property('isReplayable', true); // local config takes precedence
    });

    it('should handle CSS selector formatting correctly', function () {
      const serverResponse = {
        body: {
          id: 'requestId',
          bids: [{
            id: 'bid-123',
            impressionId: '2f0d9715f60be8',
            price: {
              cpm: 1,
              currency: 'JPY'
            },
            ad: {
              creative: {
                id: 'CREATIVE_ID',
                mediaType: 'video',
                size: { width: 320, height: 250 },
                markup: '<VAST>...</VAST>'
              }
            },
            ttl: 3600
          }]
        }
      };

      const params = {
        data: {
          impressions: [{
            id: '2f0d9715f60be8',
            adUnitCode: 'video-unit-with-special-chars'
          }]
        },
        internal: {
          bidRequests: {
            '2f0d9715f60be8': {
              ...VIDEO_BID,
              adUnitCode: 'video-unit-with-special-chars',
              params: {}
            }
          }
        }
      };

      const formattedResponse = spec.interpretResponse(serverResponse, params);

      expect(formattedResponse).to.have.length(1);
      expect(formattedResponse[0].renderer.config).to.have.property('selector');
      expect(formattedResponse[0].renderer.config.selector).to.include('video-unit-with-special-chars');
    });
  });

  describe('outstream rendering', function () {
    let container;

    beforeEach(function () {
      container = document.createElement('div');
      container.id = 'video';
      document.body.appendChild(container);
      window.HbvPlayer = { playOutstream: sinon.spy() };
    });

    afterEach(function () {
      container.remove();
      delete window.HbvPlayer;
    });

    it('should play the video in the container matching the selector', function () {
      const bid = buildRenderableVideoBid();

      bid.renderer._render(bid);

      const [playerContainer, options] = window.HbvPlayer.playOutstream.firstCall.args;

      expect(playerContainer).to.equal(container);
      expect(options).to.include({ vastXml: '<VAST></VAST>', targetWidth: 320, targetHeight: 250, expand: 'when-visible' });
      expect(options.selector).to.equal('#video');
      expect(() => {
        options.onEvent('impression');
        options.onEvent('error');
        options.onEvent('other');
      }).to.not.throw();
    });

    it('should resolve the container from a selector function', function () {
      const bid = buildRenderableVideoBid({ selector: () => container });

      bid.renderer._render(bid);

      expect(window.HbvPlayer.playOutstream.firstCall.args[0]).to.equal(container);
    });

    it('should use the container directly when the selector is neither a string nor a function', function () {
      const bid = buildRenderableVideoBid({ selector: container });

      bid.renderer._render(bid);

      expect(window.HbvPlayer.playOutstream.firstCall.args[0]).to.equal(container);
    });

    it('should call the player without container when it cannot be found', function () {
      const missingSelector = buildRenderableVideoBid({ selector: '#missing' });
      const missingFromFunction = buildRenderableVideoBid({ selector: () => null });

      missingSelector.renderer._render(missingSelector);
      missingFromFunction.renderer._render(missingFromFunction);

      expect(window.HbvPlayer.playOutstream.firstCall.args[0]).to.equal(undefined);
      expect(window.HbvPlayer.playOutstream.secondCall.args[0]).to.equal(undefined);
    });

    it('should not play the video when the player is not loaded', function () {
      const bid = buildRenderableVideoBid();
      const playOutstream = window.HbvPlayer.playOutstream;

      delete window.HbvPlayer;

      expect(() => bid.renderer._render(bid)).to.not.throw();
      expect(playOutstream.called).to.equal(false);
    });
  });
});
