import { expect } from 'chai';
import { spec, converter } from 'modules/performaxBidAdapter.js';

describe('Performax adapter', function () {
  let bids = [{
    bidder: 'performax',
    params: {
      tagid: 'sample'
    },
    ortb2Imp: {
      ext: {}
    },
    mediaTypes: {
      banner: {
        sizes: [
          [300, 300],
        ]}},
    adUnitCode: 'postbid_iframe',
    transactionId: '84deda92-e9ba-4b0d-a797-43be5e522430',
    adUnitId: '4ee4643b-931f-4a17-a571-ccba57886dc8',
    sizes: [
      [300, 300],
    ],
    bidId: '2bc545c347dbbe',
    bidderRequestId: '1534dec005b9a',
    auctionId: 'acd97e55-01e1-45ad-813c-67fa27fc5c1b',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0,
    ortb2: {
      source: {},
      site: {},
      device: {}
    },
  },

  {
    bidder: 'performax',
    params: {
      tagid: '1545'
    },
    ortb2Imp: {
      ext: {}
    },
    mediaTypes: {
      banner: {
        sizes: [
          [300, 600],
        ]}},
    adUnitCode: 'postbid_halfpage_iframe',
    transactionId: '84deda92-e9ba-4b0d-a797-43be5e522430',
    adUnitId: '4ee4643b-931f-4a17-a571-ccba57886dc8',
    sizes: [
      [300, 600],
    ],
    bidId: '3dd53d30c691fe',
    bidderRequestId: '1534dec005b9a',
    auctionId: 'acd97e55-01e1-45ad-813c-67fa27fc5c1b',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0,
    ortb2: {
      source: {},
      site: {},
      device: {}
    }}];

  let bidderRequest = {
    bidderCode: 'performax2',
    auctionId: 'acd97e55-01e1-45ad-813c-67fa27fc5c1b',
    id: 'acd97e55-01e1-45ad-813c-67fa27fc5c1b',
    bidderRequestId: '1534dec005b9a',
    bids: bids,
    ortb2: {
      regs: {
        ext: {
          gdpr: 1
        }},
      user: {
        ext: {
          consent: 'consent-string'
        }
      },
      site: {},
      device: {}
    }};

  let serverResponse = {
    body: {
      cur: 'CZK',
      seatbid: [
        {
          seat: 'performax',
          bid: [
            {
              id: 'sample',
              price: 20,
              w: 300,
              h: 300,
              adm: 'My ad'
            }
          ]}]},
  }

  describe('isBidRequestValid', function () {
    let bid = {};
    it('should return false when missing "tagid" param', function() {
      bid.params = {slotId: 'param'};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when tagid is correct', function() {
      bid.params = {tagid: 'sample'};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  })

  describe('buildRequests', function () {
    it('should set correct request method and url', function () {
      let requests = spec.buildRequests([bids[0]], bidderRequest);
      expect(requests).to.be.an('array').that.has.lengthOf(1);
      let request = requests[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://dale.performax.cz/ortb');
      expect(request.data).to.be.an('object');
    });

    it('should pass correct imp', function () {
      let requests = spec.buildRequests([bids[0]], bidderRequest);
      let {data} = requests[0];
      let {imp} = data;
      expect(imp).to.be.an('array').that.has.lengthOf(1);
      expect(imp[0]).to.be.an('object');
      let bid = imp[0];
      expect(bid.id).to.equal('2bc545c347dbbe');
      expect(bid.banner).to.deep.equal({topframe: 0, format: [{w: 300, h: 300}]});
    });

    it('should process multiple bids', function () {
      let requests = spec.buildRequests(bids, bidderRequest);
      expect(requests).to.be.an('array').that.has.lengthOf(1);
      let {data} = requests[0];
      let {imp} = data;
      expect(imp).to.be.an('array').that.has.lengthOf(bids.length);
      let bid1 = imp[0];
      expect(bid1.banner).to.deep.equal({topframe: 0, format: [{w: 300, h: 300}]});
      let bid2 = imp[1];
      expect(bid2.banner).to.deep.equal({topframe: 0, format: [{w: 300, h: 600}]});
    });
  });

  describe('interpretResponse', function () {
    it('should map params correctly', function () {
      let ortbRequest = {data: converter.toORTB({bidderRequest, bids})};
      serverResponse.body.id = ortbRequest.data.id;
      serverResponse.body.seatbid[0].bid[0].imp_id = ortbRequest.data.imp[0].id;

      let result = spec.interpretResponse(serverResponse, ortbRequest);
      expect(result).to.be.an('array').that.has.lengthOf(1);
      let bid = result[0];

      expect(bid.cpm).to.equal(20);
      expect(bid.ad).to.equal('My ad');
      expect(bid.currency).to.equal('CZK');
      expect(bid.mediaType).to.equal('banner');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(360);
      expect(bid.creativeId).to.equal('sample');
    });
  });
});
