import { expect } from 'chai';
import { spec } from 'modules/jcmBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const ENDPOINT = 'https://media.adfrontiers.com/';

describe('jcmAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'jcm',
      'params': {
        'siteId': '3608'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'jcm',
        'params': {
          'siteId': '3608'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }

    ];

    const request = spec.buildRequests(bidRequests);

    it('sends bid request to ENDPOINT via GET', function () {
      expect(request.method).to.equal('GET');
    });

    it('sends correct bid parameters', function () {
      const payloadArr = request.data.split('&');
      expect(request.method).to.equal('GET');
      expect(payloadArr.length).to.equal(4);
      expect(payloadArr[0]).to.equal('t=hb');
      expect(payloadArr[1]).to.equal('ver=1.0');
      expect(payloadArr[2]).to.equal('compact=true');
      const adReqStr = request.data.split('&bids=')[1];
      const adReq = JSON.parse(decodeURIComponent(adReqStr));
      const adReqBid = JSON.parse(decodeURIComponent(adReqStr)).bids[0];
      expect(adReqBid.siteId).to.equal('3608');
      expect(adReqBid.callbackId).to.equal('30b31c1838de1e');
      expect(adReqBid.adSizes).to.equal('300x250,300x600');
    });
  });

  describe('interpretResponse', function () {
    it('should get correct bid response', function () {
      let serverResponse = {'bids': [{'width': 300, 'height': 250, 'creativeId': '29681110', 'ad': '<!-- Creative -->', 'cpm': 0.5, 'callbackId': '30b31c1838de1e'}]};

      let expectedResponse = [
        {
          'requestId': '30b31c1838de1e',
          'bidderCode': 'jcm',
          'cpm': 0.5,
          'creativeId': '29681110',
          'width': 300,
          'height': 250,
          'ttl': 60,
          'currency': 'USA',
          'netRevenue': true,
          'ad': '<!-- Creative -->',
        }
      ];

      let result = spec.interpretResponse({ body: serverResponse });
      expect(Object.keys(result[0]).length).to.equal(Object.keys(expectedResponse[0]).length);
      expect(Object.keys(result[0]).requestId).to.equal(Object.keys(expectedResponse[0]).requestId);
      expect(Object.keys(result[0]).bidderCode).to.equal(Object.keys(expectedResponse[0]).bidderCode);
      expect(Object.keys(result[0]).cpm).to.equal(Object.keys(expectedResponse[0]).cpm);
      expect(Object.keys(result[0]).creativeId).to.equal(Object.keys(expectedResponse[0]).creativeId);
      expect(Object.keys(result[0]).width).to.equal(Object.keys(expectedResponse[0]).width);
      expect(Object.keys(result[0]).height).to.equal(Object.keys(expectedResponse[0]).height);
      expect(Object.keys(result[0]).ttl).to.equal(Object.keys(expectedResponse[0]).ttl);
      expect(Object.keys(result[0]).currency).to.equal(Object.keys(expectedResponse[0]).currency);
      expect(Object.keys(result[0]).netRevenue).to.equal(Object.keys(expectedResponse[0]).netRevenue);

      expect(Object.keys(result[0]).ad).to.equal(Object.keys(expectedResponse[0]).ad);
    });

    it('handles nobid responses', function () {
      let serverResponse = {'bids': []};

      let result = spec.interpretResponse({ body: serverResponse });
      expect(result.length).to.equal(0);
    });
  });
  describe('getUserSyncs', function () {
    it('Verifies sync iframe option', function () {
      expect(spec.getUserSyncs({})).to.be.undefined;
      expect(spec.getUserSyncs({ iframeEnabled: false })).to.be.undefined;
      const options = spec.getUserSyncs({ iframeEnabled: true });
      expect(options).to.not.be.undefined;
      expect(options).to.have.lengthOf(1);
      expect(options[0].type).to.equal('iframe');
      expect(options[0].url).to.equal('https://media.adfrontiers.com/hb/jcm_usersync.html');
    });

    it('Verifies sync image option', function () {
      expect(spec.getUserSyncs({ image: false })).to.be.undefined;
      const options = spec.getUserSyncs({ image: true });
      expect(options).to.not.be.undefined;
      expect(options).to.have.lengthOf(1);
      expect(options[0].type).to.equal('image');
      expect(options[0].url).to.equal('https://media.adfrontiers.com/hb/jcm_usersync.png');
    });
  });
});
