import { expect } from 'chai';
import sinon from 'sinon';
import { spec } from 'modules/axonixBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';
import { server } from 'test/mocks/xhr.js';
import * as utils from 'src/utils.js';

const SUPPLY_ID = 'test-supply-123';
const REGION = 'us-east-1';
const BIDDER = 'axonix';
const BIDDER_URL = `https://openrtb-${REGION}.axonix.com/supply/prebid-js/v2/${SUPPLY_ID}`;
const TIMEOUT_URL = `https://openrtb-${REGION}.axonix.com/supply/prebid-js/timeout/v2/${SUPPLY_ID}`;
const DATA_DELETION_URL = `https://openrtb-${REGION}.axonix.com/supply/prebid-js/data-deletion/v2/${SUPPLY_ID}`;

function buildBidRequest(overrides = {}) {
  return {
    bidId: 'test-bid-1',
    bidder: BIDDER,
    adUnitCode: 'banner-div',
    transactionId: 'test-transaction-id',
    params: {
      supplyId: SUPPLY_ID,
      region: REGION,
    },
    mediaTypes: {
      [BANNER]: {
        sizes: [[300, 250]],
      },
    },
    ...overrides,
  };
}

function buildBidderRequest(overrides = {}) {
  return {
    auctionId: 'test-auction-id',
    bidderRequestId: 'test-bidder-request-id',
    timeout: 3000,
    refererInfo: {
      page: 'https://example.com/page',
      domain: 'example.com',
      ref: 'https://referrer.com',
    },
    ...overrides,
  };
}

describe('Axonix Bid Adapter', function () {
  let sandbox;
  let logWarnStub;
  let triggerPixelStub;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    logWarnStub = sandbox.stub(utils, 'logWarn');
    triggerPixelStub = sandbox.stub(utils, 'triggerPixel');
    sandbox.stub(utils, 'replaceAuctionPrice').callsFake((url, cpm) => url.replace('${AUCTION_PRICE}', cpm));
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
  });

  it('should export expected metadata', function () {
    expect(spec.code).to.equal(BIDDER);
    expect(spec.gvlid).to.equal(141);
    expect(spec.supportedMediaTypes).to.deep.equal([BANNER, VIDEO]);
  });

  describe('inherited functions', function () {
    const adapter = newBidder(spec);

    it('should expose callBids from bidder factory', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true for valid banner bid', function () {
      expect(spec.isBidRequestValid(buildBidRequest())).to.equal(true);
    });

    it('should return true for valid video bid when mimes are present', function () {
      const bid = buildBidRequest({
        mediaTypes: {
          [VIDEO]: {
            playerSize: [640, 480],
            mimes: ['video/mp4'],
          },
        },
      });
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when supplyId is missing', function () {
      const bid = buildBidRequest({ params: { region: REGION } });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaTypes are missing', function () {
      const bid = buildBidRequest({ mediaTypes: undefined });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false for video without mimes', function () {
      const bid = buildBidRequest({
        mediaTypes: {
          [VIDEO]: {
            playerSize: [640, 480],
          },
        },
      });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true for video with mimes even without playerSize', function () {
      const bid = buildBidRequest({
        mediaTypes: {
          [VIDEO]: {
            mimes: ['video/mp4'],
          },
        },
      });
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('should build one POST request per bid with default endpoint', function () {
      const requests = spec.buildRequests([buildBidRequest()], buildBidderRequest());

      expect(requests).to.be.an('array').with.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(BIDDER_URL);
      expect(requests[0].options).to.deep.include({
        withCredentials: false,
        contentType: 'application/json',
      });
    });

    it('should build separate requests for each bid', function () {
      const bidRequests = [
        buildBidRequest({ bidId: 'bid-1', params: { supplyId: 'supply-1', region: REGION } }),
        buildBidRequest({ bidId: 'bid-2', params: { supplyId: 'supply-2', region: REGION } }),
      ];

      const requests = spec.buildRequests(bidRequests, buildBidderRequest());

      expect(requests).to.have.lengthOf(2);
      expect(requests[0].url).to.include('supply-1');
      expect(requests[1].url).to.include('supply-2');
    });

    it('should default region to us-east-1 when region is omitted', function () {
      const bid = buildBidRequest({ params: { supplyId: SUPPLY_ID } });
      const requests = spec.buildRequests([bid], buildBidderRequest());

      expect(requests[0].url).to.equal(BIDDER_URL);
    });

    it('should use custom endpoint when provided', function () {
      const customEndpoint = 'https://custom.example.com/bid';
      const bid = buildBidRequest({ params: { supplyId: SUPPLY_ID, endpoint: customEndpoint } });
      const requests = spec.buildRequests([bid], buildBidderRequest());

      expect(requests[0].url).to.equal(customEndpoint);
    });

    it('should include site page from refererInfo', function () {
      const requests = spec.buildRequests([buildBidRequest()], buildBidderRequest());
      const payload = requests[0].data;

      expect(payload.site.page).to.equal('https://example.com/page');
      expect(payload.refererInfo.page).to.equal('https://example.com/page');
    });

    it('should prefer params.referrer and upgrade to https when secure is true', function () {
      const bid = buildBidRequest({
        params: {
          supplyId: SUPPLY_ID,
          region: REGION,
          referrer: 'http://example.com/custom',
          secure: true,
        },
      });
      const requests = spec.buildRequests([bid], buildBidderRequest());
      const payload = requests[0].data;

      expect(payload.site.page).to.equal('https://example.com/custom');
    });

    it('should include bid floor from getFloor', function () {
      const bid = buildBidRequest({
        getFloor: () => ({ floor: 1.5, currency: 'USD' }),
      });
      const requests = spec.buildRequests([bid], buildBidderRequest());

      expect(requests[0].data.bidfloor).to.equal(1.5);
    });

    it('should add banner mimes to payload without mutating the original bid', function () {
      const bid = buildBidRequest();
      const requests = spec.buildRequests([bid], buildBidderRequest());
      const payload = requests[0].data;

      expect(payload.validBidRequest.mediaTypes[BANNER].mimes).to.deep.equal([
        'image/jpeg',
        'image/png',
        'image/gif',
      ]);
      expect(bid.mediaTypes[BANNER].mimes).to.be.undefined;
    });

    it('should include consent objects when present', function () {
      const gdprConsent = { gdprApplies: true, consentString: 'consent-string' };
      const uspConsent = '1YYN';
      const gppConsent = { gppString: 'DBAA', applicableSections: [7] };
      const bidderRequest = buildBidderRequest({ gdprConsent, uspConsent, gppConsent });

      const payload = spec.buildRequests([buildBidRequest()], bidderRequest)[0].data;

      expect(payload.gdprConsent).to.deep.equal(gdprConsent);
      expect(payload.uspConsent).to.equal(uspConsent);
      expect(payload.gppConsent).to.deep.equal(gppConsent);
    });

    it('should include schain from ortb2', function () {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [{ asi: 'example.com', sid: 'seller123', hp: 1 }],
      };
      const bidderRequest = buildBidderRequest({
        ortb2: {
          source: {
            ext: { schain },
          },
        },
      });

      const payload = spec.buildRequests([buildBidRequest()], bidderRequest)[0].data;

      expect(payload.schain).to.deep.equal(schain);
    });

    it('should include ortb2 device data', function () {
      const bidderRequest = buildBidderRequest({
        ortb2: {
          device: {
            ifa: 'test-ifa-123',
            make: 'Apple',
            model: 'iPhone',
          },
        },
      });

      const payload = spec.buildRequests([buildBidRequest()], bidderRequest)[0].data;

      expect(payload.device.ifa).to.equal('test-ifa-123');
      expect(payload.device.make).to.equal('Apple');
      expect(payload.device.model).to.equal('iPhone');
    });

    it('should include transaction and auction ids', function () {
      const bid = buildBidRequest({ transactionId: 'imp-tid' });
      const bidderRequest = buildBidderRequest({ auctionId: 'source-tid' });
      const payload = spec.buildRequests([bid], bidderRequest)[0].data;

      expect(payload.sourceTid).to.equal('source-tid');
      expect(payload.impTid).to.equal('imp-tid');
    });

    it('should send app object instead of site when app config is set', function () {
      config.setConfig({
        app: {
          bundle: 'com.example.app',
          domain: 'example.com',
        },
      });

      const payload = spec.buildRequests([buildBidRequest()], buildBidderRequest())[0].data;

      expect(payload.app.bundle).to.equal('com.example.app');
      expect(payload.site).to.be.undefined;
    });
  });

  describe('interpretResponse', function () {
    const request = { data: {} };

    it('should map valid server bids and apply defaults', function () {
      const serverResponse = {
        body: [{
          requestId: 'test-bid-1',
          cpm: 2.5,
          creativeId: 'creative-123',
          ad: '<div>test ad</div>',
          width: 300,
          height: 250,
          mediaType: BANNER,
        }],
      };

      const bids = spec.interpretResponse(serverResponse, request);

      expect(bids).to.have.lengthOf(1);
      expect(bids[0]).to.include({
        requestId: 'test-bid-1',
        cpm: 2.5,
        creativeId: 'creative-123',
        ttl: 60,
        currency: 'USD',
        netRevenue: true,
      });
    });

    it('should preserve explicit ttl, currency, and netRevenue', function () {
      const serverResponse = {
        body: [{
          requestId: 'test-bid-1',
          cpm: 2.5,
          creativeId: 'creative-123',
          ttl: 120,
          currency: 'EUR',
          netRevenue: false,
        }],
      };

      const bid = spec.interpretResponse(serverResponse, request)[0];

      expect(bid.ttl).to.equal(120);
      expect(bid.currency).to.equal('EUR');
      expect(bid.netRevenue).to.equal(false);
    });

    it('should filter bids missing required fields', function () {
      const serverResponse = {
        body: [
          { requestId: 'missing-cpm', creativeId: 'cr-1' },
          { requestId: 'missing-creative', cpm: 1.0 },
          { cpm: 1.0, creativeId: 'cr-2' },
          { requestId: 'valid', cpm: 1.0, creativeId: 'cr-3' },
        ],
      };

      const bids = spec.interpretResponse(serverResponse, request);

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('valid');
    });

    it('should return an empty array for invalid responses', function () {
      expect(spec.interpretResponse(null, request)).to.deep.equal([]);
      expect(spec.interpretResponse({}, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: {} }, request)).to.deep.equal([]);
    });
  });

  describe('onTimeout', function () {
    it('should send timeout notification to the signal endpoint', function () {
      const timeoutData = [{
        bidId: 'test-bid-1',
        params: [{ supplyId: SUPPLY_ID, region: REGION }],
      }];

      spec.onTimeout(timeoutData);

      expect(server.requests).to.have.lengthOf(1);
      expect(server.requests[0].method).to.equal('POST');
      expect(server.requests[0].url).to.equal(TIMEOUT_URL);
      expect(server.requests[0].requestBody).to.deep.equal(timeoutData[0]);
    });

    it('should not send timeout notification when params are missing', function () {
      spec.onTimeout([{ bidId: 'test-bid-1', params: [{}] }]);
      expect(server.requests).to.be.empty;
    });
  });

  describe('onBidWon', function () {
    it('should trigger nurl pixel with replaced auction price', function () {
      const bid = {
        nurl: 'https://win.example.com/win?price=${AUCTION_PRICE}',
        cpm: 2.5,
      };

      spec.onBidWon(bid);

      expect(triggerPixelStub.calledOnce).to.be.true;
      expect(triggerPixelStub.firstCall.args[0]).to.equal(
        'https://win.example.com/win?price=2.5'
      );
    });

    it('should not trigger pixel when nurl is missing', function () {
      spec.onBidWon({ cpm: 2.5 });
      expect(triggerPixelStub.called).to.be.false;
    });
  });

  describe('onBidderError', function () {
    it('should log bidder endpoint errors', function () {
      spec.onBidderError({
        error: { status: 500 },
        bidderRequest: { auctionId: 'test-auction-id' },
      });

      expect(logWarnStub.calledOnce).to.be.true;
      expect(logWarnStub.firstCall.args[0]).to.include('axonix');
      expect(logWarnStub.firstCall.args[1]).to.equal(500);
      expect(logWarnStub.firstCall.args[2]).to.equal('test-auction-id');
    });
  });

  describe('onDataDeletionRequest', function () {
    it('should send data deletion request when supplyId is present', function () {
      const bidderRequests = [{
        bids: [{
          params: {
            supplyId: SUPPLY_ID,
            region: REGION,
          },
        }],
      }];

      spec.onDataDeletionRequest(bidderRequests);

      expect(server.requests).to.have.lengthOf(1);
      expect(server.requests[0].method).to.equal('POST');
      expect(server.requests[0].url).to.equal(DATA_DELETION_URL);
      expect(server.requests[0].requestBody).to.deep.equal({ bidderRequests });
    });

    it('should not send data deletion request when supplyId is missing', function () {
      spec.onDataDeletionRequest([{ bids: [{ params: {} }] }]);
      expect(server.requests).to.be.empty;
    });
  });
});
