import { spec } from 'modules/tpcBidAdapter.js';
import { parseUrl } from 'src/utils.js';

const expect = require('chai').expect;

const PBS_HOST = 'pbs.tpcsrv.com';
const ACCOUNT_ID = 'pub-1234';
const PLACEMENT_ID = 'homepage-leaderboard';
const TEST_DOMAIN = 'example.com';
const TEST_PAGE = `https://${TEST_DOMAIN}/page.html`;
const ADUNIT_CODE = '/1234/header-bid-tag-0';

const BID_PARAMS = {
  params: {
    accountId: ACCOUNT_ID,
    placementId: PLACEMENT_ID,
  }
};

const BID_REQUEST = {
  bidder: 'tpc',
  ...BID_PARAMS,
  ortb2Imp: {
    ext: {
      tid: 'e13391ea-00f3-495d-99a6-d937990d73a9'
    }
  },
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250]
      ]
    }
  },
  adUnitCode: ADUNIT_CODE,
  transactionId: 'e13391ea-00f3-495d-99a6-d937990d73a9',
  sizes: [[300, 250]],
  bidId: '123456789',
  bidderRequestId: '1decd098c76ed2',
  auctionId: '251a6a36-a5c5-4b82-b2b3-538c148a29dd',
  src: 'client',
  bidRequestsCount: 1,
  bidderRequestsCount: 1,
  bidderWinsCount: 0,
  ortb2: {
    site: {
      page: TEST_PAGE,
      domain: TEST_DOMAIN,
      publisher: {
        domain: TEST_DOMAIN
      }
    },
    device: {
      w: 1848,
      h: 1007,
      dnt: 0,
      ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
      language: 'en',
    }
  }
};

const BIDDER_REQUEST = {
  bidderCode: BID_REQUEST.bidder,
  auctionId: BID_REQUEST.auctionId,
  bidderRequestId: BID_REQUEST.bidderRequestId,
  bids: [BID_REQUEST],
  ortb2: BID_REQUEST.ortb2,
  auctionStart: 1681224591370,
  timeout: 1000,
  refererInfo: {
    reachedTop: true,
    isAmp: false,
    numIframes: 0,
    stack: [TEST_PAGE],
    topmostLocation: TEST_PAGE,
    location: TEST_PAGE,
    canonicalUrl: null,
    page: TEST_PAGE,
    domain: TEST_DOMAIN,
    ref: null,
  },
  start: 1681224591375
};

const BID_RESPONSE = {
  seatbid: [
    {
      bid: [
        {
          id: '123456789',
          impid: BID_REQUEST.bidId,
          price: 1.5,
          adm: '<img src="//files.prebid.org/creatives/prebid300x250.png" />',
          adomain: ['example.com'],
          crid: 'creative-abc-123',
          w: 300,
          h: 250,
          exp: 300,
          mtype: 1,
          ext: {
            prebid: {
              type: 'banner',
              targeting: {
                hb_size: '300x250',
                hb_bidder: 'tpc',
                hb_pb: '1.50'
              },
              meta: {
                advertiserDomains: ['example.com']
              }
            },
            origbidcpm: 1.5
          }
        }
      ],
      seat: 'appnexus',
      group: 0
    }
  ],
  cur: 'USD',
  ext: {
    responsetimemillis: {
      appnexus: 50
    },
    tmaxrequest: 900,
    prebid: {
      auctiontimestamp: 1678646619765,
      passthrough: {
        tpc: {
          bidder: spec.code
        }
      }
    }
  }
};

const S2S_RESPONSE_BIDDER = BID_RESPONSE.seatbid[0].seat;

const buildRequest = (params) => {
  const bidRequest = {
    ...BID_REQUEST,
    params: {
      ...BID_REQUEST.params,
      ...params,
    },
  };
  return spec.buildRequests([bidRequest], BIDDER_REQUEST);
};

describe('TPC Bid Adapter', function () {
  describe('isBidRequestValid', () => {
    it('should return true for a valid bid with accountId', () => {
      expect(spec.isBidRequestValid(BID_REQUEST)).to.be.true;
    });
    it('should return false when accountId is missing', () => {
      const bid = { ...BID_REQUEST, params: {} };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', () => {
    const { data, url } = buildRequest();
    it('should POST to the correct PBS endpoint', () => {
      expect(url).equal(`https://${PBS_HOST}/openrtb2/auction`);
    });
    it('should set site.publisher.id to the accountId', () => {
      expect(data.site.publisher.id).equal(ACCOUNT_ID);
    });
    it('should include bidder code in the passthrough object', () => {
      expect(data.ext.prebid.passthrough.tpc.bidder).equal(spec.code);
    });
    it('should set tmax below the bidder timeout', () => {
      expect(data.tmax).be.greaterThan(0);
      expect(data.tmax).be.lessThan(BIDDER_REQUEST.timeout);
    });
    it('should set placementId in imp.ext.prebid.bidder.tpc', () => {
      expect(data.imp[0].ext.prebid.bidder.tpc.placementId).equal(PLACEMENT_ID);
    });
  });

  describe('buildRequests without placementId', () => {
    const { data } = buildRequest({ placementId: undefined });
    it('should not set placementId when not provided', () => {
      expect(data.imp[0].ext?.prebid?.bidder?.tpc?.placementId).to.be.undefined;
    });
  });

  describe('interpretResponse', () => {
    const request = buildRequest();
    const [bid] = spec.interpretResponse({ body: BID_RESPONSE }, request);
    it('should return the correct bid values', () => {
      const respBid = BID_RESPONSE.seatbid[0].bid[0];
      expect(bid.cpm).equal(respBid.price);
      expect(bid.ad).equal(respBid.adm);
      expect(bid.width).equal(respBid.w);
      expect(bid.height).equal(respBid.h);
    });
    it('should not expose the S2S seat as bidderCode by default', () => {
      expect(bid.bidderCode).not.equal(S2S_RESPONSE_BIDDER);
    });
    it('should return an empty array when there is no body', () => {
      expect(spec.interpretResponse({}, request)).to.deep.equal([]);
    });
  });

  describe('interpretResponse with useSourceBidderCode', () => {
    const request = buildRequest({ useSourceBidderCode: true });
    const [bid] = spec.interpretResponse({ body: BID_RESPONSE }, request);
    it('should expose the S2S seat as bidderCode', () => {
      expect(bid.bidderCode).equal(S2S_RESPONSE_BIDDER);
    });
  });

  describe('getUserSyncs with iframeEnabled', () => {
    const allSyncs = spec.getUserSyncs({ iframeEnabled: true }, [{ body: BID_RESPONSE }], null, null, null);
    const [{ url, type }] = allSyncs;
    const parsed = parseUrl(url);
    it('should return a single sync object', () => {
      expect(allSyncs.length).equal(1);
    });
    it('should use iframe sync type', () => {
      expect(type).equal('iframe');
    });
    it('should sync to the cookie_sync endpoint', () => {
      expect(parsed.hostname).equal(PBS_HOST);
      expect(parsed.pathname).equal('/cookie_sync');
    });
    it('should include at least one bidder', () => {
      expect(parsed.search.bidders.split(',').length).be.greaterThan(0);
    });
  });

  describe('getUserSyncs with pixelEnabled only', () => {
    const allSyncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, [{ body: BID_RESPONSE }], null, null, null);
    it('should return a pixel sync when iframe is not enabled', () => {
      expect(allSyncs.length).equal(1);
      expect(allSyncs[0].type).equal('image');
    });
  });

  describe('getUserSyncs with no sync options enabled', () => {
    const allSyncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, [{ body: BID_RESPONSE }], null, null, null);
    it('should return an empty array', () => {
      expect(allSyncs).to.deep.equal([]);
    });
  });

  describe('getUserSyncs with no bidders in response', () => {
    const allSyncs = spec.getUserSyncs({ iframeEnabled: true }, [{ body: {} }], null, null, null);
    it('should return an empty array when no bidders responded', () => {
      expect(allSyncs).to.deep.equal([]);
    });
  });

  describe('getUserSyncs with consent signals', () => {
    const gdprConsent = { gdprApplies: true, consentString: 'abc123' };
    const uspConsent = '1YNN';
    const gppConsent = { gppString: 'gpp_str', applicableSections: [7, 8] };
    const [{ url }] = spec.getUserSyncs(
      { iframeEnabled: true },
      [{ body: BID_RESPONSE }],
      gdprConsent,
      uspConsent,
      gppConsent
    );
    const { search } = parseUrl(url);
    it('should include GDPR params', () => {
      expect(search.gdpr).equal('1');
      expect(search.gdpr_consent).equal('abc123');
    });
    it('should include US Privacy param', () => {
      expect(search.us_privacy).equal('1YNN');
    });
    it('should include GPP params', () => {
      expect(search.gpp).equal('gpp_str');
      expect(search.gpp_sid).equal('7,8');
    });
  });
});
