import { expect } from 'chai';
import { spec } from 'modules/truereachBidAdapter.js';

describe('truereachBidAdapterTests', function () {
  it('validate_pub_params', function () {
    expect(spec.isBidRequestValid({
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      bidder: 'truereach',
      params: {
        site_id: '0142010a-8400-1b01-72cb-a553b9000009',
        bidfloor: 0.1
      }
    })).to.equal(true);
  });

  it('validate_generated_params', function () {
    let bidRequestData = [{
      bidId: '34ce3f3b15190a',
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      bidder: 'truereach',
      params: {
        site_id: '0142010a-8400-1b01-72cb-a553b9000009',
        bidfloor: 0.1
      },
      sizes: [[300, 250]]
    }];

    let request = spec.buildRequests(bidRequestData, {});
    let req_data = request.data;

    expect(request.method).to.equal('POST');
    expect(req_data.imp[0].id).to.equal('34ce3f3b15190a');
    expect(req_data.imp[0].banner.w).to.equal(300);
    expect(req_data.imp[0].banner.h).to.equal(250);
    expect(req_data.imp[0].bidfloor).to.equal(0);
  });

  it('validate_response_params', function () {
    let serverResponse = {
      body: {
        'id': '34ce3f3b15190a',
        'seatbid': [{
          'bid': [{
            'id': '0142010a-8400-0801-72dc-04a99e6f7fc0:1ed',
            'impid': '34ce3f3b15190a',
            'price': 2.55,
            'adm': '<html></html>',
            'adid': '493',
            'adomain': ['https://www.momagic.com/'],
            'iurl': '',
            'cid': '260',
            'crid': '0142010a-8400-1b01-72cb-afb296000012',
            'w': 300,
            'h': 250
          }]
        }],
        'bidid': '0142010a-8400-0801-72dc-04a99e6f7fc1',
        'cur': 'USD'
      }
    };

    let bids = spec.interpretResponse(serverResponse, {});
    expect(bids).to.have.lengthOf(1);
    let bid = bids[0];
    expect(bid.requestId).to.equal('34ce3f3b15190a');
    expect(bid.cpm).to.equal(2.55);
    expect(bid.currency).to.equal('USD');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.ad).to.equal('<html></html>');
    expect(bid.ttl).to.equal(180);
    expect(bid.creativeId).to.equal('0142010a-8400-1b01-72cb-afb296000012');
    expect(bid.netRevenue).to.equal(false);
    expect(bid.meta.advertiserDomains[0]).to.equal('https://www.momagic.com/');
  });

  describe('user_sync', function() {
    const user_sync_url = 'http://ads.momagic.com/jsp/usersync.jsp';
    it('register_iframe_pixel_if_iframeEnabled_is_true', function() {
      let syncs = spec.getUserSyncs(
        {iframeEnabled: true}
      );
      expect(syncs).to.be.an('array');
      expect(syncs.length).to.equal(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal(user_sync_url);
    });

    it('if_pixelEnabled_is_true', function() {
      let syncs = spec.getUserSyncs(
        {pixelEnabled: true}
      );
      expect(syncs).to.be.an('array');
      expect(syncs.length).to.equal(0);
    });
  });
});
