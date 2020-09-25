import { expect } from 'chai';
import { spec } from 'modules/adnowBidAdapter.js';

describe('adnowBidAdapter', function () {
  describe('isBidRequestValid', function () {
    it('Should return true', function() {
      expect(spec.isBidRequestValid({
        bidder: 'adnow',
        params: {
          codeId: 12345
        }
      })).to.equal(true);
    });

    it('Should return false when required params is not passed', function() {
      expect(spec.isBidRequestValid({
        bidder: 'adnow',
        params: {}
      })).to.equal(false);
    });
  });

  describe('buildRequests', function() {
    it('Common settings', function() {
      const bidRequestData = [{
        bidId: 'bid12345',
        params: {
          codeId: 12345
        }
      }];

      const req = spec.buildRequests(bidRequestData);
      const reqData = req[0].data;

      expect(reqData)
        .to.match(/Id=12345/)
        .to.match(/mediaType=native/)
        .to.match(/out=prebid/)
        .to.match(/requestid=bid12345/)
        .to.match(/d_user_agent=.+/);
    });

    it('Banner sizes', function () {
      const bidRequestData = [{
        bidId: 'bid12345',
        params: {
          codeId: 12345
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      }];

      const req = spec.buildRequests(bidRequestData);
      const reqData = req[0].data;

      expect(reqData).to.match(/sizes=300x250/);
    });

    it('Native sizes', function () {
      const bidRequestData = [{
        bidId: 'bid12345',
        params: {
          codeId: 12345
        },
        mediaTypes: {
          native: {
            image: {
              sizes: [100, 100]
            }
          }
        }
      }];

      const req = spec.buildRequests(bidRequestData);
      const reqData = req[0].data;

      expect(reqData)
        .to.match(/width=100/)
        .to.match(/height=100/);
    });
  });

  describe('interpretResponse', function() {
    const request = {
      bidRequest: {
        bidId: 'bid12345'
      }
    };

    it('Response with native bid', function() {
      const response = {
        currency: 'USD',
        cpm: 0.5,
        native: {
          title: 'Title',
          body: 'Body',
          sponsoredBy: 'AdNow',
          clickUrl: '//click.url',
          image: {
            url: '//img.url',
            height: 200,
            width: 200
          }
        },
        meta: {
          mediaType: 'native'
        }
      };

      const bids = spec.interpretResponse({ body: response }, request);
      expect(bids).to.be.an('array').that.is.not.empty;

      const bid = bids[0];
      expect(bid).to.have.keys('requestId', 'cpm', 'currency', 'native', 'creativeId', 'netRevenue', 'meta', 'ttl');

      const nativePart = bid.native;

      expect(nativePart.title).to.be.equal('Title');
      expect(nativePart.body).to.be.equal('Body');
      expect(nativePart.clickUrl).to.be.equal('//click.url');
      expect(nativePart.image.url).to.be.equal('//img.url');
      expect(nativePart.image.height).to.be.equal(200);
      expect(nativePart.image.width).to.be.equal(200);
    });

    it('Response with banner bid', function() {
      const response = {
        currency: 'USD',
        cpm: 0.5,
        ad: '<div>Banner</div>',
        meta: {
          mediaType: 'banner'
        }
      };

      const bids = spec.interpretResponse({ body: response }, request);
      expect(bids).to.be.an('array').that.is.not.empty;

      const bid = bids[0];
      expect(bid).to.have.keys(
        'requestId', 'cpm', 'currency', 'ad', 'creativeId', 'netRevenue', 'meta', 'ttl', 'width', 'height'
      );

      expect(bid.ad).to.be.equal('<div>Banner</div>');
    });

    it('Response with no bid should return an empty array', function() {
      const noBidResponses = [
        false,
        {},
        {body: false},
        {body: {}}
      ];

      noBidResponses.forEach(response => {
        return expect(spec.interpretResponse(response, request)).to.be.an('array').that.is.empty;
      });
    });
  });
});
