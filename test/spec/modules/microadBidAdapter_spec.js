import { expect } from 'chai';
import { spec } from 'modules/microadBidAdapter.js';
import * as utils from 'src/utils.js';

describe('microadBidAdapter', () => {
  const bidRequestTemplate = {
    bidder: 'microad',
    mediaTypes: {
      banner: {}
    },
    params: {
      spot: 'spot-code'
    },
    bidId: 'bid-id',
    transactionId: 'transaction-id'
  };

  describe('isBidRequestValid', () => {
    it('should return true when required parameters are set', () => {
      const validBids = [
        bidRequestTemplate,
        Object.assign({}, bidRequestTemplate, {
          mediaTypes: {
            native: {}
          }
        }),
        Object.assign({}, bidRequestTemplate, {
          mediaTypes: {
            video: {}
          }
        })
      ];
      validBids.forEach(validBid => {
        expect(spec.isBidRequestValid(validBid)).to.equal(true);
      });
    });

    it('should return false when required parameters are not set', () => {
      const bidWithoutParams = utils.deepClone(bidRequestTemplate);
      delete bidWithoutParams.params;
      const bidWithoutSpot = utils.deepClone(bidRequestTemplate);
      delete bidWithoutSpot.params.spot;
      const bidWithoutMediaTypes = utils.deepClone(bidRequestTemplate);
      delete bidWithoutMediaTypes.mediaTypes;

      const invalidBids = [
        {},
        bidWithoutParams,
        bidWithoutSpot,
        bidWithoutMediaTypes,
        Object.assign({}, bidRequestTemplate, {
          mediaTypes: {}
        })
      ];
      invalidBids.forEach(invalidBid => {
        expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
      });
    });
  });

  describe('buildRequests', () => {
    const bidderRequest = {
      refererInfo: {
        page: 'https://example.com/to',
        ref: 'https://example.com/from'
      }
    };
    const expectedResultTemplate = {
      spot: 'spot-code',
      url: 'https://example.com/to',
      referrer: 'https://example.com/from',
      bid_id: 'bid-id',
      transaction_id: 'transaction-id',
      media_types: 1
    };

    it('should generate valid media_types', () => {
      const bidRequests = [
        bidRequestTemplate,
        Object.assign({}, bidRequestTemplate, {
          mediaTypes: {
            banner: {}, native: {}
          }
        }),
        Object.assign({}, bidRequestTemplate, {
          mediaTypes: {
            banner: {}, native: {}, video: {}
          }
        }),
        Object.assign({}, bidRequestTemplate, {
          mediaTypes: {
            native: {}
          }
        }),
        Object.assign({}, bidRequestTemplate, {
          mediaTypes: {
            native: {}, video: {}
          }
        }),
        Object.assign({}, bidRequestTemplate, {
          mediaTypes: {
            video: {}
          }
        }),
        Object.assign({}, bidRequestTemplate, {
          mediaTypes: {
            banner: {}, video: {}
          }
        })
      ];

      const results = bidRequests.map(bid => {
        const requests = spec.buildRequests([bid], bidderRequest);
        return requests[0].data.media_types;
      });
      expect(results).to.deep.equal([
        1, // BANNER
        3, // BANNER + NATIVE
        7, // BANNER + NATIVE + VIDEO
        2, // NATIVE
        6, // NATIVE + VIDEO
        4, // VIDEO
        5 // BANNER + VIDEO
      ]);
    });

    it('should use window.location.href if there is no page', () => {
      const bidderRequestWithoutCanonicalUrl = {
        refererInfo: {
          ref: 'https://example.com/from'
        }
      };
      const requests = spec.buildRequests([bidRequestTemplate], bidderRequestWithoutCanonicalUrl);
      requests.forEach(request => {
        expect(request.data).to.deep.equal(
          Object.assign({}, expectedResultTemplate, {
            cbt: request.data.cbt,
            url: window.location.href
          })
        );
      });
    });

    it('should generate valid request with no optional parameters', () => {
      const requests = spec.buildRequests([bidRequestTemplate], bidderRequest);
      requests.forEach(request => {
        expect(request.data).to.deep.equal(
          Object.assign({}, expectedResultTemplate, {
            cbt: request.data.cbt
          })
        );
      });
    });

    it('should add url_macro parameter to response if request parameters contain url', () => {
      const bidRequestWithUrl = Object.assign({}, bidRequestTemplate, {
        params: {
          spot: 'spot-code',
          url: '${COMPASS_EXT_URL}url-macro'
        }
      });
      const requests = spec.buildRequests([bidRequestWithUrl], bidderRequest);
      requests.forEach(request => {
        expect(request.data).to.deep.equal(
          Object.assign({}, expectedResultTemplate, {
            cbt: request.data.cbt,
            url_macro: 'url-macro'
          })
        );
      });
    });

    it('should add referrer_macro parameter to response if request parameters contain referrer', () => {
      const bidRequestWithReferrer = Object.assign({}, bidRequestTemplate, {
        params: {
          spot: 'spot-code',
          referrer: '${COMPASS_EXT_REF}referrer-macro'
        }
      });
      const requests = spec.buildRequests([bidRequestWithReferrer], bidderRequest);
      requests.forEach(request => {
        expect(request.data).to.deep.equal(
          Object.assign({}, expectedResultTemplate, {
            cbt: request.data.cbt,
            referrer_macro: 'referrer-macro'
          })
        );
      });
    });

    it('should add ifa parameter to response if request parameters contain ifa', () => {
      const bidRequestWithIfa = Object.assign({}, bidRequestTemplate, {
        params: {
          spot: 'spot-code',
          ifa: '${COMPASS_EXT_IFA}ifa'
        }
      });
      const requests = spec.buildRequests([bidRequestWithIfa], bidderRequest);
      requests.forEach(request => {
        expect(request.data).to.deep.equal(
          Object.assign({}, expectedResultTemplate, {
            cbt: request.data.cbt,
            ifa: 'ifa'
          })
        );
      });
    });

    it('should add appid parameter to response if request parameters contain appid', () => {
      const bidRequestWithAppid = Object.assign({}, bidRequestTemplate, {
        params: {
          spot: 'spot-code',
          appid: '${COMPASS_EXT_APPID}appid'
        }
      });
      const requests = spec.buildRequests([bidRequestWithAppid], bidderRequest);
      requests.forEach(request => {
        expect(request.data).to.deep.equal(
          Object.assign({}, expectedResultTemplate, {
            cbt: request.data.cbt,
            appid: 'appid'
          })
        );
      });
    });

    it('should add geo parameter to response if request parameters contain geo', () => {
      const bidRequestWithGeo = Object.assign({}, bidRequestTemplate, {
        params: {
          spot: 'spot-code',
          geo: '${COMPASS_EXT_GEO}35.655275,139.693771'
        }
      });
      const requests = spec.buildRequests([bidRequestWithGeo], bidderRequest);
      requests.forEach(request => {
        expect(request.data).to.deep.equal(
          Object.assign({}, expectedResultTemplate, {
            cbt: request.data.cbt,
            geo: '35.655275,139.693771'
          })
        );
      });
    });

    it('should not add geo parameter to response if request parameters contain invalid geo', () => {
      const bidRequestWithGeo = Object.assign({}, bidRequestTemplate, {
        params: {
          spot: 'spot-code',
          geo: '${COMPASS_EXT_GEO}invalid format geo'
        }
      });
      const requests = spec.buildRequests([bidRequestWithGeo], bidderRequest);
      requests.forEach(request => {
        expect(request.data).to.deep.equal(
          Object.assign({}, expectedResultTemplate, {
            cbt: request.data.cbt
          })
        );
      });
    });

    it('should always use the HTTPS endpoint https://s-rtb-pb.send.microad.jp/prebid even if it is served via HTTP', () => {
      const requests = spec.buildRequests([bidRequestTemplate], bidderRequest);
      requests.forEach(request => {
        expect(request.url.lastIndexOf('https', 0) === 0).to.be.true;
      });
    });

    it('should add Liveramp identity link if it is available in request parameters', () => {
      const bidRequestWithLiveramp = Object.assign({}, bidRequestTemplate, {
        userId: {idl_env: 'idl-env-sample'}
      });
      const requests = spec.buildRequests([bidRequestWithLiveramp], bidderRequest)
      requests.forEach(request => {
        expect(request.data).to.deep.equal(
          Object.assign({}, expectedResultTemplate, {
            cbt: request.data.cbt,
            idl_env: 'idl-env-sample'
          })
        );
      })
    });

    it('should not add Liveramp identity link if it is not available in request parameters', () => {
      const bidRequestWithLiveramp = Object.assign({}, bidRequestTemplate, {
        userId: {}
      });
      const requests = spec.buildRequests([bidRequestWithLiveramp], bidderRequest)
      const expectedResult = Object.assign({}, expectedResultTemplate)
      requests.forEach(request => {
        expect(request.data).to.deep.equal(
          Object.assign({}, expectedResultTemplate, {
            cbt: request.data.cbt
          })
        );
      })
    });
  });

  describe('interpretResponse', () => {
    const serverResponseTemplate = {
      body: {
        requestId: 'request-id',
        cpm: 0.1,
        width: 200,
        height: 100,
        ad: '<div>test</div>',
        ttl: 10,
        creativeId: 'creative-id',
        netRevenue: true,
        currency: 'JPY',
        meta: {
          advertiserDomains: ['foobar.com']
        }
      }
    };
    const expectedBidResponseTemplate = {
      requestId: 'request-id',
      cpm: 0.1,
      width: 200,
      height: 100,
      ad: '<div>test</div>',
      ttl: 10,
      creativeId: 'creative-id',
      netRevenue: true,
      currency: 'JPY',
      meta: {
        advertiserDomains: ['foobar.com']
      }
    };

    it('should return nothing if server response body does not contain cpm', () => {
      const emptyResponse = {
        body: {}
      };

      expect(spec.interpretResponse(emptyResponse)).to.deep.equal([]);
    });

    it('should return nothing if returned cpm is zero', () => {
      const serverResponse = {
        body: {
          cpm: 0
        }
      };

      expect(spec.interpretResponse(serverResponse)).to.deep.equal([]);
    });

    it('should return a valid bidResponse without deal id if serverResponse is valid, has a nonzero cpm and no deal id', () => {
      expect(spec.interpretResponse(serverResponseTemplate)).to.deep.equal([expectedBidResponseTemplate]);
    });

    it('should return a valid bidResponse with deal id if serverResponse is valid, has a nonzero cpm and a deal id', () => {
      const serverResponseWithDealId = Object.assign({}, utils.deepClone(serverResponseTemplate));
      serverResponseWithDealId.body['dealId'] = 10001;
      const expectedBidResponse = Object.assign({}, expectedBidResponseTemplate, {
        dealId: 10001
      });

      expect(spec.interpretResponse(serverResponseWithDealId)).to.deep.equal([expectedBidResponse]);
    });

    it('should return a valid bidResponse without meta if serverResponse is valid, has a nonzero cpm and no deal id', () => {
      const serverResponseWithoutMeta = Object.assign({}, utils.deepClone(serverResponseTemplate));
      delete serverResponseWithoutMeta.body.meta;
      const expectedBidResponse = Object.assign({}, expectedBidResponseTemplate, {
        meta: { advertiserDomains: [] }
      });

      expect(spec.interpretResponse(serverResponseWithoutMeta)).to.deep.equal([expectedBidResponse]);
    });
  });

  describe('getUserSyncs', () => {
    const BOTH_ENABLED = {
      iframeEnabled: true, pixelEnabled: true
    };
    const IFRAME_ENABLED = {
      iframeEnabled: true, pixelEnabled: false
    };
    const PIXEL_ENABLED = {
      iframeEnabled: false, pixelEnabled: true
    };
    const BOTH_DISABLED = {
      iframeEnabled: false, pixelEnabled: false
    };
    const serverResponseTemplate = {
      body: {
        syncUrls: {
          iframe: ['https://www.exmaple.com/iframe1', 'https://www.exmaple.com/iframe2'],
          image: ['https://www.exmaple.com/image1', 'https://www.exmaple.com/image2']
        }
      }
    };
    const expectedIframeSyncs = [
      {type: 'iframe', url: 'https://www.exmaple.com/iframe1'},
      {type: 'iframe', url: 'https://www.exmaple.com/iframe2'}
    ];
    const expectedImageSyncs = [
      {type: 'image', url: 'https://www.exmaple.com/image1'},
      {type: 'image', url: 'https://www.exmaple.com/image2'}
    ];

    it('should return nothing if no sync urls are set', () => {
      const serverResponse = utils.deepClone(serverResponseTemplate);
      serverResponse.body.syncUrls.iframe = [];
      serverResponse.body.syncUrls.image = [];

      const syncs = spec.getUserSyncs(BOTH_ENABLED, [serverResponse]);
      expect(syncs).to.deep.equal([]);
    });

    it('should return nothing if sync is disabled', () => {
      const syncs = spec.getUserSyncs(BOTH_DISABLED, [serverResponseTemplate]);
      expect(syncs).to.deep.equal([]);
    });

    it('should register iframe and image sync urls if sync is enabled', () => {
      const syncs = spec.getUserSyncs(BOTH_ENABLED, [serverResponseTemplate]);
      expect(syncs).to.deep.equal(expectedIframeSyncs.concat(expectedImageSyncs));
    });

    it('should register iframe sync urls if iframe is enabled', () => {
      const syncs = spec.getUserSyncs(IFRAME_ENABLED, [serverResponseTemplate]);
      expect(syncs).to.deep.equal(expectedIframeSyncs);
    });

    it('should register image sync urls if image is enabled', () => {
      const syncs = spec.getUserSyncs(PIXEL_ENABLED, [serverResponseTemplate]);
      expect(syncs).to.deep.equal(expectedImageSyncs);
    });
  });
});
