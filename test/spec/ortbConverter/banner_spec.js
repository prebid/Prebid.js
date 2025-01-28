import {fillBannerImp, bannerResponseProcessor} from '../../../libraries/ortbConverter/processors/banner.js';
import {BANNER, VIDEO} from '../../../src/mediaTypes.js';
import {inIframe} from '../../../src/utils.js';

const topframe = inIframe() ? 0 : 1;

describe('pbjs -> ortb banner conversion', () => {
  [
    {
      t: 'non-banner request',
      request: {
        mediaTypes: {
          video: {}
        }
      },
      imp: {}
    },
    {
      t: 'banner with no sizes',
      request: {
        mediaTypes: {
          banner: {
            pos: 'pos',
          }
        }
      },
      imp: {
        banner: {
          topframe,
          pos: 'pos',
        }
      }
    },
    {
      t: 'single size banner',
      request: {
        mediaTypes: {
          banner: {
            sizes: [1, 2],
          }
        }
      },
      imp: {
        banner: {
          format: [
            {w: 1, h: 2}
          ],
          topframe,
        }
      }
    },
    {
      t: 'multi size banner',
      request: {
        mediaTypes: {
          banner: {
            sizes: [[1, 2], [3, 4]]
          }
        }
      },
      imp: {
        banner: {
          format: [
            {w: 1, h: 2},
            {w: 3, h: 4}
          ],
          topframe,
        }
      }
    },
    {
      t: 'banner with pos param',
      request: {
        mediaTypes: {
          banner: {
            sizes: [1, 2],
            pos: 'pos'
          }
        }
      },
      imp: {
        banner: {
          format: [
            {w: 1, h: 2}
          ],
          pos: 'pos',
          topframe,
        }
      },
    },
    {
      t: 'banner with pos 0',
      request: {
        mediaTypes: {
          banner: {
            sizes: [1, 2],
            pos: 0
          }
        }
      },
      imp: {
        banner: {
          format: [
            {w: 1, h: 2}
          ],
          pos: 0,
          topframe,
        }
      }
    }
  ].forEach(({t, request, imp}) => {
    it(`can convert ${t}`, () => {
      const actual = {};
      fillBannerImp(actual, request, {});
      expect(actual).to.eql(imp);
    });
  });

  it('should keep ortb2Imp.banner', () => {
    const imp = {
      banner: {
        someParam: 'someValue'
      }
    };
    fillBannerImp(imp, {mediaTypes: {banner: {sizes: [1, 2]}}}, {});
    expect(imp.banner.someParam).to.eql('someValue');
  });

  it('does nothing if context.mediaType is set but is not BANNER', () => {
    const imp = {};
    fillBannerImp(imp, {mediaTypes: {banner: {sizes: [1, 2]}}}, {mediaType: VIDEO});
    expect(imp).to.eql({});
  })
});

describe('ortb -> pbjs banner conversion', () => {
  let createPixel, seatbid2Banner;
  beforeEach(() => {
    createPixel = sinon.stub().callsFake((url) => `${url}Pixel`);
    seatbid2Banner = bannerResponseProcessor({createPixel});
  });

  [
    {
      t: 'non-banner request',
      seatbid: {
        adm: 'mockAdm',
        nurl: 'mockNurl'
      },
      response: {
        mediaType: VIDEO
      },
      expected: {
        mediaType: VIDEO
      }
    },
    {
      t: 'response with both adm and nurl',
      seatbid: {
        adm: 'mockAdm',
        nurl: 'mockUrl'
      },
      response: {
        mediaType: BANNER,
      },
      expected: {
        mediaType: BANNER,
        ad: 'mockAdmmockUrlPixel'
      }
    },
    {
      t: 'response with just adm',
      seatbid: {
        adm: 'mockAdm'
      },
      response: {
        mediaType: BANNER,
      },
      expected: {
        mediaType: BANNER,
        ad: 'mockAdm'
      }
    },
    {
      t: 'response with just nurl',
      seatbid: {
        nurl: 'mockNurl'
      },
      response: {
        mediaType: BANNER
      },
      expected: {
        mediaType: BANNER,
        adUrl: 'mockNurl'
      }
    }
  ].forEach(({t, seatbid, response, expected}) => {
    it(`can handle ${t}`, () => {
      seatbid2Banner(response, seatbid, context);
      expect(response).to.eql(expected)
    })
  });
})
