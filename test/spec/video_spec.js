import {fillVideoDefaults, isValidVideoBid, validateOrtbVideoFields} from 'src/video.js';
import {hook} from '../../src/hook.js';
import {stubAuctionIndex} from '../helpers/indexStub.js';
import * as utils from '../../src/utils.js';

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
});
