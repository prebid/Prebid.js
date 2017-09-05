import useSandbox from 'test/mocks/sandbox';
import { isValidVideoBid } from 'src/video';
const utils = require('src/utils');

describe('video.js', () => {
  const getSandbox = useSandbox()

  it('validates valid instream bids', () => {
    getSandbox().stub(utils, 'getBidRequest').callsFake(() => ({
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
    getSandbox().stub(utils, 'getBidRequest').callsFake(() => ({
      bidder: 'appnexusAst',
      mediaTypes: {
        video: { context: 'instream' },
      },
    }));

    const valid = isValidVideoBid({});

    expect(valid).to.be(false);
  });

  it('validates valid outstream bids', () => {
    getSandbox().stub(utils, 'getBidRequest').callsFake(() => ({
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
    getSandbox().stub(utils, 'getBidRequest').callsFake(() => ({
      bidder: 'appnexusAst',
      mediaTypes: {
        video: { context: 'outstream' },
      },
    }));

    const valid = isValidVideoBid({});

    expect(valid).to.be(false);
  });
});
