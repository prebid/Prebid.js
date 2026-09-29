import { baseImpressionVerifier, cachedVideoImpressionVerifier, PB_PREFIX } from 'modules/videoModule/videoImpressionVerifier.js';
import { vastXmlEditorFactory } from 'libraries/video/shared/vastXmlEditor.js';

let trackerMock;

function resetTrackerMock() {
  const model = {};
  trackerMock = {
    store: sinon.spy((key, value) => { model[key] = value; }),
    remove: sinon.spy(key => {
      const value = model[key];
      if (value) {
        delete model[key];
        return value;
      }
    })
  };
}

describe('Base Impression Verifier', function() {
  beforeEach(function () {
    resetTrackerMock();
  });
  describe('trackBid', function () {
    it('should generate uuid', function () {
      const baseVerifier = baseImpressionVerifier(trackerMock);
      const uuid = baseVerifier.trackBid({});
      expect(uuid.substring(0, 3)).to.equal(PB_PREFIX);
      expect(uuid.length).to.be.lessThan(16);
    });
  });

  describe('getBidIdentifiers', function () {
    it('should match ad id to uuid', function () {
      const baseVerifier = baseImpressionVerifier(trackerMock);
      const bid = { adId: 'a1', adUnitCode: 'u1' };
      const uuid = baseVerifier.trackBid(bid);
      const result = baseVerifier.getBidIdentifiers(uuid);
      expect(result).to.deep.equal({ adId: 'a1', adUnitCode: 'u1', requestId: undefined, auctionId: undefined });
      expect(trackerMock.remove.calledWith(uuid)).to.be.true;
    });

    it('should match uuid from wrapper ids', function () {
      const baseVerifier = baseImpressionVerifier(trackerMock);
      const bid = { adId: 'a2', adUnitCode: 'u2' };
      const uuid = baseVerifier.trackBid(bid);
      const result = baseVerifier.getBidIdentifiers(null, null, [uuid]);
      expect(trackerMock.remove.calledWith(uuid)).to.be.true;
      expect(result).to.deep.equal({ adId: 'a2', adUnitCode: 'u2', requestId: undefined, auctionId: undefined });
    });
  });
});

describe('Cached Video Impression Verifier', function () {
  const adUnitCode = 'test_ad_unit_code';
  const vastUrl = 'https://vast.example.com/tag';
  const inlineVastXml = '<VAST version="4.2"><Ad id="bidder_ad_id"><InLine><AdSystem>Test</AdSystem></InLine></Ad></VAST>';
  const impressionUrl = 'https://tracking.example.com/impression';
  const errorUrl = 'https://tracking.example.com/error';
  let verifier;

  function parseVast(vastXml) {
    return new DOMParser().parseFromString(vastXml, 'text/xml');
  }

  function adUnitWithTracking(tracking) {
    return { code: adUnitCode, video: { adServer: { tracking } } };
  }

  beforeEach(function () {
    resetTrackerMock();
    verifier = cachedVideoImpressionVerifier(vastXmlEditorFactory(), trackerMock);
  });

  it('should replace the Ad id of the vast xml with the tracking uuid', function () {
    const bid = { adId: 'a1', adUnitCode, vastXml: inlineVastXml };

    const uuid = verifier.trackBid(bid);

    expect(parseVast(bid.vastXml).querySelector('Ad').getAttribute('id')).to.equal(uuid);
  });

  it('should replace the Ad id of the vast xml even when the ad unit has no tracking config', function () {
    const bid = { adId: 'a1', adUnitCode, vastXml: inlineVastXml };
    const adUnit = { code: adUnitCode, video: {} };

    const uuid = verifier.trackBid(bid, adUnit);

    const vastDoc = parseVast(bid.vastXml);
    expect(vastDoc.querySelector('Ad').getAttribute('id')).to.equal(uuid);
    expect(vastDoc.querySelector('Impression')).to.be.null;
    expect(vastDoc.querySelector('Error')).to.be.null;
  });

  it('should build a vast wrapper with the tracking uuid when a vast url is provided', function () {
    const bid = { adId: 'a1', adUnitCode, vastUrl };

    const uuid = verifier.trackBid(bid);

    const vastDoc = parseVast(bid.vastXml);
    expect(vastDoc.querySelector('VAST').getAttribute('version')).to.equal('4.2');
    expect(vastDoc.querySelector('Ad').getAttribute('id')).to.equal(uuid);
    expect(vastDoc.querySelector('Wrapper VASTAdTagURI').textContent).to.equal(vastUrl);
  });

  it('should append the impression and error trackers from the ad unit tracking config', function () {
    const bid = { adId: 'a1', adUnitCode, vastXml: inlineVastXml };
    const adUnit = adUnitWithTracking({
      impression: { getUrl: () => impressionUrl, id: 'impression_id' },
      error: { getUrl: () => errorUrl }
    });

    verifier.trackBid(bid, adUnit);

    const vastDoc = parseVast(bid.vastXml);
    const impressionNode = vastDoc.querySelector('InLine Impression');
    expect(impressionNode.textContent).to.equal(impressionUrl);
    expect(impressionNode.getAttribute('id')).to.equal('impression_id');
    expect(vastDoc.querySelector('InLine Error').textContent).to.equal(errorUrl);
  });

  it('should generate the impression id from the bid ad id when not specified in the tracking config', function () {
    const bid = { adId: 'a1', adUnitCode, vastUrl };
    const adUnit = adUnitWithTracking({ impression: { getUrl: () => impressionUrl } });

    verifier.trackBid(bid, adUnit);

    expect(parseVast(bid.vastXml).querySelector('Impression').getAttribute('id')).to.equal('a1-impression');
  });

  it('should match the ad id of the cached vast to the tracked bid', function () {
    const bid = { adId: 'a1', adUnitCode, vastXml: inlineVastXml };
    verifier.trackBid(bid);
    const vastAdId = parseVast(bid.vastXml).querySelector('Ad').getAttribute('id');

    const result = verifier.getBidIdentifiers(vastAdId, 'https://ignored.example.com', []);

    expect(result).to.deep.equal({ adId: 'a1', adUnitCode, requestId: undefined, auctionId: undefined });
  });
});
