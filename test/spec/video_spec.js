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
        bidder: 'appnexusAst',
        mediaTypes: {
          video: { context: 'instream' }
        }
      }]
    }];
    const valid = isValidVideoBid(bid, bidRequests);
    expect(valid).to.be(true);
  });

  it('catches invalid instream bids', () => {
    const bid = {
      adId: '123abc'
    };
    const bidRequests = [{
      bids: [{
        bidId: '123abc',
        bidder: 'appnexusAst',
        mediaTypes: {
          video: { context: 'instream' }
        }
      }]
    }];
    const valid = isValidVideoBid(bid, bidRequests);
    expect(valid).to.be(false);
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
        bidder: 'appnexusAst',
        mediaTypes: {
          video: { context: 'outstream' }
        }
      }]
    }];
    const valid = isValidVideoBid(bid, bidRequests);
    expect(valid).to.be(true);
  });

  it('catches invalid outstream bids', () => {
    const bid = {
      adId: '123abc'
    };
    const bidRequests = [{
      bids: [{
        bidId: '123abc',
        bidder: 'appnexusAst',
        mediaTypes: {
          video: { context: 'outstream' }
        }
      }]
    }];
    const valid = isValidVideoBid(bid, bidRequests);
    expect(valid).to.be(false);
  });
});
