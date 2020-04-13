import { expect } from 'chai';
import { spec } from 'modules/envivoBidAdapter.js';

const ENDPOINT = 'https://ad.nvivo.tv/ads/www/admin/plugins/Prebid/getAd.php';

describe('The Envivo bidding adapter', function () {
  describe('isBidRequestValid', function () {
    it('should return false when given an invalid bid', function () {
      const bid = {
        bidder: 'envivo',
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(false);
    });

    it('should return true when given a publisherId in bid', function () {
      const bid = {
        bidder: 'envivo',
        params: {
          publisherId: 14
        },
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [{
      'bidder': 'envivo',
      'params': {
        'publisherId': 14
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250],
        [300, 600]
      ]
    }];

    const request = spec.buildRequests(bidRequests);

    it('sends bid request to our endpoint via POST', function () {
      expect(request.method).to.equal('POST');
    });

    it('check endpoint url', function () {
      expect(request.url).to.equal(ENDPOINT)
    });

    it('sets the proper banner object', function () {
      expect(bidRequests[0].params.publisherId).to.equal(14);
    })
  });
  const response = {
    body: [
      {
        'requestId': '2ee937f15015c6',
        'cpm': '0.2000',
        'width': 300,
        'height': 600,
        'creativeId': '4',
        'currency': 'USD',
        'netRevenue': true,
        'ad': 'ads.html',
        'mediaType': 'banner'
      },
      {
        'requestId': '3e1af92622bdc',
        'cpm': '0.2000',
        'creativeId': '4',
        'context': 'outstream',
        'currency': 'USD',
        'netRevenue': true,
        'vastUrl': 'tezt.xml',
        'width': 640,
        'height': 480,
        'mediaType': 'video'
      }]
  };

  const request = [
    {
      'bidder': 'envivo',
      'params': {
        'publisherId': 14
      },
      'mediaTypes': {
        'banner': {
          'sizes': [
            [300, 600]
          ]
        }
      },
      'bidId': '2ee937f15015c6',
      'src': 'client',
    },
    {
      'bidder': 'envivo',
      'params': {
        'publisherId': 14
      },
      'mediaTypes': {
        'video': {
          'context': 'outstream',
          'playerSize': [
            [640, 480]
          ]
        }
      },
      'bidId': '3e1af92622bdc',
      'src': 'client',
    }
  ];

  describe('interpretResponse', function () {
    it('return empty array when no ad found', function () {
      const response = {};
      const request = { bidRequests: [] };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(0);
    });

    it('check response for banner and video', function () {
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(2);
      expect(bids[0].requestId).to.equal('2ee937f15015c6');
      expect(bids[0].cpm).to.equal('0.2000');
      expect(bids[1].cpm).to.equal('0.2000');
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(600);
      expect(bids[1].vastUrl).to.not.equal('');
      expect(bids[0].ad).to.not.equal('');
      expect(bids[1].adResponse).to.not.equal('');
      expect(bids[1].renderer).not.to.be.an('undefined');
    });
  });

  describe('On winning bid', function () {
    const bids = spec.interpretResponse(response, request);
    spec.onBidWon(bids);
  });

  describe('On bid Time out', function () {
    const bids = spec.interpretResponse(response, request);
    spec.onTimeout(bids);
  });

  describe('user sync', function () {
    it('to check the user sync iframe', function () {
      let syncs = spec.getUserSyncs({
        iframeEnabled: true
      });
      expect(syncs).to.not.be.an('undefined');
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
    });
  });
});
