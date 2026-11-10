import { expect } from 'chai';
import * as utils from 'src/utils.js';
import { getNearestSizeBucket, normalizeSizeBuckets } from 'modules/videoModule/sizeBuckets.js';

describe('Video Module size buckets', function () {
  let logWarnStub;
  beforeEach(function () {
    logWarnStub = sinon.stub(utils, 'logWarn');
  });
  afterEach(function () {
    logWarnStub.restore();
  });

  describe('normalizeSizeBuckets', function () {
    it('returns null when unset, empty or not an array', function () {
      expect(normalizeSizeBuckets(undefined)).to.be.null;
      expect(normalizeSizeBuckets([])).to.be.null;
      expect(normalizeSizeBuckets({ w: 1, h: 1 })).to.be.null;
      expect(logWarnStub.calledOnce).to.be.true;
    });

    it('keeps valid entries in order, warning about the others', function () {
      expect(normalizeSizeBuckets([[1, 2], [-1, 2], [3, 4]])).to.eql([[1, 2], [3, 4]]);
      expect(logWarnStub.calledOnce).to.be.true;
    });
  });

  describe('getNearestSizeBucket', function () {
    it('picks the bucket with the smallest euclidean distance', function () {
      // [400, 300] is 100 away on both axes (distance ~141); [640, 360] is 140 away on width only
      expect(getNearestSizeBucket([500, 400], [[640, 360], [400, 300]])).to.eql([400, 300]);
      expect(getNearestSizeBucket([620, 350], [[400, 300], [640, 360], [640, 480]])).to.eql([640, 360]);
    });

    it('returns an exact match', function () {
      expect(getNearestSizeBucket([640, 480], [[640, 360], [640, 480]])).to.eql([640, 480]);
    });

    it('breaks ties in favor of the bucket listed first', function () {
      expect(getNearestSizeBucket([500, 500], [[400, 500], [600, 500]])).to.eql([400, 500]);
      expect(getNearestSizeBucket([500, 500], [[600, 500], [400, 500]])).to.eql([600, 500]);
    });

    it('returns a copy of the bucket', function () {
      const buckets = [[640, 480]];
      const result = getNearestSizeBucket([1, 1], buckets);
      result[0] = 1;
      expect(buckets[0]).to.eql([640, 480]);
    });
  });
});
