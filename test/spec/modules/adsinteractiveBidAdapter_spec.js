import { expect } from 'chai';
import { spec } from 'modules/adsinteractiveBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('adsinteractiveBidAdapter', function () {
  let bid = {
    ortb2: {
      site: {
        page: 'http://test.com',
        domain: 'test.com',
        publisher: {
          domain: 'test.com',
        },
      },
    },
    bidder: 'adsinteractive',
    sizes: [[300, 250]],
    bidId: '32469kja92389',
    params: {
      adUnit: 'example_adunit_1',
    },
  }

  const bidderRequest = {
    refererInfo: {
      isAmp: 0
    } }

  describe('build requests', () => {
    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests([
        {
          ortb2: {
            site: {
              page: 'http://test.com',
              domain: 'test.com',
              publisher: {
                domain: 'test.com',
              },
            },
          },
          bidder: 'adsinteractive',
          sizes: [[300, 250]],
          bidId: '32469kja92389',
          params: {
            adUnit: 'example_adunit_1',
          },
        },
      ], bidderRequest);
      expect(request[0].method).to.equal('POST');
    });
    it('sends bid request to adsinteractive endpoint', function () {
      const request = spec.buildRequests([
        {
          ortb2: {
            site: {
              page: 'http://test.com',
              domain: 'test.com',
              publisher: {
                domain: 'test.com',
              },
            },
          },
          bidder: 'adsinteractive',
          sizes: [[300, 250]],
          bidId: '32469kja92389',
          params: {
            adUnit: 'example_adunit_1',
          },
        },
      ], bidderRequest);
      expect(request[0].url).to.equal('https://pb.adsinteractive.com/prebid');
    });
  });

  describe('inherited functions', () => {
    const adapter = newBidder(spec);
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when necessary information is found', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when necessary information is not found', function () {
      // empty bid
      expect(spec.isBidRequestValid({ bidId: '', params: {} })).to.be.false;

      // empty bidId
      bid.bidId = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;

      // empty adUnit
      bid.bidId = '32469kja92389';
      bid.params.adUnit = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when bidder not set to "adsinteractive"', function () {
      const invalidBid = {
        bidder: 'newyork',
        sizes: [[300, 250]],
        bidId: '32469kja92389',
        params: {
          adUnit: 'example_adunit_1',
        },
      };
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });

    it('returns false when adUnit is not set in params', function () {
      const invalidBid = {
        bidder: 'adsinteractive',
        sizes: [[300, 250]],
        bidId: '32469kja92389',
        params: {},
      };

      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });
  });
  describe('interpretResponse', function () {
    let serverResponse;
    let bidRequest = { data: { id: 'adsinteractiverequest-9320' } };

    beforeEach(function () {
      serverResponse = {
        body: {
          id: '239823rhaldf822',
          seatbid: [
            {
              bid: [
                {
                  id: 'fae50ca1-3f69-4b34-bf6d-b2eb0ae3376b',
                  impid: 'example_adunit_1',
                  price: 0.49,
                  netRevenue: true,
                  ttl: 1000,
                  meta: {advertiserDomains: []},
                  adm: '<html><a href="https://www.adsinteractive.com" target="_blank"><img src ="https://adsinteractive.com/img/logo-11.png" /></a></html>',
                  crid: '932048jda99cr',
                  h: 250,
                  w: 300,
                },
              ],
              seat: 'adsinteractive',
            },
          ],
          cur: 'USD',
        },
      };
    });

    it('validate_response_params', function () {
      const newResponse = spec.interpretResponse(serverResponse, bidRequest);
      expect(newResponse[0].id).to.be.equal(
        'fae50ca1-3f69-4b34-bf6d-b2eb0ae3376b'
      );
      expect(newResponse[0].requestId).to.be.equal(
        'adsinteractiverequest-9320'
      );
      expect(newResponse[0].cpm).to.be.equal(0.49);
      expect(newResponse[0].width).to.be.equal(300);
      expect(newResponse[0].height).to.be.equal(250);
      expect(newResponse[0].currency).to.be.equal('USD');
      expect(newResponse[0].ad).to.be.equal(
        '<html><a href="https://www.adsinteractive.com" target="_blank"><img src ="https://adsinteractive.com/img/logo-11.png" /></a></html>'
      );
    });

    it('should correctly reorder the server response', function () {
      const newResponse = spec.interpretResponse(serverResponse, bidRequest);
      expect(newResponse.length).to.be.equal(1);
      expect(newResponse[0]).to.deep.equal({
        id: 'fae50ca1-3f69-4b34-bf6d-b2eb0ae3376b',
        requestId: 'adsinteractiverequest-9320',
        cpm: 0.49,
        netRevenue: true,
        ttl: 1000,
        width: 300,
        height: 250,
        meta: {advertiserDomains: []},
        creativeId: '932048jda99cr',
        currency: 'USD',
        ad: '<html><a href="https://www.adsinteractive.com" target="_blank"><img src ="https://adsinteractive.com/img/logo-11.png" /></a></html>',
      });
    });

    it('should not add responses if the cpm is 0 or null', function () {
      serverResponse.body.seatbid[0].bid[0].price = 0;
      let response = spec.interpretResponse(serverResponse, bidRequest);
      expect(response).to.deep.equal([]);

      serverResponse.body.seatbid[0].bid[0].price = null;
      response = spec.interpretResponse(serverResponse, bidRequest);
      expect(response).to.deep.equal([]);
    });
    it('should add responses if the cpm is valid', function () {
      serverResponse.body.seatbid[0].bid[0].price = 0.5;
      let response = spec.interpretResponse(serverResponse, bidRequest);
      expect(response).to.not.deep.equal([]);
    });
  });
});
