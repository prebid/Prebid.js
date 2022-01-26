import { expect } from 'chai';
import { spec, BIDDER_CODE, API_ENDPOINT, HEADER_AOTTER_VERSION } from 'modules/asealBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';

const TEST_CLIENT_ID = 'TEST_CLIENT_ID'

describe('asealBidAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  });

  describe('isBidRequestValid', () => {
    const bid = {
      bidder: 'aseal',
      params: {
        placeUid: '123'
      }
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true)
    });

    it('should return false when required param placeUid is not passed', () => {
      bid.params = {
        placeUid: ''
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    });

    it('should return false when required param placeUid is wrong type', () => {
      bid.params = {
        placeUid: null
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })
  });

  describe('buildRequests', () => {
    afterEach(() => {
      config.resetConfig();
    });

    it('should return an empty array when there are no bid requests', () => {
      const bidRequests = []
      const request = spec.buildRequests(bidRequests)

      expect(request).to.be.an('array').that.is.empty
    });

    it('should send `x-aotter-clientid` header as empty string when user not set config `clientId`', () => {
      const bidRequests = [{
        bidder: BIDDER_CODE,
        params: {
          placeUid: '123'
        }
      }]

      const bidderRequest = {}
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];

      expect(request.options.customHeaders['x-aotter-clientid']).equal('')
    })

    it('should send bid requests to ENDPOINT via POST', () => {
      const bidRequests = [{
        bidder: BIDDER_CODE,
        params: {
          placeUid: '123'
        }
      }]

      const bidderRequest = {
        refererInfo: {
          referer: 'https://aseal.in/',
        }
      }

      config.setConfig({
        aseal: {
          clientId: TEST_CLIENT_ID
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];

      expect(request.url).to.equal(API_ENDPOINT);
      expect(request.method).to.equal('POST')
      expect(request.options).deep.equal({
        contentType: 'application/json',
        withCredentials: true,
        customHeaders: {
          'x-aotter-clientid': TEST_CLIENT_ID,
          'x-aotter-version': HEADER_AOTTER_VERSION,
        }
      });
      expect(request.data).deep.equal({
        bids: bidRequests,
        refererInfo: bidderRequest.refererInfo,
      });
    });
  });

  describe('interpretResponse', () => {
    it('should return an empty array when there are no bids', () => {
      const serverResponse = {}
      const response = spec.interpretResponse(serverResponse);

      expect(response).is.an('array').that.is.empty;
    });

    it('should get correct bid response', () => {
      const serverResponse = {
        body: [{
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
          ad: '<!-- adtag -->'
        }]
      }
      const response = spec.interpretResponse(serverResponse);

      expect(response).deep.equal(serverResponse.body);
    });
  })
});
