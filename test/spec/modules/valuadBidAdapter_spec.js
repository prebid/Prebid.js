import { expect } from 'chai';
import * as sinon from 'sinon';
import { spec } from 'modules/valuadBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { BANNER } from 'src/mediaTypes.js';
import { deepClone, generateUUID } from 'src/utils.js';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';
import * as dnt from 'libraries/dnt/index.js';
import * as gptUtils from 'libraries/gptUtils/gptUtils.js';
import * as refererDetection from 'src/refererDetection.js';
import * as BoundingClientRect from 'libraries/boundingClientRect/boundingClientRect.js';

const ENDPOINT = 'https://rtb.valuad.io/adapter';
const WON_URL = 'https://hb-dot-valuad.appspot.com/adapter/win';

describe('ValuadAdapter', function () {
  const adapter = newBidder(spec);
  let requestToServer;
  let validBidRequests;
  let bidderRequest;
  let sandbox;
  let clock;

  before(function() {
    validBidRequests = [
      {
        bidder: 'valuad',
        params: {
          placementId: 'test-placement-id-1'
        },
        adUnitCode: 'adunit-code-1',
        mediaTypes: {
          [BANNER]: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        bidId: 'bid-id-1',
        bidderRequestId: 'br-id-1',
        auctionId: 'auc-id-1',
        transactionId: 'txn-id-1'
      }
    ];

    bidderRequest = {
      bidderCode: 'valuad',
      auctionId: 'auc-id-1',
      bidderRequestId: 'br-id-1',
      bids: validBidRequests,
      refererInfo: {
        topmostLocation: 'http://test.com/page',
        ref: 'http://referrer.com',
        reachedTop: true
      },
      timeout: 3000,
      gdprConsent: {
        apiVersion: 2,
        gdprApplies: true,
        consentString: 'test-consent-string',
        allowAuctionWithoutConsent: false
      },
      uspConsent: '1YN-',
      ortb2: {
        regs: {
          gpp: 'test-gpp-string',
          gpp_sid: [7],
          ext: {
            dsa: { behalf: 'advertiser', paid: 'advertiser' }
          }
        },
        site: {
          ext: {
            data: { pageType: 'article' }
          }
        },
        device: {
          w: 1920,
          h: 1080,
          language: 'en-US'
        }
      }
    };
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    clock = sinon.useFakeTimers();

    // Stub utility functions
    sandbox.stub(utils, 'getWindowTop').returns({
      location: { href: 'http://test.com/page' },
      document: {
        referrer: 'http://referrer.com',
        documentElement: {
          clientWidth: 1200,
          scrollHeight: 2000,
          scrollWidth: 1200
        }
      },
      innerWidth: 1200,
      innerHeight: 800,
      screen: { width: 1920, height: 1080 },
      pageXOffset: 0,
      pageYOffset: 0
    });

    sandbox.stub(utils, 'getWindowSelf').returns({
      location: { href: 'http://test.com/page' },
      document: {
        referrer: 'http://referrer.com',
        documentElement: {
          clientWidth: 1200,
          scrollHeight: 2000,
          scrollWidth: 1200
        }
      },
      innerWidth: 1200,
      innerHeight: 800,
      screen: { width: 1920, height: 1080 },
      pageXOffset: 0,
      pageYOffset: 0
    });

    sandbox.stub(utils, 'canAccessWindowTop').returns(true);
    sandbox.stub(dnt, 'getDNT').returns(false);
    sandbox.stub(utils, 'generateUUID').returns('test-uuid');

    sandbox.stub(refererDetection, 'parseDomain').returns('test.com');

    sandbox.stub(gptUtils, 'getGptSlotInfoForAdUnitCode').returns({
      gptSlot: '/123/adunit',
      divId: 'div-gpt-ad-123'
    });

    sandbox.stub(config, 'getConfig').withArgs('coppa').returns(false);

    sandbox.stub(BoundingClientRect, 'getBoundingClientRect').returns({
      left: 10,
      top: 20,
      right: 310,
      bottom: 270,
      width: 300,
      height: 250
    });

    requestToServer = spec.buildRequests(validBidRequests, bidderRequest)[0];
  });

  afterEach(function () {
    sandbox.restore();
    clock.restore();
  });

  describe('inherited functions', function () {
    it('should exist and be a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      bidder: 'valuad',
      params: {
        placementId: 'test-placement-id'
      },
      adUnitCode: 'adunit-code',
      mediaTypes: {
        [BANNER]: {
          sizes: [[300, 250], [300, 600]]
        }
      },
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
    };

    it('should return true for a valid banner bid request', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when placementId is missing', function () {
      const invalidBid = deepClone(bid);
      delete invalidBid.params.placementId;
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when params are missing', function () {
      const invalidBid = deepClone(bid);
      delete invalidBid.params;
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when bidId is missing', function () {
      const invalidBid = deepClone(bid);
      delete invalidBid.bidId;
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when mediaTypes is missing', function () {
      const invalidBid = deepClone(bid);
      delete invalidBid.mediaTypes;
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when banner sizes are missing', function () {
      const invalidBid = deepClone(bid);
      delete invalidBid.mediaTypes[BANNER].sizes;
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should return a valid server request object', function () {
      expect(requestToServer).to.exist;
      expect(requestToServer).to.be.an('object');
      expect(requestToServer.method).to.equal('POST');
      expect(requestToServer.url).to.equal(ENDPOINT);
      expect(requestToServer.data).to.be.a('object');
    });

    it('should build a correct ORTB request payload', function () {
      const payload = requestToServer.data;

      expect(payload.id).to.be.a('string');
      expect(payload.imp).to.be.an('array').with.lengthOf(1);
      expect(payload.cur).to.deep.equal(['USD']);
      expect(payload.tmax).to.equal(bidderRequest.timeout);

      expect(payload.site).to.exist;
      expect(payload.site.ext.data.pageType).to.equal('article');

      expect(payload.device).to.exist;
      expect(payload.device.language).to.equal('en-US');
      expect(payload.device.js).to.equal(1);
      expect(payload.device.w).to.equal(1920);
      expect(payload.device.h).to.equal(1080);

      expect(payload.regs).to.exist;
      expect(payload.regs.gdpr).to.equal(1);
      expect(payload.regs.coppa).to.equal(0);
      expect(payload.regs.us_privacy).to.equal(bidderRequest.uspConsent);
      expect(payload.regs.ext.gdpr_consent).to.equal(bidderRequest.gdprConsent.consentString);
      expect(payload.regs.ext.gpp).to.equal(bidderRequest.ortb2.regs.gpp);
      expect(payload.regs.ext.gpp_sid).to.deep.equal(bidderRequest.ortb2.regs.gpp_sid);
      expect(payload.regs.ext.dsa).to.deep.equal(bidderRequest.ortb2.regs.ext.dsa);

      expect(payload.ext.params).to.deep.equal(validBidRequests[0].params);

      const imp = payload.imp[0];
      expect(imp.id).to.equal(validBidRequests[0].bidId);
      expect(imp.banner).to.exist;
      expect(imp.banner.format).to.be.an('array').with.lengthOf(2);
      expect(imp.banner.format[0]).to.deep.equal({ w: 300, h: 250 });
    });

    it('should include schain if present', function () {
      const bidWithSchain = deepClone(validBidRequests);
      bidWithSchain[0].schain = { ver: '1.0', complete: 1, nodes: [] };
      const reqWithSchain = deepClone(bidderRequest);
      reqWithSchain.bids = bidWithSchain;

      const request = spec.buildRequests(bidWithSchain, reqWithSchain);
      const payload = request[0].data;
      expect(payload.source.ext.schain).to.deep.equal(bidWithSchain[0].schain);
    });

    it('should include eids if present', function () {
      const bidWithEids = deepClone(validBidRequests);
      bidWithEids[0].userIdAsEids = [{ source: 'pubcid.org', uids: [{ id: 'test-pubcid' }] }];
      const reqWithEids = deepClone(bidderRequest);
      reqWithEids.bids = bidWithEids;

      const request = spec.buildRequests(bidWithEids, reqWithEids);
      const payload = request[0].data;
      expect(payload.user.ext.eids).to.deep.equal(bidWithEids[0].userIdAsEids);
    });

    it('should handle floors correctly', function () {
      const bidWithFloor = deepClone(validBidRequests);
      bidWithFloor[0].getFloor = sandbox.stub().returns({ currency: 'USD', floor: 1.50 });
      const reqWithFloor = deepClone(bidderRequest);
      reqWithFloor.bids = bidWithFloor;

      const request = spec.buildRequests(bidWithFloor, reqWithFloor);
      const payload = request[0].data;
      expect(payload.imp[0].bidfloor).to.equal(1.50);
      expect(payload.imp[0].bidfloorcur).to.equal('USD');
      sinon.assert.calledWith(bidWithFloor[0].getFloor, { currency: 'USD', mediaType: BANNER, size: [300, 250] });
    });
  });

  describe('interpretResponse', function () {
    let serverResponse;

    beforeEach(function() {
      serverResponse = {
        body: {
          id: 'test-response-id',
          seatbid: [
            {
              seat: 'valuad',
              bid: [
                {
                  id: 'test-bid-id',
                  impid: 'bid-id-1',
                  price: 1.50,
                  adm: '<div id="ad">Test Ad</div>',
                  crid: 'creative-id-1',
                  mtype: 1,
                  w: 300,
                  h: 250,
                  adomain: ['advertiser.com'],
                  ext: {
                    prebid: {
                      type: BANNER
                    }
                  }
                }
              ]
            }
          ],
          cur: 'USD',
          ext: {
            valuad: { serverInfo: 'some data' }
          }
        }
      };
    });

    it('should return an array of valid bid responses', function () {
      expect(requestToServer).to.exist;
      const bids = spec.interpretResponse(serverResponse, requestToServer);

      expect(bids).to.be.an('array').with.lengthOf(1);
      const bid = bids[0];

      expect(bid.requestId).to.equal('bid-id-1');
      expect(bid.cpm).to.equal(1.50);
      expect(bid.currency).to.equal('USD');
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.ad).to.equal('<div id="ad">Test Ad</div>');
      expect(bid.creativeId).to.equal('creative-id-1');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(30);
      expect(bid.mediaType).to.equal(BANNER);
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.com']);
      expect(bid.vid).to.equal('test-placement-id-1');
    });

    it('should return an empty array if seatbid is missing', function () {
      const responseNoSeatbid = deepClone(serverResponse);
      delete responseNoSeatbid.body.seatbid;
      const bids = spec.interpretResponse(responseNoSeatbid, requestToServer);
      expect(bids).to.be.an('array').with.lengthOf(0);
    });

    it('should return an empty array if bid array is empty', function () {
      const responseEmptyBid = deepClone(serverResponse);
      responseEmptyBid.body.seatbid[0].bid = [];
      const bids = spec.interpretResponse(responseEmptyBid, requestToServer);
      expect(bids).to.be.an('array').with.lengthOf(0);
    });

    it('should return empty array when response is null or undefined', function () {
      expect(spec.interpretResponse(null, requestToServer)).to.deep.equal([]);
      expect(spec.interpretResponse(undefined, requestToServer)).to.deep.equal([]);
    });

    it('should return empty array when response body is missing or invalid', function () {
      expect(spec.interpretResponse({}, requestToServer)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: null }, requestToServer)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: undefined }, requestToServer)).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    let serverResponses;

    beforeEach(function() {
      serverResponses = [
        {
          body: {
            id: 'test-response-id',
            userSyncs: [
              { type: 'iframe', url: 'https://sync.example.com/iframe?id=1' },
              { type: 'image', url: 'https://sync.example.com/pixel?id=2' }
            ]
          }
        }
      ];
    });

    it('should return correct sync objects if server response has userSyncs', function () {
      const syncs = spec.getUserSyncs({}, serverResponses);
      expect(syncs).to.be.an('array').with.lengthOf(2);
      expect(syncs[0]).to.deep.equal({ type: 'iframe', url: 'https://sync.example.com/iframe?id=1' });
      expect(syncs[1]).to.deep.equal({ type: 'image', url: 'https://sync.example.com/pixel?id=2' });
    });

    it('should return false if server response is empty', function () {
      const syncs = spec.getUserSyncs({}, []);
      expect(syncs).to.be.false;
    });

    it('should return false if server response body is empty', function () {
      const syncs = spec.getUserSyncs({}, [{ body: '' }]);
      expect(syncs).to.be.false;
    });

    it('should return false if userSyncs array is missing in response body', function () {
      const responseNoSyncs = deepClone(serverResponses);
      delete responseNoSyncs[0].body.userSyncs;
      const syncs = spec.getUserSyncs({}, responseNoSyncs);
      expect(syncs).to.be.false;
    });

    it('should return false if userSyncs array is empty', function () {
      const responseEmptySyncs = deepClone(serverResponses);
      responseEmptySyncs[0].body.userSyncs = [];
      const syncs = spec.getUserSyncs({}, responseEmptySyncs);
      expect(syncs).to.be.an('array').with.lengthOf(0);
    });
  });

  describe('onBidWon', function () {
    let triggerPixelStub;
    let bidWonEvent;
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
      triggerPixelStub = sandbox.stub(utils, 'triggerPixel');

      bidWonEvent = {
        adUnitCode: 'adunit-code-1',
        adUnitId: 'adunit-id-1',
        auctionId: 'auc-id-1',
        bidder: 'valuad',
        cpm: 1.50,
        currency: 'USD',
        originalCpm: 1.50,
        originalCurrency: 'USD',
        size: '300x250',
        vbid: 'server-generated-vbid',
        vid: 'test-placement-id-1',
      };
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should call triggerPixel with the correct URL and encoded data', function () {
      spec.onBidWon(bidWonEvent);

      const expectedData = {
        adUnitCode: bidWonEvent.adUnitCode,
        adUnitId: bidWonEvent.adUnitId,
        auctionId: bidWonEvent.auctionId,
        bidder: bidWonEvent.bidder,
        cpm: bidWonEvent.cpm,
        currency: bidWonEvent.currency,
        originalCpm: bidWonEvent.originalCpm,
        originalCurrency: bidWonEvent.originalCurrency,
        size: bidWonEvent.size,
        vbid: bidWonEvent.vbid,
        vid: bidWonEvent.vid,
      };
      const expectedEncodedData = btoa(JSON.stringify(expectedData));
      const expectedUrl = `${WON_URL}?b=${expectedEncodedData}`;

      sinon.assert.calledOnce(triggerPixelStub);
      sinon.assert.calledWith(triggerPixelStub, expectedUrl);
    });

    it('should handle missing optional properties in bid object gracefully', function () {
      const minimalBid = {
        adUnitCode: 'adunit-code-2',
        auctionId: 'auc-id-2',
        bidder: 'valuad',
        cpm: 2.00,
        currency: 'USD',
        size: '728x90'
      };

      spec.onBidWon(minimalBid);

      const expectedData = {
        adUnitCode: minimalBid.adUnitCode,
        adUnitId: undefined,
        auctionId: minimalBid.auctionId,
        bidder: minimalBid.bidder,
        cpm: minimalBid.cpm,
        currency: minimalBid.currency,
        originalCpm: undefined,
        originalCurrency: undefined,
        size: minimalBid.size,
        vbid: undefined,
        vid: undefined,
      };
      const expectedEncodedData = btoa(JSON.stringify(expectedData));
      const expectedUrl = `${WON_URL}?b=${expectedEncodedData}`;

      sinon.assert.calledOnce(triggerPixelStub);
      sinon.assert.calledWith(triggerPixelStub, expectedUrl);
    });
  });
});
