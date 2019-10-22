import {expect} from 'chai';
import {spec} from 'modules/iqmBidAdapter'
import * as utils from 'src/utils';

describe('iqmBidAdapter', function () {
  const ENDPOINT_URL = 'https://pbd.bids.iqm.com';
  const bidRequests = [{
    bidder: 'iqm',
    params: {
      position: 1,
      tagId: 'tagId-1',
      placementId: 'placementId-1',
      pubId: 'pubId-1',
      secure: true,
      bidfloor: 0.5
    },
    placementCode: 'pcode000',
    transactionId: 'tx000',
    sizes: [[300, 250]],
    bidId: 'bid000',
    bidderRequestId: '117d765b87bed38',
    requestId: 'req000'
  }];

  const bidResponses = {
    body: {
      id: 'req000',
      seatbid: [{
        bid: [{
          nurl: 'nurl',
          adm: '<img src"https://www.imgurl.com" />',
          crid: 'cr-65981',
          impid: 'bid000',
          price: 0.99,
          w: 300,
          h: 250,
          adomain: ['https://example.com'],
          id: 'bid000',
          ttl: 300
        }]
      }]
    },
    headers: {}};

  const bidResponseEmptySeat = {
    body: {
      id: 'req000',
      seatbid: []
    },
    headers: {}
  };

  const bidResponseEmptyBid = {
    body: {
      id: 'req000',
      seatbid: [{
        bid: []
      }]
    },
    headers: {}
  };

  const bidResponseNoImpId = {
    body: {
      id: 'req000',
      seatbid: [{
        bid: [{
          nurl: 'nurl',
          adm: '<img src"https://www.imgurl.com" />',
          crid: 'cr-65981',
          price: 0.99,
          w: 300,
          h: 250,
          adomain: ['https://example.com'],
          id: 'bid000',
          ttl: 300
        }]
      }]
    },
    headers: {}
  };

  describe('Request verification', function () {
    it('basic property verification', function () {
      expect(spec.code).to.equal('iqm');
      expect(spec.aliases).to.be.an('array');
      // expect(spec.aliases).to.be.ofSize(1);
      expect(spec.aliases).to.have.lengthOf(1);
    });

    describe('isBidRequestValid', function () {
      let bid = {
        'bidder': 'iqm',
        'params': {
          'placementId': 'placementId',
          'tagId': 'tagId',
          'publisherId': 'pubId'
        },
        'adUnitCode': 'ad-unit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475'
      };

      it('should return false for empty object', function () {
        expect(spec.isBidRequestValid({})).to.equal(false);
      });

      it('should return false for request without param', function () {
        let bid = Object.assign({}, bid);
        delete bid.params;
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false for invalid params', function () {
        let bid = Object.assign({}, bid);
        delete bid.params;
        bid.params = {
          'placementId': 'placementId'
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return true for proper request', function () {
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });
    });

    describe('buildRequests', function () {
      it('sends every bid request to ENDPOINT_URL via POST method', function () {
        const requests = spec.buildRequests(bidRequests);
        expect(requests[0].method).to.equal('POST');
        expect(requests[0].url).to.equal(ENDPOINT_URL);
        // expect(requests[1].method).to.equal('POST');
        // expect(requests[1].url).to.equal(ENDPOINT_URL);
      });

      it('should send request data with every request', function () {
        const requests = spec.buildRequests(bidRequests);
        const data = requests[0].data;
        expect(data.id).to.equal(bidRequests[0].requestId);

        expect(data.imp.id).to.equal(bidRequests[0].bidId);
        expect(data.imp.bidfloor).to.equal(bidRequests[0].params.bidfloor);
        expect(data.imp.secure).to.equal(1);
        expect(data.imp.displaymanager).to.equal('Prebid.js');
        expect(data.imp.displaymanagerver).to.equal('v.1.0.0');
        expect(data.imp.mediatype).to.equal('banner');
        expect(data.imp.banner).to.deep.equal({
          w: 300,
          h: 250
        });
        expect(data.publisherId).to.equal(utils.getBidIdParameter('publisherId', bidRequests[0].params));
        expect(data.tagId).to.equal(utils.getBidIdParameter('tagId', bidRequests[0].params));
        expect(data.placementId).to.equal(utils.getBidIdParameter('placementId', bidRequests[0].params));
        expect(data.device.w).to.equal(screen.width);
        expect(data.device.h).to.equal(screen.height);
        expect(data.device.make).to.equal(navigator.vendor ? navigator.vendor : '');
        expect(data.device.ua).to.equal(navigator.userAgent);
        expect(data.device.dnt).to.equal(navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1' || navigator.doNotTrack === 'yes' ? 1 : 0);
        expect(data.site).to.deep.equal({
          id: utils.getBidIdParameter('tagId', bidRequests[0].params),
          page: utils.getTopWindowLocation().href,
          domain: utils.getTopWindowLocation().host
        });

        expect(data.device.ua).to.equal(navigator.userAgent);
        expect(data.device.h).to.equal(screen.height);
        expect(data.device.w).to.equal(screen.width);

        expect(data.site.id).to.equal(bidRequests[0].params.tagId);
        expect(data.site.page).to.equal(utils.getTopWindowLocation().href);
        expect(data.site.domain).to.equal(utils.getTopWindowLocation().host);
      });
    });

    describe('interpretResponse', function () {
      it('should handle no bid response', function () {
        const response = spec.interpretResponse({ body: null }, { bidRequests });
        expect(response.length).to.equal(0);
      });

      it('should have at least one Seat Object', function () {
        const request = spec.buildRequests(bidRequests);
        const response = spec.interpretResponse(bidResponseEmptySeat, request);
        expect(response.length).to.equal(0);
      });

      it('should have at least one Bid Object', function () {
        const request = spec.buildRequests(bidRequests);
        const response = spec.interpretResponse(bidResponseEmptyBid, request);
        expect(response.length).to.equal(0);
      });

      it('should have impId in Bid Object', function () {
        const request = spec.buildRequests(bidRequests);
        const response = spec.interpretResponse(bidResponseNoImpId, request);
        expect(response.length).to.equal(0);
      });

      it('should handle valid response', function () {
        const request = spec.buildRequests(bidRequests);
        const response = spec.interpretResponse(bidResponses, request);
        expect(response).to.be.an('array').to.have.lengthOf(1);

        let bid = response[0];
        expect(bid).to.have.property('requestId', 'bid000');
        expect(bid).to.have.property('currency', 'USD');
        expect(bid).to.have.property('cpm', 0.99);
        expect(bid).to.have.property('creativeId', 'cr-65981');
        expect(bid).to.have.property('width', 300);
        expect(bid).to.have.property('height', 250);
        expect(bid).to.have.property('ttl', 300);
        expect(bid).to.have.property('ad', '<img src"https://www.imgurl.com" />');
      });
    });
  });
});
