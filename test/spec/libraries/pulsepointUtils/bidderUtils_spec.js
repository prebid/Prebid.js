import { expect } from 'chai';
import {
  slotUnknownParams,
  processImp,
  processBidResponse,
  DEFAULT_TMAX
} from 'libraries/pulsepointUtils/bidderUtils.js';

describe('PulsePoint Utils', function () {
  describe('slotUnknownParams', function () {
    const KNOWN_PARAMS_TEST = ['kp1', 'kp2'];

    it('should return null if no unknown params', function () {
      const slot = { params: { kp1: 'v1', kp2: 'v2' } };
      expect(slotUnknownParams(slot, KNOWN_PARAMS_TEST)).to.be.null;
    });

    it('should return an object with unknown params under "prebid" key', function () {
      const slot = { params: { kp1: 'v1', ukp1: 'uv1', ukp2: 'uv2' } };
      const expected = { prebid: { ukp1: 'uv1', ukp2: 'uv2' } };
      expect(slotUnknownParams(slot, KNOWN_PARAMS_TEST)).to.deep.equal(expected);
    });

    it('should return null if all params are known', function () {
      const slot = { params: { kp1: 'v1' } };
      expect(slotUnknownParams(slot, KNOWN_PARAMS_TEST)).to.be.null;
    });

    it('should return null for empty params object', function () {
      const slot = { params: {} };
      expect(slotUnknownParams(slot, KNOWN_PARAMS_TEST)).to.be.null;
    });

    it('should return all params if KNOWN_PARAMS is empty', function () {
      const slot = { params: { p1: 'v1', p2: 'v2' } };
      const expected = { prebid: { p1: 'v1', p2: 'v2' } };
      expect(slotUnknownParams(slot, [])).to.deep.equal(expected);
    });
  });

  describe('processImp', function () {
    const KNOWN_PARAMS_IMP_TEST = ['knownImpParam'];
    const MOCK_CONTEXT = {};
    let mockBuildImp;

    beforeEach(function () {
      mockBuildImp = sinon.stub();
    });

    it('should correctly process a basic bidRequest with ct, battr, and deals', function () {
      mockBuildImp.returns({ id: 'impId', banner: {} });
      const bidRequest = {
        params: {
          ct: 'tag123',
          knownImpParam: 'value1',
          unknownParam1: 'uvalue1',
          battr: [1, 2],
          deals: [{ id: 'deal1' }]
        }
      };
      const result = processImp(mockBuildImp, bidRequest, MOCK_CONTEXT, KNOWN_PARAMS_IMP_TEST);

      expect(mockBuildImp.calledWith(bidRequest, MOCK_CONTEXT)).to.be.true;
      expect(result.id).to.equal('impId');
      expect(result.tagid).to.equal('tag123');
      expect(result.ext).to.deep.equal({ prebid: { unknownParam1: 'uvalue1' } });
      expect(result.banner.battr).to.deep.equal([1, 2]);
      expect(result.pmp).to.deep.equal({ private_auction: 0, deals: [{ id: 'deal1' }] });
    });

    it('should correctly process a basic bidRequest with adzoneid', function () {
      mockBuildImp.returns({ id: 'impId', video: {} });
      const bidRequest = {
        params: {
          adzoneid: 'zone456',
          unknownParam2: 'uvalue2',
        }
      };
      const result = processImp(mockBuildImp, bidRequest, MOCK_CONTEXT, KNOWN_PARAMS_IMP_TEST);
      expect(result.tagid).to.equal('zone456');
      expect(result.ext).to.deep.equal({ prebid: { unknownParam2: 'uvalue2' } });
      expect(result.pmp).to.be.undefined;
      expect(result.video.battr).to.be.undefined;
    });

    it('should handle bidRequest without battr', function () {
      mockBuildImp.returns({ id: 'impId', banner: {} });
      const bidRequest = {
        params: {
          ct: 'tag123',
          deals: [{ id: 'deal1' }]
        }
      };
      const result = processImp(mockBuildImp, bidRequest, MOCK_CONTEXT, KNOWN_PARAMS_IMP_TEST);
      expect(result.banner.battr).to.be.undefined;
      expect(result.pmp).to.deep.equal({ private_auction: 0, deals: [{ id: 'deal1' }] });
    });

    it('should handle bidRequest without deals', function () {
      mockBuildImp.returns({ id: 'impId', native: {} });
      const bidRequest = {
        params: {
          ct: 'tag123',
          battr: [3, 4]
        }
      };
      const result = processImp(mockBuildImp, bidRequest, MOCK_CONTEXT, KNOWN_PARAMS_IMP_TEST);
      expect(result.native.battr).to.deep.equal([3, 4]);
      expect(result.pmp).to.be.undefined;
    });

    it('should handle battr for media types not present in imp', function () {
      mockBuildImp.returns({ id: 'impId', audio: {} }); // imp has audio, but battr might be requested for banner/video
      const bidRequest = {
        params: {
          ct: 'tag123',
          battr: [1, 2]
        }
      };
      const result = processImp(mockBuildImp, bidRequest, MOCK_CONTEXT, KNOWN_PARAMS_IMP_TEST);
      expect(result.audio.battr).to.deep.equal([1, 2]);
      // No error should occur if banner/video specific battr handling is there but imp[k] is undefined
    });

    it('should not set imp.pmp if deals is not an array', function () {
      mockBuildImp.returns({ id: 'impId' });
      const bidRequest = {
        params: {
          ct: 'tag123',
          deals: { id: 'notAnArray' } // Deals is an object, not an array
        }
      };
      const result = processImp(mockBuildImp, bidRequest, MOCK_CONTEXT, KNOWN_PARAMS_IMP_TEST);
      expect(result.pmp).to.be.undefined;
    });

    it('should merge unknownParams with existing imp.ext', function () {
      mockBuildImp.returns({ id: 'impId', ext: { existingExt: 'value' } });
      const bidRequest = {
        params: {
          ct: 'tag789',
          unknownParam3: 'uvalue3'
        }
      };
      const result = processImp(mockBuildImp, bidRequest, MOCK_CONTEXT, KNOWN_PARAMS_IMP_TEST);
      expect(result.ext).to.deep.equal({ existingExt: 'value', prebid: { unknownParam3: 'uvalue3' } });
    });

     it('should prefer ct over adzoneid if both present', function () {
      mockBuildImp.returns({ id: 'impId' });
      const bidRequest = {
        params: {
          ct: 'tagCT',
          adzoneid: 'tagAdZone'
        }
      };
      const result = processImp(mockBuildImp, bidRequest, MOCK_CONTEXT, KNOWN_PARAMS_IMP_TEST);
      expect(result.tagid).to.equal('tagCT');
    });

    it('should use adzoneid if ct is null/undefined', function () {
      mockBuildImp.returns({ id: 'impId' });
      let bidRequest = { params: { ct: null, adzoneid: 'tagAdZone' } };
      let result = processImp(mockBuildImp, bidRequest, MOCK_CONTEXT, KNOWN_PARAMS_IMP_TEST);
      expect(result.tagid).to.equal('tagAdZone');

      bidRequest = { params: { adzoneid: 'tagAdZone' } }; // ct is undefined
      result = processImp(mockBuildImp, bidRequest, MOCK_CONTEXT, KNOWN_PARAMS_IMP_TEST);
      expect(result.tagid).to.equal('tagAdZone');
    });

    it('should handle case where params.ct and params.adzoneid are not present', function () {
      mockBuildImp.returns({ id: 'impId' });
      const bidRequest = { params: {} };
      const result = processImp(mockBuildImp, bidRequest, MOCK_CONTEXT, KNOWN_PARAMS_IMP_TEST);
      expect(result.tagid).to.be.undefined;
    });
  });

  describe('processBidResponse', function () {
    const MOCK_DEFAULT_CURRENCY = 'USD';
    const MOCK_CONTEXT_BR = {};
    let mockBuildBidResponse;

    beforeEach(function () {
      mockBuildBidResponse = sinon.stub();
    });

    it('should use bid.cur if present', function () {
      mockBuildBidResponse.returns({ requestId: 'req1' });
      const bid = { id: 'bid1', cur: 'EUR' };
      const result = processBidResponse(mockBuildBidResponse, bid, MOCK_CONTEXT_BR, MOCK_DEFAULT_CURRENCY);

      expect(mockBuildBidResponse.calledWith(bid, MOCK_CONTEXT_BR)).to.be.true;
      expect(result.requestId).to.equal('req1');
      expect(result.cur).to.equal('EUR');
    });

    it('should use DEFAULT_CURRENCY if bid.cur is not present', function () {
      mockBuildBidResponse.returns({ requestId: 'req2' });
      const bid = { id: 'bid2' }; // cur is undefined
      const result = processBidResponse(mockBuildBidResponse, bid, MOCK_CONTEXT_BR, MOCK_DEFAULT_CURRENCY);

      expect(result.requestId).to.equal('req2');
      expect(result.cur).to.equal(MOCK_DEFAULT_CURRENCY);
    });

    it('should use DEFAULT_CURRENCY if bid.cur is null', function () {
      mockBuildBidResponse.returns({ requestId: 'req3' });
      const bid = { id: 'bid3', cur: null };
      const result = processBidResponse(mockBuildBidResponse, bid, MOCK_CONTEXT_BR, MOCK_DEFAULT_CURRENCY);
      expect(result.cur).to.equal(MOCK_DEFAULT_CURRENCY);
    });
  });

  describe('DEFAULT_TMAX', function () {
    it('should be 500', function () {
      expect(DEFAULT_TMAX).to.equal(500);
    });
  });
});
