import { isValidVideoBid } from 'src/video';
const utils = require('src/utils');

describe('video.js', () => {
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

    utils.getBidRequest.restore();
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

    utils.getBidRequest.restore();
  });

  it('validates valid outstream bids', () => {
    sinon.stub(utils, 'getBidRequest', () => ({
      bidder: 'appnexusAst',
      mediaTypes: {
        video: { context: 'outstream' },
      },
      renderer: {
        url: 'render.url',
        render: () => true,
      }
    }));

    const valid = isValidVideoBid({});

    expect(valid).to.be(true);

    utils.getBidRequest.restore();
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

    utils.getBidRequest.restore();
  });
});
