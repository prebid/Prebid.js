import { baseImpressionVerifier, videoImpressionVerifier, PB_PREFIX, UUID_MARKER } from 'modules/videoModule/videoImpressionVerifier.js';

let trackerStore;
let trackerMock;

function initTracker() {
  trackerStore = {};
  trackerMock = {
    store: sinon.spy((key, value) => { trackerStore[key] = value; }),
    remove: sinon.spy((key) => {
      const val = trackerStore[key];
      if (val) {
        delete trackerStore[key];
      }
      return val;
    })
  };
}

describe('Base Impression Verifier', function() {
  beforeEach(function () {
    initTracker();
  });
  describe('trackBid', function () {
    it('should generate uuid', function () {
      const baseVerifier = baseImpressionVerifier(trackerMock);
      const uuid = baseVerifier.trackBid({});
      expect(uuid.substring(0, 3)).to.equal(PB_PREFIX);
      expect(uuid.length).to.be.lessThan(16);
      expect(trackerMock.store.calledOnce).to.be.true;
    });
  });

  describe('getBidIdentifiers', function () {
    it('should match ad id to uuid', function () {
      const baseVerifier = baseImpressionVerifier(trackerMock);
      const bid = { adId: 'a1', adUnitCode: 'u1', requestId: 'r1', auctionId: 'auc1' };
      const uuid = baseVerifier.trackBid(bid);
      const result = baseVerifier.getBidIdentifiers(uuid);
      expect(result).to.deep.equal(bid);
      expect(trackerMock.remove.calledWith(uuid)).to.be.true;
    });

    it('should match uuid in ad tag url', function () {
      const baseVerifier = baseImpressionVerifier(trackerMock);
      const bid = { adId: 'a2', adUnitCode: 'u2', requestId: 'r2', auctionId: 'auc2' };
      const uuid = baseVerifier.trackBid(bid);
      const url = `http://test.com?${UUID_MARKER}=${uuid}`;
      const result = baseVerifier.getBidIdentifiers(null, url);
      expect(result).to.deep.equal(bid);
    });

    it('should match uuid from wrapper ids', function () {
      const baseVerifier = baseImpressionVerifier(trackerMock);
      const bid = { adId: 'a3', adUnitCode: 'u3', requestId: 'r3', auctionId: 'auc3' };
      const uuid = baseVerifier.trackBid(bid);
      const wrapperIds = { [uuid]: true };
      const result = baseVerifier.getBidIdentifiers(null, null, wrapperIds);
      expect(result).to.deep.equal(bid);
    });
  });
});

describe('videoImpressionVerifier', function () {
  beforeEach(function () {
    initTracker();
  });

  it('appends uuid to vastUrl', function () {
    const vastXmlEditor = { getVastXmlWithTracking: sinon.spy() };
    const verifier = videoImpressionVerifier(vastXmlEditor, trackerMock);
    const bid = { vastUrl: 'http://example.com/ad' };
    const uuid = verifier.trackBid(bid);
    expect(bid.vastUrl).to.contain(`${UUID_MARKER}=${uuid}`);
    expect(uuid.substring(0, 3)).to.equal(PB_PREFIX);
  });

  it('adds tracking to vastXml when provided', function () {
    const vastXmlEditor = { getVastXmlWithTracking: sinon.stub().returns('newXml') };
    const verifier = videoImpressionVerifier(vastXmlEditor, trackerMock);
    const bid = { vastXml: '<VAST></VAST>' };
    const uuid = verifier.trackBid(bid);
    expect(vastXmlEditor.getVastXmlWithTracking.calledWith('<VAST></VAST>', uuid)).to.be.true;
    expect(bid.vastXml).to.equal('newXml');
  });

  it('returns nothing when no vast data is supplied', function () {
    const vastXmlEditor = { getVastXmlWithTracking: sinon.spy() };
    const verifier = videoImpressionVerifier(vastXmlEditor, trackerMock);
    const bid = {};
    const uuid = verifier.trackBid(bid);
    expect(uuid).to.equal(undefined);
  });
});

/*
const adUnitCode = 'test_ad_unit_code';
const sampleBid = {
  adId: 'test_ad_id',
  adUnitCode,
  vastUrl: 'test_ad_url'
};
const sampleAdUnit = {
  code: adUnitCode,
};

const expectedImpressionUrl = 'test_impression_url';
const expectedImpressionId = 'test_impression_id';
const expectedErrorUrl = 'test_error_url';
const expectedVastXml = 'test_xml';

it('should not modify the bid\'s adXml when the tracking config is omitted', function () {
  const adUnit = Object.assign({}, sampleAdUnit, { video: { adServer: { tracking: null } } });
  const pbGlobal = Object.assign({}, pbGlobalMock, { adUnits: [ adUnit ] });
  pbVideoFactory(null, () => ({}), pbGlobal, pbEvents);

  bidAdjustmentCb(sampleBid);
  // expect(vastXmlEditorMock.getVastXmlWithTrackingNodes.called).to.be.false;
  // expect(vastXmlEditorMock.buildVastWrapper.called).to.be.false;
});

it('should request a vast wrapper when only an ad url is provided', function () {
  const adUnit = Object.assign({}, sampleAdUnit, { video: { adServer: { tracking: { } } } });
  const pbGlobal = Object.assign({}, pbGlobalMock, { adUnits: [ adUnit ] });
  pbVideoFactory(null, () => ({}), pbGlobal, pbEvents);

  bidAdjustmentCb(sampleBid);
  // expect(vastXmlEditorMock.getVastXmlWithTrackingNodes.called).to.be.false;
  // expect(vastXmlEditorMock.buildVastWrapper.called).to.be.true;
});

it('should request the addition of tracking nodes when an ad xml is provided', function () {
  const adUnit = Object.assign({}, sampleAdUnit, { video: { adServer: { tracking: { } } } });
  const pbGlobal = Object.assign({}, pbGlobalMock, { adUnits: [ adUnit ] });
  pbVideoFactory(null, () => ({}), pbGlobal, pbEvents);

  const bid = Object.assign({}, sampleBid, { vastXml: 'test_xml' });
  bidAdjustmentCb(bid);
  // expect(vastXmlEditorMock.getVastXmlWithTrackingNodes.called).to.be.true;
  // expect(vastXmlEditorMock.buildVastWrapper.called).to.be.false;
});

it('should pass the tracking information as args to the xml editing function', function () {
  const adUnit = Object.assign({}, sampleAdUnit, { video: { adServer: { tracking: {
    impression: {
      url: expectedImpressionUrl,
      id: expectedImpressionId
    },
    error: {
      url: expectedErrorUrl
    }
  } } } });
  const pbGlobal = Object.assign({}, pbGlobalMock, { adUnits: [ adUnit ] });
  pbVideoFactory(null, () => ({}), pbGlobal, pbEvents);

  const bid = Object.assign({}, sampleBid, { vastXml: expectedVastXml });
  bidAdjustmentCb(bid);
  // expect(vastXmlEditorMock.getVastXmlWithTrackingNodes.called).to.be.true;
  // expect(vastXmlEditorMock.getVastXmlWithTrackingNodes.calledWith(expectedVastXml, expectedImpressionUrl, expectedImpressionId, expectedErrorUrl))
  // expect(vastXmlEditorMock.buildVastWrapper.called).to.be.false;
});

it('should generate the impression id when not specified in config', function () {
  const adUnit = Object.assign({}, sampleAdUnit, { video: { adServer: { tracking: {
    impression: {
      url: expectedImpressionUrl,
    },
    error: {
      url: expectedErrorUrl
    }
  } } } });
  const pbGlobal = Object.assign({}, pbGlobalMock, { adUnits: [ adUnit ] });
  pbVideoFactory(null, () => ({}), pbGlobal, pbEvents);

  const bid = Object.assign({}, sampleBid, { vastXml: expectedVastXml });
  bidAdjustmentCb(bid);
  const expectedGeneratedId = sampleBid.adId + '-impression';
  // expect(vastXmlEditorMock.getVastXmlWithTrackingNodes.called).to.be.true;
  // expect(vastXmlEditorMock.getVastXmlWithTrackingNodes.calledWith(expectedVastXml, expectedImpressionUrl, expectedGeneratedId, expectedErrorUrl))
  // expect(vastXmlEditorMock.buildVastWrapper.called).to.be.false;
});
*/
