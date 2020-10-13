import {expect} from 'chai';
import {spec} from 'modules/clicktripzBidAdapter.js';

const ENDPOINT_URL = 'https://www.clicktripz.com/x/prebid/v1';

describe('clicktripzBidAdapter', function () {
  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'clicktripz',
      'params': {
        placementId: 'testPlacementId',
        siteId: 'testSiteId'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250]
      ],
      'bidId': '1234asdf1234',
      'bidderRequestId': '1234asdf1234asdf',
      'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf120'
    };

    let bid2 = {
      'bidder': 'clicktripz',
      'params': {
        placementId: 'testPlacementId'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250]
      ],
      'bidId': '1234asdf1234',
      'bidderRequestId': '1234asdf1234asdf',
      'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf120'
    };

    let bid3 = {
      'bidder': 'clicktripz',
      'params': {
        siteId: 'testSiteId'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250]
      ],
      'bidId': '1234asdf1234',
      'bidderRequestId': '1234asdf1234asdf',
      'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf120'
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are NOT found', function () {
      expect(spec.isBidRequestValid(bid2)).to.equal(false);
      expect(spec.isBidRequestValid(bid3)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let validBidRequests = [{
      'bidder': 'clicktripz',
      'params': {
        placementId: 'testPlacementId',
        siteId: 'testSiteId'
      },
      'sizes': [
        [300, 250],
        [300, 300]
      ],
      'bidId': '23beaa6af6cdde',
      'bidderRequestId': '19c0c1efdf37e7',
      'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
    }, {
      'bidder': 'clicktripz',
      'params': {
        placementId: 'testPlacementId2',
        siteId: 'testSiteId2'
      },
      'sizes': [
        [300, 250]
      ],
      'bidId': '25beaa6af6cdde',
      'bidderRequestId': '19c0c1efdf37e7',
      'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
    }];

    const request = spec.buildRequests(validBidRequests);
    it('sends bid request to our endpoint via POST', function () {
      expect(request.method).to.equal('POST');
    });
    it('sends bid request to our endpoint via POST', function () {
      expect(request.method).to.equal('POST');
    });

    it('sends bid request to our endpoint at the correct URL', function () {
      expect(request.url).to.equal(ENDPOINT_URL);
    });
    it('sends bid request to our endpoint at the correct URL', function () {
      expect(request.url).to.equal(ENDPOINT_URL);
    });

    it('transforms sizes into an array of strings. Pairs of concatenated sizes joined with an x', function () {
      expect(request.data[0].sizes.toString()).to.equal('300x250,300x300');
    });
    it('transforms sizes into an array of strings. Pairs of concatenated sizes joined with an x', function () {
      expect(request.data[1].sizes.toString()).to.equal('300x250');
    });

    it('includes bidId, siteId, and placementId in payload', function () {
      expect(request.data[0].bidId).to.equal('23beaa6af6cdde');
      expect(request.data[0].siteId).to.equal('testSiteId');
      expect(request.data[0].placementId).to.equal('testPlacementId');
    });
    it('includes bidId, siteId, and placementId in payload', function () {
      expect(request.data[1].bidId).to.equal('25beaa6af6cdde');
      expect(request.data[1].siteId).to.equal('testSiteId2');
      expect(request.data[1].placementId).to.equal('testPlacementId2');
    });
  });

  describe('interpretResponse', function () {
    let serverResponse = {
      body: [{
        'bidId': 'bid-request-id',
        'ttl': 120,
        'netRevenue': true,
        'size': '300x200',
        'currency': 'USD',
        'adUrl': 'https://www.clicktripz.com/n3/crane/v0/render?t=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJwYXlsb2FkIjoiaHR0cHM6XC9cL3d3dy5jbGlja3RyaXB6LmNvbVwvY2xpY2sucGhwP2NhbXBhaWduSUQ9MTkxNTYmcHJlQ2hlY2tlZD0xJnB1Ymxpc2hlcklEPTM2MCZzZWFyY2hLZXk9N2M5MzQ0NzhlM2M1NTc3Y2EyN2ZmN2Y1NTg5N2NkMzkmc2VhcmNoRGlzcGxheVR5cGU9MSZkaXNwbGF5VHlwZT00JmNyZWF0aXZlVHlwZT1zaW5nbGUmaXNQb3BVbmRlcj0wJnBvc2l0aW9uPTEmdHlwZT0xJmNpdHk9TWFkcmlkJTJDK1NwYWluJmNoZWNrSW5EYXRlPTAzJTJGMDElMkYyMDIwJmNoZWNrT3V0RGF0ZT0wMyUyRjA1JTJGMjAyMCZndWVzdHM9MiZyb29tcz0xIn0.WBDGYr1qfkSvOuK02VpMW3iAua1E02jjDGDViFc2kaE',
        'creativeId': '25ef9876abc5681f153',
        'cpm': 50
      }]
    };
    it('should get the correct bid response', function () {
      let expectedResponse = [{
        'requestId': 'bid-request-id',
        'cpm': 50,
        'netRevenue': true,
        'width': '300',
        'height': '200',
        'creativeId': '25ef9876abc5681f153',
        'currency': 'USD',
        'adUrl': 'https://www.clicktripz.com/n3/crane/v0/render?t=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJwYXlsb2FkIjoiaHR0cHM6XC9cL3d3dy5jbGlja3RyaXB6LmNvbVwvY2xpY2sucGhwP2NhbXBhaWduSUQ9MTkxNTYmcHJlQ2hlY2tlZD0xJnB1Ymxpc2hlcklEPTM2MCZzZWFyY2hLZXk9N2M5MzQ0NzhlM2M1NTc3Y2EyN2ZmN2Y1NTg5N2NkMzkmc2VhcmNoRGlzcGxheVR5cGU9MSZkaXNwbGF5VHlwZT00JmNyZWF0aXZlVHlwZT1zaW5nbGUmaXNQb3BVbmRlcj0wJnBvc2l0aW9uPTEmdHlwZT0xJmNpdHk9TWFkcmlkJTJDK1NwYWluJmNoZWNrSW5EYXRlPTAzJTJGMDElMkYyMDIwJmNoZWNrT3V0RGF0ZT0wMyUyRjA1JTJGMjAyMCZndWVzdHM9MiZyb29tcz0xIn0.WBDGYr1qfkSvOuK02VpMW3iAua1E02jjDGDViFc2kaE',
        'ttl': 120
      }];
      let result = spec.interpretResponse(serverResponse);
      expect(result).to.deep.equal(expectedResponse);
    });
  });
});
