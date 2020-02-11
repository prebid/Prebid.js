import { spec } from 'modules/onetagBidAdapter';
import { expect } from 'chai';

describe('onetag', () => {
  let bid = {
    'bidder': 'onetag',
    'params': {
      'pubId': '386276e072',
    },
    'adUnitCode': 'adunit-code',
    'sizes': [[300, 250]],
    'bidId': '30b31c1838de1e',
    'bidderRequestId': '22edbae2733bf6',
    'auctionId': '1d1a030790a475',
    'transactionId': 'qwerty123'
  };

  describe('isBidRequestValid', () => {
    it('Should return true when required params are found', () => {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('Should return false when pubId is not a string', () => {
      bid.params.pubId = 30;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('Should return false when pubId is undefined', () => {
      bid.params.pubId = undefined;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('Should return false when the sizes array is empty', () => {
      bid.sizes = [];
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', () => {
    let serverRequest = spec.buildRequests([bid]);
    it('Creates a ServerRequest object with method, URL and data', () => {
      expect(serverRequest).to.exist;
      expect(serverRequest.method).to.exist;
      expect(serverRequest.url).to.exist;
      expect(serverRequest.data).to.exist;
    });
    it('Returns POST method', () => {
      expect(serverRequest.method).to.equal('POST');
    });
    it('Returns valid URL', () => {
      expect(serverRequest.url).to.equal('https://onetag-sys.com/prebid-request');
    });

    const d = serverRequest.data;
    try {
      const data = JSON.parse(d);
      it('Should contains all keys', () => {
        expect(data).to.be.an('object');
        expect(data).to.have.all.keys('location', 'masked', 'referrer', 'sHeight', 'sWidth', 'timeOffset', 'date', 'wHeight', 'wWidth', 'bids');
        expect(data.location).to.be.a('string');
        expect(data.masked).to.be.a('number');
        expect(data.referrer).to.be.a('string');
        expect(data.sHeight).to.be.a('number');
        expect(data.sWidth).to.be.a('number');
        expect(data.wWidth).to.be.a('number');
        expect(data.wHeight).to.be.a('number');
        expect(data.timeOffset).to.be.a('number');
        expect(data.date).to.be.a('string');
        expect(data.bids).to.be.an('array');

        const bids = data['bids'];
        for (let i = 0; i < bids.length; i++) {
          const bid = bids[i];
          expect(bid).to.have.all.keys('adUnitCode', 'auctionId', 'bidId', 'bidderRequestId', 'pubId', 'transactionId', 'sizes');
          expect(bid.bidId).to.be.a('string');
          expect(bid.pubId).to.be.a('string');
        }
      });
    } catch (e) {
      console.log('Error while parsing');
    }
    it('Returns empty data if no valid requests are passed', () => {
      serverRequest = spec.buildRequests([]);
      let dataString = serverRequest.data;
      try {
        let dataObj = JSON.parse(dataString);
        expect(dataObj.bids).to.be.an('array').that.is.empty;
      } catch (e) {
        console.log('Error while parsing');
      }
    });
    it('should send GDPR consent data', () => {
      let consentString = 'consentString';
      let bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          consentString: consentString,
          gdprApplies: true
        }
      };
      let serverRequest = spec.buildRequests([bid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);

      expect(payload).to.exist;
      expect(payload.gdprConsent).to.exist;
      expect(payload.gdprConsent.consentString).to.exist.and.to.equal(consentString);
      expect(payload.gdprConsent.consentRequired).to.exist.and.to.be.true;
    });
  });
  describe('interpretResponse', () => {
    const resObject = {
      body: {
        nobid: false,
        bids: [{
          ad: '<div>Advertising</div>',
          cpm: 13,
          width: 300,
          height: 250,
          creativeId: '1820',
          dealId: 'dishfo',
          currency: 'USD',
          requestId: 'sdiceobxcw'
        }]
      }
    };
    it('Returns an array of valid server responses if response object is valid', () => {
      const serverResponses = spec.interpretResponse(resObject);

      expect(serverResponses).to.be.an('array').that.is.not.empty;
      for (let i = 0; i < serverResponses.length; i++) {
        let dataItem = serverResponses[i];
        expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId', 'netRevenue', 'currency', 'mediaType', 'dealId');
        expect(dataItem.requestId).to.be.a('string');
        expect(dataItem.cpm).to.be.a('number');
        expect(dataItem.width).to.be.a('number');
        expect(dataItem.height).to.be.a('number');
        expect(dataItem.ad).to.be.a('string');
        expect(dataItem.ttl).to.be.a('number');
        expect(dataItem.creativeId).to.be.a('string');
        expect(dataItem.netRevenue).to.be.a('boolean');
        expect(dataItem.currency).to.be.a('string');
      }
      it('Returns an empty array if invalid response is passed', () => {
        const serverResponses = spec.interpretResponse('invalid_response');
        expect(serverResponses).to.be.an('array').that.is.empty;
      });
    });
  });
});
