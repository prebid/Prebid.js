import { expect } from 'chai';
import { spec } from 'modules/consumableBidAdapter';

var bidFactory = require('src/bidfactory.js');

const ENDPOINT = 'https://e.serverbid.com/api/v2';
const SMARTSYNC_CALLBACK = 'serverbidCallBids';

const REQUEST = {
  'bidderCode': 'consumable',
  'auctionId': 'a4713c32-3762-4798-b342-4ab810ca770d',
  'bidderRequestId': '109f2a181342a9',
  'bidRequest': [{
    'bidder': 'consumable',
    'params': {
      'networkId': 9969,
      'siteId': 730181,
      'unitId': 123456,
      'unitName': 'cnsmbl-unit'
    },
    'placementCode': 'div-gpt-ad-1487778092495-0',
    'sizes': [
      [728, 90],
      [970, 90]
    ],
    'bidId': '2b0f82502298c9',
    'bidderRequestId': '109f2a181342a9',
    'auctionId': 'a4713c32-3762-4798-b342-4ab810ca770d'
  },
  {
    'bidder': 'consumable',
    'params': {
      'networkId': 9969,
      'siteId': 730181,
      'unitId': 123456,
      'unitName': 'cnsmbl-unit'
    },
    'placementCode': 'div-gpt-ad-1487778092495-0',
    'sizes': [
      [728, 90],
      [970, 90]
    ],
    'bidId': '123',
    'bidderRequestId': '109f2a181342a9',
    'auctionId': 'a4713c32-3762-4798-b342-4ab810ca770d'
  }],
  'start': 1487883186070,
  'auctionStart': 1487883186069,
  'timeout': 3000
};

const RESPONSE = {
  'headers': null,
  'body': {
    'user': { 'key': 'ue1-2d33e91b71e74929b4aeecc23f4376f1' },
    'decisions': {
      '2b0f82502298c9': {
        'adId': 2364764,
        'creativeId': 1950991,
        'flightId': 2788300,
        'campaignId': 542982,
        'clickUrl': 'https://e.serverbid.com/r',
        'impressionUrl': 'https://e.serverbid.com/i.gif',
        'contents': [{
          'type': 'html',
          'body': '<html></html>',
          'data': {
            'height': 90,
            'width': 728,
            'imageUrl': 'https://static.adzerk.net/Advertisers/b0ab77db8a7848c8b78931aed022a5ef.gif',
            'fileName': 'b0ab77db8a7848c8b78931aed022a5ef.gif'
          },
          'template': 'image'
        }],
        'height': 90,
        'width': 728,
        'events': [],
        'pricing': {'price': 0.5, 'clearPrice': 0.5, 'revenue': 0.0005, 'rateType': 2, 'eCPM': 0.5}
      },
      '123': {
        'adId': 2364764,
        'creativeId': 1950991,
        'flightId': 2788300,
        'campaignId': 542982,
        'clickUrl': 'https://e.serverbid.com/r',
        'impressionUrl': 'https://e.serverbid.com/i.gif',
        'contents': [{
          'type': 'html',
          'body': '<html></html>',
          'data': {
            'height': 90,
            'width': 728,
            'imageUrl': 'https://static.adzerk.net/Advertisers/b0ab77db8a7848c8b78931aed022a5ef.gif',
            'fileName': 'b0ab77db8a7848c8b78931aed022a5ef.gif'
          },
          'template': 'image'
        }],
        'height': 90,
        'width': 728,
        'events': [],
        'pricing': {'price': 0.5, 'clearPrice': 0.5, 'revenue': 0.0005, 'rateType': 2, 'eCPM': 0.5}
      }
    }
  }
};

describe('Consumable BidAdapter', function () {
  let bidRequests;
  let adapter = spec;

  beforeEach(function () {
    bidRequests = [
      {
        bidder: 'consumable',
        params: {
          networkId: '9969',
          siteId: '730181',
          unitId: '123456',
          unitName: 'cnsmbl-unit'
        },
        placementCode: 'header-bid-tag-1',
        sizes: [[300, 250], [300, 600]],
        bidId: '23acc48ad47af5',
        auctionId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
      }
    ];
  });

  describe('bid request validation', function () {
    it('should accept valid bid requests', function () {
      let bid = {
        bidder: 'consumable',
        params: {
          networkId: '9969',
          siteId: '123',
          unitId: '123456',
          unitName: 'cnsmbl-unit'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should accept valid bid requests with extra fields', function () {
      let bid = {
        bidder: 'consumable',
        params: {
          networkId: '9969',
          siteId: '123',
          unitId: '123456',
          unitName: 'cnsmbl-unit',
          zoneId: '123'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should reject bid requests without siteId', function () {
      let bid = {
        bidder: 'consumable',
        params: {
          networkId: '9969',
          unitId: '123456',
          unitName: 'cnsmbl-unit'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should reject bid requests without networkId', function () {
      let bid = {
        bidder: 'consumable',
        params: {
          siteId: '9969',
          unitId: '123456',
          unitName: 'cnsmbl-unit'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests validation', function () {
    it('creates request data', function () {
      let request = spec.buildRequests(bidRequests);

      expect(request).to.exist.and.to.be.a('object');
    });

    it('request to consumable should contain a url', function () {
      let request = spec.buildRequests(bidRequests);

      expect(request.url).to.have.string('serverbid.com');
    });

    it('requires valid bids to make request', function () {
      let request = spec.buildRequests([]);
      expect(request.bidRequest).to.be.empty;
    });

    it('sends bid request to ENDPOINT via POST', function () {
      let request = spec.buildRequests(bidRequests);

      expect(request.method).to.have.string('POST');
    });
  });
  describe('interpretResponse validation', function () {
    it('response should have valid bidderCode', function () {
      let bidRequest = spec.buildRequests(REQUEST.bidRequest);
      let bid = bidFactory.createBid(1, bidRequest.bidRequest[0]);

      expect(bid.bidderCode).to.equal('consumable');
    });

    it('response should include objects for all bids', function () {
      let bids = spec.interpretResponse(RESPONSE, REQUEST);
      expect(bids.length).to.equal(2);
    });

    it('registers bids', function () {
      let bids = spec.interpretResponse(RESPONSE, REQUEST);
      bids.forEach(b => {
        expect(b).to.have.property('cpm');
        expect(b.cpm).to.be.above(0);
        expect(b).to.have.property('requestId');
        expect(b).to.have.property('unitId');
        expect(b).to.have.property('unitName');
        expect(b).to.have.property('cpm');
        expect(b).to.have.property('width');
        expect(b).to.have.property('height');
        expect(b).to.have.property('ad');
        expect(b).to.have.property('currency', 'USD');
        expect(b).to.have.property('creativeId');
        expect(b).to.have.property('ttl', 360);
        expect(b).to.have.property('netRevenue', true);
        expect(b).to.have.property('referrer');
      });
    });

    it('handles nobid responses', function () {
      let EMPTY_RESP = Object.assign({}, RESPONSE, {'body': {'decisions': null}})
      let bids = spec.interpretResponse(EMPTY_RESP, REQUEST);

      expect(bids).to.be.empty;
    });

    it('handles no server response', function () {
      let bids = spec.interpretResponse(null, REQUEST);

      expect(bids).to.be.empty;
    });
  });
  describe('getUserSyncs', function () {
    let syncOptions = {'iframeEnabled': true};

    it('handles empty sync options', function () {
      let opts = spec.getUserSyncs({});

      expect(opts).to.be.empty;
    });

    it('should return a sync url if iframe syncs are enabled', function () {
      let opts = spec.getUserSyncs(syncOptions);

      expect(opts.length).to.equal(1);
    });
  });
});
