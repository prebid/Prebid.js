import { expect } from 'chai';
import { spec, converter } from 'modules/nativeryBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';
import * as ajax from 'src/ajax.js';

const ENDPOINT = 'https://hb.nativery.com/openrtb2/auction';
const MAX_IMPS_PER_REQUEST = 10;

const bid = {
  bidder: 'nativery',
  params: {
    widgetId: 'abc123',
  },
  adUnitCode: '/adunit-code/test-path',
  bidId: 'test-bid-id-1',
  bidderRequestId: 'test-bid-request-1',
  auctionId: 'test-auction-1',
  transactionId: 'test-transactionId-1',
};

const bidRequests = [
  {
    ...bid,
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 600],
        ],
      },
    },
    ortb2: {},
  },
];

describe('NativeryAdapter', function () {
  const adapter = newBidder(spec);
  let sandBox;

  beforeEach(() => {
    sandBox = sinon.createSandbox();
  });

  afterEach(() => sandBox.restore());

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      const invalidBid = Object.assign({}, bid);
      delete invalidBid.params.widgetId;
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should build the request', function () {
      const request = spec.buildRequests(bidRequests, {});
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT);
      expect(request.options.withCredentials).to.equal(true);
      expect(typeof request.data.id).to.equal('string');
      expect(request.data.imp).to.be.an('array');
      expect(request.data.imp.length).to.equal(1);
      request.data.imp.forEach((data) => {
        expect(data.id).to.exist.and.to.be.a('string');
        expect(data).to.have.nested.property('banner.format');
        expect(data.ext.nativery.widgetId).to.equal(bid.params.widgetId);
      });
    });
    // build multi bid request
    const multiBidRequest = Array(12).fill(bidRequests[0]);

    it('should build the request splitting in chuncks', function () {
      const request = spec.buildRequests(multiBidRequest, {});

      const expectedNumRequests = Math.ceil(
        multiBidRequest.length / MAX_IMPS_PER_REQUEST
      );
      expect(request).to.be.an('array').that.has.lengthOf(expectedNumRequests);

      // Check each object of the request
      request.forEach((req) => {
        expect(req).to.have.property('method', 'POST');
        expect(req).to.have.property('url', ENDPOINT);
        expect(req).to.have.property('data').that.is.an('object');
        expect(req.data).to.have.property('imp').that.is.an('array');
        // Each chunk must contain at most MAX_IMPS_PER_REQUEST elements.
        expect(req.data.imp.length).to.be.at.most(MAX_IMPS_PER_REQUEST);
      });
    });
  });

  describe('interpretResponse', function () {
    const bidderRequest = spec.buildRequests(bidRequests, {});
    it('should return [] if serverResponse.body is falsy', function () {
      // Case: serverResponse.body does not exist
      let serverResponse = {};
      let result = spec.interpretResponse(serverResponse, bidderRequest);
      expect(result).to.be.an('array').that.is.empty;

      // Case: serverResponse.body is null
      serverResponse = { body: null };
      result = spec.interpretResponse(serverResponse, bidderRequest);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return [] if serverResponse.body is not an object', function () {
      const serverResponse = { body: 'not an object' };
      const result = spec.interpretResponse(serverResponse, bidderRequest);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return [] if serverResponse.body.seatbid is not an array', function () {
      const serverResponse = {
        body: {
          seatbid: {}, // Not an array
        },
      };

      const result = spec.interpretResponse(serverResponse, bidderRequest);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should correctly process a response with a seatbid array and return bids', function () {
      const bidsMock = [{ bid: 1 }, { bid: 2 }];
      const serverResponse = {
        body: {
          seatbid: [{}],
        },
      };

      sandBox.stub(converter, 'fromORTB').returns({ bids: bidsMock });

      const result = spec.interpretResponse(serverResponse, bidderRequest);
      expect(result).to.deep.equal(bidsMock);
      sinon.assert.calledWith(converter.fromORTB, {
        request: bidderRequest.data,
        response: serverResponse.body,
      });
    });

    it('should log a warning if deepAccess returns errors, but still return bids', function () {
      const logWarnSpy = sinon.spy(utils, 'logWarn');
      const bidsMock = [{ bid: 1 }];
      const bidderRequest = spec.buildRequests(bidRequests, {});

      const errors = ['error1', 'error2'];
      const serverResponse = {
        body: {
          seatbid: [{}],
          ext: {
            errors: {
              nativery: errors,
            },
          },
        },
      };

      sandBox.stub(converter, 'fromORTB').returns({ bids: bidsMock });

      const result = spec.interpretResponse(serverResponse, bidderRequest);
      expect(result).to.deep.equal(bidsMock);
      expect(logWarnSpy.calledOnceWithExactly(`Nativery: Error in bid response ${JSON.stringify(errors)}`)).to.be.true;
      logWarnSpy.restore();
    });

    it('should return [] and log an error if converter.fromORTB throws an error', function () {
      const logErrorSpy = sinon.spy(utils, 'logError');
      const bidderRequest = spec.buildRequests(bidRequests, {});

      const serverResponse = {
        body: {
          seatbid: [{}],
        },
      };

      const error = new Error('Test error');
      sandBox.stub(converter, 'fromORTB').throws(error);

      const result = spec.interpretResponse(serverResponse, bidderRequest);
      expect(result).to.be.an('array').that.is.empty;
      expect(logErrorSpy.calledOnceWithExactly(`Nativery: unhandled error in bid response ${error.message}`)).to.be.true;
      logErrorSpy.restore();
    });
  });

  describe('onBidWon callback', () => {
    it('should exists and be a function', () => {
      expect(spec.onBidWon).to.exist.and.to.be.a('function');
    });
    it('should NOT call ajax when invalid or empty data is provided', () => {
      const ajaxStub = sandBox.stub(ajax, 'ajax');
      spec.onBidWon(null);
      spec.onBidWon({});
      spec.onBidWon(undefined);
      expect(ajaxStub.called).to.be.false;
    });
    it('should call ajax with correct payload when valid data is provided', () => {
      const ajaxStub = sandBox.stub(ajax, 'ajax');
      const validData = { bidder: 'nativery', adUnitCode: 'div-1' };
      spec.onBidWon(validData);
      assertTrackEvent(ajaxStub, 'NAT_BID_WON', validData)
    });
  });

  describe('onAdRenderSucceeded callback', () => {
    it('should exists and be a function', () => {
      expect(spec.onAdRenderSucceeded).to.exist.and.to.be.a('function');
    });
    it('should NOT call ajax when invalid or empty data is provided', () => {
      const ajaxStub = sandBox.stub(ajax, 'ajax');
      spec.onAdRenderSucceeded(null);
      spec.onAdRenderSucceeded({});
      spec.onAdRenderSucceeded(undefined);
      expect(ajaxStub.called).to.be.false;
    });
    it('should call ajax with correct payload when valid data is provided', () => {
      const ajaxStub = sandBox.stub(ajax, 'ajax');
      const validData = { bidder: 'nativery', adUnitCode: 'div-1' };
      spec.onAdRenderSucceeded(validData);
      assertTrackEvent(ajaxStub, 'NAT_AD_RENDERED', validData)
    });
  });

  describe('onTimeout callback', () => {
    it('should exists and be a function', () => {
      expect(spec.onTimeout).to.exist.and.to.be.a('function');
    });
    it('should NOT call ajax when invalid or empty data is provided', () => {
      const ajaxStub = sandBox.stub(ajax, 'ajax');
      spec.onTimeout(null);
      spec.onTimeout({});
      spec.onTimeout([]);
      spec.onTimeout(undefined);
      expect(ajaxStub.called).to.be.false;
    });
    it('should call ajax with correct payload when valid data is provided', () => {
      const ajaxStub = sandBox.stub(ajax, 'ajax');
      const validData = [{ bidder: 'nativery', adUnitCode: 'div-1' }];
      spec.onTimeout(validData);
      assertTrackEvent(ajaxStub, 'NAT_TIMEOUT', validData)
    });
  });

  describe('onBidderError callback', () => {
    it('should exists and be a function', () => {
      expect(spec.onBidderError).to.exist.and.to.be.a('function');
    });
    it('should NOT call ajax when invalid or empty data is provided', () => {
      const ajaxStub = sandBox.stub(ajax, 'ajax');
      spec.onBidderError(null);
      spec.onBidderError({});
      spec.onBidderError(undefined);
      expect(ajaxStub.called).to.be.false;
    });
    it('should call ajax with correct payload when valid data is provided', () => {
      const ajaxStub = sandBox.stub(ajax, 'ajax');
      const validData = {
        error: 'error',
        bidderRequest: {
          bidder: 'nativery',
        }
      };
      spec.onBidderError(validData);
      assertTrackEvent(ajaxStub, 'NAT_BIDDER_ERROR', validData)
    });
  });
});

const assertTrackEvent = (ajaxStub, event, data) => {
  expect(ajaxStub.calledOnce).to.be.true;

  const [url, callback, body, options] = ajaxStub.firstCall.args;

  expect(url).to.equal('https://hb.nativery.com/openrtb2/track-event');
  expect(callback).to.be.undefined;
  expect(body).to.be.a('string');
  expect(options).to.deep.equal({ method: 'POST', withCredentials: true, keepalive: true });

  const payload = JSON.parse(body);
  expect(payload.event).to.equal(event);
  expect(payload.prebidVersion).to.exist.and.to.be.a('string')
  expect(payload.data).to.deep.equal(data);
}
