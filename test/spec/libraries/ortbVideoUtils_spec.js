import { expect } from 'chai';
import { buildOrtbVideo, getMergedVideoParams } from 'libraries/ortbVideoUtils/ortbVideoUtils.js';

describe('ortbVideoUtils', function () {
  describe('getMergedVideoParams', function () {
    it('returns an empty object when the bid has no video params at all', function () {
      expect(getMergedVideoParams({})).to.deep.equal({});
    });

    it('derives w and h from a single playerSize', function () {
      const bid = { mediaTypes: { video: { playerSize: [640, 480] } } };
      expect(getMergedVideoParams(bid)).to.deep.equal({ w: 640, h: 480, playerSize: [640, 480] });
    });

    it('derives w and h from the first of several playerSizes', function () {
      const bid = { mediaTypes: { video: { playerSize: [[640, 480], [300, 250]] } } };
      const params = getMergedVideoParams(bid);
      expect(params.w).to.equal(640);
      expect(params.h).to.equal(480);
    });

    it('lets mediaTypes.video override the derived size and params.video override everything', function () {
      const bid = {
        mediaTypes: { video: { playerSize: [640, 480], w: 1280, mimes: ['video/mp4'], skip: 0 } },
        params: { video: { skip: 1, minduration: 5 } }
      };
      expect(getMergedVideoParams(bid)).to.deep.equal({
        w: 1280,
        h: 480,
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        skip: 1,
        minduration: 5
      });
    });
  });

  describe('buildOrtbVideo', function () {
    const validators = {
      mimes: value => Array.isArray(value) && value.length > 0,
      skip: value => [0, 1].indexOf(value) !== -1,
      w: value => Number.isInteger(value),
      h: value => Number.isInteger(value)
    };

    it('keeps the listed params whose values pass validation', function () {
      const bid = { mediaTypes: { video: { playerSize: [640, 480], mimes: ['video/mp4'] } }, params: { video: { skip: 1 } } };
      expect(buildOrtbVideo(bid, validators)).to.deep.equal({ mimes: ['video/mp4'], skip: 1, w: 640, h: 480 });
    });

    it('drops params that fail validation and reports each one', function () {
      const onInvalid = sinon.spy();
      const bid = { mediaTypes: { video: { playerSize: [640, 480], mimes: [], skip: 2 } } };
      expect(buildOrtbVideo(bid, validators, onInvalid)).to.deep.equal({ w: 640, h: 480 });
      expect(onInvalid.args.map(call => call[0])).to.deep.equal(['mimes', 'skip']);
    });

    it('ignores params that are not in the validator list', function () {
      const bid = { mediaTypes: { video: { playerSize: [640, 480], context: 'outstream', battr: [1] } } };
      expect(buildOrtbVideo(bid, validators)).to.deep.equal({ w: 640, h: 480 });
    });

    it('does not require an onInvalid callback', function () {
      const bid = { mediaTypes: { video: { skip: 7 } } };
      expect(buildOrtbVideo(bid, validators)).to.deep.equal({});
    });

    it('returns an empty object when nothing matches', function () {
      expect(buildOrtbVideo({}, validators)).to.deep.equal({});
    });
  });
});
