import { expect } from 'chai';
import { spec } from 'modules/uolBidAdapter';

const ENDPOINT = 'https://prebid.adilligo.com/v1/prebid.json';

describe('UOL Bid Adapter', function () {
  let sandbox;
  let queryStub;
  let getCurrentPositionStub;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'uol',
      'params': {
        'placementId': '19571273'
      },
      'adUnitCode': '/uol/unit/code',
      'sizes': [[300, 250], [970, 250]],
      'bidId': '3ddb6ed2d73b45',
      'bidderRequestId': 'd2b12f9d2bad975b7',
      'auctionId': 'eb511c63-df7e-4240-9b65-2f8ae50303e4',
    };

    it('should return true for valid params', function () {
      let clonedBid = Object.assign({}, bid);
      expect(spec.isBidRequestValid(clonedBid)).to.equal(true);

      delete clonedBid.params;
      clonedBid.params = {
        'placementId': '19571277',
        'test': 'true'
      }
      expect(spec.isBidRequestValid(clonedBid)).to.equal(true);

      delete clonedBid.params;
      clonedBid.params = {
        'placementId': '19571278',
        'test': 'true',
        'cpmFactor': 2
      }
      expect(spec.isBidRequestValid(clonedBid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let clonedBid = Object.assign({}, bid);
      delete clonedBid.params;
      expect(spec.isBidRequestValid(clonedBid)).to.equal(false);
    });

    it('should return false when params are invalid', function () {
      let clonedBid = Object.assign({}, bid);
      delete clonedBid.params;
      clonedBid.params = {
        'placementId': 0
      }
      expect(spec.isBidRequestValid(clonedBid)).to.equal(false);

      delete clonedBid.params;
      clonedBid.params = {
        'placementId': '19571281',
        'cpmFactor': 2
      }
      expect(spec.isBidRequestValid(clonedBid)).to.equal(false);

      delete clonedBid.params;
      clonedBid.params = {
        'placementId': '19571282',
        'cpmFactor': 'two'
      }
      expect(spec.isBidRequestValid(clonedBid)).to.equal(false);
    });

    it('should return false when cpmFactor is passed and test flag isn\'t active', function () {
      let clonedBid = Object.assign({}, bid);
      delete clonedBid.params;
      clonedBid.params = {
        'placementId': '19571283',
        'test': false,
        'cpmFactor': 2
      };
      expect(spec.isBidRequestValid(clonedBid)).to.equal(false);
    });

    it('should not allow empty size', function () {
      let clonedBid = Object.assign({}, bid);
      delete clonedBid.sizes;
      expect(spec.isBidRequestValid(clonedBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'uol',
        'params': {
          'placementId': '19571273'
        },
        'adUnitCode': '/uol/unit/code',
        'sizes': [[300, 250]],
        'bidId': '3ddb6ed2d73b45',
        'bidderRequestId': 'd2b12f9d2bad975b7',
        'auctionId': 'eb511c63-df7e-4240-9b65-2f8ae50303e4',
      }, {
        'bidder': 'uol',
        'params': {
          'placementId': '19571274'
        },
        'adUnitCode': '/uol/unit/code2',
        'sizes': [[300, 600], [970, 250]],
        'bidId': '3a3ea8e80a2dc5',
        'bidderRequestId': 'd2b12f9d2bad975b7',
        'auctionId': 'eb511c63-df7e-4240-9b65-2f8ae50303e4',
      }
    ];

    let bidderRequest = {
      'auctionId': 'eb511c63-df7e-4240-9b65-2f8ae50303e4',
      'auctionStart': 1530133180799,
      'bidderCode': 'uol',
      'bidderRequestId': 'd2b12f9d2bad975b7',
      'bids': bidRequests,
      'doneCbCallCount': 1,
      'start': 1530133180801,
      'timeout': 3000
    };

    describe('buildRequest basic params', function () {
      const requestObject = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(requestObject.data);

      it('should send bid requests to expected endpoint via POST method', function () {
        expect(requestObject.url).to.equal(ENDPOINT);
        expect(requestObject.method).to.equal('POST');
      });

      it('should contain referrer URL', function () {
        expect(payload.referrerURL).to.exist.and.to.match(/^http(s)?:\/\/.+$/)
      });

      it('should contain an array of requests with length equivalent to bid count', function () {
        expect(payload.requests).to.have.length(bidRequests.length);
      });
      it('should return propper ad size if at least one entry is provided', function () {
        expect(payload.requests[0].sizes).to.deep.equal(bidRequests[0].sizes);
      });
    });

    if (navigator.permissions && navigator.permissions.query && navigator.geolocation) {
      describe('buildRequest geolocation param', function () { // shall only be tested if browser engine supports geolocation and permissions API.
        let geolocation = { lat: 4, long: 3, timestamp: 123121451 };

        beforeEach(function() {
          getCurrentPositionStub = sandbox.stub(navigator.geolocation, 'getCurrentPosition');
          queryStub = sandbox.stub(navigator.permissions, 'query');
        });

        it('should not contain user coordinates if browser doesnt support permission query', function () {
          localStorage.setItem('uolLocationTracker', JSON.stringify(geolocation));
          navigator.permissions.query = undefined;
          const requestObject = spec.buildRequests(bidRequests, bidderRequest);
          const payload = JSON.parse(requestObject.data);
          expect(payload.geolocation).to.not.exist;
        })

        it('should contain user coordinates if (i) DNT is off; (ii) browser supports implementation; (iii) localStorage contains geolocation history', function (done) {
          localStorage.setItem('uolLocationTracker', JSON.stringify(geolocation));
          queryStub.callsFake(function() {
            return new Promise((resolve, reject) => {
              resolve({state: 'granted'});
            });
          });
          getCurrentPositionStub.callsFake(() => done());
          const requestObject = spec.buildRequests(bidRequests, bidderRequest);
          const payload = JSON.parse(requestObject.data);
          expect(payload.geolocation).to.exist.and.not.be.empty;
        })

        it('should not contain user coordinates if localStorage is empty', function () {
          localStorage.removeItem('uolLocationTracker');
          queryStub.callsFake(function() {
            return new Promise((resolve, reject) => {
              resolve({state: 'prompt'});
            });
          });
          const requestObject = spec.buildRequests(bidRequests, bidderRequest);
          const payload = JSON.parse(requestObject.data);
          expect(payload.geolocation).to.not.exist;
        })
      })
    }
    describe('buildRequest test params', function () {
      it('should return test and cpmFactor params if defined', function () {
        let clonedBid = JSON.parse(JSON.stringify(bidRequests));
        delete clonedBid[0].params;
        clonedBid.splice(1, 1);
        clonedBid[0].params = {
          'placementId': '19571277',
          'test': true
        }
        let requestObject = spec.buildRequests(clonedBid, bidderRequest);
        let payload = JSON.parse(requestObject.data);
        expect(payload.requests[0].customParams.test).to.exist.and.equal(true);
        expect(payload.requests[0].customParams.cpmFactor).to.be.an('undefined');

        delete clonedBid[0].params;
        clonedBid[0].params = {
          'placementId': '19571278',
          'test': true,
          'cpmFactor': 2
        }
        requestObject = spec.buildRequests(clonedBid, bidderRequest);
        payload = JSON.parse(requestObject.data);
        expect(payload.requests[0].customParams.test).to.exist.and.equal(true);
        expect(payload.requests[0].customParams.cpmFactor).to.exist.and.equal(2);
      });
    })
  });

  describe('interpretResponse', function () {
    let serverResponse = {
      'body': {
        'bidderRequestId': '2a21a2fc993ef9',
        'ads': [{
          'currency': 'BRL',
          'creativeId': '12334',
          'cpm': 1.9,
          'ttl': 300,
          'netRevenue': false,
          'ad': '<html></html>',
          'width': 300,
          'height': 250,
          'bidId': '26df49c6447b82',
          'mediaType': 'banner'
        }, {
          'currency': 'BRL',
          'creativeId': '12335',
          'cpm': 1.99,
          'ttl': 300,
          'netRevenue': false,
          'ad': '<html></html>',
          'width': 300,
          'height': 600,
          'bidId': '26df49c6447b82',
          'mediaType': 'banner'
        }]
      },
      'headers': {}
    };
    let bidRequest = {};

    it('should return the correct bid response structure', function () {
      let expectedResponse = [
        {
          'requestId': '2a21a2fc993ef9',
          'cpm': 1.9,
          'width': 300,
          'height': 250,
          'creativeId': '12335',
          'currency': 'BRL',
          'dealId': null,
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 300,
          'ad': '<html></html>'
        }
      ];
      let result = spec.interpretResponse(serverResponse, {bidRequest});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('should corretly return an empty array of bidResponses if no ads were received', function () {
      let emptyResponse = Object.assign({}, serverResponse);
      emptyResponse.body.ads = [];
      let result = spec.interpretResponse(emptyResponse, {bidRequest});
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    let syncOptions = { iframeEnabled: true };
    let serverResponses = [{ body: { trackingPixel: 'https://www.uol.com.br' } }, { body: { trackingPixel: 'https://www.dynad.net/' } }];

    it('should return the two sync params for iframeEnabled bids with a trackingPixel response', function () {
      expect(spec.getUserSyncs(syncOptions, serverResponses)).to.have.length(2);
    })

    it('should not return any sync params if iframe is disabled or no trackingPixel is received', function () {
      let cloneOptions = Object.assign({}, syncOptions);
      delete cloneOptions.iframeEnabled;
      expect(spec.getUserSyncs(cloneOptions, serverResponses)).to.have.length(0);

      let cloneResponses = Object.assign({}, serverResponses);
      delete cloneResponses[0].body.trackingPixel;
      delete cloneResponses[1].body.trackingPixel;
      expect(spec.getUserSyncs(syncOptions, cloneResponses)).to.have.length(0);

      expect(spec.getUserSyncs(cloneOptions, cloneResponses)).to.have.length(0);
    })
  });
});
