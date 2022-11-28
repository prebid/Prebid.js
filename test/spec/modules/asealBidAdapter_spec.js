import { expect } from 'chai';
import {
  spec,
  BIDDER_CODE,
  API_ENDPOINT,
  HEADER_AOTTER_VERSION,
  WEB_SESSION_ID_KEY,
} from 'modules/asealBidAdapter.js';
import { getRefererInfo } from 'src/refererDetection.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';
import { storage } from 'modules/asealBidAdapter.js';

const TEST_CLIENT_ID = 'TEST_CLIENT_ID';
const TEST_WEB_SESSION_ID = 'TEST_WEB_SESSION_ID';

describe('asealBidAdapter', () => {
  const adapter = newBidder(spec);

  let localStorageIsEnabledStub;
  let getDataFromLocalStorageStub;
  let sandbox;
  let w;

  beforeEach((done) => {
    localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
    getDataFromLocalStorageStub = sinon.stub(
      storage,
      'getDataFromLocalStorage'
    );

    w = {
      document: {
        title: 'Aseal',
        referrer: 'https://aseal.in/',
        href: 'https://aseal.in/',
      },
      location: {
        href: 'https://aseal.in/',
      },
    };

    sandbox = sinon.sandbox.create();
    sandbox.stub(utils, 'getWindowTop').returns(w);
    sandbox.stub(utils, 'getWindowSelf').returns(w);
    done();
  });

  afterEach(() => {
    localStorageIsEnabledStub.restore();
    getDataFromLocalStorageStub.restore();
    sandbox.restore();
    config.resetConfig();
  });

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    const bid = {
      bidder: 'aseal',
      params: {
        placeUid: '123',
      },
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required param placeUid is not passed', () => {
      bid.params = {
        placeUid: '',
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required param placeUid is wrong type', () => {
      bid.params = {
        placeUid: null,
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    it('should return an empty array when there are no bid requests', () => {
      const bidRequests = [];
      const request = spec.buildRequests(bidRequests);

      expect(request).to.be.an('array').that.is.empty;
    });

    it('should send `x-aotter-clientid` header as empty string when user not set config `clientId`', () => {
      const bidRequests = [
        {
          bidder: BIDDER_CODE,
          params: {
            placeUid: '123',
          },
        },
      ];

      const bidderRequest = {};
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];

      expect(request.options.customHeaders['x-aotter-clientid']).equal('');
    });

    it('should send bid requests to ENDPOINT via POST', () => {
      const bidRequests = [
        {
          bidder: BIDDER_CODE,
          params: {
            placeUid: '123',
          },
        },
      ];

      const bidderRequest = {
        refererInfo: getRefererInfo(),
      };

      config.setConfig({
        aseal: {
          clientId: TEST_CLIENT_ID,
        },
      });

      localStorageIsEnabledStub.returns(true);
      getDataFromLocalStorageStub
        .withArgs(WEB_SESSION_ID_KEY)
        .returns(TEST_WEB_SESSION_ID);

      const request = spec.buildRequests(bidRequests, bidderRequest)[0];

      utils.getWindowTop.restore();
      utils.getWindowSelf.restore();

      sandbox.stub(utils, 'getWindowTop').returns(w);
      sandbox.stub(utils, 'getWindowSelf').returns(w);

      const payload = {
        meta: {
          dr: w.document.referrer,
          drs: w.document.referrer,
          drt: w.document.referrer,
          dt: w.document.title,
          dl: w.location.href,
        },
      };

      expect(request.url).to.equal(API_ENDPOINT);
      expect(request.method).to.equal('POST');
      expect(request.options).deep.equal({
        contentType: 'application/json',
        withCredentials: true,
        customHeaders: {
          'x-aotter-clientid': TEST_CLIENT_ID,
          'x-aotter-version': HEADER_AOTTER_VERSION,
        },
      });
      expect(request.data.bids).deep.equal(bidRequests);
      expect(request.data.payload).deep.equal(payload);
      expect(request.data.device).deep.equal({
        webSessionId: TEST_WEB_SESSION_ID,
      });
    });
  });

  describe('interpretResponse', () => {
    it('should return an empty array when there are no bids', () => {
      const serverResponse = {};
      const response = spec.interpretResponse(serverResponse);

      expect(response).is.an('array').that.is.empty;
    });

    it('should get correct bid response', () => {
      const serverResponse = {
        body: [
          {
            requestId: '2ef08f145b7a4f',
            cpm: 3,
            width: 300,
            height: 250,
            creativeId: '123abc',
            dealId: '123abc',
            currency: 'USD',
            netRevenue: false,
            mediaType: 'banner',
            ttl: 300,
            ad: '<!-- adtag -->',
          },
        ],
      };
      const response = spec.interpretResponse(serverResponse);

      expect(response).deep.equal(serverResponse.body);
    });
  });
});
