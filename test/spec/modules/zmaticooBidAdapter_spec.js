import {spec} from '../../../modules/zmaticooBidAdapter.js'

describe('zMaticoo Bidder Adapter', function () {
  const bannerRequest = [{
    bidId: '1234511',
    auctionId: '223',
    mediaTypes: {
      banner: {
        sizes: [[320, 50]],
      }
    },
    refererInfo: {
      page: 'testprebid.com'
    },
    params: {
      user: {
        uid: '12345',
        buyeruid: '12345'
      },
      device: {
        ip: '111.222.33.44',
        geo: {
          country: 'USA'
        }
      },
      pubId: 'prebid-test',
      test: 1
    }
  }];

  it('Test the bid validation function', function () {
    const validBid = spec.isBidRequestValid(bannerRequest[0]);
    const invalidBid = spec.isBidRequestValid(null);

    expect(validBid).to.be.true;
    expect(invalidBid).to.be.false;
  });

  it('Test the request processing function', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    expect(request).to.not.be.empty;

    const payload = request.data;
    expect(payload).to.not.be.empty;
  });

  const responseBody = {
    id: '12345',
    seatbid: [
      {
        bid: [
          {
            id: 'auctionId',
            impid: 'impId',
            price: 0.0,
            adm: 'adMarkup',
            crid: 'creativeId',
            h: 50,
            w: 320
          }
        ]
      }
    ],
    cur: 'USD'
  };

  it('Test the response parsing function', function () {
    const receivedBid = responseBody.seatbid[0].bid[0];
    const response = {};
    response.body = responseBody;

    const bidResponse = spec.interpretResponse(response, null);
    expect(bidResponse).to.not.be.empty;

    const bid = bidResponse[0];
    expect(bid).to.not.be.empty;
    expect(bid.ad).to.equal(receivedBid.adm);
    expect(bid.cpm).to.equal(receivedBid.price);
    expect(bid.height).to.equal(receivedBid.h);
    expect(bid.width).to.equal(receivedBid.w);
    expect(bid.requestId).to.equal(receivedBid.impid);
  });
});
