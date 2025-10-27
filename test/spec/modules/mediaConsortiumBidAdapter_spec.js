import { expect } from 'chai';
import { spec, OPTIMIZATIONS_STORAGE_KEY, getOptimizationsFromLocalStorage } from 'modules/mediaConsortiumBidAdapter.js';

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
}

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
}

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
}

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
}

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
}

describe('Media Consortium Bid Adapter', function () {
  before(function () {
    // The local storage variable is not cleaned in some other test so we need to do it ourselves here
    localStorage.removeItem('ope_fpid')
  })

  beforeEach(function () {
    $$PREBID_GLOBAL$$.bidderSettings = {
      mediaConsortium: {
        storageAllowed: true
      }
    }
  })

  afterEach(function () {
    $$PREBID_GLOBAL$$.bidderSettings = {};
  })

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
      }

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
      }

      const bids = [BANNER_BID]
      const [syncRequest, auctionRequest] = spec.buildRequests(bids, {...bidderRequest, bids});

      expect(syncRequest.data).to.deep.equal(builtSyncRequest)
      expect(auctionRequest.data).to.deep.equal(builtBidRequest)
    })

    it('should build a video request', function () {
      const builtSyncRequest = {
        gdpr: false,
        ad_unit_codes: VIDEO_BID.adUnitCode
      }

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
      }

      const bids = [VIDEO_BID]
      const [syncRequest, auctionRequest] = spec.buildRequests(bids, {...bidderRequest, bids});

      expect(syncRequest.data).to.deep.equal(builtSyncRequest)
      expect(auctionRequest.data).to.deep.equal(builtBidRequest)
    })

    it('should build a request with multiple mediatypes', function () {
      const builtSyncRequest = {
        gdpr: false,
        ad_unit_codes: MULTI_MEDIATYPES_BID.adUnitCode
      }

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
      }

      const bids = [MULTI_MEDIATYPES_BID]
      const [syncRequest, auctionRequest] = spec.buildRequests(bids, {...bidderRequest, bids});

      expect(syncRequest.data).to.deep.equal(builtSyncRequest)
      expect(auctionRequest.data).to.deep.equal(builtBidRequest)
    })

    it('should not build a request if optimizations are there for the adunit code', function () {
      const bids = [BANNER_BID]
      const optimizations = {
        [bids[0].adUnitCode]: {isEnabled: false, expiresAt: Date.now() + 600000}
      }

      localStorage.setItem(OPTIMIZATIONS_STORAGE_KEY, JSON.stringify(optimizations))

      const requests = spec.buildRequests(bids, {...bidderRequest, bids});

      localStorage.removeItem(OPTIMIZATIONS_STORAGE_KEY)

      expect(requests).to.be.undefined
    })

    it('should exclude video requests where context is missing or not equal to outstream', function () {
      const builtSyncRequest = {
        gdpr: false,
        ad_unit_codes: MULTI_MEDIATYPES_WITH_INVALID_VIDEO_CONTEXT.adUnitCode
      }

      const builtBidRequest = {
        id: '98bb5f61-4140-4ced-8b0e-65a33d792ab8',
        impressions: [{
          id: MULTI_MEDIATYPES_WITH_INVALID_VIDEO_CONTEXT.bidId,
          adUnitCode: MULTI_MEDIATYPES_WITH_INVALID_VIDEO_CONTEXT.adUnitCode,
          mediaTypes: {banner: MULTI_MEDIATYPES_WITH_INVALID_VIDEO_CONTEXT.mediaTypes.banner}
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
      }

      const invalidVideoBids = [VIDEO_BID_WITH_MISSING_CONTEXT]
      const multiMediatypesBidWithInvalidVideo = [MULTI_MEDIATYPES_WITH_INVALID_VIDEO_CONTEXT]

      expect(spec.buildRequests(invalidVideoBids, {...bidderRequest, bids: invalidVideoBids})).to.be.undefined

      const [syncRequest, auctionRequest] = spec.buildRequests(multiMediatypesBidWithInvalidVideo, {...bidderRequest, bids: multiMediatypesBidWithInvalidVideo})

      expect(syncRequest.data).to.deep.equal(builtSyncRequest)
      expect(auctionRequest.data).to.deep.equal(builtBidRequest)
    })
  })

  describe('interpretResponse', function () {
    it('should return an empty array if the response is invalid', function () {
      expect(spec.interpretResponse({body: 'INVALID_BODY'}, {})).to.deep.equal([]);
    })

    it('should return a formatted bid', function () {
      const serverResponse = {
        body: {
          id: 'requestId',
          bids: [{
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
                size: {width: 320, height: 250},
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
            }
          ]
        }
      }

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
      }

      const formattedResponse = spec.interpretResponse(serverResponse, {})
      const storedOptimizations = getOptimizationsFromLocalStorage()

      localStorage.removeItem(OPTIMIZATIONS_STORAGE_KEY)

      expect(formattedResponse).to.deep.equal([formattedBid]);

      expect(storedOptimizations['test_ad_unit_code']).to.exist
      expect(storedOptimizations['test_ad_unit_code'].isEnabled).to.equal(false)
      expect(storedOptimizations['test_ad_unit_code'].expiresAt).to.be.a('number')

      expect(storedOptimizations['test_ad_unit_code_2']).to.exist
      expect(storedOptimizations['test_ad_unit_code_2'].isEnabled).to.equal(true)
      expect(storedOptimizations['test_ad_unit_code_2'].expiresAt).to.be.a('number')
    })
  });

  describe('getUserSyncs', function () {
    it('should return an empty response if the response is invalid or missing data', function () {
      expect(spec.getUserSyncs(null, [{body: 'INVALID_BODY'}])).to.be.undefined;
      expect(spec.getUserSyncs(null, [{body: 'INVALID_BODY'}, {body: 'INVALID_BODY'}])).to.be.undefined;
    })

    it('should return an array of user syncs', function () {
      const serverResponses = [
        {
          body: {
            bidders: [
              {type: 'image', url: 'https://test-url.com'},
              {type: 'redirect', url: 'https://test-url.com'},
              {type: 'iframe', url: 'https://test-url.com'}
            ]
          }
        },
        {
          body: 'BID-RESPONSE-DATA'
        }
      ]

      const formattedUserSyncs = [
        {type: 'image', url: 'https://test-url.com'},
        {type: 'image', url: 'https://test-url.com'},
        {type: 'iframe', url: 'https://test-url.com'}
      ]

      expect(spec.getUserSyncs(null, serverResponses)).to.deep.equal(formattedUserSyncs);
    })
  });
});
