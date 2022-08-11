import {expect} from 'chai';
import {spec} from 'modules/videonowBidAdapter';

describe('videonowBidAdapter', function () {
  it('minimal params', function () {
    expect(spec.isBidRequestValid({
      bidder: 'videonow',
      params: {
        pId: 'advDesktopBillboard'
      }})).to.equal(true)
  })

  it('minimal params no placementId', function () {
    expect(spec.isBidRequestValid({
      bidder: 'videonow',
      params: {
        currency: `GBP`
      }})).to.equal(false)
  })

  it('generated_params common case', function () {
    const bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'videonow',
      params: {
        pId: 'advDesktopBillboard',
        currency: `GBP`
      },
      sizes: [[240, 400]]
    }];

    const request = spec.buildRequests(bidRequestData);
    const req_data = request[0].data;

    expect(req_data.places[0].id).to.equal(`bid1234`)
    expect(req_data.places[0].placementId).to.equal(`advDesktopBillboard`)
    expect(req_data.settings.currency).to.equal(`GBP`)
    expect(req_data.places[0].sizes[0][0]).to.equal(240);
    expect(req_data.places[0].sizes[0][1]).to.equal(400);
  });

  it('response_params common case', function () {
    const bidRequestData = {
      data: {
        bidId: 'bid1234'
      }
    };

    const serverResponse = {
      body: {
        bids: [
          {
            'displayCode': '<html><body>test html</body></html>',
            'id': '123456',
            'cpm': 375,
            'currency': 'RUB',
            'placementId': 'profileName',
            'codeType': 'js',
            'size': {
              'width': 640,
              'height': 480
            }
          }
        ]
      }
    };

    const bids = spec.interpretResponse(serverResponse, bidRequestData);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.requestId).to.equal('123456')
    expect(bid.cpm).to.equal(375);
    expect(bid.currency).to.equal('RUB');
    expect(bid.width).to.equal(640);
    expect(bid.height).to.equal(480);
    expect(bid.ad).to.equal('<html><body>test html</body></html>');
    expect(bid.creativeId).to.equal(`123456`)
    expect(bid.netRevenue).to.equal(true);
  });
})
