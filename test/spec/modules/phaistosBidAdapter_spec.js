import { expect } from 'chai';
import { getTopDomain, spec } from 'modules/phaistosBidAdapter.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';
import { findRootDomain, coreStorage } from 'src/fpd/rootDomain.js';
import { canSetCookie } from 'src/storageManager.js';
import { parseUrl } from 'src/utils.js';

describe('phaistosBidAdapter', function () {
  let sandbox;
  let cookies;
  // Domains the stub treats as public suffixes (browser would reject Domain=…).
  const publicSuffixes = new Set(['com', 'uk', 'co.uk', 'org.uk', 'com.au']);

  beforeEach(function () {
    findRootDomain.clear();
    canSetCookie.clear();
    cookies = {};
    sandbox = sinon.createSandbox();
    sandbox.stub(coreStorage, 'cookiesAreEnabled').returns(true);
    sandbox.stub(coreStorage, 'setCookie').callsFake((cookie, value, expiration, sameSite, domain) => {
      if (publicSuffixes.has(domain)) {
        return;
      }
      if (new Date(expiration) <= Date.now()) {
        delete cookies[cookie];
      } else {
        cookies[cookie] = value;
      }
    });
    sandbox.stub(coreStorage, 'getCookie').callsFake((cookie) => cookies[cookie]);
  });

  afterEach(function () {
    sandbox.restore();
    findRootDomain.clear();
    canSetCookie.clear();
  });

  const bannerBid = {
    bidder: 'phaistos',
    params: { id: 42551, host: 'https://x.grxchange.gr' },
    adUnitCode: 'div-banner',
    bidId: 'bid-1',
    transactionId: 'tx-1',
    auctionId: 'auc-1',
    mediaTypes: {
      banner: { sizes: [[300, 250], [300, 600]] }
    },
    ortb2Imp: {}
  };

  const videoBid = {
    bidder: 'phaistos',
    params: { id: 42552, host: 'https://x.grxchange.gr' },
    adUnitCode: 'div-video',
    bidId: 'bid-video-1',
    transactionId: 'tx-video-1',
    auctionId: 'auc-1',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 360]],
        mimes: ['video/mp4', 'video/webm'],
        protocols: [2, 3, 5, 6],
        api: [1, 2],
        maxduration: 30,
        linearity: 1
      }
    },
    ortb2Imp: {}
  };

  const bidderRequest = {
    bidderCode: 'phaistos',
    auctionId: 'auc-1',
    bidderRequestId: 'req-1',
    timeout: 2000,
    refererInfo: {
      page: 'https://www.example.com/article',
      domain: 'www.example.com'
    }
  };

  describe('getTopDomain', function () {
    it('returns hostnames with two or fewer labels unchanged', function () {
      expect(getTopDomain('example.com')).to.equal('example.com');
      expect(getTopDomain('localhost')).to.equal('localhost');
    });

    it('returns eTLD+1 for longer hostnames', function () {
      expect(getTopDomain('www.example.com')).to.equal('example.com');
      expect(getTopDomain('a.b.example.com')).to.equal('example.com');
    });

    it('handles multi-part public suffixes', function () {
      expect(getTopDomain('www.example.co.uk')).to.equal('example.co.uk');
      expect(getTopDomain('a.b.example.co.uk')).to.equal('example.co.uk');
    });

    it('strips a port before deriving the domain', function () {
      expect(getTopDomain('example.com:5555')).to.equal('example.com');
      expect(getTopDomain('www.example.com:8080')).to.equal('example.com');
      expect(getTopDomain('localhost:8090')).to.equal('localhost');
    });
  });

  describe('isBidRequestValid', function () {
    it('returns true when id is present', function () {
      expect(spec.isBidRequestValid(bannerBid)).to.equal(true);
    });

    it('returns true for video units with id', function () {
      expect(spec.isBidRequestValid(videoBid)).to.equal(true);
    });

    it('accepts numeric ids', function () {
      expect(spec.isBidRequestValid({ params: { id: 1 } })).to.equal(true);
    });

    it('returns false when params missing', function () {
      expect(spec.isBidRequestValid({})).to.equal(false);
    });

    it('returns false when id is missing/empty', function () {
      expect(spec.isBidRequestValid({ params: {} })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { id: '' } })).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('returns empty array with no bids', function () {
      expect(spec.buildRequests([], bidderRequest)).to.deep.equal([]);
    });

    it('builds a single credentialed text/plain POST to expand', function () {
      const reqs = spec.buildRequests([bannerBid], bidderRequest);
      expect(reqs).to.have.lengthOf(1);
      const r = reqs[0];
      expect(r.method).to.equal('POST');
      expect(r.url).to.equal('https://pbs.phaistos.eu/openrtb2/auction');
      expect(r.options.contentType).to.equal('text/plain');
      expect(r.options.withCredentials).to.equal(true);
      expect(r.data).to.be.an('object');
      expect(r.data.imp).to.be.an('array').with.lengthOf(1);
    });

    it('puts bidder params under imp.ext.prebid.bidder.phaistos', function () {
      const imp = spec.buildRequests([bannerBid], bidderRequest)[0].data.imp[0];
      expect(imp.ext.prebid.bidder.phaistos).to.deep.include({
        id: 42551,
        host: 'https://x.grxchange.gr'
      });
    });

    it('sets site.publisher.id from the page eTLD+1', function () {
      const data = spec.buildRequests([bannerBid], bidderRequest)[0].data;
      expect(data.site.publisher.id).to.equal('example.com');
    });

    it('allows params.accountId to override the derived publisher id', function () {
      const bid = Object.assign({}, bannerBid, {
        params: { id: 42551, accountId: 'custom-account' }
      });
      const data = spec.buildRequests([bid], bidderRequest)[0].data;
      expect(data.site.publisher.id).to.equal('custom-account');
      expect(data.imp[0].ext.prebid.bidder.phaistos.accountId).to.equal(undefined);
    });

    it('includes a banner object', function () {
      const imp = spec.buildRequests([bannerBid], bidderRequest)[0].data.imp[0];
      expect(imp.banner).to.be.an('object');
    });

    it('batches multiple imps into one request', function () {
      const second = Object.assign({}, bannerBid, {
        bidId: 'bid-2',
        params: { id: 42552 }
      });
      const data = spec.buildRequests([bannerBid, second], bidderRequest)[0].data;
      expect(data.imp).to.have.lengthOf(2);
      expect(data.imp[0].ext.prebid.bidder.phaistos.id).to.equal(42551);
      expect(data.imp[1].ext.prebid.bidder.phaistos.id).to.equal(42552);
    });

    if (FEATURES.VIDEO) {
      it('includes a video object for instream units', function () {
        const imp = spec.buildRequests([videoBid], bidderRequest)[0].data.imp[0];
        expect(imp.video).to.be.an('object');
        expect(imp.video.mimes).to.deep.equal(['video/mp4', 'video/webm']);
        expect(imp.ext.prebid.bidder.phaistos.id).to.equal(42552);
        expect(imp.banner).to.equal(undefined);
      });
    }
  });

  describe('interpretResponse', function () {
    function buildRequestData(bid) {
      return spec.buildRequests([bid], bidderRequest)[0];
    }

    it('returns [] for an empty body', function () {
      expect(spec.interpretResponse({ body: {} }, buildRequestData(bannerBid))).to.deep.equal([]);
      expect(spec.interpretResponse({}, buildRequestData(bannerBid))).to.deep.equal([]);
    });

    it('parses a banner seatbid into a Prebid bid', function () {
      const request = buildRequestData(bannerBid);
      const response = {
        body: {
          id: 'auc-1',
          cur: 'EUR',
          seatbid: [{
            seat: 'phaistos',
            bid: [{
              id: 'b1',
              impid: request.data.imp[0].id,
              price: 2.5,
              adm: '<div>ad</div>',
              crid: '99',
              w: 300,
              h: 250,
              mtype: 1,
              adomain: ['brand.com']
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal(bannerBid.bidId);
      expect(bids[0].cpm).to.equal(2.5);
      expect(bids[0].currency).to.equal('EUR');
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].ad).to.equal('<div>ad</div>');
      expect(bids[0].creativeId).to.equal('99');
      expect(bids[0].mediaType).to.equal(BANNER);
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['brand.com']);
    });

    if (FEATURES.VIDEO) {
      it('parses a video seatbid into a VAST bid', function () {
        const request = buildRequestData(videoBid);
        const vast = '<VAST version="3.0"><Ad></Ad></VAST>';
        const response = {
          body: {
            id: 'auc-1',
            cur: 'EUR',
            seatbid: [{
              seat: 'phaistos',
              bid: [{
                id: 'v1',
                impid: request.data.imp[0].id,
                price: 4.0,
                adm: vast,
                crid: 'video-99',
                w: 640,
                h: 360,
                mtype: 2,
                adomain: ['brand.com']
              }]
            }]
          }
        };
        const bids = spec.interpretResponse(response, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].requestId).to.equal(videoBid.bidId);
        expect(bids[0].cpm).to.equal(4.0);
        expect(bids[0].currency).to.equal('EUR');
        expect(bids[0].mediaType).to.equal(VIDEO);
        expect(bids[0].vastXml).to.equal(vast);
        expect(bids[0].width).to.equal(640);
        expect(bids[0].height).to.equal(360);
        expect(bids[0].meta.advertiserDomains).to.deep.equal(['brand.com']);
      });
    }
  });

  describe('getUserSyncs', function () {
    let auctionRequest;
    let syncResponse;

    beforeEach(function () {
      auctionRequest = spec.buildRequests([bannerBid], bidderRequest)[0];
      syncResponse = [{
        body: {
          id: auctionRequest.data.id,
          ext: { responsetimemillis: { phaistos: 12 } }
        }
      }];
    });

    it('returns no syncs when iframe sync is disabled', function () {
      expect(spec.getUserSyncs({ iframeEnabled: false }, syncResponse)).to.deep.equal([]);
    });

    it('returns no syncs without server responses', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true }, [])).to.deep.equal([]);
    });

    it('returns no syncs when COPPA is enabled', function () {
      expect(spec.getUserSyncs(
        { iframeEnabled: true },
        syncResponse,
        undefined,
        undefined,
        undefined,
        true
      )).to.deep.equal([]);
    });

    it('returns an iframe loader aimed at expand cookie_sync', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, syncResponse, {
        gdprApplies: true,
        consentString: 'CONSENT'
      }, '1YNY');
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      const { search, hostname, pathname } = parseUrl(syncs[0].url);
      expect(hostname).to.equal('pbs.phaistos.eu');
      expect(pathname).to.equal('/static/cookie_sync.html');
      expect(search.endpoint).to.equal('https://pbs.phaistos.eu/cookie_sync');
      expect(search.bidders).to.equal('phaistos');
      expect(search.account).to.equal('example.com');
      expect(search.gdpr).to.equal('1');
      expect(search.gdpr_consent).to.equal('CONSENT');
      expect(search.us_privacy).to.equal('1YNY');
    });

    it('uses params.accountId for the sync account when set', function () {
      const bid = Object.assign({}, bannerBid, {
        params: { id: 42551, accountId: 'custom-account' }
      });
      const request = spec.buildRequests([bid], bidderRequest)[0];
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [{
        body: { id: request.data.id }
      }]);
      expect(parseUrl(syncs[0].url).search.account).to.equal('custom-account');
    });

    it('keeps each auction account tied to its response id', function () {
      const bidA = Object.assign({}, bannerBid, {
        params: { id: 42551, accountId: 'account-a' }
      });
      const bidB = Object.assign({}, bannerBid, {
        bidId: 'bid-b',
        params: { id: 42552, accountId: 'account-b' }
      });
      const requestA = spec.buildRequests([bidA], bidderRequest)[0];
      const requestB = spec.buildRequests([bidB], bidderRequest)[0];
      // Later auction B must not overwrite A's sync account.
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [{
        body: { id: requestA.data.id }
      }]);
      expect(parseUrl(syncs[0].url).search.account).to.equal('account-a');
      expect(requestB.data.id).to.not.equal(requestA.data.id);
    });
  });

  describe('spec metadata', function () {
    it('registers phaistos with GVL 47', function () {
      expect(spec.code).to.equal('phaistos');
      expect(spec.gvlid).to.equal(47);
      expect(spec.disclosureURL).to.equal('https://static.adman.gr/phaistos_ads_cookies_disclosure.json');
      expect(spec.supportedMediaTypes).to.include(BANNER);
      if (FEATURES.VIDEO) {
        expect(spec.supportedMediaTypes).to.include(VIDEO);
      }
    });
  });
});
