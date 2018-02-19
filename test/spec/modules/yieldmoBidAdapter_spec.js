import { expect } from 'chai';
import { spec } from 'modules/yieldmoBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';

describe('YieldmoAdapter', () => {
  const adapter = newBidder(spec);
  const ENDPOINT = 'https://ads.yieldmo.com/exchange/prebid';

  let bid = {
    bidder: 'yieldmo',
    params: {},
    adUnitCode: 'adunit-code',
    sizes: [[300, 250], [300, 600]],
    bidId: '30b31c1838de1e',
    bidderRequestId: '22edbae2733bf6',
    auctionId: '1d1a030790a475'
  };
  let bidArray = [bid];

  describe('isBidRequestValid', () => {
    it('should return true when necessary information is found', () => {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when necessary information is not found', () => {
      // empty bid
      expect(spec.isBidRequestValid({})).to.be.false;

      // empty bidId
      bid.bidId = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;

      // empty adUnitCode
      bid.bidId = '30b31c1838de1e';
      bid.adUnitCode = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;

      bid.adUnitCode = 'adunit-code';
    });
  });

  describe('buildRequests', () => {
    it('should attempt to send bid requests to the endpoint via GET', () => {
      const request = spec.buildRequests(bidArray);
      expect(request.method).to.equal('GET');
      expect(request.url).to.be.equal(ENDPOINT);
    });

    it('should place bid information into the p parameter of data', () => {
      let placementInfo = spec.buildRequests(bidArray).data.p;
      expect(placementInfo).to.equal('[{"placement_id":"adunit-code","callback_id":"30b31c1838de1e","sizes":[[300,250],[300,600]]}]');

      bidArray.push({
        bidder: 'yieldmo',
        params: {},
        adUnitCode: 'adunit-code-1',
        sizes: [[300, 250], [300, 600]],
        bidId: '123456789',
        bidderRequestId: '987654321',
        auctionId: '0246810'
      });

      // multiple placements
      placementInfo = spec.buildRequests(bidArray).data.p;
      expect(placementInfo).to.equal('[{"placement_id":"adunit-code","callback_id":"30b31c1838de1e","sizes":[[300,250],[300,600]]},{"placement_id":"adunit-code-1","callback_id":"123456789","sizes":[[300,250],[300,600]]}]');
    });

    it('should add placement id if given', () => {
      bidArray[0].params.placementId = 'ym_1293871298';
      let placementInfo = spec.buildRequests(bidArray).data.p;
      expect(placementInfo).to.include('"ym_placement_id":"ym_1293871298"}');
      expect(placementInfo).not.to.include('"ym_placement_id":"ym_0987654321"}');

      bidArray[1].params.placementId = 'ym_0987654321';
      placementInfo = spec.buildRequests(bidArray).data.p;
      expect(placementInfo).to.include('"ym_placement_id":"ym_1293871298"}');
      expect(placementInfo).to.include('"ym_placement_id":"ym_0987654321"}');
    });

    it('should add additional information to data parameter of request', () => {
      const data = spec.buildRequests(bidArray).data;
      expect(data.hasOwnProperty('page_url')).to.be.true;
      expect(data.hasOwnProperty('bust')).to.be.true;
      expect(data.hasOwnProperty('pr')).to.be.true;
      expect(data.hasOwnProperty('scrd')).to.be.true;
      expect(data.dnt).to.be.false;
      expect(data.e).to.equal(90);
      expect(data.hasOwnProperty('description')).to.be.true;
      expect(data.hasOwnProperty('title')).to.be.true;
      expect(data.hasOwnProperty('h')).to.be.true;
      expect(data.hasOwnProperty('w')).to.be.true;
    })
  });

  describe('interpretResponse', () => {
    let serverResponse;

    beforeEach(() => {
      serverResponse = {
        body: [{
          callback_id: '21989fdbef550a',
          cpm: 3.45455,
          width: 300,
          height: 250,
          ad: '<html><head></head><body><script>//GEX ad object</script><div id=\"ym_123\" class=\"ym\"></div><script>//js code</script></body></html>',
          creativeId: '9874652394875'
        }],
        header: 'header?'
      };
    })

    it('should correctly reorder the server response', () => {
      const newResponse = spec.interpretResponse(serverResponse);
      expect(newResponse.length).to.be.equal(1);
      expect(newResponse[0]).to.deep.equal({
        requestId: '21989fdbef550a',
        cpm: 3.45455,
        width: 300,
        height: 250,
        creativeId: '9874652394875',
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        ad: '<html><head></head><body><script>//GEX ad object</script><div id=\"ym_123\" class=\"ym\"></div><script>//js code</script></body></html>'
      });
    });

    it('should not add responses if the cpm is 0 or null', () => {
      serverResponse.body[0].cpm = 0;
      let response = spec.interpretResponse(serverResponse);
      expect(response).to.deep.equal([]);

      serverResponse.body[0].cpm = null;
      response = spec.interpretResponse(serverResponse);
      expect(response).to.deep.equal([])
    });
  });

  describe('getUserSync', () => {
    const SYNC_ENDPOINT = 'https://static.yieldmo.com/blank.min.html?orig=';
    let options = {
      iframeEnabled: true,
      pixelEnabled: true
    };

    it('should return a tracker with type and url as parameters', () => {
      if (/iPhone|iPad|iPod/i.test(window.navigator.userAgent)) {
        expect(spec.getUserSync(options)).to.deep.equal([{
          type: 'iframe',
          url: SYNC_ENDPOINT + utils.getOrigin()
        }]);

        options.iframeEnabled = false;
        expect(spec.getUserSync(options)).to.deep.equal([]);
      } else {
        // not ios, so tracker will fail
        expect(spec.getUserSync(options)).to.deep.equal([]);
      }
    });
  });
});
