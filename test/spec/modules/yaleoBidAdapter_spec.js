import { cloneDeep } from "lodash";
import sinon from 'sinon';
import { config } from "src/config.js";
import * as utils from "src/utils.js";
import { spec } from "../../../modules/yaleoBidAdapter.ts";

const PLACEMENT_ID = '9c752583-d856-4b44-a227-c0ce6c7a8cfa';

const bannerBidRequestBase = {
  adUnitCode: 'banner-ad-unit-code',
  auctionId: 'banner-auction-id',
  bidId: 'banner-bid-id',
  bidder: 'yaleo',
  bidderRequestId: 'banner-bidder-request-id',
  mediaTypes: { banner: [[300, 250]] },
  params: { placementId: PLACEMENT_ID },
};

const bannerServerResponseBase = {
  body: {
    id: 'banner-server-response-id',
    seatbid: [
      {
        bid: [
          {
            id: 'banner-seatbid-bid-id',
            impid: 'banner-bid-id',
            price: 0.05,
            adm: '<div>banner-ad</div>',
            adid: 'banner-ad-id',
            adomain: ['audienzz.com', 'yaleo.com'],
            iurl: 'iurl',
            cid: 'banner-campaign-id',
            crid: 'banner-creative-id',
            cat: [],
            w: 300,
            h: 250,
            mtype: 1,
          },
        ],
        seat: 'yaleo',
      },
    ],
    cur: 'USD',
  },
};

describe('Yaleo bid adapter', () => {
  let bannerBidRequest;

  beforeEach(() => {
    bannerBidRequest = cloneDeep(bannerBidRequestBase);
  });

  describe('spec', () => {
    it('checks that spec has required properties', () => {
      expect(spec).to.have.property('code', 'yaleo');
      expect(spec).to.have.property('supportedMediaTypes').that.includes('banner');
      expect(spec).to.have.property('isBidRequestValid').that.is.a('function');
      expect(spec).to.have.property('buildRequests').that.is.a('function');
      expect(spec).to.have.property('interpretResponse').that.is.a('function');
      expect(spec).to.have.property('gvlid').that.equals(783);
    });
  });

  describe('isBidRequestValid', () => {
    it('returns true when all params are specified', () => {
      bannerBidRequest.params = {
        placementId: PLACEMENT_ID,
        maxCpm: 5.00,
        memberId: 12345,
        forceDarkTheme: true,
      };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.true;
    });

    it('returns true when required params are specified', () => {
      bannerBidRequest.params = { placementId: PLACEMENT_ID };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.true;
    });

    it('returns false when params are empty', () => {
      bannerBidRequest.params = {};
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returns false when params are not specified', () => {
      bannerBidRequest.params = undefined;
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returnsfalse when required params are not specified', () => {
      bannerBidRequest.params = { wrongParam: '12345' };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returns false when placementId is a number', () => {
      bannerBidRequest.params = { placementId: 12345 };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returns false when placementId is a boolean', () => {
      bannerBidRequest.params = { placementId: true };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returns false when placementId is an object', () => {
      bannerBidRequest.params = { placementId: {} };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returns false when placementId is an array', () => {
      bannerBidRequest.params = { placementId: [] };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returns false when placementId is undefined', () => {
      bannerBidRequest.params = { placementId: undefined };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returns false when placementId is null', () => {
      bannerBidRequest.params = { placementId: null };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returns false when placementId is an empty string', () => {
      bannerBidRequest.params = { placementId: '' };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    describe('invalid params', () => {
      const describeValue = (value) => (typeof value === 'string' ? `"${value}"` : String(value));
      let logWarnStub;

      beforeEach(() => {
        logWarnStub = sinon.stub(utils, 'logWarn');
      });

      afterEach(() => {
        logWarnStub.restore();
      });

      [
        { placementId: PLACEMENT_ID },
        { placementId: PLACEMENT_ID.toUpperCase() },
        { placementId: ` ${PLACEMENT_ID} ` },
        { placementId: PLACEMENT_ID, memberId: 1, maxCpm: 0, forceDarkTheme: false },
        { placementId: PLACEMENT_ID, memberId: 3927, maxCpm: 5.5, forceDarkTheme: true },
      ].forEach((params) => {
        it(`accepts the bid without a warning: ${JSON.stringify(params)}`, () => {
          bannerBidRequest.params = params;
          expect(spec.isBidRequestValid(bannerBidRequest)).to.be.true;
          sinon.assert.notCalled(logWarnStub);
        });
      });

      ['', ' ', '12345', `${PLACEMENT_ID}0`, PLACEMENT_ID.replace(/-/g, ''), 'zz752583-d856-4b44-a227-c0ce6c7a8cfa'].forEach((placementId) => {
        it(`rejects the bid and warns when placementId is not a UUID: "${placementId}"`, () => {
          bannerBidRequest.params = { placementId };
          expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
          sinon.assert.calledOnceWithExactly(logWarnStub, `yaleo: placementId must be a UUID, got "${placementId}"`);
        });
      });

      [
        ['memberId', [0, -1, 1.5, NaN, '3927', null, true]],
        ['maxCpm', [-0.01, NaN, Infinity, '5', null]],
        ['forceDarkTheme', ['true', 1, null]],
      ].forEach(([param, values]) => {
        values.forEach((value) => {
          it(`accepts the bid but warns when ${param} is ${describeValue(value)}`, () => {
            bannerBidRequest.params = { placementId: PLACEMENT_ID, [param]: value };
            expect(spec.isBidRequestValid(bannerBidRequest)).to.be.true;
            sinon.assert.calledOnce(logWarnStub);
            expect(logWarnStub.firstCall.args[0]).to.include(`yaleo: ${param} must be`);
          });
        });
      });

      it('warns only about the invalid value', () => {
        bannerBidRequest.params = { placementId: PLACEMENT_ID, memberId: 0 };
        expect(spec.isBidRequestValid(bannerBidRequest)).to.be.true;
        sinon.assert.calledOnceWithExactly(logWarnStub, 'yaleo: memberId must be a positive integer, got "0"');
      });

      it('warns once per invalid optional param', () => {
        bannerBidRequest.params = { placementId: PLACEMENT_ID, memberId: 0, maxCpm: -1, forceDarkTheme: 'true' };
        expect(spec.isBidRequestValid(bannerBidRequest)).to.be.true;
        sinon.assert.callCount(logWarnStub, 3);
      });
    });
  });

  describe('buildRequests', () => {
    afterEach(() => {
      config.resetConfig();
    });

    it('creates a valid banner bid request', () => {
      const bidderRequest = {
        bids: [bannerBidRequest],
        auctionId: bannerBidRequest.auctionId,
        bidderRequestId: bannerBidRequest.bidderRequestId,
        ortb2: {
          site: {
            page: 'http://example.com',
          }
        }
      };

      const request = spec.buildRequests([bannerBidRequest], bidderRequest);

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://bidder.yaleo.com/prebid');
      expect(request.data.imp.length).to.equal(1);
      expect(request.data.imp[0]).to.have.property('banner');
      expect(request.data.site.page).to.be.equal('http://example.com');
    });

    it('uses the production endpoint by default', () => {
      const bidderRequest = {
        bids: [bannerBidRequest],
        auctionId: bannerBidRequest.auctionId,
        bidderRequestId: bannerBidRequest.bidderRequestId,
      };

      const request = spec.buildRequests([bannerBidRequest], bidderRequest);

      expect(request.url).to.equal('https://bidder.yaleo.com/prebid');
    });

    it('overrides the endpoint via yaleo.endpoint config for an approved Yaleo host', () => {
      config.setConfig({ yaleo: { endpoint: 'https://dev-bidder.yaleo.com/prebid' } });
      const bidderRequest = {
        bids: [bannerBidRequest],
        auctionId: bannerBidRequest.auctionId,
        bidderRequestId: bannerBidRequest.bidderRequestId,
      };

      const request = spec.buildRequests([bannerBidRequest], bidderRequest);

      expect(request.url).to.equal('https://dev-bidder.yaleo.com/prebid');
    });

    it('ignores an endpoint override that is not a Yaleo host', () => {
      config.setConfig({ yaleo: { endpoint: 'https://bidder.example.com/prebid' } });
      const bidderRequest = {
        bids: [bannerBidRequest],
        auctionId: bannerBidRequest.auctionId,
        bidderRequestId: bannerBidRequest.bidderRequestId,
      };

      const request = spec.buildRequests([bannerBidRequest], bidderRequest);

      expect(request.url).to.equal('https://bidder.yaleo.com/prebid');
    });

    it('ignores a non-HTTPS endpoint override', () => {
      config.setConfig({ yaleo: { endpoint: 'http://bidder.yaleo.com/prebid' } });
      const bidderRequest = {
        bids: [bannerBidRequest],
        auctionId: bannerBidRequest.auctionId,
        bidderRequestId: bannerBidRequest.bidderRequestId,
      };

      const request = spec.buildRequests([bannerBidRequest], bidderRequest);

      expect(request.url).to.equal('https://bidder.yaleo.com/prebid');
    });

    it('ignores an unapproved Yaleo subdomain override', () => {
      config.setConfig({ yaleo: { endpoint: 'https://anything.yaleo.com/prebid' } });
      const bidderRequest = {
        bids: [bannerBidRequest],
        auctionId: bannerBidRequest.auctionId,
        bidderRequestId: bannerBidRequest.bidderRequestId,
      };

      const request = spec.buildRequests([bannerBidRequest], bidderRequest);

      expect(request.url).to.equal('https://bidder.yaleo.com/prebid');
    });

    describe('test mode', () => {
      let getParameterByNameStub;

      const buildRequest = (ortb2) => spec.buildRequests([bannerBidRequest], {
        bids: [bannerBidRequest],
        auctionId: bannerBidRequest.auctionId,
        bidderRequestId: bannerBidRequest.bidderRequestId,
        ortb2,
      });

      const setTestQueryParam = (value) => {
        getParameterByNameStub = sinon.stub(utils, 'getParameterByName')
          .callsFake((name) => (name === 'yaleo_test' ? value : ''));
      };

      afterEach(() => {
        getParameterByNameStub?.restore();
        getParameterByNameStub = undefined;
      });

      ['true', 'TRUE', 'True'].forEach((value) => {
        it(`sets test: 1 when the page URL has yaleo_test=${value}`, () => {
          setTestQueryParam(value);

          expect(buildRequest().data.test).to.equal(1);
        });
      });

      ['', 'false', '1'].forEach((value) => {
        it(`does not flag the request as a test when yaleo_test is "${value}"`, () => {
          setTestQueryParam(value);

          expect(buildRequest().data.test).to.not.equal(1);
        });
      });

      it('does not flag the request as a test in Prebid.js debug mode', () => {
        config.setConfig({ debug: true });

        const request = buildRequest();

        expect(request.data.test).to.not.equal(1);
        expect(request.data.ext.prebid.debug).to.be.true;
      });

      it('keeps test: 1 set through ortb2', () => {
        expect(buildRequest({ test: 1 }).data.test).to.equal(1);
      });

      it('keeps test: 1 set through ortb2 when yaleo_test=false', () => {
        setTestQueryParam('false');

        expect(buildRequest({ test: 1 }).data.test).to.equal(1);
      });

      it('sets test: 1 when yaleo_test=true and ortb2 sets test: 0', () => {
        setTestQueryParam('true');

        expect(buildRequest({ test: 0 }).data.test).to.equal(1);
      });
    });

    it('checks that all params are passed to the request', () => {
      bannerBidRequest.params = {
        placementId: PLACEMENT_ID,
        maxCpm: 5.00,
        memberId: 12345,
        forceDarkTheme: true,
      };
      const bidderRequest = {
        bids: [bannerBidRequest],
        auctionId: bannerBidRequest.auctionId,
        bidderRequestId: bannerBidRequest.bidderRequestId,
      };

      const request = spec.buildRequests([bannerBidRequest], bidderRequest);
      const yaleoParams = request.data.imp[0].ext.prebid.bidder.yaleo;

      expect(yaleoParams.placementId).to.equal(PLACEMENT_ID);
      expect(yaleoParams.maxCpm).to.equal(5.00);
      expect(yaleoParams.memberId).to.equal(12345);
      expect(yaleoParams.forceDarkTheme).to.be.true;
    });
  });

  it('checks that only specified params are passed to the request', () => {
    bannerBidRequest.params = {
      placementId: PLACEMENT_ID,
    };

    const bidderRequest = {
      bids: [bannerBidRequest],
      auctionId: bannerBidRequest.auctionId,
      bidderRequestId: bannerBidRequest.bidderRequestId,
    };

    const request = spec.buildRequests([bannerBidRequest], bidderRequest);
    const yaleoParams = request.data.imp[0].ext.prebid.bidder.yaleo;

    expect(yaleoParams).to.deep.equal({ placementId: PLACEMENT_ID });
  });

  describe('interpretResponse', () => {
    let bannerServerResponse;
    beforeEach(() => {
      bannerServerResponse = cloneDeep(bannerServerResponseBase);
    });

    it('parses banner bid response correctly', () => {
      const bidderRequest = {
        bids: [bannerBidRequest],
        auctionId: bannerBidRequest.auctionId,
        bidderRequestId: bannerBidRequest.bidderRequestId,
      };

      const request = spec.buildRequests([bannerBidRequest], bidderRequest);
      const response = spec.interpretResponse(bannerServerResponse, request);

      expect(response).to.have.property('bids');
      expect(response.bids.length).to.be.equal(1);
      expect(response.bids[0].cpm).to.equal(0.05);
      expect(response.bids[0].currency).to.equal('USD');
      expect(response.bids[0].mediaType).to.equal('banner');
      expect(response.bids[0].width).to.equal(300);
      expect(response.bids[0].height).to.equal(250);
      expect(response.bids[0].creativeId).to.equal('banner-creative-id');
      expect(response.bids[0].ad).to.equal('<div>banner-ad</div>');
      expect(response.bids[0].bidderCode).to.equal('yaleo');
      expect(response.bids[0].meta.advertiserDomains).to.deep.equal(['audienzz.com', 'yaleo.com']);
      expect(response.bids[0].netRevenue).to.be.true;
      expect(response.bids[0].ttl).to.equal(300);
    });
  });
});
