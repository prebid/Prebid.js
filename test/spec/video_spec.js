import { isValidVideoBid } from 'src/video';

describe('video.js', () => {
  it('validates valid instream bids', () => {
    const bid = {
      adId: '123abc',
      vastUrl: 'http://www.example.com/vastUrl'
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

  it('catches invalid instream bids', () => {
    const bid = {
      adId: '123abc'
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

  it('catches invalid bids when prebid-cache is disabled', () => {
    const bidRequests = [{
      bids: [{
        bidder: 'vastOnlyVideoBidder',
        mediaTypes: { video: {} },
      }]
    }];

    const valid = isValidVideoBid({ vastXml: '<xml>vast</xml>' }, bidRequests);

    expect(valid).to.equal(false);
  });

  it('validates valid outstream bids', () => {
    const bid = {
      adId: '123abc',
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

  it('catches invalid outstream bids', () => {
    const bid = {
      adId: '123abc'
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
