import { expect } from 'chai';
import { spec } from 'modules/colombiaBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import * as ajaxLib from 'src/ajax.js';

const HOST_NAME = document.location.protocol + '//' + window.location.host;
const ENDPOINT = 'https://ade.clmbtech.com/cde/prebid.htm';

describe('colombiaBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    const bid = {
      'bidder': 'colombia',
      'params': {
        placementId: '307466'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250]
      ],
      'bidId': '23beaa6af6cdde',
      'bidderRequestId': '19c0c1efdf37e7',
      'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when placementId not passed correctly', function () {
      bid.params.placementId = '';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when require params are not passed', function () {
      const invalidBid = Object.assign({}, bid);
      invalidBid.params = {};
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        'bidder': 'colombia',
        'params': {
          placementId: '307466'
        },
        'adUnitCode': 'adunit-code1',
        'sizes': [
          [300, 250]
        ],
        'bidId': '23beaa6af6cdde',
        'bidderRequestId': '19c0c1efdf37e7',
        'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
      },
      {
        'bidder': 'colombia',
        'params': {
          placementId: '307466'
        },
        'adUnitCode': 'adunit-code2',
        'sizes': [
          [300, 250]
        ],
        'bidId': '382091349b149f"',
        'bidderRequestId': '"1f9c98192de2511"',
        'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
      }
    ];
    const bidderRequest = {
      refererInfo: {
        numIframes: 0,
        reachedTop: true,
        referer: 'http://example.com',
        stack: ['http://example.com']
      }
    };

    const request = spec.buildRequests(bidRequests);
    it('sends bid request to our endpoint via POST', function () {
      expect(request[0].method).to.equal('POST');
    });

    it('attaches source and version to endpoint URL as query params', function () {
      expect(request[0].url).to.equal(ENDPOINT);
    });
  });

  describe('interpretResponse', function () {
    const bidRequest = [
      {
        'method': 'POST',
        'url': 'https://ade.clmbtech.com/cde/prebid.htm',
        'data': {
          'v': 'hb1',
          'p': '307466',
          'w': '300',
          'h': '250',
          'cb': 12892917383,
          'r': 'http%3A%2F%2Flocalhost%3A9876%2F%3Fid%3D74552836',
          'uid': '23beaa6af6cdde',
          't': 'i',
        }
      }
    ];

    const serverResponse = [{
      'ad': '<div>This is test case for colombia adapter</div> ',
      'cpm': 3.14,
      'creativeId': '6b958110-612c-4b03-b6a9-7436c9f746dc-1sk24',
      'currency': 'USD',
      'requestId': '23beaa6af6cdde',
      'width': 728,
      'height': 90,
      'netRevenue': true,
      'ttl': 600,
      'dealid': '',
      'referrer': 'http%3A%2F%2Flocalhost%3A9876%2F%3Fid%3D74552836'
    }];

    it('should get the correct bid response', function () {
      const expectedResponse = [{
        'requestId': '23beaa6af6cdde',
        'cpm': 3.14,
        'width': 728,
        'height': 90,
        'creativeId': '6b958110-612c-4b03-b6a9-7436c9f746dc-1sk24',
        'dealId': '',
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'referrer': 'http%3A%2F%2Flocalhost%3A9876%2F%3Fid%3D74552836',
        'ad': '<div>This is test case for colombia adapter</div>'
      }];
      const result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });

    it('handles empty bid response', function () {
      const response = {
        body: {
          'uid': '23beaa6af6cdde',
          'height': 0,
          'creativeId': '',
          'statusMessage': 'Bid returned empty or error response',
          'width': 0,
          'cpm': 0
        }
      };
      const result = spec.interpretResponse(response, bidRequest[0]);
      expect(result.length).to.equal(0);
    });
  });
  describe('onBidWon', function () {
    let ajaxStub;
    beforeEach(() => {
      ajaxStub = sinon.stub(ajaxLib, 'ajax');
    });

    afterEach(() => {
      ajaxStub.restore();
    });

    it('should call ajax with correct URL and encoded evtData when event 500 is present', function () {
      const bid = {
        eventTrackers: [{
          event: 500,
          method: 500,
          url: 'https://ade.clmbtech.com/cde/bidNotify.htm'
        }],
        ext: {
          evtData: 'd_1_%7B%22iId%22%3A%22abc123-impr-id%22%2C%22aId%22%3A%22ad5678%22%2C%22ci%22%3A%22call-id-789%22%2C%22fpc%22%3A%22some-fpc-value%22%2C%22prebid%22%3A1%7D'
        }
      };
      spec.onBidWon(bid);
      expect(ajaxStub.calledOnce).to.be.true;
      const [url, , data, options] = ajaxStub.firstCall.args;
      expect(url).to.equal('https://ade.clmbtech.com/cde/bidNotify.htm');
      const parsedPayload = JSON.parse(data);
      expect(parsedPayload).to.deep.equal({
        bidNotifyType: 1,
        evt: 'd_1_%7B%22iId%22%3A%22abc123-impr-id%22%2C%22aId%22%3A%22ad5678%22%2C%22ci%22%3A%22call-id-789%22%2C%22fpc%22%3A%22some-fpc-value%22%2C%22prebid%22%3A1%7D'
      });
      expect(options).to.deep.include({
        method: 'POST',
        withCredentials: false
      });
    });
    it('should not call ajax if eventTrackers is missing or event 500 not present', function () {
      spec.onBidWon({});
      spec.onBidWon({ eventTrackers: [{ event: 200 }] });

      expect(ajaxStub.notCalled).to.be.true;
    });
  });
  describe('onTimeout', function () {
    let ajaxStub;

    beforeEach(function () {
      ajaxStub = sinon.stub(ajaxLib, 'ajax');
    });

    afterEach(function () {
      ajaxStub.restore();
    });

    it('should call ajax with correct payload and pubAdCodeNames from gpid', function () {
      const timeoutData = [
        {
          ortb2Imp: {
            ext: {
              gpid: 'abc#123'
            }
          }
        },
        {
          ortb2Imp: {
            ext: {
              gpid: 'def#456'
            }
          }
        },
        {
          ortb2Imp: {
            ext: {
              gpid: 'ghi#789'
            }
          }
        }
      ];

      spec.onTimeout(timeoutData);

      expect(ajaxStub.calledOnce).to.be.true;

      const [url, , data, options] = ajaxStub.firstCall.args;

      expect(url).to.equal('https://ade.clmbtech.com/cde/bidNotify.htm');

      const parsedPayload = JSON.parse(data);
      expect(parsedPayload).to.deep.equal({
        bidNotifyType: 2,
        pubAdCodeNames: 'abc,def,ghi'
      });

      expect(options).to.deep.include({
        method: 'POST',
        withCredentials: false
      });
    });

    it('should not call ajax if timeoutData is null or empty', function () {
      spec.onTimeout(null);
      spec.onTimeout([]);

      expect(ajaxStub.notCalled).to.be.true;
    });

    it('should skip entries without valid gpid', function () {
      const timeoutData = [
        { ortb2Imp: { ext: { gpid: 'valid#123' } } },
        { ortb2Imp: { ext: {} } },
        { ortb2Imp: {} },
        {},
      ];

      spec.onTimeout(timeoutData);

      expect(ajaxStub.calledOnce).to.be.true;
      const [, , data] = ajaxStub.firstCall.args;
      const parsed = JSON.parse(data);

      expect(parsed.pubAdCodeNames).to.equal('valid');
    });
  });
});
