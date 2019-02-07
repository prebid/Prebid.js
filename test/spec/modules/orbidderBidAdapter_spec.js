import {expect} from 'chai';
import {spec} from 'modules/orbidderBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';

describe('orbidderBidAdapter', () => {
  const adapter = newBidder(spec);
  const defaultBidRequest = {
    bidId: 'd66fa86787e0b0ca900a96eacfd5f0bb',
    auctionId: 'ccc4c7cdfe11cfbd74065e6dd28413d8',
    transactionId: 'd58851660c0c4461e4aa06344fc9c0c6',
    adUnitCode: 'adunit-code',
    sizes: [[300, 250], [300, 600]],
    params: {
      'accountId': 'string1',
      'placementId': 'string2'
    }
  };

  const deepClone = function (val) {
    return JSON.parse(JSON.stringify(val));
  };

  const buildRequest = function (buildRequest) {
    return spec.buildRequests(
      [buildRequest],
      {
        refererInfo: {
          referer: 'http://localhost:9876/'
        }
      })[0];
  };

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(defaultBidRequest)).to.equal(true);
    });

    it('accepts optional keyValues object', () => {
      const bidRequest = deepClone(defaultBidRequest);
      bidRequest.params.keyValues = {'key': 'value'};
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('performs type checking', () => {
      const bidRequest = deepClone(defaultBidRequest);
      bidRequest.params.accountId = 1; // supposed to be a string
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('doesn\'t accept malformed keyValues', () => {
      const bidRequest = deepClone(defaultBidRequest);
      bidRequest.params.keyValues = 'another not usable string';
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when required params are not passed', () => {
      const bidRequest = deepClone(defaultBidRequest);
      delete bidRequest.params;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    const request = buildRequest(defaultBidRequest);

    it('sends bid request to endpoint via https using post', () => {
      expect(request.method).to.equal('POST');
      expect(request.url.indexOf('https://')).to.equal(0);
      expect(request.url).to.equal(`${spec.orbidderHost}/bid`);
    });

    it('sends correct bid parameters', () => {
      // we add one, because we add referer information from bidderRequest object
      expect(Object.keys(request.data).length).to.equal(Object.keys(defaultBidRequest).length + 1);
      expect(request.data.pageUrl).to.equal('http://localhost:9876/');
      // expect(request.data.referrer).to.equal('');
      Object.keys(defaultBidRequest).forEach((key) => {
        expect(defaultBidRequest[key]).to.equal(request.data[key]);
      });
    });

    it('handles empty gdpr object', () => {
      const bidRequest = deepClone(defaultBidRequest);
      bidRequest.gdprConsent = {};

      const request = buildRequest(bidRequest);
      expect(request.data.gdprConsent.consentRequired).to.be.equal(true);
    });

    it('handles non-existent gdpr object', () => {
      const bidRequest = deepClone(defaultBidRequest);
      bidRequest.gdprConsent = null;

      const request = buildRequest(bidRequest);
      expect(request.data.gdprConsent).to.be.undefined;
    });

    it('handles properly filled gdpr object where gdpr applies', () => {
      const consentString = 'someWeirdString';
      const bidRequest = deepClone(defaultBidRequest);
      bidRequest.gdprConsent = {
        gdprApplies: true,
        consentString: 'someWeirdString'
      };

      const request = buildRequest(bidRequest);
      const gdprConsent = request.data.gdprConsent;
      expect(gdprConsent.consentRequired).to.be.equal(true);
      expect(gdprConsent.consentString).to.be.equal(consentString);
    });

    it('handles properly filled gdpr object where gdpr does not apply', () => {
      const consentString = 'someWeirdString';
      const bidRequest = deepClone(defaultBidRequest);
      bidRequest.gdprConsent = {
        gdprApplies: false,
        consentString: 'someWeirdString'
      };

      const request = buildRequest(bidRequest);
      const gdprConsent = request.data.gdprConsent;
      expect(gdprConsent.consentRequired).to.be.equal(false);
      expect(gdprConsent.consentString).to.be.equal(consentString);
    });
  });

  describe('onBidWon', () => {
    let ajaxStub;
    const winObj = {
      adId: 'testId',
      test: 1,
      pageUrl: 'www.someurl.de',
      referrer: 'www.somereferrer.de'
    };

    beforeEach(() => {
      ajaxStub = sinon.stub(spec, 'ajaxCall');
    });

    afterEach(() => {
      ajaxStub.restore();
    });

    it('calls orbidder\'s win endpoint', () => {
      spec.onBidWon(winObj);
      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0].indexOf('https://')).to.equal(0);
      expect(ajaxStub.firstCall.args[0]).to.equal(`${spec.orbidderHost}/win`);
      expect(ajaxStub.firstCall.args[1]).to.equal(JSON.stringify(winObj));
    });
  });

  describe('interpretResponse', () => {
    it('should get correct bid response', () => {
      const serverResponse = [
        {
          'width': 300,
          'height': 250,
          'creativeId': '29681110',
          'ad': '<!-- Creative -->',
          'cpm': 0.5,
          'requestId': '30b31c1838de1e',
          'ttl': 60,
          'netRevenue': true,
          'currency': 'EUR'
        }
      ];

      const expectedResponse = [
        {
          'requestId': '30b31c1838de1e',
          'cpm': 0.5,
          'creativeId': '29681110',
          'width': 300,
          'height': 250,
          'ttl': 60,
          'currency': 'EUR',
          'ad': '<!-- Creative -->',
          'netRevenue': true
        }
      ];

      const result = spec.interpretResponse({body: serverResponse});

      expect(result.length).to.equal(expectedResponse.length);
      Object.keys(expectedResponse[0]).forEach((key) => {
        expect(result[0][key]).to.equal(expectedResponse[0][key]);
      });
    });

    it('handles broken server response', () => {
      const serverResponse = [
        {
          'ad': '<!-- Creative -->',
          'cpm': 0.5,
          'requestId': '30b31c1838de1e',
          'ttl': 60
        }
      ];
      const result = spec.interpretResponse({body: serverResponse});

      expect(result.length).to.equal(0);
    });

    it('handles nobid responses', () => {
      const serverResponse = [];
      const result = spec.interpretResponse({body: serverResponse});

      expect(result.length).to.equal(0);
    });
  });
});
