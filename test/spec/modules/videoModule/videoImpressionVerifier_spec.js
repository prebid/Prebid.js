import { baseImpressionVerifier, cachedVideoImpressionVerifier, videoImpressionVerifier, videoImpressionVerifierFactory, PB_PREFIX, UUID_MARKER } from 'modules/videoModule/videoImpressionVerifier.js';
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

    it('should match the uuid marker of an absolute ad tag url', function () {
      const baseVerifier = baseImpressionVerifier(trackerMock);
      const uuid = baseVerifier.trackBid({ adId: 'a3', adUnitCode: 'u3' });
      const adTagUrl = `https://vast.example.com/tag?${UUID_MARKER}=${uuid}`;

      const result = baseVerifier.getBidIdentifiers(null, adTagUrl, []);

      expect(result).to.deep.equal({ adId: 'a3', adUnitCode: 'u3', requestId: undefined, auctionId: undefined });
    });

    it('should match the uuid marker of a relative ad tag url', function () {
      const baseVerifier = baseImpressionVerifier(trackerMock);
      const uuid = baseVerifier.trackBid({ adId: 'a3', adUnitCode: 'u3' });
      const adTagUrl = `/relative/tag.xml?${UUID_MARKER}=${uuid}`;

      const result = baseVerifier.getBidIdentifiers(null, adTagUrl, []);

      expect(result).to.deep.equal({ adId: 'a3', adUnitCode: 'u3', requestId: undefined, auctionId: undefined });
    });

    it('should match the uuid marker that follows other query params and precedes a fragment', function () {
      const baseVerifier = baseImpressionVerifier(trackerMock);
      const uuid = baseVerifier.trackBid({ adId: 'a3', adUnitCode: 'u3' });
      const adTagUrl = `https://vast.example.com/tag?cb=%%CACHEBUSTER%%&${UUID_MARKER}=${uuid}&foo=bar#section`;

      const result = baseVerifier.getBidIdentifiers(null, adTagUrl, []);

      expect(result).to.deep.equal({ adId: 'a3', adUnitCode: 'u3', requestId: undefined, auctionId: undefined });
    });

    it('should not match the uuid marker of an ad tag url nested in an encoded query param', function () {
      const baseVerifier = baseImpressionVerifier(trackerMock);
      const uuid = baseVerifier.trackBid({ adId: 'a3', adUnitCode: 'u3' });
      const nestedUrl = encodeURIComponent(`https://vast.example.com/tag?${UUID_MARKER}=${uuid}`);
      const adTagUrl = `https://adserver.example.com/ads?description_url=${nestedUrl}`;

      const result = baseVerifier.getBidIdentifiers(null, adTagUrl, []);

      expect(result).to.be.undefined;
    });

    it('should not match an ad tag url without the uuid marker', function () {
      const baseVerifier = baseImpressionVerifier(trackerMock);
      baseVerifier.trackBid({ adId: 'a3', adUnitCode: 'u3' });

      const result = baseVerifier.getBidIdentifiers(null, 'https://vast.example.com/tag?foo=bar', []);

      expect(result).to.be.undefined;
    });

    [undefined, null, '', 'not a url', '%%%', 123, {}, []].forEach(adTagUrl => {
      it(`should not throw nor match when the ad tag url is ${JSON.stringify(adTagUrl)}`, function () {
        const baseVerifier = baseImpressionVerifier(trackerMock);
        baseVerifier.trackBid({ adId: 'a3', adUnitCode: 'u3' });

        const result = baseVerifier.getBidIdentifiers(null, adTagUrl, []);

        expect(result).to.be.undefined;
      });
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

  it('should build a vast wrapper with the tracking uuid as Ad id and in the wrapped vast url', function () {
    const bid = { adId: 'a1', adUnitCode, vastUrl };

    const uuid = verifier.trackBid(bid);

    const vastDoc = parseVast(bid.vastXml);
    const expectedVastUrl = `${vastUrl}?${UUID_MARKER}=${uuid}`;
    expect(vastDoc.querySelector('VAST').getAttribute('version')).to.equal('4.2');
    expect(vastDoc.querySelector('Ad').getAttribute('id')).to.equal(uuid);
    expect(vastDoc.querySelector('Wrapper VASTAdTagURI').textContent).to.equal(expectedVastUrl);
    expect(bid.vastUrl).to.equal(expectedVastUrl);
  });

  it('should append the uuid marker to a vast url that already has query params', function () {
    const bid = { adId: 'a1', adUnitCode, vastUrl: `${vastUrl}?foo=bar` };

    const uuid = verifier.trackBid(bid);

    const wrappedUrl = new URL(parseVast(bid.vastXml).querySelector('VASTAdTagURI').textContent);
    expect(wrappedUrl.searchParams.get('foo')).to.equal('bar');
    expect(wrappedUrl.searchParams.get(UUID_MARKER)).to.equal(uuid);
  });

  it('should preserve the original query of the vast url when appending the uuid marker', function () {
    const vastUrlWithMacro = `${vastUrl}?cb=%%CACHEBUSTER%%&q=a%20b+c`;
    const bid = { adId: 'a1', adUnitCode, vastUrl: vastUrlWithMacro };

    const uuid = verifier.trackBid(bid);

    const expectedVastUrl = `${vastUrlWithMacro}&${UUID_MARKER}=${uuid}`;
    expect(parseVast(bid.vastXml).querySelector('VASTAdTagURI').textContent).to.equal(expectedVastUrl);
    expect(bid.vastUrl).to.equal(expectedVastUrl);
  });

  it('should append the uuid marker to a relative vast url', function () {
    const relativeVastUrl = '/relative/tag.xml';
    const bid = { adId: 'a1', adUnitCode, vastUrl: relativeVastUrl };

    const uuid = verifier.trackBid(bid);

    const vastDoc = parseVast(bid.vastXml);
    const expectedVastUrl = `${relativeVastUrl}?${UUID_MARKER}=${uuid}`;
    expect(vastDoc.querySelector('Ad').getAttribute('id')).to.equal(uuid);
    expect(vastDoc.querySelector('VASTAdTagURI').textContent).to.equal(expectedVastUrl);
    expect(bid.vastUrl).to.equal(expectedVastUrl);
  });

  it('should keep the bidder vast trackers in the vast wrapper built from the vast url', function () {
    const bidderImpressionUrl = 'https://bidder.example.com/impression';
    const bidderErrorUrl = 'https://bidder.example.com/error';
    const bidderStartUrl = 'https://bidder.example.com/start';
    const bid = {
      adId: 'a1',
      adUnitCode,
      vastUrl,
      vastTrackers: {
        impression: [bidderImpressionUrl],
        error: [bidderErrorUrl],
        trackingEvents: [{ event: 'start', url: bidderStartUrl }]
      }
    };

    verifier.trackBid(bid);

    const vastDoc = parseVast(bid.vastXml);
    const impressionUrls = Array.from(vastDoc.querySelectorAll('Wrapper > Impression')).map(node => node.textContent);
    const errorUrls = Array.from(vastDoc.querySelectorAll('Wrapper > Error')).map(node => node.textContent);
    const startTracker = vastDoc.querySelector('Wrapper Creatives Creative Linear TrackingEvents Tracking[event="start"]');
    expect(impressionUrls).to.deep.equal([bidderImpressionUrl]);
    expect(errorUrls).to.deep.equal([bidderErrorUrl]);
    expect(startTracker?.textContent).to.equal(bidderStartUrl);
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

    const result = verifier.getBidIdentifiers(vastAdId, 'https://adserver.example.com/tag', []);

    expect(result).to.deep.equal({ adId: 'a1', adUnitCode, requestId: undefined, auctionId: undefined });
  });

  it('should match the bid from the uuid marker of the loaded ad tag url', function () {
    const bid = { adId: 'a1', adUnitCode, vastUrl };
    verifier.trackBid(bid);

    const result = verifier.getBidIdentifiers('bidder_ad_id', bid.vastUrl, []);

    expect(result).to.deep.equal({ adId: 'a1', adUnitCode, requestId: undefined, auctionId: undefined });
  });
});

describe('Video Impression Verifier', function () {
  const vastUrl = 'https://vast.example.com/tag';
  let verifier;

  beforeEach(function () {
    resetTrackerMock();
    verifier = videoImpressionVerifier(vastXmlEditorFactory(), trackerMock);
  });

  it('should append the uuid marker to the vast url', function () {
    const bid = { adId: 'a1', vastUrl };

    const uuid = verifier.trackBid(bid);

    expect(bid.vastUrl).to.equal(`${vastUrl}?${UUID_MARKER}=${uuid}`);
  });

  it('should preserve the original query of the vast url when appending the uuid marker', function () {
    const vastUrlWithMacro = `${vastUrl}?cb=%%CACHEBUSTER%%`;
    const bid = { adId: 'a1', vastUrl: vastUrlWithMacro };

    const uuid = verifier.trackBid(bid);

    expect(bid.vastUrl).to.equal(`${vastUrlWithMacro}&${UUID_MARKER}=${uuid}`);
  });

  it('should not add a separator when the vast url query already ends with one', function () {
    const bid = { adId: 'a1', vastUrl: `${vastUrl}?foo=bar&` };

    const uuid = verifier.trackBid(bid);

    expect(bid.vastUrl).to.equal(`${vastUrl}?foo=bar&${UUID_MARKER}=${uuid}`);
  });

  it('should append the uuid marker before the fragment of the vast url', function () {
    const bid = { adId: 'a1', vastUrl: `${vastUrl}?foo=bar#section` };

    const uuid = verifier.trackBid(bid);

    expect(bid.vastUrl).to.equal(`${vastUrl}?foo=bar&${UUID_MARKER}=${uuid}#section`);
  });

  it('should append the uuid marker to a relative vast url', function () {
    const relativeVastUrl = '/relative/tag.xml';
    const bid = { adId: 'a1', vastUrl: relativeVastUrl };

    const uuid = verifier.trackBid(bid);

    expect(bid.vastUrl).to.equal(`${relativeVastUrl}?${UUID_MARKER}=${uuid}`);
  });

  it('should match the bid from the uuid marker of the loaded ad tag url', function () {
    const bid = { adId: 'a1', vastUrl };
    verifier.trackBid(bid);

    const result = verifier.getBidIdentifiers(null, bid.vastUrl, []);

    expect(result).to.deep.equal({ adId: 'a1', adUnitCode: undefined, requestId: undefined, auctionId: undefined });
  });
});

describe('Video Impression Verifier Factory', function () {
  beforeEach(function () {
    resetTrackerMock();
  });

  it('should return the cached verifier when cache is used', function () {
    const verifier = videoImpressionVerifierFactory(true, trackerMock);
    const bid = { adId: 'a1', vastUrl: 'https://vast.example.com/tag' };

    verifier.trackBid(bid);

    expect(bid.vastXml).to.be.a('string');
  });

  it('should return the non cached verifier when cache is not used', function () {
    const verifier = videoImpressionVerifierFactory(false, trackerMock);
    const bid = { adId: 'a1', vastUrl: 'https://vast.example.com/tag' };

    verifier.trackBid(bid);

    expect(bid.vastXml).to.be.undefined;
  });

  it('should keep a bid tracked by a previous verifier resolvable when sharing the tracker', function () {
    const previousVerifier = videoImpressionVerifierFactory(false, trackerMock);
    const bid = { adId: 'a1', adUnitCode: 'u1', requestId: 'r1', auctionId: 'auc1', vastUrl: 'https://vast.example.com/tag' };
    const uuid = previousVerifier.trackBid(bid);
    const nextVerifier = videoImpressionVerifierFactory(true, trackerMock);

    const result = nextVerifier.getBidIdentifiers(uuid);

    expect(result).to.deep.equal({ adId: 'a1', adUnitCode: 'u1', requestId: 'r1', auctionId: 'auc1' });
  });

  it('should match a bid tracked before switching to the cached verifier from the loaded ad tag url', function () {
    const previousVerifier = videoImpressionVerifierFactory(false, trackerMock);
    const bid = { adId: 'a1', adUnitCode: 'u1', requestId: 'r1', auctionId: 'auc1', vastUrl: 'https://vast.example.com/tag' };
    previousVerifier.trackBid(bid);
    const nextVerifier = videoImpressionVerifierFactory(true, trackerMock);

    const result = nextVerifier.getBidIdentifiers('bidder_ad_id', bid.vastUrl, []);

    expect(result).to.deep.equal({ adId: 'a1', adUnitCode: 'u1', requestId: 'r1', auctionId: 'auc1' });
  });
});
