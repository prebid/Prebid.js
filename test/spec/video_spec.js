import { isValidVideoBid } from 'src/video.js';

describe('video.js', function () {
  it('validates valid instream bids', function () {
    const bid = {
      adId: '456xyz',
      vastUrl: 'http://www.example.com/vastUrl',
      requestId: '123abc'
    };
    const bidRequests = [{
      bids: [{
        bidId: '123abc',
        bidder: 'appnexus',
        mediaTypes: {
          video: { context: 'instream' }
        }
      }]
    }];
    const valid = isValidVideoBid(bid, bidRequests);
    expect(valid).to.equal(true);
  });

  it('catches invalid instream bids', function () {
    const bid = {
      requestId: '123abc'
    };
    const bidRequests = [{
      bids: [{
        bidId: '123abc',
        bidder: 'appnexus',
        mediaTypes: {
          video: { context: 'instream' }
        }
      }]
    }];
    const valid = isValidVideoBid(bid, bidRequests);
    expect(valid).to.equal(false);
  });

  it('catches invalid bids when prebid-cache is disabled', function () {
    const bidRequests = [{
      bids: [{
        bidder: 'vastOnlyVideoBidder',
        mediaTypes: { video: {} },
      }]
    }];

    const valid = isValidVideoBid({ vastXml: '<xml>vast</xml>' }, bidRequests);

    expect(valid).to.equal(false);
  });

  it('validates valid outstream bids', function () {
    const bid = {
      requestId: '123abc',
      renderer: {
        url: 'render.url',
        render: () => true,
      }
    };
    const bidRequests = [{
      bids: [{
        bidId: '123abc',
        bidder: 'appnexus',
        mediaTypes: {
          video: { context: 'outstream' }
        }
      }]
    }];
    const valid = isValidVideoBid(bid, bidRequests);
    expect(valid).to.equal(true);
  });

  it('catches invalid outstream bids', function () {
    const bid = {
      requestId: '123abc'
    };
    const bidRequests = [{
      bids: [{
        bidId: '123abc',
        bidder: 'appnexus',
        mediaTypes: {
          video: { context: 'outstream' }
        }
      }]
    }];
    const valid = isValidVideoBid(bid, bidRequests);
    expect(valid).to.equal(false);
  });
});
