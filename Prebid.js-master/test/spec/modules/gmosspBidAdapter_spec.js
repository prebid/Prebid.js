import { expect } from 'chai';
import { spec } from 'modules/gmosspBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';

const ENDPOINT = 'https://sp.gmossp-sp.jp/hb/prebid/query.ad';

describe('GmosspAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      bidder: 'gmossp',
      params: {
        sid: '123456'
      }
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        bidder: 'gmossp',
        params: {
          sid: '123456'
        },
        adUnitCode: 'adunit-code',
        sizes: [
          [300, 250],
          [320, 50],
          [320, 100],
        ],
        bidId: '2b84475b5b636e',
        bidderRequestId: '1f4001782ac16c',
        auctionId: 'aba03555-4802-4c45-9f15-05ffa8594cff',
        transactionId: '791e9d84-af92-4903-94da-24c7426d9d0c',
        userId: {
          imuid: 'h.0a4749e7ffe09fa6',
          pubcid: '1111',
          idl_env: '1111',
        }
      }
    ];

    it('sends bid request to ENDPOINT via GET', function () {
      const bidderRequest = {
        refererInfo: {
          referer: 'https://hoge.com'
        }
      };
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('GET');
      expect(requests[0].data).to.equal('tid=791e9d84-af92-4903-94da-24c7426d9d0c&bid=2b84475b5b636e&ver=$prebid.version$&sid=123456&im_uid=h.0a4749e7ffe09fa6&shared_id=1111&idl_env=1111&url=https%3A%2F%2Fhoge.com' + '&ref=' + encodeURIComponent(document.referrer) + '&cur=JPY&dnt=0&');
    });

    it('should use fallback if refererInfo.referer in bid request is empty and im_uid ,shared_id, idl_env cookie is empty', function () {
      const bidderRequest = {
        refererInfo: {
          referer: ''
        },
      };
      bidRequests[0].userId.imuid = '';
      bidRequests[0].userId.pubcid = '';
      bidRequests[0].userId.idl_env = '';

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      const result = 'tid=791e9d84-af92-4903-94da-24c7426d9d0c&bid=2b84475b5b636e&ver=$prebid.version$&sid=123456&ref=' + encodeURIComponent(document.referrer) + '&cur=JPY&dnt=0&';
      expect(requests[0].data).to.equal(result);
    });
  });

  describe('interpretResponse', function () {
    const bidderRequests = [
      {
        bidder: 'gmossp',
        params: {
          sid: '123456'
        },
        adUnitCode: 'adunit-code',
        sizes: [
          [300, 250],
          [320, 50],
          [320, 100],
        ],
        bidId: '2b84475b5b636e',
        bidderRequestId: '1f4001782ac16c',
        auctionId: 'aba03555-4802-4c45-9f15-05ffa8594cff',
        transactionId: '791e9d84-af92-4903-94da-24c7426d9d0c'
      }
    ];

    it('should get correct banner bid response', function () {
      const response = {
        bid: '2b84475b5b636e',
        price: 20,
        w: 300,
        h: 250,
        adomains: [
          'test.com'
        ],
        ad: '<div class="gmossp"></div>',
        creativeId: '985ec572b32be309.76973017',
        cur: 'JPY',
        dealId: '',
        imps: [
          'https://sp.gmossp-sp.jp/hb/prebid/imp.ad'
        ],
        syncs: [
          'https://sync.dsp.reemo-ad.jp'
        ],
        ttl: 300
      };

      const expectedResponse = [
        {
          requestId: '2b84475b5b636e',
          cpm: 20,
          currency: 'JPY',
          width: 300,
          height: 250,
          meta: {
            advertiserDomains: [
              'test.com'
            ]
          },
          ad: '<div class="gmossp"></div>',
          creativeId: '985ec572b32be309.76973017',
          netRevenue: true,
          ttl: 300
        }
      ];

      const result = spec.interpretResponse({ body: response }, bidderRequests);
      expect(result).to.have.lengthOf(1);

      response.imps.forEach(impTracker => {
        const tracker = utils.createTrackPixelHtml(impTracker);
        expectedResponse[0].ad += tracker;
      });

      expect(result).to.deep.have.same.members(expectedResponse);
    });

    it('handles nobid responses', function () {
      const response = '';

      const result = spec.interpretResponse({ body: response }, bidderRequests);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    const bidResponse = {
      body: {
        ad: {},
        syncs: [
          'https://hoge.com'
        ]
      }
    };
    it('should return returns pixel syncs', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: true }, [bidResponse]);
      expect(syncs).to.deep.equal([
        {
          type: 'image',
          url: 'https://hoge.com'
        }
      ])
    })
  });
});
