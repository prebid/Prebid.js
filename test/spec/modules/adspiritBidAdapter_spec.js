import {expect} from 'chai';
import {spec} from 'modules/adspiritBidAdapter';

describe('Adspirit adapter tests', () => {
  let bidRequests, serverResponses;

  beforeEach(() => {
    bidRequests = [
      // valid for adspirit
      {
        bidder: 'adspirit',
        placementCode: 'ad-1',
        params: {
          placementId: '1',
          host: 'test.adspirit.de'
        },
      },
      // valid for xapadsmedia
      {
        bidder: 'xapadsmedia',
        placementCode: 'ad-1',
        params: {
          placementId: '1'
        },
      },
      // valid for connectad
      {
        bidder: 'connectad',
        placementCode: 'ad-1',
        params: {
          placementId: '1'
        },
      },
      // invalid 1
      {
        bidder: 'adspirit',
        placementCode: 'ad-1',
        params: {
        },
      },
      // invalid 2
      {
        bidder: 'adspirit',
        placementCode: 'ad-1',
        params: {
          host: 'test.adspirit.de'
        },
      },
      // invalid 3
      {
        bidder: '-',
        placementCode: 'ad-1',
        params: {
          host: 'test.adspirit.de'
        },
      }
    ];
    serverResponses = [
      {
        headers: {},
        body: {
          cpm: 1.5,
          w: 300,
          h: 250,
          placement_id: 1,
          adm: '<script type="text/javascript" language="JavaScript">\r\n<!--\r\n\r\n//-->\r\n</script>'
        }
      },
      {
        headers: {},
        body: {
          cpm: 0,
          w: 0,
          h: 0,
          placement_id: 1,
          adm: '<script type="text/javascript" language="JavaScript">\r\n<!--\r\n\r\n//-->\r\n</script>'
        }
      },
      {
        headers: {},
        body: {
          cpm: 0,
          w: 0,
          h: 0,
          placement_id: 0,
          adm: ''
        }
      }
    ]
  });

  describe('test bid request', () => {
    it('with valid data 1', () => {
      expect(spec.isBidRequestValid(bidRequests[0])).to.equal(true);
    });
    it('with valid data 2', () => {
      expect(spec.isBidRequestValid(bidRequests[1])).to.equal(true);
    });
    it('with valid data 3', () => {
      expect(spec.isBidRequestValid(bidRequests[2])).to.equal(true);
    });
    it('with invalid data 1 (no host)', () => {
      expect(spec.isBidRequestValid(bidRequests[3])).to.equal(false);
    });
    it('with invalid data 2 (no placementId)', () => {
      expect(spec.isBidRequestValid(bidRequests[4])).to.equal(false);
    });
    it('with invalid data 3 (no bidder code)', () => {
      expect(spec.isBidRequestValid(bidRequests[5])).to.equal(false);
    });
  });

  describe('test request build', () => {
    it('normal', () => {
      var requests = spec.buildRequests([bidRequests[0]]);
      expect(requests).to.be.lengthOf(1);
    });
  });

  describe('test bid responses', () => {
    it('success 1', () => {
      var bids = spec.interpretResponse(serverResponses[0], {'bidRequest': bidRequests[0]});
      expect(bids).to.be.lengthOf(1);
      expect(bids[0].cpm).to.equal(1.5);
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].ad).to.have.length.above(1);
    });
    it('fail 1 (cpm=0)', () => {
      var bids = spec.interpretResponse(serverResponses[1], {'bidRequest': bidRequests[0]});
      expect(bids).to.be.lengthOf(0);
    });
    it('fail 2 (no response)', () => {
      var bids = spec.interpretResponse([], {'bidRequest': bidRequests[0]});
      expect(bids).to.be.lengthOf(0);
    });
    it('fail 3 (status fail)', () => {
      var bids = spec.interpretResponse(serverResponses[2], {'bidRequest': bidRequests[0]});
      expect(bids).to.be.lengthOf(0);
    });
  });
});
