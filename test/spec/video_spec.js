import {fillVideoDefaults, isValidVideoBid} from 'src/video.js';
import {hook} from '../../src/hook.js';
import {stubAuctionIndex} from '../helpers/indexStub.js';

describe('video.js', function () {
  before(() => {
    hook.ready();
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
