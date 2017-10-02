import { isValidVideoBid } from 'src/video';
const utils = require('src/utils');

describe('video.js', () => {
  afterEach(() => {
    utils.getBidRequest.restore();
  });

  it('validates valid instream bids', () => {
    sinon.stub(utils, 'getBidRequest', () => ({
      bidder: 'appnexusAst',
      mediaTypes: {
        video: { context: 'instream' },
      },
    }));

    const valid = isValidVideoBid({
      vastUrl: 'http://www.example.com/vastUrl'
    });

    expect(valid).to.be(true);
  });

  it('catches invalid instream bids', () => {
    sinon.stub(utils, 'getBidRequest', () => ({
      bidder: 'appnexusAst',
      mediaTypes: {
        video: { context: 'instream' },
      },
    }));

    const valid = isValidVideoBid({});

    expect(valid).to.be(false);
  });

  it('validates valid outstream bids', () => {
    sinon.stub(utils, 'getBidRequest', () => ({
      bidder: 'appnexusAst',
      mediaTypes: {
        video: { context: 'outstream' },
      },
    }));

    const valid = isValidVideoBid({
      renderer: {
        url: 'render.url',
        render: () => true,
      }
    });

    expect(valid).to.be(true);
  });

  it('catches invalid outstream bids', () => {
    sinon.stub(utils, 'getBidRequest', () => ({
      bidder: 'appnexusAst',
      mediaTypes: {
        video: { context: 'outstream' },
      },
    }));

    const valid = isValidVideoBid({});

    expect(valid).to.be(false);
  });
});
