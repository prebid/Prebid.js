import {fillVideoImp, fillVideoResponse, VALIDATIONS} from '../../../libraries/ortbConverter/processors/video.js';
import {BANNER, VIDEO} from '../../../src/mediaTypes.js';

describe('pbjs -> ortb video conversion', () => {
  [
    {
      t: 'non-video request',
      request: {
        mediaTypes: {
          banner: {}
        }
      },
      imp: {}
    },
    {
      t: 'instream video request',
      request: {
        mediaTypes: {
          video: {
            playerSize: [[1, 2]],
            context: 'instream',
            mimes: ['video/mp4'],
            skip: 1,
          }
        }
      },
      imp: {
        video: {
          w: 1,
          h: 2,
          mimes: ['video/mp4'],
          skip: 1,
          placement: 1,
        },
      },
    },
    {
      t: 'outstream video request',
      request: {
        mediaTypes: {
          video: {
            playerSize: [[1, 2]],
            context: 'outstream',
            mimes: ['video/mp4'],
            skip: 1
          }
        }
      },
      imp: {
        video: {
          w: 1,
          h: 2,
          mimes: ['video/mp4'],
          skip: 1,
        },
      },
    },
    {
      t: 'video request with explicit placement',
      request: {
        mediaTypes: {
          video: {
            playerSize: [[1, 2]],
            placement: 'explicit'
          }
        }
      },
      imp: {
        video: {
          w: 1,
          h: 2,
          placement: 'explicit',
        }
      }
    },
    {
      t: 'video request with multiple playerSizes',
      request: {
        mediaTypes: {
          video: {
            playerSize: [[1, 2], [3, 4]]
          }
        }
      },
      imp: {
        video: {
          w: 1,
          h: 2,
        }
      }
    },
    {
      t: 'video request with 2-tuple playerSize',
      request: {
        mediaTypes: {
          video: {
            playerSize: [1, 2]
          }
        }
      },
      imp: {
        video: {
          w: 1,
          h: 2,
        }
      }
    },
    {
      t: 'video request with invalid skip',
      request: {
        mediaTypes: {
          video: {
            context: 'instream',
            skip: 'invalid',
            skipmin: 1,
            skipafter: 2
          }
        }
      },
      imp: {
        video: {
          placement: 1,
        }
      }
    }
  ].forEach(({t, request, imp}) => {
    it(`can handle ${t}`, () => {
      const actual = {};
      fillVideoImp(actual, request, {});
      expect(actual).to.eql(imp);
    });
  });

  it('should keep ortb2Imp.video', () => {
    const imp = {
      video: {
        someParam: 'someValue'
      }
    };
    fillVideoImp(imp, {mediaTypes: {video: {playerSize: [[1, 2]]}}}, {});
    expect(imp.video.someParam).to.eql('someValue');
  });

  it('does nothing is context.mediaType is set but is not VIDEO', () => {
    const imp = {};
    fillVideoImp(imp, {mediaTypes: {video: {playerSize: [[1, 2]]}}}, {mediaType: BANNER});
    expect(imp).to.eql({});
  });

  describe('validations', () => {
    describe('skip', () => {
      Object.entries({
        'not set': 0,
        'invalid': 'invalid'
      }).forEach(([t, skip]) => {
        it(`should move skip attributes when skip is ${t}`, () => {
          const video = {
            skip,
            skipmin: 123,
            skipafter: 321
          }
          VALIDATIONS.skip(video, skip);
          expect(video.skipmin).to.not.exist;
          expect(video.skipafter).to.not.exist;
        })
      });
      it('should remove skip if invalid', () => {
        const video = {
          skip: 'invalid'
        }
        VALIDATIONS.skip(video, video.skip);
        expect(video).to.eql({});
      })
    });
  })
});

describe('ortb -> pbjs video conversion', () => {
  [
    {
      t: 'non-video response',
      seatbid: {},
      response: {
        mediaType: BANNER
      },
      expected: {
        mediaType: BANNER
      }
    },
    {
      t: 'simple video response',
      seatbid: {
        adm: 'mockAdm',
        nurl: 'mockNurl'
      },
      response: {
        mediaType: VIDEO,
      },
      context: {
        imp: {
          video: {
            w: 1,
            h: 2
          }
        }
      },
      expected: {
        mediaType: VIDEO,
        playerWidth: 1,
        playerHeight: 2,
        vastXml: 'mockAdm',
        vastUrl: 'mockNurl'
      }
    },
    {
      t: 'video response without playerSize',
      seatbid: {},
      response: {
        mediaType: VIDEO,
      },
      context: {
        imp: {}
      },
      expected: {
        mediaType: VIDEO
      }
    }
  ].forEach(({t, seatbid, context, response, expected}) => {
    it(`can handle ${t}`, () => {
      fillVideoResponse(response, seatbid, context);
      expect(response).to.eql(expected);
    })
  })
})
