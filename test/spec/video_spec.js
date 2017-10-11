import { isValidVideoBid } from 'src/video';
import { auctionManager } from 'src/auctionManager';

describe('video.js', () => {
  afterEach(() => {
	  auctionManager.getBidsRequested.restore();
  });

  it('validates valid instream bids', () => {
	  sinon.stub(auctionManager, 'getBidsRequested', () => [
		  {
			  bids: [{
				  bidId: '123abc',
				  bidder: 'appnexusAst',
				  mediaTypes: {
					  video: { context: 'instream' }
				  }
			  }]
		  }
	  ]);

    const valid = isValidVideoBid({
	    adId: '123abc',
      vastUrl: 'http://www.example.com/vastUrl'
    });

    expect(valid).to.be(true);
  });

  it('catches invalid instream bids', () => {
	  sinon.stub(auctionManager, 'getBidsRequested', () => [
		  {
			  bids: [{
				  bidId: '123abc',
				  bidder: 'appnexusAst',
				  mediaTypes: {
					  video: { context: 'instream' }
				  }
			  }]
		  }
	  ]);

    const valid = isValidVideoBid({
	    adId: '123abc'
    });

    expect(valid).to.be(false);
  });

  it('validates valid outstream bids', () => {
	  sinon.stub(auctionManager, 'getBidsRequested', () => [
		  {
			  bids: [{
				  bidId: '123abc',
				  bidder: 'appnexusAst',
				  mediaTypes: {
					  video: { context: 'outstream' }
				  }
			  }]
		  }
	  ]);

    const valid = isValidVideoBid({
	    adId: '123abc',
      renderer: {
        url: 'render.url',
        render: () => true,
      }
    });

    expect(valid).to.be(true);
  });

  it('catches invalid outstream bids', () => {
	  sinon.stub(auctionManager, 'getBidsRequested', () => [
		  {
			  bids: [{
				  bidId: '123abc',
				  bidder: 'appnexusAst',
				  mediaTypes: {
					  video: { context: 'outstream' }
				  }
			  }]
		  }
	  ]);

    const valid = isValidVideoBid({
	    adId: '123abc'
    });

    expect(valid).to.be(false);
  });
});
