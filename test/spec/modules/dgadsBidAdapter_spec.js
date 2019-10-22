import {expect} from 'chai';
import * as utils from 'src/utils';
import {spec, getCookieUid} from 'modules/dgadsBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';
import { BANNER, NATIVE } from 'src/mediaTypes';

describe('dgadsBidAdapter', function () {
  const adapter = newBidder(spec);
  const UID_NAME = 'dgads_uid';
  const VALID_ENDPOINT = 'https://ads-tr.bigmining.com/ad/p/bid';

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'dgads',
      params: {
        site_id: '1',
        location_id: '1'
      }
    };
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params(location_id) are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        site_id: '1'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required params(site_id) are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        location_id: '1'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      { // banner
        bidder: 'dgads',
        mediaType: 'banner',
        params: {
          site_id: '1',
          location_id: '1'
        },
        adUnitCode: 'adunit-code',
        sizes: [[300, 250]],
        bidId: '2db3101abaec66',
        bidderRequestId: '14a9f773e30243',
        auctionId: 'c0cd37c5-af11-464d-b83e-35863e533b1f',
        transactionId: 'c1f1eff6-23c6-4844-a321-575212939e37'
      },
      { // native
        bidder: 'dgads',
        sizes: [[300, 250]],
        params: {
          site_id: '1',
          location_id: '10'
        },
        mediaTypes: {
          native: {
            image: {
              required: true
            },
            title: {
              required: true,
              len: 25
            },
            clickUrl: {
              required: true
            },
            body: {
              required: true,
              len: 140
            },
            sponsoredBy: {
              required: true,
              len: 40
            }
          },
        },
        adUnitCode: 'adunit-code',
        bidId: '2db3101abaec66',
        bidderRequestId: '14a9f773e30243',
        auctionId: 'c0cd37c5-af11-464d-b83e-35863e533b1f',
        transactionId: 'c1f1eff6-23c6-4844-a321-575212939e37'
      }
    ];
    it('no bidRequests', function () {
      const noBidRequests = [];
      expect(Object.keys(spec.buildRequests(noBidRequests)).length).to.equal(0);
    });
    it('getCookieUid return empty if cookie not found', function () {
      expect(getCookieUid(UID_NAME)).to.equal('');
    });
    const data = {
      location_id: '1',
      site_id: '1',
      transaction_id: 'c1f1eff6-23c6-4844-a321-575212939e37',
      bid_id: '2db3101abaec66',
      referer: utils.getTopWindowUrl(),
      _uid: ''
    };
    it('sends bid request to VALID_ENDPOINT via GET', function () {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.url).to.equal(VALID_ENDPOINT);
      expect(request.method).to.equal('GET');
    });
    it('should attache params to the request', function () {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.data['_loc']).to.equal(data['location_id']);
      expect(request.data['_medium']).to.equal(data['site_id']);
      expect(request.data['transaction_id']).to.equal(data['transaction_id']);
      expect(request.data['bid_id']).to.equal(data['bid_id']);
      expect(request.data['referer']).to.equal(data['referer']);
      expect(request.data['_uid']).to.equal(data['_uid']);
    });
  });

  describe('interpretResponse', function () {
    const bidRequests = {
      banner: {
        bidRequest: {
          bidder: 'dgads',
          params: {
            location_id: '1',
            site_id: '1'
          },
          transactionId: 'c1f1eff6-23c6-4844-a321-575212939e37',
          bidId: '2db3101abaec66',
          adUnitCode: 'adunit-code',
          sizes: [[300, 250]],
          bidderRequestId: '14a9f773e30243',
          auctionId: 'c0cd37c5-af11-464d-b83e-35863e533b1f'
        },
      },
      native: {
        bidRequest: {
          bidder: 'adg',
          params: {
            site_id: '1',
            location_id: '10'
          },
          mediaTypes: {
            native: {
              image: {
                required: true
              },
              title: {
                required: true,
                len: 25
              },
              body: {
                required: true,
                len: 140
              },
              sponsoredBy: {
                required: true,
                len: 40
              }
            }
          },
          transactionId: 'f76f6dfd-d64f-4645-a29f-682bac7f431a',
          bidId: '2f6ac468a9c15e',
          adUnitCode: 'adunit-code',
          sizes: [[1, 1]],
          bidderRequestId: '14a9f773e30243',
          auctionId: '4aae9f05-18c6-4fcd-80cf-282708cd584a',
        },
      },
    };

    const serverResponse = {
      noAd: {
        results: [],
      },
      banner: {
        bids: {
          ads: {
            ad: '<a href="https://ads-tr.bigmining.com/ad/p/r?_cid=RTdQaXxTSkcm9Wvw5kNIQn2lELdIIE4314NKTTaZnt9bTiOE4PWrDmRC2bI3chxXDt02FAJxTLAy6ngYs91%2BxyfVUoR56nHdBKUYt5iVW7GwQ4v2CXG4wOhbex74avCPdd78HKPOnP%2FRYwsjMijxPw%3D%3D"><img src="https://ads-tr.bigmining.com/img/300_250_1.jpg" width="300" height="250"></a><IMG src=https://ads-tr.bigmining.com/ad/p/c?_cid=RTdQaXxTSkcm9Wvw5kNIQn2lELdIIE4314NKTTaZnt%2BpBwBx3ioQpptCqZ7GEdkHn3y7VbwrM6JPIBnNm0aBvO%2BYsUCm1nqDckBxSYRZ%2BBlkVxs6oLlxzrnoq30DVRV4Gdfn3kFBmXkTiNr74ednNwtTaE%2BXTpFEIyHpG73GeQcvzdbSXkz5eQQOJKa7VHJ2uZmWAaMxYniSj3EikGKa6A%3D%3D border=0 width=0 height=0>',
            cpm: 1.22,
            w: 300,
            h: 250,
            creativeId: 'xuidx62944aab4fx37f',
            ttl: 60,
            bidId: '2f6ac468a9c15e'
          }
        }
      },
      native: {
        bids: {
          ads: {
            cpm: 1.22,
            title: 'title',
            desc: 'description',
            sponsoredBy: 'sponsoredBy',
            image: 'https://ads-tr.bigmining.com/img/300_250_1.jpg',
            w: 300,
            h: 250,
            ttl: 60,
            bidId: '2f6ac468a9c15e',
            creativeId: 'xuidx62944aab4fx37f',
            isNative: 1,
            impressionTrackers: ['https://ads-tr.bigmining.com/ad/view/beacon.gif'],
            clickTrackers: ['https://ads-tr.bigmining.com/ad/view/beacon.png'],
            clickUrl: 'https://www.garage.co.jp/ja/'
          },
        }
      }
    };

    const bidResponses = {
      banner: {
        requestId: '2f6ac468a9c15e',
        cpm: 1.22,
        width: 300,
        height: 250,
        creativeId: 'xuidx62944aab4fx37f',
        currency: 'JPY',
        netRevenue: true,
        ttl: 60,
        referrer: utils.getTopWindowUrl(),
        ad: '<a href="https://ads-tr.bigmining.com/ad/p/r?_cid=RTdQaXxTSkcm9Wvw5kNIQn2lELdIIE4314NKTTaZnt9bTiOE4PWrDmRC2bI3chxXDt02FAJxTLAy6ngYs91%2BxyfVUoR56nHdBKUYt5iVW7GwQ4v2CXG4wOhbex74avCPdd78HKPOnP%2FRYwsjMijxPw%3D%3D"><img src="https://ads-tr.bigmining.com/img/300_250_1.jpg" width="300" height="250"></a><IMG src=https://ads-tr.bigmining.com/ad/p/c?_cid=RTdQaXxTSkcm9Wvw5kNIQn2lELdIIE4314NKTTaZnt%2BpBwBx3ioQpptCqZ7GEdkHn3y7VbwrM6JPIBnNm0aBvO%2BYsUCm1nqDckBxSYRZ%2BBlkVxs6oLlxzrnoq30DVRV4Gdfn3kFBmXkTiNr74ednNwtTaE%2BXTpFEIyHpG73GeQcvzdbSXkz5eQQOJKa7VHJ2uZmWAaMxYniSj3EikGKa6A%3D%3D border=0 width=0 height=0>',
      },
      native: {
        requestId: '2f6ac468a9c15e',
        cpm: 1.22,
        creativeId: 'xuidx62944aab4fx37f',
        currency: 'JPY',
        netRevenue: true,
        ttl: 60,
        native: {
          image: {
            url: 'https://ads-tr.bigmining.com/img/300_250_1.jpg',
            width: 300,
            height: 250
          },
          title: 'title',
          body: 'description',
          sponsoredBy: 'sponsoredBy',
          clickUrl: 'https://www.garage.co.jp/ja/',
          impressionTrackers: ['https://ads-tr.bigmining.com/ad/view/beacon.gif'],
          clickTrackers: ['https://ads-tr.bigmining.com/ad/view/beacon.png']
        },
        referrer: utils.getTopWindowUrl(),
        creativeid: 'xuidx62944aab4fx37f',
        mediaType: NATIVE
      }
    };

    it('no bid responses', function () {
      const result = spec.interpretResponse({body: serverResponse.noAd}, bidRequests.banner);
      expect(result.length).to.equal(0);
    });
    it('handles banner responses', function () {
      const result = spec.interpretResponse({body: serverResponse.banner}, bidRequests.banner)[0];
      expect(result.requestId).to.equal(bidResponses.banner.requestId);
      expect(result.width).to.equal(bidResponses.banner.width);
      expect(result.height).to.equal(bidResponses.banner.height);
      expect(result.creativeId).to.equal(bidResponses.banner.creativeId);
      expect(result.currency).to.equal(bidResponses.banner.currency);
      expect(result.netRevenue).to.equal(bidResponses.banner.netRevenue);
      expect(result.ttl).to.equal(bidResponses.banner.ttl);
      expect(result.referrer).to.equal(bidResponses.banner.referrer);
      expect(result.ad).to.equal(bidResponses.banner.ad);
    });

    it('handles native responses', function () {
      const result = spec.interpretResponse({body: serverResponse.native}, bidRequests.native)[0];
      expect(result.requestId).to.equal(bidResponses.native.requestId);
      expect(result.creativeId).to.equal(bidResponses.native.creativeId);
      expect(result.currency).to.equal(bidResponses.native.currency);
      expect(result.netRevenue).to.equal(bidResponses.native.netRevenue);
      expect(result.ttl).to.equal(bidResponses.native.ttl);
      expect(result.referrer).to.equal(bidResponses.native.referrer);
      expect(result.native.title).to.equal(bidResponses.native.native.title);
      expect(result.native.body).to.equal(bidResponses.native.native.body);
      expect(result.native.sponsoredBy).to.equal(bidResponses.native.native.sponsoredBy);
      expect(result.native.image.url).to.equal(bidResponses.native.native.image.url);
      expect(result.native.image.width).to.equal(bidResponses.native.native.image.width);
      expect(result.native.image.height).to.equal(bidResponses.native.native.image.height);
      expect(result.native.clickUrl).to.equal(bidResponses.native.native.clickUrl);
      expect(result.native.impressionTrackers[0]).to.equal(bidResponses.native.native.impressionTrackers[0]);
      expect(result.native.clickTrackers[0]).to.equal(bidResponses.native.native.clickTrackers[0]);
    });
  });
});
