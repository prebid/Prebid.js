import { expect } from 'chai';
import { spec } from 'modules/my6senseBidAdapter.js';

describe('My6sense Bid adapter test', function () {
  let bidRequests, serverResponses;
  beforeEach(function () {
    bidRequests = [
      {
        // valid 1
        bidder: 'my6sense',
        params: {
          key: 'DTAeOJN67pCjY36dbhrM3G',
          dataVersion: 3,
          pageUrl: 'liran.com',
          zone: '[ZONE]',
          dataParams: '',
          dataView: '',
          organicClicks: '',
          paidClicks: ''
        }
      },
      {
        // invalid 2- no params
        bidder: 'my6sense'
      },
      {
        // invalid 3 - no key in params
        bidder: 'my6sense',
        params: {
          dataVersion: 3,
          pageUrl: 'liran.com',
          zone: '[ZONE]',
          dataParams: '',
          dataView: '',
          organicClicks: '',
          paidClicks: ''
        }
      },
      {
        // invalid 3 - wrong bidder name
        bidder: 'test',
        params: {
          key: 'ZxA0bNhlO9tf5EZ1Q9ZYdS',
          dataVersion: 3,
          pageUrl: 'liran.com',
          zone: '[ZONE]',
          dataParams: '',
          dataView: '',
          organicClicks: '',
          paidClicks: ''
        }
      }
    ];
    serverResponses = [
      {
        headers: {},
        body: {
          cpm: 1.5,
          width: 300,
          height: 250,
          placement_id: 1,
          adm: '<script type="text/javascript" language="JavaScript">\r\n<!--\r\n\r\n//-->\r\n</script>'
        }
      },
      {
        headers: {},
        body: {
          cpm: 0,
          width: 0,
          height: 0,
          placement_id: 1,
          adm: '<script type="text/javascript" language="JavaScript">\r\n<!--\r\n\r\n//-->\r\n</script>'
        }
      },
      {
        headers: {},
        body: {
          cpm: 0,
          width: 0,
          height: 0,
          placement_id: 0,
          adm: ''
        }
      },
      {
        headers: {},
        body: {
          cpm: 5,
          creativeId: '5b29f5d1e4b086e3ee8de36b',
          currency: 'USD',
          height: 250,
          netRevenue: false,
          requestId: '2954a0957643bb',
          ttl: 360,
          width: 300,
          adm: '<script type="text/javascript" language="JavaScript">\r\n<!--\r\n\r\n//-->\r\n</script>'
        }
      }
    ]
  });

  describe('test if requestIsValid function', function () {
    it('with valid data 1', function () {
      expect(spec.isBidRequestValid(bidRequests[0])).to.equal(true);
    });
    it('with invalid data 2', function () {
      expect(spec.isBidRequestValid(bidRequests[1])).to.equal(false);
    });
    it('with invalid data 3', function () {
      expect(spec.isBidRequestValid(bidRequests[2])).to.equal(false);
    });
    it('with invalid data 3', function () {
      expect(spec.isBidRequestValid(bidRequests[3])).to.equal(false);
    });
  });

  describe('test if buildRequests function', function () {
    it('normal', function () {
      var requests = spec.buildRequests([bidRequests[0]]);
      expect(requests).to.be.lengthOf(1);
    });
  });
  describe('test bid responses', function () {
    it('success 1', function () {
      var bids = spec.interpretResponse(serverResponses[0], {'bidRequest': bidRequests[0]});
      expect(bids).to.be.lengthOf(1);
      expect(bids[0].cpm).to.equal(1.5);
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].adm).to.have.length.above(1);
    });
    it('success 2', function () {
      var bids = spec.interpretResponse(serverResponses[3]);
      expect(bids).to.be.lengthOf(1);
      expect(bids[0].cpm).to.equal(5);
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].netRevenue).to.equal(false);
      expect(bids[0].ttl).to.equal(360);
      expect(bids[0].currency).to.equal('USD');
    });
    it('fail 1 (cpm=0)', function () {
      var bids = spec.interpretResponse(serverResponses[1]);
      expect(bids).to.be.lengthOf(1);
    });
    it('fail 2 (no response)', function () {
      var bids = spec.interpretResponse([]);
      expect(bids).to.be.lengthOf(0);
    });
  });
});
