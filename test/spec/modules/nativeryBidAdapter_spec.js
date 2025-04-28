import { expect } from 'chai';
import { spec, converter } from 'modules/nativeryBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';

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
  let deepAccessStub;
  let logWarnSpy;
  let logErrorSpy;

  beforeEach(() => {
    sandBox = sinon.createSandbox();
    deepAccessStub = sandBox.stub();
    logWarnSpy = sandBox.spy(utils.logWarn);
    logErrorSpy = sandBox.spy(utils.logError);

    // Sovrascrivi le funzioni globali usate nella funzione da testare
    utils.logWarn = logWarnSpy;
    utils.logError = logErrorSpy;
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

      // Verifica i singoli oggetti della request
      request.forEach((req) => {
        expect(req).to.have.property('method', 'POST');
        expect(req).to.have.property('url', ENDPOINT);
        expect(req).to.have.property('data').that.is.an('object');
        expect(req.data).to.have.property('imp').that.is.an('array');
        // Ogni chunk deve avere al massimo MAX_IMPS_PER_REQUEST elementi
        expect(req.data.imp.length).to.be.at.most(MAX_IMPS_PER_REQUEST);
      });
    });
  });

  describe('interpretResponse', function () {
    const bidderRequest = spec.buildRequests(bidRequests, {});
    it('dovrebbe ritornare [] se serverResponse.body è falsy', function () {
      // Caso: serverResponse.body non esiste
      let serverResponse = {};
      let result = spec.interpretResponse(serverResponse, bidderRequest);
      expect(result).to.be.an('array').that.is.empty;

      // Caso: serverResponse.body è null
      serverResponse = { body: null };
      result = spec.interpretResponse(serverResponse, bidderRequest);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('dovrebbe ritornare [] se serverResponse.body non è un oggetto', function () {
      const serverResponse = { body: 'not an object' };
      const result = spec.interpretResponse(serverResponse, bidderRequest);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('dovrebbe ritornare [] se serverResponse.body.seatbid non è un array', function () {
      const serverResponse = {
        body: {
          seatbid: {}, // Non è un array
        },
      };

      const result = spec.interpretResponse(serverResponse, bidderRequest);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('dovrebbe processare correttamente una risposta con seatbid array e ritornare bids', function () {
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

    it('dovrebbe loggare un warning se deepAccess restituisce errori, ma comunque ritornare bids', function () {
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
      sinon.assert.calledOnce(logWarnSpy);
      sinon.assert.calledWith(
        logWarnSpy,
        'Nativery: Error in bid response ' + JSON.stringify(errors)
      );
    });

    it('dovrebbe ritornare [] e loggare un errore se converter.fromORTB lancia un errore', function () {
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
      sinon.assert.calledOnce(logErrorSpy);
      sinon.assert.calledWith(
        logErrorSpy,
        'Nativery: unhandled error in bid response ' + error.message
      );
    });
  });
});
