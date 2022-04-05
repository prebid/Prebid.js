import {expect} from 'chai';
import {spec} from 'modules/biddoBidAdapter.js';

describe('biddo bid adapter tests', function () {
  describe('bid requests', function () {
    it('should accept valid bid', function () {
      const validBid = {
        bidder: 'biddo',
        params: {zoneId: 123},
      };

      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('should reject invalid bid', function () {
      const invalidBid = {
        bidder: 'biddo',
        params: {},
      };

      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should correctly build payload string', function () {
      const bidRequests = [{
        bidder: 'biddo',
        params: {zoneId: 123},
        mediaTypes: {
          banner: {
            sizes: [[300, 250]],
          },
        },
        bidId: '23acc48ad47af5',
        auctionId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729',
      }];
      const payload = spec.buildRequests(bidRequests)[0].data;

      expect(payload).to.contain('ctype=div');
      expect(payload).to.contain('pzoneid=123');
      expect(payload).to.contain('width=300');
      expect(payload).to.contain('height=250');
    });

    it('should support multiple bids', function () {
      const bidRequests = [{
        bidder: 'biddo',
        params: {zoneId: 123},
        mediaTypes: {
          banner: {
            sizes: [[300, 250]],
          },
        },
        bidId: '23acc48ad47af5',
        auctionId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729',
      }, {
        bidder: 'biddo',
        params: {zoneId: 321},
        mediaTypes: {
          banner: {
            sizes: [[728, 90]],
          },
        },
        bidId: '23acc48ad47af52',
        auctionId: '0fb4905b-9456-4152-86be-c6f6d259ba992',
        bidderRequestId: '1c56ad30b9b8ca82',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea9347292',
      }];
      const payload = spec.buildRequests(bidRequests);

      expect(payload).to.be.lengthOf(2);
    });

    it('should support multiple sizes', function () {
      const bidRequests = [{
        bidder: 'biddo',
        params: {zoneId: 123},
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]],
          },
        },
        bidId: '23acc48ad47af5',
        auctionId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729',
      }];
      const payload = spec.buildRequests(bidRequests);

      expect(payload).to.be.lengthOf(2);
    });
  });

  describe('bid responses', function () {
    it('should return complete bid response', function () {
      const serverResponse = {
        body: {
          banner: {
            hash: '1c56ad30b9b8ca8',
          },
          hb: {
            cpm: 0.5,
            netRevenue: false,
            adomains: ['securepubads.g.doubleclick.net'],
          },
          template: {
            html: '<ad></ad>',
          },
        },
      };
      const bidderRequest = {
        bidId: '23acc48ad47af5',
        params: {
          requestedSizes: [300, 250],
        },
      };

      const bids = spec.interpretResponse(serverResponse, {bidderRequest});

      expect(bids).to.be.lengthOf(1);
      expect(bids[0].requestId).to.equal('23acc48ad47af5');
      expect(bids[0].creativeId).to.equal('1c56ad30b9b8ca8');
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].ttl).to.equal(600);
      expect(bids[0].cpm).to.equal(0.5);
      expect(bids[0].netRevenue).to.equal(false);
      expect(bids[0].currency).to.equal('USD');
      expect(bids[0].meta.advertiserDomains).to.be.lengthOf(1);
      expect(bids[0].meta.advertiserDomains[0]).to.equal('securepubads.g.doubleclick.net');
    });

    it('should return empty bid response', function () {
      const serverResponse = {
        body: {},
      };
      const bidderRequest = {
        bidId: '23acc48ad47af5',
        params: {
          requestedSizes: [300, 250],
        },
      };

      const bids = spec.interpretResponse(serverResponse, {bidderRequest});

      expect(bids).to.be.lengthOf(0);
    });

    it('should return empty bid response 2', function () {
      const serverResponse = {
        body: {
          template: {
            html: '',
          }
        },
      };
      const bidderRequest = {
        bidId: '23acc48ad47af5',
        params: {
          requestedSizes: [300, 250],
        },
      };

      const bids = spec.interpretResponse(serverResponse, {bidderRequest});

      expect(bids).to.be.lengthOf(0);
    });
  });
});
