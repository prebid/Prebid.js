import { expect } from 'chai';
import * as utils from 'src/utils.js';
import { spec } from 'modules/brightcomBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const URL = 'https://brightcombid.marphezis.com/hb';

describe('brightcomBidAdapter', function() {
  const adapter = newBidder(spec);
  let element, win;
  let bidRequests;
  let sandbox;

  beforeEach(function() {
    element = {
      x: 0,
      y: 0,

      width: 0,
      height: 0,

      getBoundingClientRect: () => {
        return {
          width: element.width,
          height: element.height,

          left: element.x,
          top: element.y,
          right: element.x + element.width,
          bottom: element.y + element.height
        };
      }
    };
    win = {
      document: {
        visibilityState: 'visible'
      },

      innerWidth: 800,
      innerHeight: 600
    };
    bidRequests = [{
      'bidder': 'brightcom',
      'params': {
        'publisherId': 1234567
      },
      'adUnitCode': 'adunit-code',
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 250], [300, 600]]
        }
      },
      'bidId': '5fb26ac22bde4',
      'bidderRequestId': '4bf93aeb730cb9',
      'auctionId': 'ffe9a1f7-7b67-4bda-a8e0-9ee5dc9f442e'
    }];

    sandbox = sinon.sandbox.create();
    sandbox.stub(document, 'getElementById').withArgs('adunit-code').returns(element);
    sandbox.stub(utils, 'getWindowTop').returns(win);
    sandbox.stub(utils, 'getWindowSelf').returns(win);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'brightcom',
      'params': {
        'publisherId': 1234567
      },
      'adUnitCode': 'adunit-code',
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 250], [300, 600]]
        }
      },
      'bidId': '5fb26ac22bde4',
      'bidderRequestId': '4bf93aeb730cb9',
      'auctionId': 'ffe9a1f7-7b67-4bda-a8e0-9ee5dc9f442e',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when publisherId not passed correctly', function () {
      bid.params.publisherId = undefined;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when require params are not passed', function () {
      let bid = Object.assign({}, bid);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('sends bid request to our endpoint via POST', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.method).to.equal('POST');
    });

    it('request url should match our endpoint url', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal(URL);
    });

    it('sets the proper banner object', function() {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}]);
    });

    it('accepts a single array as a size', function() {
      bidRequests[0].mediaTypes.banner.sizes = [300, 250];
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}]);
    });

    it('sends bidfloor param if present', function () {
      bidRequests[0].params.bidFloor = 0.05;
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].bidfloor).to.equal(0.05);
    });

    it('sends tagid', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].tagid).to.equal('adunit-code');
    });

    it('sends publisher id', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.site.publisher.id).to.equal(1234567);
    });

    it('sends gdpr info if exists', function () {
      const consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      const bidderRequest = {
        'bidderCode': 'brightcom',
        'auctionId': '1d1a030790a437',
        'bidderRequestId': '22edbae2744bf5',
        'timeout': 3000,
        gdprConsent: {
          consentString: consentString,
          gdprApplies: true
        },
        refererInfo: {
          referer: 'http://example.com/page.html',
        }
      };
      bidderRequest.bids = bidRequests;

      const data = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);

      expect(data.regs.ext.gdpr).to.exist.and.to.be.a('number');
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.exist.and.to.be.a('string');
      expect(data.user.ext.consent).to.equal(consentString);
    });

    context('when element is fully in view', function() {
      it('returns 100', function() {
        Object.assign(element, { width: 600, height: 400 });
        const request = spec.buildRequests(bidRequests);
        const payload = JSON.parse(request.data);
        expect(payload.imp[0].banner.ext.viewability).to.equal(100);
      });
    });

    context('when element is out of view', function() {
      it('returns 0', function() {
        Object.assign(element, { x: -300, y: 0, width: 207, height: 320 });
        const request = spec.buildRequests(bidRequests);
        const payload = JSON.parse(request.data);
        expect(payload.imp[0].banner.ext.viewability).to.equal(0);
      });
    });

    context('when element is partially in view', function() {
      it('returns percentage', function() {
        Object.assign(element, { width: 800, height: 800 });
        const request = spec.buildRequests(bidRequests);
        const payload = JSON.parse(request.data);
        expect(payload.imp[0].banner.ext.viewability).to.equal(75);
      });
    });

    context('when width or height of the element is zero', function() {
      it('try to use alternative values', function() {
        Object.assign(element, { width: 0, height: 0 });
        bidRequests[0].mediaTypes.banner.sizes = [[800, 2400]];
        const request = spec.buildRequests(bidRequests);
        const payload = JSON.parse(request.data);
        expect(payload.imp[0].banner.ext.viewability).to.equal(25);
      });
    });

    context('when nested iframes', function() {
      it('returns \'na\'', function() {
        Object.assign(element, { width: 600, height: 400 });

        utils.getWindowTop.restore();
        utils.getWindowSelf.restore();
        sandbox.stub(utils, 'getWindowTop').returns(win);
        sandbox.stub(utils, 'getWindowSelf').returns({});

        const request = spec.buildRequests(bidRequests);
        const payload = JSON.parse(request.data);
        expect(payload.imp[0].banner.ext.viewability).to.equal('na');
      });
    });

    context('when tab is inactive', function() {
      it('returns 0', function() {
        Object.assign(element, { width: 600, height: 400 });

        utils.getWindowTop.restore();
        win.document.visibilityState = 'hidden';
        sandbox.stub(utils, 'getWindowTop').returns(win);

        const request = spec.buildRequests(bidRequests);
        const payload = JSON.parse(request.data);
        expect(payload.imp[0].banner.ext.viewability).to.equal(0);
      });
    });
  });

  describe('interpretResponse', function () {
    let response;
    beforeEach(function () {
      response = {
        body: {
          'id': '37386aade21a71',
          'seatbid': [{
            'bid': [{
              'id': '376874781',
              'impid': '283a9f4cd2415d',
              'price': 0.35743275,
              'nurl': '<!-- NURL -->',
              'adm': '<!-- Creative -->',
              'w': 300,
              'h': 250
            }]
          }]
        }
      };
    });

    it('should get the correct bid response', function () {
      let expectedResponse = [{
        'requestId': '283a9f4cd2415d',
        'cpm': 0.35743275,
        'width': 300,
        'height': 250,
        'creativeId': '376874781',
        'currency': 'USD',
        'netRevenue': true,
        'mediaType': 'banner',
        'ad': `<!-- Creative --><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="${encodeURI('<!-- NURL -->')}"></div>`,
        'ttl': 60
      }];

      let result = spec.interpretResponse(response);
      expect(result[0]).to.deep.equal(expectedResponse[0]);
    });

    it('crid should default to the bid id if not on the response', function () {
      let expectedResponse = [{
        'requestId': '283a9f4cd2415d',
        'cpm': 0.35743275,
        'width': 300,
        'height': 250,
        'creativeId': response.body.seatbid[0].bid[0].id,
        'currency': 'USD',
        'netRevenue': true,
        'mediaType': 'banner',
        'ad': `<!-- Creative --><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="${encodeURI('<!-- NURL -->')}"></div>`,
        'ttl': 60
      }];

      let result = spec.interpretResponse(response);
      expect(result[0]).to.deep.equal(expectedResponse[0]);
    });

    it('handles empty bid response', function () {
      let response = {
        body: ''
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs ', () => {
    let syncOptions = {iframeEnabled: true, pixelEnabled: true};

    it('should not return', () => {
      let returnStatement = spec.getUserSyncs(syncOptions, []);
      expect(returnStatement).to.be.empty;
    });
  });
});
