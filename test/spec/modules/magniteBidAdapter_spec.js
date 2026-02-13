import {expect} from 'chai';
import {
  spec,
  REQUEST_URL,
  SYNC_URL,
  masSizeOrdering,
  resetMgniConf
} from 'modules/magniteBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from 'src/mediaTypes.js';
import {config} from 'src/config.js';
// load modules that register ORTB processors
import 'src/prebid.js';
import 'modules/currency.js';
import 'modules/userId/index.js';
import 'modules/multibid/index.js';
import 'modules/priceFloors.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';

import {hook} from '../../../src/hook.js';

function getBannerBidRequest(overrides = {}) {
  return {
    bidder: 'magnite',
    params: {
      accountId: 1001,
      siteId: 2001,
      zoneId: 3001,
      ...(overrides.params)
    },
    adUnitCode: 'adunit-banner',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    sizes: [[300, 250], [728, 90]],
    bidId: 'bid-banner-1',
    bidderRequestId: 'bidder-req-1',
    auctionId: 'auction-1',
    transactionId: 'trans-1',
    ortb2Imp: {
      ext: {
        tid: 'trans-1'
      }
    },
    ...overrides
  };
}

function getVideoBidRequest(overrides = {}) {
  return {
    bidder: 'magnite',
    params: {
      accountId: 1001,
      siteId: 2001,
      zoneId: 3001,
      ...(overrides.params)
    },
    adUnitCode: 'adunit-video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [1, 2],
        linearity: 1,
        ...(overrides.videoMediaType)
      }
    },
    sizes: [[640, 480]],
    bidId: 'bid-video-1',
    bidderRequestId: 'bidder-req-1',
    auctionId: 'auction-1',
    transactionId: 'trans-2',
    ortb2Imp: {
      ext: {
        tid: 'trans-2'
      }
    },
    ...overrides
  };
}

function getBidderRequest(overrides = {}) {
  return {
    bidderCode: 'magnite',
    auctionId: 'auction-1',
    bidderRequestId: 'bidder-req-1',
    timeout: 3000,
    refererInfo: {
      page: 'https://example.com/test',
      reachedTop: true
    },
    ortb2: {
      source: {
        tid: 'auction-1'
      }
    },
    ...overrides
  };
}

function getSampleOrtbBidResponse(impid, overrides = {}) {
  return {
    id: 'response-1',
    seatbid: [{
      bid: [{
        impid: impid || 'bid-banner-1',
        price: 3.5,
        w: 300,
        h: 250,
        crid: 'creative-123',
        dealid: 'deal-456',
        adm: '<div>test ad</div>',
        mtype: 1,
        adomain: ['advertiser.com'],
        ...overrides
      }],
      seat: 'magnite'
    }],
    cur: 'USD'
  };
}

describe('the magnite adapter', function () {
  before(() => {
    hook.ready();
  });

  const adapter = newBidder(spec);

  afterEach(function () {
    config.resetConfig();
    resetMgniConf();
  });

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('spec properties', function () {
    it('should have the correct bidder code', function () {
      expect(spec.code).to.equal('magnite');
    });

    it('should have the correct GVL ID', function () {
      expect(spec.gvlid).to.equal(52);
    });

    it('should support banner, native, and video media types', function () {
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER, NATIVE, VIDEO]);
    });
  });

  describe('isBidRequestValid()', function () {
    it('should return true when all required params are present', function () {
      const bid = getBannerBidRequest();
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return true when params are passed as strings that parse to numbers', function () {
      const bid = getBannerBidRequest({
        params: {accountId: '1001', siteId: '2001', zoneId: '3001'}
      });
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when accountId is missing', function () {
      const bid = getBannerBidRequest();
      delete bid.params.accountId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when siteId is missing', function () {
      const bid = getBannerBidRequest();
      delete bid.params.siteId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when zoneId is missing', function () {
      const bid = getBannerBidRequest();
      delete bid.params.zoneId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when accountId is not a number', function () {
      const bid = getBannerBidRequest({
        params: {accountId: 'abc', siteId: 2001, zoneId: 3001}
      });
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when params is undefined', function () {
      const bid = getBannerBidRequest();
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when params is empty', function () {
      const bid = getBannerBidRequest();
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return true for video bid requests with valid params', function () {
      const bid = getVideoBidRequest();
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
  });

  describe('buildRequests()', function () {
    let bidderRequest;

    beforeEach(function () {
      bidderRequest = getBidderRequest();
    });

    it('should return an array of requests', function () {
      const requests = spec.buildRequests([getBannerBidRequest()], bidderRequest);
      expect(requests).to.be.an('array');
      expect(requests.length).to.be.greaterThan(0);
    });

    it('should use POST method', function () {
      const requests = spec.buildRequests([getBannerBidRequest()], bidderRequest);
      requests.forEach(req => {
        expect(req.method).to.equal('POST');
      });
    });

    it('should use the default REQUEST_URL', function () {
      const requests = spec.buildRequests([getBannerBidRequest()], bidderRequest);
      requests.forEach(req => {
        expect(req.url).to.include(REQUEST_URL);
      });
    });

    it('should include accountId-siteId in the query string as "as" param', function () {
      const bid = getBannerBidRequest();
      const requests = spec.buildRequests([bid], bidderRequest);
      expect(requests[0].url).to.include('as=1001-2001');
    });

    it('should include mediaType in the query string as "m" param', function () {
      const bid = getBannerBidRequest();
      const requests = spec.buildRequests([bid], bidderRequest);
      expect(requests[0].url).to.include('m=banner');
    });

    it('should include the number of imps in the query string as "s" param', function () {
      const bid = getBannerBidRequest();
      const requests = spec.buildRequests([bid], bidderRequest);
      expect(requests[0].url).to.include('s=1');
    });

    it('should use a custom bid endpoint from config', function () {
      config.setConfig({magnite: {bidEndpoint: 'https://custom.endpoint.com/bid'}});
      const requests = spec.buildRequests([getBannerBidRequest()], bidderRequest);
      expect(requests[0].url).to.include('https://custom.endpoint.com/bid');
    });

    describe('request grouping', function () {
      it('should group bids by accountId-siteId-mediaType', function () {
        const bid1 = getBannerBidRequest({bidId: 'bid-1'});
        const bid2 = getBannerBidRequest({
          bidId: 'bid-2',
          adUnitCode: 'adunit-banner-2',
          params: {accountId: 1001, siteId: 2002, zoneId: 3002}
        });
        const requests = spec.buildRequests([bid1, bid2], bidderRequest);
        // Different siteIds => separate requests
        expect(requests.length).to.equal(2);
      });

      it('should combine bids with same accountId-siteId-mediaType into one request', function () {
        const bid1 = getBannerBidRequest({bidId: 'bid-1', adUnitCode: 'adunit-1'});
        const bid2 = getBannerBidRequest({bidId: 'bid-2', adUnitCode: 'adunit-2'});
        const requests = spec.buildRequests([bid1, bid2], bidderRequest);
        // Same accountId, siteId, mediaType => one request
        expect(requests.length).to.equal(1);
        expect(requests[0].url).to.include('s=2');
      });

      it('should split multi-format bids into separate requests by mediaType', function () {
        const multiformatBid = getBannerBidRequest({
          bidId: 'bid-multi',
          mediaTypes: {
            banner: {sizes: [[300, 250]]},
            video: {
              context: 'instream',
              playerSize: [640, 480],
              mimes: ['video/mp4'],
              protocols: [1, 2],
              linearity: 1
            }
          }
        });
        const requests = spec.buildRequests([multiformatBid], bidderRequest);
        expect(requests.length).to.equal(2);

        const mediaTypes = requests.map(r => {
          const url = new URL(r.url);
          return url.searchParams.get('m');
        });
        expect(mediaTypes).to.include('banner');
        expect(mediaTypes).to.include('video');
      });

      it('should correctly handle mediaType with hyphen', function () {
        const bid = getBannerBidRequest({
          bidId: 'bid-hyphen',
          mediaTypes: {
            'video-outstream': {}
          },
          params: {
            accountId: 1001,
            siteId: 2001,
            zoneId: 3001,
            enabledMediaTypes: ['video-outstream']
          }
        });
        const requests = spec.buildRequests([bid], bidderRequest);
        expect(requests.length).to.equal(1);
        const url = new URL(requests[0].url);
        expect(url.searchParams.get('m')).to.equal('video-outstream');
        expect(url.searchParams.get('as')).to.equal('1001-2001');
      });
    });

    describe('chunking', function () {
      it('should chunk requests at the default impLimit of 10', function () {
        const bids = [];
        for (let i = 0; i < 12; i++) {
          bids.push(getBannerBidRequest({
            bidId: `bid-${i}`,
            adUnitCode: `adunit-${i}`
          }));
        }
        const requests = spec.buildRequests(bids, bidderRequest);
        expect(requests.length).to.equal(2);
        expect(requests[0].url).to.include('s=10');
        expect(requests[1].url).to.include('s=2');
      });

      it('should respect custom impLimit from config', function () {
        config.setConfig({magnite: {impLimit: 3}});
        const bids = [];
        for (let i = 0; i < 7; i++) {
          bids.push(getBannerBidRequest({
            bidId: `bid-${i}`,
            adUnitCode: `adunit-${i}`
          }));
        }
        const requests = spec.buildRequests(bids, bidderRequest);
        expect(requests.length).to.equal(3);
        expect(requests[0].url).to.include('s=3');
        expect(requests[1].url).to.include('s=3');
        expect(requests[2].url).to.include('s=1');
      });
    });

    describe('enabledMediaTypes filtering', function () {
      it('should filter out mediaTypes not in enabledMediaTypes', function () {
        const bid = getBannerBidRequest({
          bidId: 'bid-filter',
          mediaTypes: {
            banner: {sizes: [[300, 250]]},
            video: {
              context: 'instream',
              playerSize: [640, 480],
              mimes: ['video/mp4'],
              protocols: [1, 2],
              linearity: 1
            }
          },
          params: {
            accountId: 1001,
            siteId: 2001,
            zoneId: 3001,
            enabledMediaTypes: ['banner']
          }
        });
        const requests = spec.buildRequests([bid], bidderRequest);
        // Only banner should be sent, video filtered out
        expect(requests.length).to.equal(1);
        const url = new URL(requests[0].url);
        expect(url.searchParams.get('m')).to.equal('banner');
      });
    });

    describe('ORTB request data', function () {
      it('should produce valid ORTB data with imp array', function () {
        const requests = spec.buildRequests([getBannerBidRequest()], bidderRequest);
        const data = requests[0].data;
        expect(data).to.be.an('object');
        expect(data.imp).to.be.an('array');
        expect(data.imp.length).to.equal(1);
      });

      it('should set imp.secure to 1', function () {
        const requests = spec.buildRequests([getBannerBidRequest()], bidderRequest);
        expect(requests[0].data.imp[0].secure).to.equal(1);
      });

      it('should not include tmax in the request', function () {
        const requests = spec.buildRequests([getBannerBidRequest()], bidderRequest);
        expect(requests[0].data.tmax).to.be.undefined;
      });

      it('should not include cur in the request', function () {
        const requests = spec.buildRequests([getBannerBidRequest()], bidderRequest);
        expect(requests[0].data.cur).to.be.undefined;
      });

      it('should set default channel name to pbjs', function () {
        const requests = spec.buildRequests([getBannerBidRequest()], bidderRequest);
        expect(requests[0].data.ext.prebid.channel.name).to.equal('pbjs');
      });

      it('should use int_type from config for channel name', function () {
        config.setConfig({magnite: {int_type: 'custom_integration'}});
        const requests = spec.buildRequests([getBannerBidRequest()], bidderRequest);
        expect(requests[0].data.ext.prebid.channel.name).to.equal('custom_integration');
      });

      it('should move bidder params to dvplus namespace', function () {
        const bid = getBannerBidRequest();
        const requests = spec.buildRequests([bid], bidderRequest);
        const imp = requests[0].data.imp[0];
        expect(imp.ext.prebid.bidder.dvplus).to.be.an('object');
        expect(imp.ext.prebid.bidder.magnite).to.be.undefined;
      });

      it('should include accountId, siteId, zoneId in dvplus params', function () {
        const bid = getBannerBidRequest();
        const requests = spec.buildRequests([bid], bidderRequest);
        const dvplus = requests[0].data.imp[0].ext.prebid.bidder.dvplus;
        expect(dvplus.accountId).to.equal(1001);
        expect(dvplus.siteId).to.equal(2001);
        expect(dvplus.zoneId).to.equal(3001);
      });

      it('should remove non-context mediaTypes from imp', function () {
        const bid = getBannerBidRequest();
        const requests = spec.buildRequests([bid], bidderRequest);
        const imp = requests[0].data.imp[0];
        // This is a banner context request
        expect(imp.banner).to.exist;
        expect(imp.video).to.be.undefined;
        expect(imp.native).to.be.undefined;
      });

      it('should set pos from params.position when not already set', function () {
        const bid = getBannerBidRequest({
          params: {accountId: 1001, siteId: 2001, zoneId: 3001, position: 'atf'}
        });
        const requests = spec.buildRequests([bid], bidderRequest);
        expect(requests[0].data.imp[0].banner.pos).to.equal(1);
      });

      it('should set pos to 3 for btf position', function () {
        const bid = getBannerBidRequest({
          params: {accountId: 1001, siteId: 2001, zoneId: 3001, position: 'btf'}
        });
        const requests = spec.buildRequests([bid], bidderRequest);
        expect(requests[0].data.imp[0].banner.pos).to.equal(3);
      });

      it('should signal multi-format in ext.rp.rtb.formats when bid has multiple mediaTypes', function () {
        const bid = getBannerBidRequest({
          bidId: 'bid-multi',
          mediaTypes: {
            banner: {sizes: [[300, 250]]},
            video: {
              context: 'instream',
              playerSize: [640, 480],
              mimes: ['video/mp4'],
              protocols: [1, 2],
              linearity: 1
            }
          }
        });
        const requests = spec.buildRequests([bid], bidderRequest);
        // The banner request should have the formats signal
        const bannerReq = requests.find(r => r.url.includes('m=banner'));
        expect(bannerReq.data.imp[0].ext.rp.rtb.formats).to.include('banner');
        expect(bannerReq.data.imp[0].ext.rp.rtb.formats).to.include('video');
      });

      it('should not delete device.dnt from request', function () {
        const requests = spec.buildRequests([getBannerBidRequest()], bidderRequest);
        // dnt should be deleted by the adapter
        expect(requests[0].data.device?.dnt).to.be.undefined;
      });
    });

    describe('visitor and inventory FPD cleaning', function () {
      it('should wrap non-array visitor values in arrays', function () {
        const bid = getBannerBidRequest({
          params: {
            accountId: 1001,
            siteId: 2001,
            zoneId: 3001,
            visitor: {age: '25', interests: ['sports', 'tech']}
          }
        });
        const requests = spec.buildRequests([bid], bidderRequest);
        const dvplus = requests[0].data.imp[0].ext.prebid.bidder.dvplus;
        // Non-array value 'age' should be wrapped
        expect(dvplus.visitor.age).to.deep.equal(['25']);
        // Already-array value should remain unchanged
        expect(dvplus.visitor.interests).to.deep.equal(['sports', 'tech']);
      });

      it('should wrap non-array inventory values in arrays', function () {
        const bid = getBannerBidRequest({
          params: {
            accountId: 1001,
            siteId: 2001,
            zoneId: 3001,
            inventory: {rating: '5-star', prodtype: ['tech', 'mobile']}
          }
        });
        const requests = spec.buildRequests([bid], bidderRequest);
        const dvplus = requests[0].data.imp[0].ext.prebid.bidder.dvplus;
        expect(dvplus.inventory.rating).to.deep.equal(['5-star']);
        expect(dvplus.inventory.prodtype).to.deep.equal(['tech', 'mobile']);
      });
    });

    describe('ppuid handling', function () {
      it('should set user.id from config user.id when ortb user.id is not set', function () {
        config.setConfig({'user': {id: 'config-ppuid-123'}});
        const requests = spec.buildRequests([getBannerBidRequest()], bidderRequest);
        expect(requests[0].data.user.id).to.equal('config-ppuid-123');
      });
    });
  });

  describe('interpretResponse()', function () {
    let bidderRequest;

    beforeEach(function () {
      bidderRequest = getBidderRequest();
    });

    it('should return an empty array when response body is missing', function () {
      const bidRequest = getBannerBidRequest();
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const bids = spec.interpretResponse({}, requests[0]);
      expect(bids).to.be.an('array');
      expect(bids.length).to.equal(0);
    });

    it('should return an empty array when response body has no seatbid', function () {
      const bidRequest = getBannerBidRequest();
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const bids = spec.interpretResponse({body: {nbr: 0}}, requests[0]);
      expect(bids).to.be.an('array');
      expect(bids.length).to.equal(0);
    });

    context('when there is a valid banner response', function () {
      let bids;

      beforeEach(function () {
        const bidRequest = getBannerBidRequest();
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const response = getSampleOrtbBidResponse(bidRequest.bidId);
        bids = spec.interpretResponse({body: response}, requests[0]);
      });

      it('should return at least one bid', function () {
        expect(bids).to.be.an('array');
        expect(bids.length).to.be.greaterThan(0);
      });

      it('should return a valid cpm', function () {
        expect(bids[0].cpm).to.equal(3.5);
      });

      it('should return the correct creativeId', function () {
        expect(bids[0].creativeId).to.equal('creative-123');
      });

      it('should return the correct width and height', function () {
        expect(bids[0].width).to.equal(300);
        expect(bids[0].height).to.equal(250);
      });

      it('should return net revenue as true', function () {
        expect(bids[0].netRevenue).to.be.true;
      });

      it('should return USD currency', function () {
        expect(bids[0].currency).to.equal('USD');
      });

      it('should return a TTL of 300 for banner', function () {
        expect(bids[0].ttl).to.equal(300);
      });
    });

    context('when there is a valid video response', function () {
      let bids;

      beforeEach(function () {
        const bidRequest = getVideoBidRequest();
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const response = getSampleOrtbBidResponse(bidRequest.bidId, {
          mtype: 2,
          adm: '<VAST version="3.0"></VAST>',
          w: 640,
          h: 480
        });
        bids = spec.interpretResponse({body: response}, requests[0]);
      });

      it('should return at least one bid', function () {
        expect(bids).to.be.an('array');
        expect(bids.length).to.be.greaterThan(0);
      });

      it('should return a TTL of 900 for video', function () {
        expect(bids[0].ttl).to.equal(900);
      });
    });
  });

  describe('getUserSyncs()', function () {
    it('should return undefined when iframe is not enabled', function () {
      const result = spec.getUserSyncs({iframeEnabled: false}, []);
      expect(result).to.be.undefined;
    });

    it('should return a sync object when iframe is enabled', function () {
      const result = spec.getUserSyncs({iframeEnabled: true}, []);
      expect(result).to.be.an('object');
      expect(result.type).to.equal('iframe');
      expect(result.url).to.include(SYNC_URL);
    });

    it('should use the default SYNC_URL', function () {
      const result = spec.getUserSyncs({iframeEnabled: true}, []);
      expect(result.url).to.equal(SYNC_URL);
    });

    it('should use a custom syncEndpoint from config', function () {
      config.setConfig({magnite: {syncEndpoint: 'https://custom.sync.com/usync.html'}});
      const result = spec.getUserSyncs({iframeEnabled: true}, []);
      expect(result.url).to.include('https://custom.sync.com/usync.html');
    });

    describe('GDPR consent', function () {
      it('should add gdpr and gdpr_consent params when gdprConsent is present', function () {
        const gdprConsent = {
          gdprApplies: true,
          consentString: 'GDPR_CONSENT_STRING'
        };
        const result = spec.getUserSyncs({iframeEnabled: true}, [], gdprConsent);
        expect(result.url).to.include('gdpr=1');
        expect(result.url).to.include('gdpr_consent=GDPR_CONSENT_STRING');
      });

      it('should set gdpr=0 when gdprApplies is false', function () {
        const gdprConsent = {
          gdprApplies: false,
          consentString: 'GDPR_CONSENT_STRING'
        };
        const result = spec.getUserSyncs({iframeEnabled: true}, [], gdprConsent);
        expect(result.url).to.include('gdpr=0');
      });

      it('should not add gdpr param when gdprApplies is not a boolean', function () {
        const gdprConsent = {
          gdprApplies: 'maybe',
          consentString: 'GDPR_CONSENT_STRING'
        };
        const result = spec.getUserSyncs({iframeEnabled: true}, [], gdprConsent);
        expect(result.url).to.not.include('gdpr=');
      });

      it('should not add gdpr_consent when consentString is not a string', function () {
        const gdprConsent = {
          gdprApplies: true,
          consentString: 123
        };
        const result = spec.getUserSyncs({iframeEnabled: true}, [], gdprConsent);
        expect(result.url).to.include('gdpr=1');
        expect(result.url).to.not.include('gdpr_consent=');
      });
    });

    describe('USP consent', function () {
      it('should add us_privacy param when uspConsent is present', function () {
        const result = spec.getUserSyncs({iframeEnabled: true}, [], undefined, '1YNN');
        expect(result.url).to.include('us_privacy=1YNN');
      });

      it('should not add us_privacy param when uspConsent is undefined', function () {
        const result = spec.getUserSyncs({iframeEnabled: true}, [], undefined, undefined);
        expect(result.url).to.not.include('us_privacy');
      });
    });

    describe('GPP consent', function () {
      it('should add gpp and gpp_sid params when gppConsent is present', function () {
        const gppConsent = {
          gppString: 'GPP_STRING',
          applicableSections: [6, 7]
        };
        const result = spec.getUserSyncs({iframeEnabled: true}, [], undefined, undefined, gppConsent);
        expect(result.url).to.include('gpp=GPP_STRING');
        expect(result.url).to.include('gpp_sid=6,7');
      });

      it('should not add gpp params when gppConsent is undefined', function () {
        const result = spec.getUserSyncs({iframeEnabled: true}, [], undefined, undefined, undefined);
        expect(result.url).to.not.include('gpp=');
      });

      it('should not add gpp params when gppString is missing', function () {
        const gppConsent = {
          applicableSections: [6, 7]
        };
        const result = spec.getUserSyncs({iframeEnabled: true}, [], undefined, undefined, gppConsent);
        expect(result.url).to.not.include('gpp=');
      });
    });

    describe('combined consent params', function () {
      it('should include all consent params when all are present', function () {
        const gdprConsent = {gdprApplies: true, consentString: 'GDPR_STRING'};
        const gppConsent = {gppString: 'GPP_STRING', applicableSections: [6]};
        const result = spec.getUserSyncs({iframeEnabled: true}, [], gdprConsent, '1YNN', gppConsent);
        expect(result.url).to.include('gdpr=1');
        expect(result.url).to.include('gdpr_consent=GDPR_STRING');
        expect(result.url).to.include('us_privacy=1YNN');
        expect(result.url).to.include('gpp=GPP_STRING');
        expect(result.url).to.include('gpp_sid=6');
      });
    });
  });

  describe('masSizeOrdering()', function () {
    it('should sort 300x250 to the first position', function () {
      const sizes = [
        {w: 728, h: 90},
        {w: 300, h: 250},
        {w: 160, h: 600}
      ];
      const sorted = masSizeOrdering(sizes);
      expect(sorted[0]).to.deep.equal({w: 300, h: 250});
    });

    it('should order priority sizes as 300x250, 728x90, 160x600', function () {
      const sizes = [
        {w: 160, h: 600},
        {w: 728, h: 90},
        {w: 300, h: 250}
      ];
      const sorted = masSizeOrdering(sizes);
      expect(sorted[0]).to.deep.equal({w: 300, h: 250});
      expect(sorted[1]).to.deep.equal({w: 728, h: 90});
      expect(sorted[2]).to.deep.equal({w: 160, h: 600});
    });

    it('should place priority sizes before non-priority sizes', function () {
      const sizes = [
        {w: 320, h: 50},
        {w: 300, h: 250},
        {w: 970, h: 250}
      ];
      const sorted = masSizeOrdering(sizes);
      expect(sorted[0]).to.deep.equal({w: 300, h: 250});
    });

    it('should maintain relative order for non-priority sizes', function () {
      const sizes = [
        {w: 320, h: 50},
        {w: 970, h: 250}
      ];
      const sorted = masSizeOrdering(sizes);
      expect(sorted[0]).to.deep.equal({w: 320, h: 50});
      expect(sorted[1]).to.deep.equal({w: 970, h: 250});
    });

    it('should handle a single size', function () {
      const sizes = [{w: 300, h: 250}];
      const sorted = masSizeOrdering(sizes);
      expect(sorted).to.deep.equal([{w: 300, h: 250}]);
    });

    it('should handle an empty array', function () {
      const sorted = masSizeOrdering([]);
      expect(sorted).to.deep.equal([]);
    });
  });

  describe('transformBidParams()', function () {
    it('should convert string params to numbers', function () {
      const result = spec.transformBidParams({
        accountId: '1001',
        siteId: '2001',
        zoneId: '3001'
      });
      expect(result.accountId).to.equal(1001);
      expect(result.siteId).to.equal(2001);
      expect(result.zoneId).to.equal(3001);
    });

    it('should keep number params as numbers', function () {
      const result = spec.transformBidParams({
        accountId: 1001,
        siteId: 2001,
        zoneId: 3001
      });
      expect(result.accountId).to.equal(1001);
      expect(result.siteId).to.equal(2001);
      expect(result.zoneId).to.equal(3001);
    });
  });

  describe('config merging', function () {
    it('should read magnite config', function () {
      config.setConfig({magnite: {int_type: 'magnite_test'}});
      const requests = spec.buildRequests([getBannerBidRequest()], getBidderRequest());
      expect(requests[0].data.ext.prebid.channel.name).to.equal('magnite_test');
    });

    it('should read rubicon config for backward compatibility', function () {
      config.setConfig({rubicon: {int_type: 'rubicon_test'}});
      const requests = spec.buildRequests([getBannerBidRequest()], getBidderRequest());
      expect(requests[0].data.ext.prebid.channel.name).to.equal('rubicon_test');
    });

    it('should reset config with resetMgniConf', function () {
      config.setConfig({magnite: {int_type: 'custom'}});
      resetMgniConf();
      const requests = spec.buildRequests([getBannerBidRequest()], getBidderRequest());
      // After reset, should use default integration
      expect(requests[0].data.ext.prebid.channel.name).to.equal('pbjs');
    });
  });
});
