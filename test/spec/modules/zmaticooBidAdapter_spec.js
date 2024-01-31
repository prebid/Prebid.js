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
  const videoRequest = [{
    bidId: '1234511',
    auctionId: '223',
    mediaTypes: {
      video: {
        playerSize: [480, 320],
        mimes: ['video/mp4'],
        context: 'instream',
        placement: 1,
        maxduration: 30,
        minduration: 15,
        pos: 1,
        startdelay: 10,
        protocols: [2, 3],
        api: [2, 3],
        playbackmethod: [2, 6],
        skip: 10,
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
  it('Test the video request validation function', function () {
    const validBid = spec.isBidRequestValid(videoRequest[0]);
    const invalidBid = spec.isBidRequestValid(null);
    expect(validBid).to.be.true;
    expect(invalidBid).to.be.false;
  });
  it('Test the video request processing function', function () {
    const request = spec.buildRequests(videoRequest, videoRequest[0]);
    expect(request).to.not.be.empty;
    const payload = request.data;
    expect(payload).to.not.be.empty;
  });
  it('Test video object', function () {
    const request = spec.buildRequests(videoRequest, videoRequest[0]);
    const payload = JSON.parse(request.data);
    expect(payload.imp[0].video.minduration).to.eql(videoRequest[0].mediaTypes.video.minduration);
    expect(payload.imp[0].video.maxduration).to.eql(videoRequest[0].mediaTypes.video.maxduration);
    expect(payload.imp[0].video.protocols).to.eql(videoRequest[0].mediaTypes.video.protocols);
    expect(payload.imp[0].video.mimes).to.eql(videoRequest[0].mediaTypes.video.mimes);
    expect(payload.imp[0].video.w).to.eql(480);
    expect(payload.imp[0].video.h).to.eql(320);
    expect(payload.imp[0].banner).to.be.undefined;
  });
  it('Test the banner request validation function', function () {
    const validBid = spec.isBidRequestValid(bannerRequest[0]);
    const invalidBid = spec.isBidRequestValid(null);

    expect(validBid).to.be.true;
    expect(invalidBid).to.be.false;
  });
  it('Test the banner request processing function', function () {
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
