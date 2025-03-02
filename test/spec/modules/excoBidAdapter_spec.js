import { expect } from 'chai';
import { spec as adapter, SID, ENDPOINT, BIDDER_CODE } from 'modules/excoBidAdapter';
import { BANNER } from '../../../src/mediaTypes';
import { config } from '../../../src/config';
import sinon from 'sinon';

describe('ExcoBidAdapter', function () {
  const BID = {
    bidId: '1731e91fa1236fd',
    adUnitCode: '300x250',
    bidder: BIDDER_CODE,
    params: {
      accountId: 'accountId',
      publisherId: 'publisherId',
      tagId: 'tagId',
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    transactionId: 'transactionId',
    sizes: [[300, 250]],
    bidderRequestId: '1677eaa35e64f46',
    auctionId: 'auctionId',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0,
  };

  const BIDDER_REQUEST = {
    bidderCode: BIDDER_CODE,
    auctionId: 'auctionId',
    bidderRequestId: '1677eaa35e64f46',
    bids: [BID],
    gdprConsent: {
      consentString: 'consent_string',
      gdprApplies: true,
    },
    gppString: 'gpp_string',
    gppSid: [7],
    uspConsent: 'consent_string',
    refererInfo: {
      page: 'https://www.greatsite.com',
      ref: 'https://www.somereferrer.com',
    },
    ortb2: {
      site: {
        content: {
          language: 'en',
        },
      },
      device: {
        w: 1309,
        h: 1305,
        dnt: 0,
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        language: 'en',
        sua: {
          source: 1,
          platform: { brand: 'Windows' },
          browsers: [
            { brand: 'Not(A:Brand', version: ['99'] },
            { brand: 'Google Chrome', version: ['133'] },
            { brand: 'Chromium', version: ['133'] },
          ],
          mobile: 0,
        },
      }
    },
  };

  let BUILT_REQ = null;

  describe('isBidRequestValid', function () {
    it('should return false if accountId is missing', function () {
      const bid = { ...BID, params: { publisherId: 'publisherId', tagId: 'tagId' } };
      expect(adapter.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false if publisherId is missing', function () {
      const bid = { ...BID, params: { accountId: 'accountId', tagId: 'tagId' } };
      expect(adapter.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false if tagId is missing', function () {
      const bid = { ...BID, params: { accountId: 'accountId', publisherId: 'publisherId' } };
      expect(adapter.isBidRequestValid(bid)).to.be.false;
    });

    it('should return true if all required params are present', function () {
      expect(adapter.isBidRequestValid(BID)).to.be.true;
    });
  });

  describe('buildRequests', function () {
    let sandbox;
    before(function () {
      sandbox = sinon.createSandbox();
      sandbox.stub(Date, 'now').returns(1000);
    });

    it('should build request', function () {
      config.setConfig({
        bidderTimeout: 3000,
        enableTIDs: true,
      });

      const requests = adapter.buildRequests([BID], BIDDER_REQUEST);
      expect(requests).to.have.length(1);

      const req = requests[0];
      expect(req.method).to.equal('POST');
      expect(req.url).to.equal(ENDPOINT);

      const ext = req.data.ext[BIDDER_CODE] || {};
      expect(ext.pbversion).to.equal('$prebid.version$');
      expect(ext.sid).to.equal(SID);

      BUILT_REQ = req;
    });

    after(function () {
      sandbox.restore();
    });
  });

  describe('interpretResponse', function () {
    const SERVER_RESPONSE = {
      body: {
        id: 'b1ec10d0-a1af-44e5-8a85-cb7b1652fe81',
        seatbid: [
          {
            bid: [
              {
                id: 'b7b6eddb-9924-425e-aa52-5eba56689abe',
                impid: BID.bidId,
                cpm: 10.56,
                ad: '<iframe>console.log("hello world")</iframe>',
                lurl: 'https://ads-ssp-stg.hit.buzz/loss?loss=${AUCTION_LOSS}&min_to_win=${AUCTION_MIN_TO_WIN}',
                adomain: ['crest.com'],
                iurl: 'https://thetradedesk-t-general.s3.amazonaws.com/AdvertiserLogos/qrr9d3g.png',
                crid: 'h6bvt3rl',
                w: 300,
                h: 250,
                mtype: 2,
                creativeId: 'h6bvt3rl',
                netRevenue: true,
                mediaType: BANNER,
                ext: {
                  advid: 37981,
                  bidtype: 1,
                  dspid: 377,
                  origbidcpm: 0,
                  origbidcur: 'USD',
                  wDSPByrId: '3000',
                },
                currency: 'USD',
              },
            ],
          },
        ],
      }
    };

    it('should return an array of interpreted banner responses', function () {
      const responses = adapter.interpretResponse(SERVER_RESPONSE, BUILT_REQ);
      expect(responses).to.have.length(1);
      expect(responses[0]).to.deep.equal({
        seatBidId: 'b7b6eddb-9924-425e-aa52-5eba56689abe',
        mediaType: BANNER,
        requestId: BID.bidId,
        cpm: 10.56,
        width: 300,
        height: 250,
        adapterCode: BIDDER_CODE,
        bidderCode: BIDDER_CODE,
        creativeId: 'h6bvt3rl',
        creative_id: 'h6bvt3rl',
        ttl: 3000,
        eventtrackers: [],
        meta: {
          advertiserDomains: [
            'crest.com'
          ],
          mediaType: BANNER
        },
        ad: '<iframe>console.log("hello world")</iframe>',
        netRevenue: true,
        currency: 'USD',
        vastXml: undefined,
        adUrl: undefined,
      });
    });

    it('should return empty array when there is no response', function () {
      const responses = adapter.interpretResponse(null, BUILT_REQ);
      expect(responses).to.have.length(0);
    });

    it('should return empty array when there is no ad', function () {
      const responses = adapter.interpretResponse({ price: 1, ad: '' }, BUILT_REQ);
      expect(responses).to.have.length(0);
    });

    it('should return empty array when there is no price', function () {
      const responses = adapter.interpretResponse({
        price: null,
        ad: 'great ad',
      }, BUILT_REQ);
      expect(responses).to.have.length(0);
    });
  });
});
