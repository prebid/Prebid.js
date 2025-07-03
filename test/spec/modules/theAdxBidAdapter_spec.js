import {
  expect
} from 'chai';
import {
  spec,
  internals
} from 'modules/theAdxBidAdapter.js';
import {
  newBidder
} from 'src/adapters/bidderFactory.js';

describe('TheAdxAdapter', function () {
  const adapter = newBidder(spec);

  describe('getUserSyncs', () => {
    const USER_SYNC_IFRAME_URL = 'https://ssp.theadx.com/async_usersync_iframe.html'
    const USER_SYNC_IMAGE_URL = 'https://ssp.theadx.com/async_usersync_image.gif'

    expect(spec.getUserSyncs({
      iframeEnabled: true,
      pixelEnabled: true,
    }, [{
      body: {
        ext: {
          sync: {
            iframe: [USER_SYNC_IFRAME_URL],
            image: [USER_SYNC_IMAGE_URL],
          }
        }
      }
    }])).to.deep.equal([{
      type: 'iframe',
      url: USER_SYNC_IFRAME_URL
    },
    {
      type: 'image',
      url: USER_SYNC_IMAGE_URL
    },
    ]);
  });

  describe('bid validator', function () {
    it('rejects a bid that is missing the placementId', function () {
      const testBid = {};
      expect(spec.isBidRequestValid(testBid)).to.be.false;
    });

    it('accepts a bid with all the expected parameters', function () {
      const testBid = {
        params: {
          pid: '1',
          tagId: '1',
        }
      };

      expect(spec.isBidRequestValid(testBid)).to.be.true;
    });
  });

  describe('request builder', function () {
    // Taken from the docs, so used as much as is valid
    const sampleBidRequest = {
      'bidder': 'tests',
      'bidId': '51ef8751f9aead',
      'params': {
        'pid': '1',
        'tagId': '1',
      },
      'adUnitCode': 'div-gpt-ad-sample',
      'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      'sizes': [
        [300, 250]
      ],
      'bidderRequestId': '418b37f85e772c',
      'auctionId': '18fd8b8b0bd757',
      'mediaTypes': {
        banner: {
          'sizes': [
            [320, 50],
            [300, 250],
            [300, 600]
          ]
        }
      },
      userId: {
        uid2: { id: 'sample-uid2' },
        id5id: {
          'uid': 'sample-id5id',
          'ext': {
            'linkType': 'abc'
          }
        },
        netId: 'sample-netid',
        sharedid: {
          'id': 'sample-sharedid',
        },

      },
    };

    const sampleBidderRequest = {
      bidderRequestId: 'sample',
      refererInfo: {
        canonicalUrl: 'https://domain.com/to',
        referer: 'https://domain.com/from'
      }
    }

    it('successfully generates a URL', function () {
      const placementId = '1';

      const bidRequests = [sampleBidRequest];

      const results = spec.buildRequests(bidRequests, sampleBidderRequest);
      const result = results.pop();

      expect(result.url).to.not.be.undefined;
      expect(result.url).to.not.be.null;

      expect(result.url).to.include('tagid=' + placementId);
    });

    it('uses the bidId id as the openRtb request ID', function () {
      const bidId = '51ef8751f9aead';

      const bidRequests = [
        sampleBidRequest
      ];

      const results = spec.buildRequests(bidRequests, sampleBidderRequest);
      const result = results.pop();

      // Double encoded JSON
      const payload = JSON.parse(result.data);

      expect(payload).to.not.be.null;
      expect(payload.id).to.equal(bidId);
    });

    it('generates the device payload as expected', function () {
      const bidRequests = [
        sampleBidRequest
      ];

      const results = spec.buildRequests(bidRequests, sampleBidderRequest);
      const result = results.pop();

      // Double encoded JSON
      const payload = JSON.parse(result.data);

      expect(payload).to.not.be.null;
      const userData = payload.user;

      expect(userData).to.not.be.null;
    });

    it('generates multiple requests with single imp bodies', function () {
      const SECOND_PLACEMENT_ID = '2';
      const firstBidRequest = JSON.parse(JSON.stringify(sampleBidRequest));
      const secondBidRequest = JSON.parse(JSON.stringify(sampleBidRequest));
      secondBidRequest.params.tagId = SECOND_PLACEMENT_ID;

      const bidRequests = [
        firstBidRequest,
        secondBidRequest
      ];

      const results = spec.buildRequests(bidRequests, sampleBidderRequest);

      expect(results instanceof Array).to.be.true;
      expect(results.length).to.equal(2);

      const firstRequest = results[0];

      // Double encoded JSON
      const firstPayload = JSON.parse(firstRequest.data);

      expect(firstPayload).to.not.be.null;
      expect(firstPayload.imp).to.not.be.null;
      expect(firstPayload.imp.length).to.equal(1);

      expect(firstRequest.url).to.not.be.null;
      expect(firstRequest.url.indexOf('tagid=1')).to.be.gt(0);

      const secondRequest = results[1];

      // Double encoded JSON
      const secondPayload = JSON.parse(secondRequest.data);

      expect(secondPayload).to.not.be.null;
      expect(secondPayload.imp).to.not.be.null;
      expect(secondPayload.imp.length).to.equal(1);

      expect(secondRequest.url).to.not.be.null;
      expect(secondRequest.url.indexOf(`tagid=${SECOND_PLACEMENT_ID}`)).to.be.gte(0);
    });

    it('generates a banner request as expected', function () {
      // clone the sample for stability
      const localBidRequest = JSON.parse(JSON.stringify(sampleBidRequest));

      const results = spec.buildRequests([localBidRequest], sampleBidderRequest);
      const result = results.pop();

      // Double encoded JSON
      const payload = JSON.parse(result.data);

      expect(payload).to.not.be.null;

      const imps = payload.imp;

      const firstImp = imps[0];

      expect(firstImp.banner).to.not.be.null;

      const bannerData = firstImp.banner;

      expect(bannerData.w).to.equal(320);
      expect(bannerData.h).to.equal(50);
    });

    it('generates a banner request using a singular adSize instead of an array', function () {
      // clone the sample for stability
      const localBidRequest = JSON.parse(JSON.stringify(sampleBidRequest));
      localBidRequest.sizes = [320, 50];
      localBidRequest.mediaTypes = {
        banner: {}
      };

      const results = spec.buildRequests([localBidRequest], sampleBidderRequest);
      const result = results.pop();

      // Double encoded JSON
      const payload = JSON.parse(result.data);

      expect(payload).to.not.be.null;

      const imps = payload.imp;

      const firstImp = imps[0];

      expect(firstImp.banner).to.not.be.null;

      const bannerData = firstImp.banner;

      expect(bannerData.w).to.equal(320);
      expect(bannerData.h).to.equal(50);
    });

    it('fails gracefully on an invalid size', function () {
      // clone the sample for stability
      const localBidRequest = JSON.parse(JSON.stringify(sampleBidRequest));
      localBidRequest.sizes = ['x', 'w'];

      localBidRequest.mediaTypes = {
        banner: {
          sizes: ['y', 'z']
        }
      };

      const results = spec.buildRequests([localBidRequest], sampleBidderRequest);
      const result = results.pop();

      // Double encoded JSON
      const payload = JSON.parse(result.data);

      expect(payload).to.not.be.null;

      const imps = payload.imp;

      const firstImp = imps[0];

      expect(firstImp.banner).to.not.be.null;

      const bannerData = firstImp.banner;

      expect(bannerData.w).to.equal(null);
      expect(bannerData.h).to.equal(null);
    });

    it('generates a video request as expected', function () {
      // clone the sample for stability
      const localBidRequest = JSON.parse(JSON.stringify(sampleBidRequest));

      localBidRequest.mediaTypes = {
        video: {
          sizes: [
            [326, 256]
          ]
        }
      };

      const results = spec.buildRequests([localBidRequest], sampleBidderRequest);
      const result = results.pop();

      // Double encoded JSON
      const payload = JSON.parse(result.data);

      expect(payload).to.not.be.null;

      const imps = payload.imp;

      const firstImp = imps[0];

      expect(firstImp.video).to.not.be.null;

      const videoData = firstImp.video;
      expect(videoData.w).to.equal(326);
      expect(videoData.h).to.equal(256);
    });

    it('generates a native request as expected', function () {
      // clone the sample for stability
      const localBidRequest = JSON.parse(JSON.stringify(sampleBidRequest));

      localBidRequest.mediaTypes = {
        native: {
          image: {
            required: false,
            sizes: [100, 50]
          },
          title: {
            required: false,
            len: 140
          },
          sponsoredBy: {
            required: false
          },
          clickUrl: {
            required: false
          },
          body: {
            required: false
          },
          icon: {
            required: false,
            sizes: [50, 50]
          },
        }
      };

      const results = spec.buildRequests([localBidRequest], sampleBidderRequest);
      const result = results.pop();

      // Double encoded JSON
      const payload = JSON.parse(result.data);

      expect(payload).to.not.be.null;

      const imps = payload.imp;

      const firstImp = imps[0];

      expect(firstImp.native).to.not.be.null;
    });

    it('propagates the mediaTypes object in the built request', function () {
      const localBidRequest = JSON.parse(JSON.stringify(sampleBidRequest));

      localBidRequest.mediaTypes = {
        video: {}
      };

      const results = spec.buildRequests([localBidRequest], sampleBidderRequest);
      const result = results.pop();

      const mediaTypes = result.mediaTypes;

      expect(mediaTypes).to.not.be.null;
      expect(mediaTypes).to.not.be.undefined;
      expect(mediaTypes.video).to.not.be.null;
      expect(mediaTypes.video).to.not.be.undefined;
    });

    it('add eids to request', function () {
      const localBidRequest = JSON.parse(JSON.stringify(sampleBidRequest));

      const results = spec.buildRequests([localBidRequest], sampleBidderRequest);
      const result = results.pop();
      const payload = JSON.parse(result.data);
      expect(payload).to.not.be.null;
      expect(payload.ext).to.not.be.null;

      expect(payload.ext.uid2).to.not.be.null;
      expect(payload.ext.uid2.length).to.greaterThan(0);

      expect(payload.ext.id5id).to.not.be.null;
      expect(payload.ext.id5id.length).to.greaterThan(0);
      expect(payload.ext.id5_linktype).to.not.be.null;
      expect(payload.ext.id5_linktype.length).to.greaterThan(0);

      expect(payload.ext.netid).to.not.be.null;
      expect(payload.ext.netid.length).to.greaterThan(0);

      expect(payload.ext.sharedid).to.not.be.null;
      expect(payload.ext.sharedid.length).to.greaterThan(0);
    });
  });

  describe('response interpreter', function () {
    it('returns an empty array when no bids present', function () {
      // an empty JSON body indicates no ad was found

      const result = spec.interpretResponse({
        body: ''
      }, {})

      expect(result).to.eql([]);
    });

    it('gracefully fails when a non-JSON body is present', function () {
      const result = spec.interpretResponse({
        body: 'THIS IS NOT <JSON/>'
      }, {})

      expect(result).to.eql([]);
    });

    it('returns a valid bid response on sucessful banner request', function () {
      const incomingRequestId = 'XXtestingXX';
      const responsePrice = 3.14

      const responseCreative = 'sample_creative&{FOR_COVARAGE}';

      const responseCreativeId = '274';
      const responseCurrency = 'TRY';

      const responseWidth = 300;
      const responseHeight = 250;
      const responseTtl = 213;

      const sampleResponse = {
        id: '66043f5ca44ecd8f8769093b1615b2d9',
        seatbid: [{
          bid: [{
            id: 'c21bab0e-7668-4d8f-908a-63e094c09197',
            impid: '1',
            price: responsePrice,
            adid: responseCreativeId,
            crid: responseCreativeId,
            adm: responseCreative,
            adomain: [
              'www.domain.com'
            ],
            cid: '274',
            attr: [],
            w: responseWidth,
            h: responseHeight,
            ext: {
              ttl: responseTtl
            }
          }],
          seat: '201',
          group: 0
        }],
        bidid: 'c21bab0e-7668-4d8f-908a-63e094c09197',
        cur: responseCurrency
      };

      const sampleRequest = {
        bidId: incomingRequestId,
        mediaTypes: {
          banner: {}
        },
        requestId: incomingRequestId
      };
      const serverResponse = {
        body: sampleResponse
      }
      const result = spec.interpretResponse(serverResponse, sampleRequest);

      expect(result.length).to.equal(1);

      const processedBid = result[0];

      // expect(processedBid.requestId).to.equal(incomingRequestId);
      expect(processedBid.cpm).to.equal(responsePrice);
      expect(processedBid.width).to.equal(responseWidth);
      expect(processedBid.height).to.equal(responseHeight);
      expect(processedBid.ad).to.equal(responseCreative);
      expect(processedBid.ttl).to.equal(responseTtl);
      expect(processedBid.creativeId).to.equal(responseCreativeId);
      expect(processedBid.netRevenue).to.equal(true);
      expect(processedBid.currency).to.equal(responseCurrency);
    });

    it('returns a valid deal bid response on sucessful banner request with deal', function () {
      const incomingRequestId = 'XXtestingXX';
      const responsePrice = 3.14

      const responseCreative = 'sample_creative&{FOR_COVARAGE}';

      const responseCreativeId = '274';
      const responseCurrency = 'TRY';

      const responseWidth = 300;
      const responseHeight = 250;
      const responseTtl = 213;
      const dealId = 'theadx_deal_id';

      const sampleResponse = {
        id: '66043f5ca44ecd8f8769093b1615b2d9',
        seatbid: [{
          bid: [{
            id: 'c21bab0e-7668-4d8f-908a-63e094c09197',
            dealid: 'theadx_deal_id',
            impid: '1',
            price: responsePrice,
            adid: responseCreativeId,
            crid: responseCreativeId,
            adm: responseCreative,
            adomain: [
              'www.domain.com'
            ],
            cid: '274',
            attr: [],
            w: responseWidth,
            h: responseHeight,
            ext: {
              ttl: responseTtl
            }
          }],
          seat: '201',
          group: 0
        }],
        bidid: 'c21bab0e-7668-4d8f-908a-63e094c09197',
        cur: responseCurrency
      };

      const sampleRequest = {
        bidId: incomingRequestId,
        mediaTypes: {
          banner: {}
        },
        requestId: incomingRequestId,
        deals: [{ id: dealId }]
      };
      const serverResponse = {
        body: sampleResponse
      }
      const result = spec.interpretResponse(serverResponse, sampleRequest);

      expect(result.length).to.equal(1);

      const processedBid = result[0];

      // expect(processedBid.requestId).to.equal(incomingRequestId);
      expect(processedBid.cpm).to.equal(responsePrice);
      expect(processedBid.width).to.equal(responseWidth);
      expect(processedBid.height).to.equal(responseHeight);
      expect(processedBid.ad).to.equal(responseCreative);
      expect(processedBid.ttl).to.equal(responseTtl);
      expect(processedBid.creativeId).to.equal(responseCreativeId);
      expect(processedBid.netRevenue).to.equal(true);
      expect(processedBid.currency).to.equal(responseCurrency);
      expect(processedBid.dealId).to.equal(dealId);
    });

    it('returns an valid bid response on sucessful video request', function () {
      const incomingRequestId = 'XXtesting-275XX';
      const responsePrice = 6
      const vast_url = 'https://theadx.com/vast?rid=a8ae0b48-a8db-4220-ba0c-7458f452b1f5&{FOR_COVARAGE}'

      const responseCreativeId = '1556';
      const responseCurrency = 'TRY';

      const responseWidth = 284;
      const responseHeight = 285;
      const responseTtl = 286;

      const sampleResponse = {
        id: '1234567890',
        seatbid: [{
          bid: [{
            id: 'a8ae0b48-a8db-4220-ba0c-7458f452b1f5',
            impid: '1',
            price: responsePrice,
            adid: responseCreativeId,
            crid: responseCreativeId,
            cid: '270',
            attr: [],
            w: responseWidth,
            h: responseHeight,
            ext: {
              vast_url: vast_url,
              ttl: responseTtl
            }
          }],
          seat: '201',
          group: 0
        }],
        bidid: 'a8ae0b48-a8db-4220-ba0c-7458f452b1f5',
        cur: 'TRY'
      };

      const sampleRequest = {
        bidId: incomingRequestId,
        mediaTypes: {
          video: {}
        },
        requestId: incomingRequestId
      };

      const result = spec.interpretResponse({
        body: sampleResponse
      },
      sampleRequest
      );

      expect(result.length).to.equal(1);

      const processedBid = result[0];
      // expect(processedBid.requestId).to.equal(incomingRequestId);
      expect(processedBid.cpm).to.equal(responsePrice);
      expect(processedBid.width).to.equal(responseWidth);
      expect(processedBid.height).to.equal(responseHeight);
      expect(processedBid.ad).to.equal(null);
      expect(processedBid.ttl).to.equal(responseTtl);
      expect(processedBid.creativeId).to.equal(responseCreativeId);
      expect(processedBid.netRevenue).to.equal(true);
      expect(processedBid.currency).to.equal(responseCurrency);
      expect(processedBid.vastUrl).to.equal(vast_url);
    });

    it('returns an valid bid response on sucessful native request', function () {
      const incomingRequestId = 'XXtesting-275XX';
      const responsePrice = 6
      const nurl = 'https://app.theadx.com/ixc?rid=02aefd80-2df9-11e9-896d-d33384d77f5c&time=v-1549888312715&sp=1WzMjcRpeyk%3D';
      const linkUrl = 'https%3A%2F%2Fapp.theadx.com%2Fgclick%3Frid%3D02aefd80-2df9-11e9-896d-d33384d77f5c%26url%3Dhttps%253A%252F%252Fwww.theadx.com%252Ftr%252Fhedeflemeler'
      const responseCreativeId = '1556';
      const responseCurrency = 'TRY';

      const responseTtl = 286;

      const sampleResponse = {
        id: '1234567890',
        seatbid: [{
          bid: [{
            id: 'a8ae0b48-a8db-4220-ba0c-7458f452b1f5',
            impid: '1',
            nurl: nurl,
            price: responsePrice,
            adid: responseCreativeId,
            crid: responseCreativeId,
            cid: '270',
            attr: [],
            ext: {
              ttl: responseTtl,
              native: {
                ver: 1,
                link: {
                  url: linkUrl
                },
                assets: [{
                  id: 3,
                  img: {
                    url: 'https://ads.theadx.com/winwords/120/17508/154712307258.73.jpg',
                    h: 627,
                    w: 1200
                  }
                }, {
                  id: 0,
                  title: {
                    ext: 'SELF-MANAGED DSP'
                  }
                }, {
                  id: 5,
                  data: {
                    value: 'Sponsored by Theadx'
                  }
                }, {
                  id: 4,
                  data: {
                    value: 'Gerçek Zamanlı Self-Managed DSP ile kampanya oluşturmak ve yönetmek çok kolay '
                  }
                }, {
                  id: 2,
                  img: {
                    url: 'https://ads.theadx.com/winwords/120/17508/154712307258.74.png',
                    h: 128,
                    w: 128
                  }
                }]
              },

              rid: '02ac3e60-2df9-11e9-9d09-bba751e172da',
              impu: 'https://ssp.theadx.com/ixc?rid=02ac3e60-2df9-11e9-9d09-bba751e172da&time=1549888312719&tid=1',
              cliu: 'https://ssp.theadx.com/click?trid=02ac3e60-2df9-11e9-9d09-bba751e172da'

            }
          }],
          seat: '201',
          group: 0
        }],
        bidid: 'a8ae0b48-a8db-4220-ba0c-7458f452b1f5',
        cur: 'TRY'
      };

      const sampleRequest = {
        bidId: incomingRequestId,
        mediaTypes: {
          native: {
            image: {
              required: false,
              sizes: [100, 50]
            },
            title: {
              required: false,
              len: 140
            },
            sponsoredBy: {
              required: false
            },
            clickUrl: {
              required: false
            },
            body: {
              required: false
            },
            icon: {
              required: false,
              sizes: [50, 50]
            }

          },
        },
        requestId: incomingRequestId
      };

      const result = spec.interpretResponse({
        body: sampleResponse
      },
      sampleRequest
      );

      expect(result.length).to.equal(1);

      const processedBid = result[0];
      // expect(processedBid.requestId).to.equal(incomingRequestId);
      expect(processedBid.cpm).to.equal(responsePrice);
      expect(processedBid.width).to.equal(0);
      expect(processedBid.height).to.equal(0);
      expect(processedBid.ad).to.equal(null);
      expect(processedBid.ttl).to.equal(responseTtl);
      expect(processedBid.creativeId).to.equal(responseCreativeId);
      expect(processedBid.netRevenue).to.equal(true);
      expect(processedBid.currency).to.equal(responseCurrency);
      expect(processedBid.native.impressionTrackers[0]).to.equal(nurl);
      expect(processedBid.native.clickUrl).to.equal(linkUrl);
    });
  });
});
