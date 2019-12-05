import { expect } from 'chai';
import { spec } from 'modules/adrollBidAdapter';

describe('adrollBidAdapter', function() {
  let validBid = {
    id: 'id',
    bidder: 'adroll',
    adUnitCode: 'adunit-code',
    bidId: 'bid_id',
    sizes: [[300, 200]],
    params: {
      ip: 'ip',
      bidfloor: 1,
      sizes: [[300, 200]],
      zoneId: 'zone1',
      publisherId: 'publisher_id'
    }
  };
  let bidWithoutValidId = { id: '' };
  let bidWithoutId = { params: { zoneId: 'zone1' } };

  describe('isBidRequestValid', function() {
    it('validates the bids correctly when the bid has an id', function() {
      expect(spec.isBidRequestValid(validBid)).to.be.true;
    });

    it('validates the bids correcly when the bid does not have an id', function() {
      expect(spec.isBidRequestValid(bidWithoutValidId)).to.be.false;
      expect(spec.isBidRequestValid(bidWithoutId)).to.be.false;
    });
  });

  describe('buildRequests', function() {
    it('builds the same amount of requests as valid requests it takes', function() {
      expect(spec.buildRequests([validBid, validBid], {})).to.be.lengthOf(2);
    });

    it('doest not build a request when there is no valid requests', function () {
      expect(spec.buildRequests([], {})).to.be.lengthOf(0);
    });

    it('builds a request with POST method', function () {
      expect(spec.buildRequests([validBid], {})[0].method).to.equal('POST');
    });

    it('builds a request with id, url and imp object', function () {
      const request = spec.buildRequests([validBid], {})[0];
      expect(request.data.id).to.be.an('string').that.is.not.empty;
      expect(request.url).to.equal('https://d.adroll.com/bid/prebid/');
      expect(request.data.imp).to.exist.and.to.be.a('object');
    });

    it('builds a request with site and device information', function () {
      const request = spec.buildRequests([validBid], {})[0];

      expect(request.data.site).to.exist.and.to.be.a('object');
      expect(request.data.device).to.exist.and.to.be.a('object');
    });

    it('builds a request with a complete imp object', function () {
      const request = spec.buildRequests([validBid], {})[0];

      expect(request.data.imp.id).to.equal('bid_id');
      expect(request.data.imp.bidfloor).to.be.equal(1);
      expect(request.data.imp.banner).to.exist.and.to.be.a('object');
      expect(request.data.imp.ext.zone.id).to.be.equal('zone1');
    });

    it('includes the sizes into the request correctly', function () {
      const bannerObject = spec.buildRequests([validBid], {})[0].data.imp.banner;

      expect(bannerObject.format).to.exist;
      expect(bannerObject.format).to.be.lengthOf(1);
      expect(bannerObject.format[0].w).to.be.equal(300);
      expect(bannerObject.format[0].h).to.be.equal(200);
    });
  });

  describe('interpretResponse', function () {
    let responseBody = {
      id: 'bidresponse_id',
      dealId: 'deal_id',
      seatbid: [
        {
          bid: [
            {
              price: 1.2,
              w: 300,
              h: 200,
              crid: 'crid1',
              adm: 'adm1'
            }
          ]
        },
        {
          bid: [
            {
              price: 2.1,
              w: 250,
              h: 300,
              crid: 'crid2',
              adm: 'adm2'
            }
          ]
        }
      ]
    };

    it('returns an empty list when there is no response body', function () {
      expect(spec.interpretResponse({}, {})).to.be.eql([]);
    });

    it('builds the same amount of responses as server responses it receives', function () {
      expect(spec.interpretResponse({body: responseBody}, {})).to.be.lengthOf(2);
    });

    it('builds a response with the expected fields', function () {
      const response = spec.interpretResponse({body: responseBody}, {})[0];

      expect(response.requestId).to.be.equal('bidresponse_id');
      expect(response.cpm).to.be.equal(1.2);
      expect(response.width).to.be.equal(300);
      expect(response.height).to.be.equal(200);
      expect(response.creativeId).to.be.equal('crid1');
      expect(response.dealId).to.be.equal('deal_id');
      expect(response.currency).to.be.equal('USD');
      expect(response.netRevenue).to.be.equal(true);
      expect(response.ttl).to.be.equal(300);
      expect(response.ad).to.be.equal('adm1');
    });
  });

  describe('getUserSyncs', function () {
    it('returns an empty list', function () {
      expect(spec.getUserSyncs({}, {})).to.be.eql([]);
    })
  })
});
