import { expect } from 'chai';
import { spec } from '../../../modules/aceexBidAdapter.js';

describe('aceexBidAdapter', function () {
  const makeBidderRequest = (ortb2 = {}) => ({
    bidderCode: 'aceex',
    auctionId: 'auction-1',
    bidderRequestId: 'br-1',
    ortb2
  });

  const makeBid = (overrides = {}) => ({
    bidId: overrides.bidId || 'bid-1',
    bidder: 'aceex',
    params: {
      publisherId: 'pub-1',
      trafficType: 'banner',
      internalKey: 'ik-1',
      bidfloor: 0.1,
      ...overrides.params,
    },
    mediaTypes: overrides.mediaTypes,
    sizes: overrides.sizes,
    ...overrides,
  });

  describe('isBidRequestValid', function () {
    it('should return true when bidId, params.publisherId and params.trafficType are present', function () {
      const bid = makeBid({
        bidId: 'bid-123',
        params: { publisherId: 'pub-123', trafficType: 'banner' }
      });

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when bidId is missing', function () {
      const bid = makeBid({ bidId: undefined });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when params.publisherId is missing', function () {
      const bid = makeBid({ params: { trafficType: 'banner' } });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when params.trafficType is missing', function () {
      const bid = makeBid({ params: { publisherId: 'pub-1' } });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should build a single request object', function () {
      const bidderRequest = makeBidderRequest();
      const validBidRequests = [makeBid({ bidId: 'bid-1' })];

      const req = spec.buildRequests(validBidRequests, bidderRequest);

      expect(req).to.be.an('object');

      expect(req).to.have.property('data');
    });

    it('should map ortb2 fields into request.data (cat, keywords, badv, wseat, bseat)', function () {
      const bidderRequest = makeBidderRequest({
        cat: ['IAB1', 'IAB1-1'],
        keywords: { key1: ['v1', 'v2'] },
        badv: ['bad.com'],
        wseat: ['seat1'],
        bseat: ['seat2'],
      });

      const validBidRequests = [makeBid({ bidId: 'bid-1' })];
      const req = spec.buildRequests(validBidRequests, bidderRequest);

      expect(req.data.cat).to.deep.equal(['IAB1', 'IAB1-1']);
      expect(req.data.keywords).to.deep.equal({ key1: ['v1', 'v2'] });
      expect(req.data.badv).to.deep.equal(['bad.com']);
      expect(req.data.wseat).to.deep.equal(['seat1']);
      expect(req.data.bseat).to.deep.equal(['seat2']);
    });

    it('should not throw if ortb2 fields are missing', function () {
      const bidderRequest = makeBidderRequest();
      const validBidRequests = [makeBid({ bidId: 'bid-1' })];

      expect(() => spec.buildRequests(validBidRequests, bidderRequest)).to.not.throw();
    });
  });

  describe('interpretResponse', function () {
    it('should return [] when serverResponse/body is missing', function () {
      expect(spec.interpretResponse(null, {})).to.deep.equal([]);
      expect(spec.interpretResponse({}, {})).to.deep.equal([]);
      expect(spec.interpretResponse({ body: null }, {})).to.deep.equal([]);
    });

    it('should interpret banner bid', function () {
      const bidRequest = {
        data: {
          placements: [
            { bidId: 'resp-bid-1', adFormat: 'banner' }
          ]
        }
      };

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              id: 'resp-bid-1',
              price: 1.23,
              crid: 'cr-1',
              dealid: 'deal-1',
              h: 250,
              w: 300,
              adm: '<div>price=1.23</div>',
              nurl: 'https://win.example.com?c=1.23',
              adomain: ['test.com']
            }]
          }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.have.lengthOf(1);

      const b = out[0];
      expect(b.requestId).to.equal('resp-bid-1');
      expect(b.cpm).to.equal(1.23);
      expect(b.mediaType).to.equal('banner');
      expect(b.width).to.equal(300);
      expect(b.height).to.equal(250);
      expect(b.ad).to.include('1.23');
      expect(b.meta.advertiserDomains[0]).to.equal('test.com');
    });

    it('should interpret video bid as vastXml', function () {
      const bidRequest = {
        data: {
          placements: [
            { bidId: 'resp-bid-2', adFormat: 'video' }
          ]
        }
      };

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              id: 'resp-bid-2',
              price: 5,
              crid: 'cr-v',
              dealid: 'deal-v',
              h: 360,
              w: 640,
              adm: '<VAST version="3.0"></VAST>',
              nurl: 'https://win.example.com?c=5',
              adomain: ['test.com']
            }]
          }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.have.lengthOf(1);

      const b = out[0];
      expect(b.mediaType).to.equal('video');
      expect(b.vastXml).to.equal('<VAST version="3.0"></VAST>');
      expect(b.ad).to.equal(undefined);
    });

    it('should interpret native bid into native.ortb', function () {
      const bidRequest = {
        data: {
          placements: [
            { bidId: 'resp-bid-3', adFormat: 'native' }
          ]
        }
      };

      const nativeAdm = JSON.stringify({
        native: {
          assets: [{ id: 1, title: { text: 'Hello' } }],
          imptrackers: ['https://imp.example.com/1'],
          link: { url: 'https://click.example.com' }
        }
      });

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              id: 'resp-bid-3',
              price: 2.5,
              crid: 'cr-n',
              dealid: 'deal-n',
              h: 1,
              w: 1,
              adm: nativeAdm,
              nurl: 'https://win.example.com?c=5',
              adomain: ['test.com']
            }]
          }]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.have.lengthOf(1);

      const b = out[0];
      expect(b.mediaType).to.equal('native');
      expect(b).to.have.property('native');
      expect(b.native).to.have.property('ortb');

      expect(b.native.ortb.assets).to.deep.equal([{ id: 1, title: { text: 'Hello' } }]);
      expect(b.native.ortb.imptrackers).to.deep.equal(['https://imp.example.com/1']);
      expect(b.native.ortb.link).to.deep.equal({ url: 'https://click.example.com' });
    });

    it('should handle multiple seatbids and multiple bids', function () {
      const bidRequest = {
        data: {
          placements: [
            { bidId: 'b1', adFormat: 'banner' },
            { bidId: 'b2', adFormat: 'video' }
          ]
        }
      };

      const serverResponse = {
        body: {
          seatbid: [
            { bid: [{ id: 'b1', price: 1, crid: 'c1', dealid: 'd1', h: 250, w: 300, adm: '<div/>', nurl: '', adomain: ['test.com'] }] },
            { bid: [{ id: 'b2', price: 2, crid: 'c2', dealid: 'd2', h: 360, w: 640, adm: '<VAST/>', nurl: '', adomain: ['test.com'] }] }
          ]
        }
      };

      const out = spec.interpretResponse(serverResponse, bidRequest);
      expect(out).to.have.lengthOf(2);
      expect(out.find(x => x.requestId === 'b1').mediaType).to.equal('banner');
      expect(out.find(x => x.requestId === 'b2').mediaType).to.equal('video');
    });
  });
});
