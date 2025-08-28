import {expect} from 'chai';
import {spec} from 'modules/adverxoBidAdapter.js';
import {config} from 'src/config';

describe('Adverxo Bid Adapter', () => {
  function makeBidRequestWithParams(params) {
    return {
      bidId: '2e9f38ea93bb9e',
      bidder: 'adverxo',
      adUnitCode: 'adunit-code',
      mediaTypes: {banner: {sizes: [[300, 250]]}},
      params: params,
      bidderRequestId: 'test-bidder-request-id'
    };
  }

  const bannerBidRequests = [
    {
      bidId: 'bid-banner',
      bidder: 'adverxo',
      adUnitCode: 'adunit-code',
      userIdAsEids: [{
        'source': 'pubcid.org',
        'uids': [{
          'atype': 1,
          'id': '01EAJWWNEPN3CYMM5N8M5VXY22'
        }]
      }],
      mediaTypes: {banner: {sizes: [[300, 250]]}},
      params: {
        host: 'bid.example.com',
        adUnitId: 1,
        auth: 'authExample',
      },
      bidderRequestId: 'test-bidder-request-id',
    },
  ];

  const bannerBidderRequest = {
    bidderCode: 'adverxo',
    bidderRequestId: 'test-bidder-request-id',
    bids: bannerBidRequests,
    auctionId: 'new-auction-id'
  };

  const nativeOrtbRequest = {
    assets: [
      {
        id: 1,
        required: 1,
        img: {type: 3, w: 150, h: 50}
      },
      {
        id: 2,
        required: 1,
        title: {len: 80}
      },
      {
        id: 3,
        required: 0,
        data: {type: 1}
      }
    ]
  };

  const nativeBidRequests = [
    {
      bidId: 'bid-native',
      mediaTypes: {
        native: {
          ortb: nativeOrtbRequest
        }
      },
      nativeOrtbRequest,
      params: {
        host: 'bid.example.com',
        adUnitId: 1,
        auth: 'authExample'
      }
    },
  ];

  const nativeBidderRequest = {
    bidderCode: 'adverxo',
    bidderRequestId: 'test-bidder-request-id',
    bids: nativeBidRequests,
    auctionId: 'new-auction-id'
  };

  const videoInstreamBidRequests = [
    {
      bidId: 'bid-video',
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [400, 300],
          w: 400,
          h: 300,
          minduration: 5,
          maxduration: 10,
          startdelay: 0,
          skip: 1,
          minbitrate: 200,
          protocols: [1, 2, 4]
        }
      },
      params: {
        host: 'bid.example.com',
        adUnitId: 1,
        auth: 'authExample'
      }
    }
  ];

  const videoInstreamBidderRequest = {
    bidderCode: 'adverxo',
    bidderRequestId: 'test-bidder-request-id',
    bids: videoInstreamBidRequests,
    auctionId: 'new-auction-id'
  };

  const videoOutstreamBidRequests = [
    {
      bidId: 'bid-video',
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [400, 300],
          w: 400,
          h: 300,
          minduration: 5,
          maxduration: 10,
          startdelay: 0,
          skip: 1,
          minbitrate: 200,
          protocols: [1, 2, 4]
        }
      },
      params: {
        host: 'bid.example.com',
        adUnitId: 1,
        auth: 'authExample'
      }
    }
  ];

  const videoOutstreamBidderRequest = {
    bidderCode: 'adverxo',
    bidderRequestId: 'test-bidder-request-id',
    bids: videoOutstreamBidRequests,
    auctionId: 'new-auction-id'
  };

  afterEach(function () {
    config.resetConfig();
  });

  describe('isBidRequestValid', function () {
    it('should validate bid request with valid params (adUnit as number)', () => {
      const validBid = makeBidRequestWithParams({
        adUnitId: 1,
        auth: 'authExample',
        host: 'www.bidExample.com'
      });

      const isValid = spec.isBidRequestValid(validBid);

      expect(isValid).to.be.true;
    });

    it('should validate bid request with valid params (adUnit as string)', () => {
      const validBid = makeBidRequestWithParams({
        adUnitId: "1",
        auth: 'authExample',
        host: 'www.bidExample.com'
      });

      const isValid = spec.isBidRequestValid(validBid);

      expect(isValid).to.be.true;
    });

    it('should not validate bid request with empty params', () => {
      const invalidBid = makeBidRequestWithParams({});

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.be.false;
    });

    it('should not validate bid request with missing param(adUnitId)', () => {
      const invalidBid = makeBidRequestWithParams({
        auth: 'authExample',
        host: 'www.bidExample.com'
      });

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.be.false;
    });

    it('should not validate bid request with invalid param(adUnitId)', () => {
      const invalidBid = makeBidRequestWithParams({
        adUnitId: "1a",
        auth: 'authExample',
        host: 'www.bidExample.com'
      });

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.be.false;
    });

    it('should not validate bid request with missing param(auth)', () => {
      const invalidBid = makeBidRequestWithParams({
        adUnitId: 1,
        host: 'www.bidExample.com'
      });

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.be.false;
    });

    it('should validate bid request with missing param(host)', () => {
      const invalidBid = makeBidRequestWithParams({
        adUnitId: 1,
        auth: 'authExample',
      });

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.be.true;
    });
  });

  describe('buildRequests', () => {
    it('should add eids information to the request', function () {
      const request = spec.buildRequests(bannerBidRequests, bannerBidderRequest)[0];

      expect(request.data.user.ext.eids).to.exist;
      expect(request.data.user.ext.eids).to.deep.equal(bannerBidRequests[0].userIdAsEids);
    });

    it('should use correct bidUrl for an alias', () => {
      const bidRequests = [
        {
          bidder: 'bidsmind',
          mediaTypes: {banner: {sizes: [[300, 250]]}},
          params: {
            adUnitId: 1,
            auth: 'authExample',
          }
        },
      ];

      const bidderRequest = {
        bidderCode: 'bidsmind',
        bids: bidRequests,
      };

      const request = spec.buildRequests(bidRequests, bidderRequest)[0];

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://arcantila.com/pickpbs?id=1&auth=authExample');
    });

    it('should use correct default bidUrl', () => {
      const bidRequests = [
        {
          bidder: 'adverxo',
          mediaTypes: {banner: {sizes: [[300, 250]]}},
          params: {
            adUnitId: 1,
            auth: 'authExample',
          }
        },
      ];

      const bidderRequest = {
        bidderCode: 'adverxo',
        bids: bidRequests
      };

      const request = spec.buildRequests(bidRequests, bidderRequest)[0];

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://js.pbsadverxo.com/pickpbs?id=1&auth=authExample');
    });

    it('should build post request for banner', () => {
      const request = spec.buildRequests(bannerBidRequests, bannerBidderRequest)[0];

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://bid.example.com/pickpbs?id=1&auth=authExample');
      expect(request.data.device.ip).to.equal('caller');
      expect(request.data.ext.avx_add_vast_url).to.equal(1);
    });

    if (FEATURES.NATIVE) {
      it('should build post request for native', () => {
        const request = spec.buildRequests(nativeBidRequests, nativeBidderRequest)[0];

        expect(request.method).to.equal('POST');
        expect(request.url).to.equal('https://bid.example.com/pickpbs?id=1&auth=authExample');

        const nativeRequest = JSON.parse(request.data.imp[0]['native'].request);

        expect(nativeRequest.assets).to.have.lengthOf(3);

        expect(nativeRequest.assets[0]).to.deep.equal({
          id: 1,
          required: 1,
          img: {w: 150, h: 50, type: 3}
        });

        expect(nativeRequest.assets[1]).to.deep.equal({
          id: 2,
          required: 1,
          title: {len: 80}
        });

        expect(nativeRequest.assets[2]).to.deep.equal({
          id: 3,
          required: 0,
          data: {type: 1}
        });
      });
    }

    if (FEATURES.VIDEO) {
      it('should build post request for video', function () {
        const request = spec.buildRequests(videoInstreamBidRequests, videoInstreamBidderRequest)[0];

        expect(request.method).to.equal('POST');
        expect(request.url).to.equal('https://bid.example.com/pickpbs?id=1&auth=authExample');

        const ortbRequest = request.data;

        expect(ortbRequest.imp).to.have.lengthOf(1);

        expect(ortbRequest.imp[0]).to.deep.equal({
          id: 'bid-video',
          secure: 1,
          video: {
            w: 400,
            h: 300,
            minduration: 5,
            maxduration: 10,
            startdelay: 0,
            skip: 1,
            minbitrate: 200,
            protocols: [1, 2, 4]
          }
        });
      });
    }

    it('should add bid floor to request', function () {
      const bannerBidRequestWithFloor = {
        ...bannerBidRequests[0],
        getFloor: () => ({currency: 'USD', floor: 3})
      };

      const request = spec.buildRequests([bannerBidRequestWithFloor], {})[0].data;

      expect(request.imp[0].bidfloor).to.equal(3);
      expect(request.imp[0].bidfloorcur).to.equal('USD');
    });
  });

  describe('interpretResponse', () => {
    it('should return empty array if serverResponse is not defined', () => {
      const bidRequest = spec.buildRequests(bannerBidRequests, bannerBidderRequest);
      const bids = spec.interpretResponse(undefined, bidRequest);

      expect(bids.length).to.equal(0);
    });

    it('should interpret banner response', () => {
      const bidResponse = {
        body: {
          id: 'bid-response',
          cur: 'USD',
          seatbid: [
            {
              bid: [
                {
                  impid: 'bid-banner',
                  crid: 'creative-id',
                  cur: 'USD',
                  price: 2,
                  w: 300,
                  h: 250,
                  mtype: 1,
                  adomain: ['test.com'],
                  adm: '<div></div>'
                },
              ],
              seat: 'test-seat',
            },
          ],
        },
      };

      const expectedBids = [
        {
          cpm: 2,
          creativeId: 'creative-id',
          creative_id: 'creative-id',
          currency: 'USD',
          height: 250,
          mediaType: 'banner',
          meta: {
            advertiserDomains: ['test.com'],
          },
          netRevenue: true,
          requestId: 'bid-banner',
          ttl: 60,
          width: 300,
          ad: '<div></div>'
        },
      ];

      const request = spec.buildRequests(bannerBidRequests, bannerBidderRequest)[0];
      const bids = spec.interpretResponse(bidResponse, request);

      expect(bids).to.deep.equal(expectedBids);
    });

    it('should replace openrtb auction price macro', () => {
      const bidResponse = {
        body: {
          id: 'bid-response',
          cur: 'USD',
          seatbid: [
            {
              bid: [
                {
                  impid: 'bid-banner',
                  crid: 'creative-id',
                  cur: 'USD',
                  price: 2,
                  w: 300,
                  h: 250,
                  mtype: 1,
                  adomain: ['test.com'],
                  adm: '<a href="https://www.example.com/imp?prc=${AUCTION_PRICE}" target="_blank"><img src="https://www.example.com/click?prc=${AUCTION_PRICE}"</a>'
                },
              ],
              seat: 'test-seat',
            },
          ],
        },
      };

      const request = spec.buildRequests(bannerBidRequests, bannerBidderRequest)[0];
      const bids = spec.interpretResponse(bidResponse, request);

      expect(bids[0].ad).to.equal('<a href="https://www.example.com/imp?prc=2" target="_blank"><img src="https://www.example.com/click?prc=2"</a>');
    });

    if (FEATURES.NATIVE) {
      it('should interpret native response', () => {
        const bidResponse = {
          body: {
            id: 'native-response',
            cur: 'USD',
            seatbid: [
              {
                bid: [
                  {
                    impid: 'bid-native',
                    crid: 'creative-id',
                    cur: 'USD',
                    price: 2,
                    w: 300,
                    h: 250,
                    mtype: 4,
                    adomain: ['test.com'],
                    adm: '{"native":{"assets":[{"id":2,"title":{"text":"Title"}},{"id":3,"data":{"value":"Description"}},{"id":1,"img":{"url":"http://example.com?img","w":150,"h":50}}],"link":{"url":"http://example.com?link"}}}'
                  },
                ],
                seat: 'test-seat',
              },
            ],
          },
        };

        const expectedBids = [
          {
            cpm: 2,
            creativeId: 'creative-id',
            creative_id: 'creative-id',
            currency: 'USD',
            height: 250,
            mediaType: 'native',
            meta: {
              advertiserDomains: ['test.com'],
            },
            netRevenue: true,
            requestId: 'bid-native',
            ttl: 60,
            width: 300,
            native: {
              ortb: {
                assets: [
                  {id: 2, title: {text: 'Title'}},
                  {id: 3, data: {value: 'Description'}},
                  {id: 1, img: {url: 'http://example.com?img', w: 150, h: 50}}
                ],
                link: {url: 'http://example.com?link'}
              }
            }
          }
        ];

        const request = spec.buildRequests(nativeBidRequests, nativeBidderRequest)[0];
        const bids = spec.interpretResponse(bidResponse, request);

        expect(bids).to.deep.equal(expectedBids);
      });
    }

    if (FEATURES.VIDEO) {
      it('should interpret video instream response', () => {
        const bidResponse = {
          body: {
            id: 'video-response',
            cur: 'USD',
            seatbid: [
              {
                bid: [
                  {
                    impid: 'bid-video',
                    crid: 'creative-id',
                    cur: 'USD',
                    price: 2,
                    w: 300,
                    h: 250,
                    mtype: 2,
                    adomain: ['test.com'],
                    adm: 'vastXml',
                    ext: {
                      avx_vast_url: 'vastUrl'
                    }
                  },
                ],
                seat: 'test-seat',
              },
            ],
          },
        };

        const expectedBids = [
          {
            cpm: 2,
            creativeId: 'creative-id',
            creative_id: 'creative-id',
            currency: 'USD',
            height: 250,
            mediaType: 'video',
            meta: {
              advertiserDomains: ['test.com'],
            },
            netRevenue: true,
            playerHeight: 300,
            playerWidth: 400,
            requestId: 'bid-video',
            ttl: 60,
            vastUrl: 'vastUrl',
            vastXml: 'vastXml',
            width: 300
          }
        ];

        const request = spec.buildRequests(videoInstreamBidRequests, videoInstreamBidderRequest)[0];
        const bids = spec.interpretResponse(bidResponse, request);

        expect(bids).to.deep.equal(expectedBids);
      });

      it('should interpret video outstream response', () => {
        const bidResponse = {
          body: {
            id: 'video-response',
            cur: 'USD',
            seatbid: [
              {
                bid: [
                  {
                    impid: 'bid-video',
                    crid: 'creative-id',
                    cur: 'USD',
                    price: 2,
                    w: 300,
                    h: 250,
                    mtype: 2,
                    adomain: ['test.com'],
                    adm: 'vastXml',
                    ext: {
                      avx_vast_url: 'vastUrl',
                      avx_video_renderer_url: 'videoRendererUrl',
                    }
                  },
                ],
                seat: 'test-seat',
              },
            ],
          },
        };

        const expectedBids = [
          {
            avxVideoRendererUrl: 'videoRendererUrl',
            cpm: 2,
            creativeId: 'creative-id',
            creative_id: 'creative-id',
            currency: 'USD',
            height: 250,
            mediaType: 'video',
            meta: {
              advertiserDomains: ['test.com'],
            },
            netRevenue: true,
            playerHeight: 300,
            playerWidth: 400,
            requestId: 'bid-video',
            ttl: 60,
            vastUrl: 'vastUrl',
            vastXml: 'vastXml',
            width: 300
          }
        ];

        const request = spec.buildRequests(videoOutstreamBidRequests, videoOutstreamBidderRequest)[0];
        const bids = spec.interpretResponse(bidResponse, request);

        expect(bids[0].renderer.url).to.equal('videoRendererUrl');

        delete (bids[0].renderer);
        expect(bids).to.deep.equal(expectedBids);
      });
    }
  });

  describe('getUserSyncs', () => {
    const exampleUrl = 'https://example.com/usync?id=5';
    const iframeConfig = {iframeEnabled: true};

    const responses = [{
      body: {ext: {avx_usync: [exampleUrl]}}
    }];

    const responseWithoutQueryString = [{
      body: {ext: {avx_usync: ['https://example.com/usync/sf/5']}}
    }];

    it('should not return empty list if not allowed', function () {
      expect(spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: false
      }, responses, undefined, undefined, undefined)).to.be.empty;
    });

    it('should not return iframe if not allowed', function () {
      expect(spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: true
      }, responses, undefined, undefined, undefined)).to.deep.equal([{
        type: 'image', url: `${exampleUrl}&type=image`
      }]);
    });

    it('should add query string to url when missing', function () {
      expect(spec.getUserSyncs(iframeConfig, responseWithoutQueryString, undefined, undefined, undefined)).to.deep.equal([{
        type: 'iframe', url: `https://example.com/usync/sf/5?type=iframe`
      }]);
    });

    it('should not add parameters if not provided', function () {
      expect(spec.getUserSyncs(iframeConfig, responses, undefined, undefined, undefined)).to.deep.equal([{
        type: 'iframe', url: `${exampleUrl}&type=iframe`
      }]);
    });

    it('should add GDPR parameters if provided', function () {
      expect(spec.getUserSyncs(iframeConfig, responses, {gdprApplies: true}, undefined, undefined)).to.deep.equal([{
        type: 'iframe', url: `${exampleUrl}&type=iframe&gdpr=1&gdpr_consent=`
      }]);

      expect(spec.getUserSyncs(iframeConfig, responses,
        {gdprApplies: true, consentString: 'foo?'}, undefined, undefined)).to.deep.equal([{
        type: 'iframe', url: `${exampleUrl}&type=iframe&gdpr=1&gdpr_consent=foo%3F`
      }]);

      expect(spec.getUserSyncs(iframeConfig, responses,
        {gdprApplies: false, consentString: 'bar'}, undefined, undefined)).to.deep.equal([{
        type: 'iframe', url: `${exampleUrl}&type=iframe&gdpr=0&gdpr_consent=bar`
      }]);
    });

    it('should add CCPA parameters if provided', function () {
      expect(spec.getUserSyncs(iframeConfig, responses, undefined, 'foo?', undefined)).to.deep.equal([{
        type: 'iframe', url: `${exampleUrl}&type=iframe&us_privacy=foo%3F`
      }]);
    });

    it('should not apply if not gppConsent.gppString', function () {
      const gppConsent = {gppString: '', applicableSections: [123]};
      const result = spec.getUserSyncs(iframeConfig, responses, undefined, undefined, gppConsent);
      expect(result).to.deep.equal([{
        type: 'iframe', url: `${exampleUrl}&type=iframe`
      }]);
    });

    it('should not apply if not gppConsent.applicableSections', function () {
      const gppConsent = {gppString: '', applicableSections: undefined};
      const result = spec.getUserSyncs(iframeConfig, responses, undefined, undefined, gppConsent);
      expect(result).to.deep.equal([{
        type: 'iframe', url: `${exampleUrl}&type=iframe`
      }]);
    });

    it('should not apply if empty gppConsent.applicableSections', function () {
      const gppConsent = {gppString: '', applicableSections: []};
      const result = spec.getUserSyncs(iframeConfig, responses, undefined, undefined, gppConsent);
      expect(result).to.deep.equal([{
        type: 'iframe', url: `${exampleUrl}&type=iframe`
      }]);
    });

    it('should apply if all above are available', function () {
      const gppConsent = {gppString: 'foo?', applicableSections: [123]};
      const result = spec.getUserSyncs(iframeConfig, responses, undefined, undefined, gppConsent);
      expect(result).to.deep.equal([{
        type: 'iframe', url: `${exampleUrl}&type=iframe&gpp=foo%3F&gpp_sid=123`
      }]);
    });

    it('should support multiple sections', function () {
      const gppConsent = {gppString: 'foo', applicableSections: [123, 456]};
      const result = spec.getUserSyncs(iframeConfig, responses, undefined, undefined, gppConsent);
      expect(result).to.deep.equal([{
        type: 'iframe', url: `${exampleUrl}&type=iframe&gpp=foo&gpp_sid=123%2C456`
      }]);
    });
  });
});
