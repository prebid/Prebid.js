import { expect } from 'chai';
import { spec } from 'modules/tribeosBidAdapter.js';

describe('tribeosBidAdapter', function() {
  describe('isBidRequestValid', function() {
    it('should return true if all parameters are passed', function() {
      expect(spec.isBidRequestValid({
        bidder: 'tribeos',
        params: {
          placementId: '12345'
        }
      })).to.equal(true);
    });

    it('should return false is placementId is missing', function() {
      expect(spec.isBidRequestValid({
        bidder: 'tribeos',
        params: {}
      })).to.equal(false);
    });
  });

  it('validate bid request data from backend', function() {
    let bidRequestData = [{
      bidId: 'bid12',
      bidder: 'tribeos',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250]
          ],
        }
      },
      params: {
        placementId: 'test-bid'
      }
    }];

    let request = spec.buildRequests(bidRequestData);
    let payload = JSON.parse(request[0].data);

    expect(payload.bidId).to.equal('bid12');
  });

  it('validate response parameters', function() {
    let bidRequestData = {
      data: {
        bidId: '21f3e9c3ce92f2'
      }
    };

    let serverResponse = {
      body: {
        'id': '5e23a6c74314aa782328376f5954',
        'bidid': '5e23a6c74314aa782328376f5954',
        'seatbid': [{
          'bid': [{
            'id': '5e23a6c74314aa782328376f5954',
            'impid': '21f3e9c3ce92f2',
            'price': 1.1,
            'adid': '5e23a6c74314aa782328376f5954',
            'adm': '<html></html>',
            'cid': '5e1eea895d37673aef2134825195rnd2',
            'crid': '5e0b71e6823bb66fcb6c9858',
            'h': 250,
            'w': 300
          }],
          'seats': '1'
        }],
        'cur': 'USD'
      }
    };

    let bids = spec.interpretResponse(serverResponse, bidRequestData);
    expect(bids).to.have.lengthOf(1);
    let bid = bids[0];

    expect(bid.cpm).to.equal(1.1);
    expect(bid.currency).to.equal('USD');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.netRevenue).to.equal(true);
    expect(bid.requestId).to.equal('21f3e9c3ce92f2');
    expect(bid.ad).to.equal('<html></html>');
  });
});
