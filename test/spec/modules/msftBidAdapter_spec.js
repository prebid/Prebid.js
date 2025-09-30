import {
  expect
} from 'chai';
import {
  spec
} from 'modules/msftBidAdapter.js';
import {
  deepClone
} from '../../../src/utils.js';

const ENDPOINT_URL_NORMAL = 'https://ib.adnxs.com/openrtb2/prebidjs';

describe('msftBidAdapter', function () {
  let baseBidRequests = {
    bidder: 'msft',
    adUnitCode: 'adunit-code',
    bidId: '2c5f3044f546f1',
    params: {
      placement_id: '12345'
    }
  };

  let baseBidderRequest = {
    auctionId: 'test-auction-id',
    ortb2: {
      site: {
        page: 'http://www.example.com/page.html',
        domain: 'example.com'
      }
    },
    refererInfo: {
      topmostLocation: 'http://www.example.com/page.html'
    },
    bids: baseBidRequests,
    gdprConsent: {
      gdprApplies: true,
      consentString: 'test-consent-string',
      vendorData: {
        purpose: {
          consents: {
            1: true
          }
        }
      }
    }
  };

  describe('isBidRequestValid', function () {
    it('should return true when required params are present (placement_id)', function () {
      const bid = {
        bidder: 'msft',
        params: {
          placement_id: '12345'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params are present (member and inv_code)', function () {
      const bid = {
        bidder: 'msft',
        params: {
          member: '123',
          inv_code: 'abc'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not present', function () {
      const bid = {
        bidder: 'msft',
        params: {
          member: '123'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    beforeEach(function () {
      //
    });

    it('should build a basic banner request', function () {
      let testBidRequest = deepClone(baseBidRequests);
      testBidRequest.params = Object.assign({}, testBidRequest.params, {
        banner_frameworks: [1, 2, 7],
        allow_smaller_sizes: false,
        use_pmt_rule: true,
        keywords: 'sports,music=rock',
        traffic_source_code: 'some_traffic_source',
        pubclick: 'http://publisher.click.url',
        ext_inv_code: 'inv_code_123',
        ext_imp_id: 'ext_imp_id_456'
      });
      const bidRequests = [{
        ...testBidRequest,
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [300, 600]
            ]
          }
        },
      }];

      const testBidderRequest = deepClone(baseBidderRequest);
      const bidderRequest = Object.assign({}, testBidderRequest, {
        bids: bidRequests
      });

      debugger; // eslint-disable-line
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.satisfy(url => url.startsWith(ENDPOINT_URL_NORMAL));
      const data = request.data;
      expect(data).to.exist;
      expect(data.imp).to.have.lengthOf(1);
      expect(data.imp[0].banner.format).to.deep.equal([{
        w: 300,
        h: 250
      }, {
        w: 300,
        h: 600
      }]);
      expect(data.imp[0].banner.api).to.deep.equal([1, 2, 7]);
      expect(data.imp[0].ext.appnexus.placement_id).to.equal('12345');
      expect(data.imp[0].ext.appnexus.allow_smaller_sizes).to.equal(false);
      expect(data.imp[0].ext.appnexus.use_pmt_rule).to.equal(true);
      expect(data.imp[0].ext.appnexus.keywords).to.equal('sports,music=rock');
      expect(data.imp[0].ext.appnexus.traffic_source_code).to.equal('some_traffic_source');
      expect(data.imp[0].ext.appnexus.pubclick).to.equal('http://publisher.click.url');
      expect(data.imp[0].ext.appnexus.ext_inv_code).to.equal('inv_code_123');
      expect(data.imp[0].id).to.equal('ext_imp_id_456');
    });

    if (FEATURES.VIDEO) {
      it('should build a video request', function () {
        const testBidRequests = deepClone(baseBidRequests);
        const testBidderRequest = deepClone(baseBidderRequest);

        const bidRequests = [{
          ...testBidRequests,
          mediaTypes: {
            video: {
              context: 'instream',
              playerSize: [
                [640, 480]
              ],
              mimes: ['video/mp4'],
              protocols: [2, 3],
              api: [2]
            }
          }
        }];
        const bidderRequest = Object.assign({}, testBidderRequest, {
          bids: bidRequests
        });

        const request = spec.buildRequests(bidRequests, bidderRequest)[0];
        expect(request.method).to.equal('POST');
        expect(request.url).to.satisfy(url => url.startsWith(ENDPOINT_URL_NORMAL));
        const data = request.data;
        expect(data).to.exist;
        expect(data.imp).to.have.lengthOf(1);
        expect(data.imp[0].video).to.exist;
        expect(data.imp[0].video.w).to.equal(640);
        expect(data.imp[0].video.h).to.equal(480);
        expect(data.imp[0].ext.appnexus.require_asset_url).to.be.true;
      });
    }

    if (FEATURES.NATIVE) {
      it('should build a native request', function () {
        const testBidRequests = deepClone(baseBidRequests);
        const testBidderRequest = deepClone(baseBidderRequest);

        const nativeRequest = {
          assets: [{
            id: 1,
            required: 1,
            title: {
              len: 140
            }
          }],
          context: 1,
          plcmttype: 1,
          ver: '1.2'
        };

        const bidRequests = [{
          ...testBidRequests,
          mediaTypes: {
            native: {
              ortb: nativeRequest
            }
          },
          nativeOrtbRequest: nativeRequest,
          nativeParams: {
            ortb: nativeRequest
          }
        }];
        const bidderRequest = Object.assign({}, testBidderRequest, {
          bids: bidRequests
        });

        const request = spec.buildRequests(bidRequests, bidderRequest)[0];
        expect(request.method).to.equal('POST');
        expect(request.url).to.satisfy(url => url.startsWith(ENDPOINT_URL_NORMAL));
        const data = request.data;
        expect(data.imp).to.have.lengthOf(1);
        expect(data.imp[0].native.request).to.equal(JSON.stringify(nativeRequest));
      });
    }
  });

  // describe('interpretResponse', function () {
  //   const request = {
  //     data: {
  //       id: 'test-req-id',
  //       imp: [{
  //         id: '2c5f3044f546f1',
  //         banner: {},
  //         ext: {
  //           appnexus: {
  //             placement_id: '12345'
  //           }
  //         }
  //       }]
  //     },
  //     bidderRequest: {
  //       bids: [{
  //         bidId: '2c5f3044f546f1',
  //         adUnitCode: 'adunit-code'
  //       }]
  //     }
  //   };

  //   const baseBid = {
  //     impid: '2c5f3044f546f1',
  //     price: 0.5,
  //     crid: 'creative-id',
  //     w: 300,
  //     h: 250,
  //     ext: {
  //       appnexus: {
  //         bid_ad_type: 0, // banner
  //         advertiser_id: 987
  //       }
  //     }
  //   };

  //   it('should interpret a banner response', function () {
  //     const response = {
  //       body: {
  //         id: 'test-resp-id',
  //         seatbid: [{
  //           seat: 'msft',
  //           bid: [{
  //             ...baseBid,
  //             adm: '<div>banner</div>'
  //           }]
  //         }]
  //       }
  //     };

  //     const bids = spec.interpretResponse(response, request);
  //     expect(bids).to.have.lengthOf(1);
  //     const bid = bids[0];
  //     expect(bid.mediaType).to.equal(BANNER);
  //     expect(bid.cpm).to.equal(0.5);
  //     expect(bid.ad).to.equal('<div>banner</div>');
  //     expect(bid.meta.advertiserId).to.equal(987);
  //   });

  //   it('should interpret a video response', function () {
  //     const response = {
  //       body: {
  //         id: 'test-resp-id',
  //         seatbid: [{
  //           seat: 'msft',
  //           bid: [{
  //             ...baseBid,
  //             adm: '<vast></vast>',
  //             ext: {
  //               appnexus: {
  //                 ...baseBid.ext.appnexus,
  //                 bid_ad_type: 1 // video
  //               }
  //             }
  //           }]
  //         }]
  //       }
  //     };

  //     const bids = spec.interpretResponse(response, request);
  //     expect(bids).to.have.lengthOf(1);
  //     const bid = bids[0];
  //     expect(bid.mediaType).to.equal(VIDEO);
  //     expect(bid.vastXml).to.equal('<vast></vast>');
  //   });

  //   it('should interpret a native response', function () {
  //     const nativeAdm = {
  //       assets: [{
  //         id: 1,
  //         title: {
  //           text: 'native title'
  //         }
  //       }],
  //       imptrackers: ['imp-tracker-url']
  //     };

  //     const response = {
  //       body: {
  //         id: 'test-resp-id',
  //         seatbid: [{
  //           seat: 'msft',
  //           bid: [{
  //             ...baseBid,
  //             adm: JSON.stringify(nativeAdm),
  //             ext: {
  //               appnexus: {
  //                 ...baseBid.ext.appnexus,
  //                 bid_ad_type: 3 // native
  //               }
  //             }
  //           }]
  //         }]
  //       }
  //     };

  //     const bids = spec.interpretResponse(response, request);
  //     expect(bids).to.have.lengthOf(1);
  //     const bid = bids[0];
  //     expect(bid.mediaType).to.equal(NATIVE);
  //     expect(bid.native.title).to.equal('native title');
  //     expect(bid.native.impressionTrackers).to.deep.equal(['imp-tracker-url']);
  //   });
  // });

  describe('getUserSyncs', function () {
    it('should return an iframe sync if enabled and GDPR consent is given', function () {
      const syncOptions = {
        iframeEnabled: true
      };
      const gdprConsent = {
        gdprApplies: true,
        consentString: '...',
        vendorData: {
          purpose: {
            consents: {
              1: true
            }
          }
        }
      };
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(syncs).to.deep.equal([{
        type: 'iframe',
        url: 'https://acdn.adnxs.com/dmp/async_usersync.html'
      }]);
    });

    it('should return a pixel sync if enabled', function () {
      const syncOptions = {
        pixelEnabled: true
      };
      const syncs = spec.getUserSyncs(syncOptions, []);
      expect(syncs).to.not.be.empty;
      expect(syncs[0].type).to.equal('image');
    });
  });
});
