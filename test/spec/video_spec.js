import {fillVideoDefaults, isValidVideoBid, validateOrtbVideoFields} from 'src/video.js';
import {hook} from '../../src/hook.js';
import {stubAuctionIndex} from '../helpers/indexStub.js';
import * as utils from '../../src/utils.js';
import { syncOrtb2 } from '../../src/prebid.js';

describe('video.js', function () {
  let sandbox;
  let utilsMock;

  before(() => {
    hook.ready();
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    utilsMock = sandbox.mock(utils);
  })

  afterEach(() => {
    utilsMock.restore();
    sandbox.restore();
  });

  describe('fillVideoDefaults', () => {
    function fillDefaults(videoMediaType = {}) {
      const adUnit = {mediaTypes: {video: videoMediaType}};
      fillVideoDefaults(adUnit);
      return adUnit.mediaTypes.video;
    }

    describe('should set plcmt = 4 when', () => {
      it('context is "outstream"', () => {
        expect(fillDefaults({context: 'outstream'})).to.eql({
          context: 'outstream',
          plcmt: 4
        })
      });
      [2, 3, 4].forEach(placement => {
        it(`placemement is "${placement}"`, () => {
          expect(fillDefaults({placement})).to.eql({
            placement,
            plcmt: 4
          });
        })
      });
    });
    describe('should set plcmt = 2 when', () => {
      [2, 6].forEach(playbackmethod => {
        it(`playbackmethod is "${playbackmethod}"`, () => {
          expect(fillDefaults({playbackmethod})).to.eql({
            playbackmethod,
            plcmt: 2,
          });
        });
      });
    });
    describe('should not set plcmt when', () => {
      Object.entries({
        'it was set by pub (context=outstream)': {
          expected: 1,
          video: {
            context: 'outstream',
            plcmt: 1
          }
        },
        'it was set by pub (placement=2)': {
          expected: 1,
          video: {
            placement: 2,
            plcmt: 1
          }
        },
        'placement not in 2, 3, 4': {
          expected: undefined,
          video: {
            placement: 1
          }
        },
        'it was set by pub (playbackmethod=2)': {
          expected: 1,
          video: {
            plcmt: 1,
            playbackmethod: 2
          }
        }
      }).forEach(([t, {expected, video}]) => {
        it(t, () => {
          expect(fillDefaults(video).plcmt).to.eql(expected);
        })
      })
    })
  })

  describe('validateOrtbVideoFields', () => {
    it('remove incorrect ortb properties, and keep non ortb ones', () => {
      sandbox.spy(utils, 'logWarn');

      const mt = {
        content: 'outstream',

        mimes: ['video/mp4'],
        minduration: 5,
        maxduration: 15,
        startdelay: 0,
        maxseq: 0,
        poddur: 0,
        protocols: [7],
        w: 600,
        h: 480,
        podid: 'an-id',
        podseq: 0,
        rqddurs: [5],
        placement: 1,
        plcmt: 1,
        linearity: 1,
        skip: 0,
        skipmin: 3,
        skipafter: 3,
        sequence: 0,
        slotinpod: 0,
        mincpmpersec: 2.5,
        battr: [6, 7],
        maxextended: 0,
        minbitrate: 800,
        maxbitrate: 1000,
        boxingallowed: 1,
        playbackmethod: [1],
        playbackend: 1,
        delivery: [2],
        pos: 0,
        api: 6, // -- INVALID
        companiontype: [1, 2, 3],
        poddedupe: [1],

        otherOne: 'test',
      };

      const expected = {...mt};
      delete expected.api;

      const adUnit = {
        code: 'adUnitCode',
        mediaTypes: { video: mt }
      };
      validateOrtbVideoFields(adUnit);

      expect(adUnit.mediaTypes.video).to.eql(expected);
      sinon.assert.callCount(utils.logWarn, 1);
    });

    it('Early return when 1st param is not a plain object', () => {
      sandbox.spy(utils, 'logWarn');

      validateOrtbVideoFields();
      validateOrtbVideoFields([]);
      validateOrtbVideoFields(null);
      validateOrtbVideoFields('hello');
      validateOrtbVideoFields(() => {});

      sinon.assert.callCount(utils.logWarn, 5);
    });

    it('Calls onInvalidParam when a property is invalid', () => {
      const onInvalidParam = sandbox.spy();
      const adUnit = {
        code: 'adUnitCode',
        mediaTypes: {
          video: {
            content: 'outstream',
            mimes: ['video/mp4'],
            api: 6
          }
        }
      };
      validateOrtbVideoFields(adUnit, onInvalidParam);

      sinon.assert.calledOnce(onInvalidParam);
      sinon.assert.calledWith(onInvalidParam, 'api', 6, adUnit);
    });
  })

  describe('isValidVideoBid', () => {
    it('validates valid instream bids', function () {
      const bid = {
        adId: '456xyz',
        vastUrl: 'http://www.example.com/vastUrl',
        adUnitId: 'au'
      };
      const adUnits = [{
        adUnitId: 'au',
        mediaTypes: {
          video: {context: 'instream'}
        }
      }];
      const valid = isValidVideoBid(bid, {index: stubAuctionIndex({adUnits})});
      expect(valid).to.equal(true);
    });

    it('catches invalid instream bids', function () {
      const bid = {
        adUnitId: 'au'
      };
      const adUnits = [{
        adUnitId: 'au',
        mediaTypes: {
          video: {context: 'instream'}
        }
      }];
      const valid = isValidVideoBid(bid, {index: stubAuctionIndex({adUnits})});
      expect(valid).to.equal(false);
    });

    it('catches invalid bids when prebid-cache is disabled', function () {
      const adUnits = [{
        adUnitId: 'au',
        bidder: 'vastOnlyVideoBidder',
        mediaTypes: {video: {}},
      }];

      const valid = isValidVideoBid({ adUnitId: 'au', vastXml: '<xml>vast</xml>' }, {index: stubAuctionIndex({adUnits})});

      expect(valid).to.equal(false);
    });

    it('validates valid outstream bids', function () {
      const bid = {
        adUnitId: 'au',
        renderer: {
          url: 'render.url',
          render: () => true,
        }
      };
      const adUnits = [{
        adUnitId: 'au',
        mediaTypes: {
          video: {context: 'outstream'}
        }
      }];
      const valid = isValidVideoBid(bid, {index: stubAuctionIndex({adUnits})});
      expect(valid).to.equal(true);
    });

    it('validates valid outstream bids with a publisher defined renderer', function () {
      const bid = {
        adUnitId: 'au',
      };
      const adUnits = [{
        adUnitId: 'au',
        mediaTypes: {
          video: {
            context: 'outstream',
          }
        },
        renderer: {
          url: 'render.url',
          render: () => true,
        }
      }];
      const valid = isValidVideoBid(bid, {index: stubAuctionIndex({adUnits})});
      expect(valid).to.equal(true);
    });

    it('catches invalid outstream bids', function () {
      const bid = {
        adUnitId: 'au',
      };
      const adUnits = [{
        adUnitId: 'au',
        mediaTypes: {
          video: {context: 'outstream'}
        }
      }];
      const valid = isValidVideoBid(bid, {index: stubAuctionIndex({adUnits})});
      expect(valid).to.equal(false);
    });
  })

  describe('syncOrtb2', () => {
    if (!FEATURES.VIDEO) {
      return;
    }

    let logWarnSpy;

    beforeEach(function () {
      logWarnSpy = sinon.spy(utils, 'logWarn');
    });

    afterEach(function () {
      utils.logWarn.restore();
    });

    it('should properly sync fields if both present', () => {
      const adUnit = {
        mediaTypes: {
          video: {
            minduration: 500,
            maxduration: 1000,
            protocols: [1, 2, 3],
            linearity: 5, // should be overwritten with value from ortb2Imp
            w: 100,
            h: 200,
            foo: 'omitted_value' // should be omitted during copying - not part of video obj spec
          }
        },
        ortb2Imp: {
          video: {
            minbitrate: 10,
            maxbitrate: 50,
            delivery: [1, 2, 3, 4],
            linearity: 10,
            bar: 'omitted_value' // should be omitted during copying - not part of video obj spec
          }
        }
      };

      const expected = {
        mediaTypes: {
          video: {
            minduration: 500,
            maxduration: 1000,
            protocols: [1, 2, 3],
            w: 100,
            h: 200,
            minbitrate: 10,
            maxbitrate: 50,
            delivery: [1, 2, 3, 4],
            linearity: 10,
            foo: 'omitted_value'
          }
        },
        ortb2Imp: {
          video: {
            minduration: 500,
            maxduration: 1000,
            protocols: [1, 2, 3],
            w: 100,
            h: 200,
            minbitrate: 10,
            maxbitrate: 50,
            delivery: [1, 2, 3, 4],
            linearity: 10,
            bar: 'omitted_value'
          }
        }
      };

      syncOrtb2(adUnit, 'video');
      expect(adUnit).to.deep.eql(expected);

      assert.ok(logWarnSpy.calledOnce, 'expected warning was logged due to conflicting linearity');
    });

    it('should omit sync if video mediaType not present on adUnit', () => {
      const adUnit = {
        mediaTypes: {
          native: {
            fieldToOmit: 'omitted_value'
          }
        },
        ortb2Imp: {
          native: {
            fieldToOmit2: 'omitted_value'
          }
        }
      };

      syncOrtb2(adUnit, 'video');

      expect(adUnit.mediaTypes.video).to.be.undefined;
      expect(adUnit.ortb2Imp.video).to.be.undefined;
    });

    it('should properly sync if mediaTypes is not present on any of side', () => {
      const adUnit = {
        mediaTypes: {
          video: {
            minduration: 500,
            maxduration: 1000,
            protocols: [1, 2, 3],
            linearity: 5,
            w: 100,
            h: 200,
            foo: 'omitted_value'
          }
        },
        ortb2Imp: {
          // lack of video field
        }
      };

      const expected1 = {
        mediaTypes: {
          video: {
            minduration: 500,
            maxduration: 1000,
            protocols: [1, 2, 3],
            linearity: 5,
            w: 100,
            h: 200,
            foo: 'omitted_value'
          }
        },
        ortb2Imp: {
          video: {
            minduration: 500,
            maxduration: 1000,
            protocols: [1, 2, 3],
            linearity: 5,
            w: 100,
            h: 200,
          }
        }
      };

      syncOrtb2(adUnit, 'video');
      expect(adUnit).to.deep.eql(expected1);

      const adUnit2 = {
        mediaTypes: {
          // lack of video field
        },
        ortb2Imp: {
          video: {
            minduration: 500,
            maxduration: 1000,
            protocols: [1, 2, 3],
            linearity: 5,
            w: 100,
            h: 200,
            foo: 'omitted_value'
          }
        }
      };

      const expected2 = {
        mediaTypes: {
          video: {
            minduration: 500,
            maxduration: 1000,
            protocols: [1, 2, 3],
            linearity: 5,
            w: 100,
            h: 200,
          }
        },
        ortb2Imp: {
          video: {
            minduration: 500,
            maxduration: 1000,
            protocols: [1, 2, 3],
            linearity: 5,
            w: 100,
            h: 200,
            foo: 'omitted_value',
          }
        }
      };

      syncOrtb2(adUnit2, 'video');
      expect(adUnit2).to.deep.eql(expected2);
    });

    it('should not create empty video object on ortb2Imp if there was nothing to copy', () => {
      const adUnit2 = {
        mediaTypes: {
          video: {
            noOrtbVideoField1: 'value',
            noOrtbVideoField2: 'value'
          }
        },
        ortb2Imp: {
          // lack of video field
        }
      };
      syncOrtb2(adUnit2, 'video');
      expect(adUnit2.ortb2Imp.video).to.be.undefined
    });
  });
});
