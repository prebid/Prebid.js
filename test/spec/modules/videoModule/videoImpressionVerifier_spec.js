import { baseImpressionVerifier, cachedVideoImpressionVerifier, videoImpressionVerifier, videoImpressionVerifierFactory, PB_PREFIX, tracker, UUID_MARKER } from 'modules/videoModule/videoImpressionVerifier.js';
import { vastXmlEditorFactory } from 'libraries/video/shared/vastXmlEditor.js';
import { updateVast } from 'src/videoCache.js';

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
    });

    it('should generate a distinct uuid for each bid', function () {
      const baseVerifier = baseImpressionVerifier(trackerMock);
      const uuids = new Set(Array.from({ length: 100 }, () => baseVerifier.trackBid({})));
      expect(uuids.size).to.equal(100);
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

  it('should not track a bid without vast', function () {
    const bid = { adId: 'a1', adUnitCode, ad: '<div></div>' };

    expect(verifier.trackBid(bid)).to.be.undefined;
    expect(trackerMock.store.called).to.be.false;
    expect(bid).to.not.have.property('vastXml');
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

  it('should leave the bidder vast trackers for core to add to the vast wrapper built from the vast url', function () {
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
    const adUnit = adUnitWithTracking({
      impression: { getUrl: () => impressionUrl, id: 'impression_id' },
      error: { getUrl: () => errorUrl }
    });

    verifier.trackBid(bid, adUnit);
    expect(parseVast(bid.vastXml).querySelectorAll('Wrapper > Impression')).to.have.lengthOf(1);
    updateVast(bid);

    const vastDoc = parseVast(bid.vastXml);
    const urls = selector => Array.from(vastDoc.querySelectorAll(selector), node => node.textContent);
    expect(urls('Wrapper > Impression')).to.deep.equal([impressionUrl, bidderImpressionUrl]);
    expect(urls('Wrapper > Error')).to.deep.equal([errorUrl, bidderErrorUrl]);
    expect(urls('Wrapper Creatives Creative Linear TrackingEvents Tracking[event="start"]')).to.deep.equal([bidderStartUrl]);
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

describe('video impression tracking', function () {
  let bid;
  let bidTracker;
  let xmlEditor;

  beforeEach(function () {
    bid = { adId: 'ad-1', adUnitCode: 'video-slot', requestId: 'request-1', auctionId: 'auction-1' };
    bidTracker = tracker();
    xmlEditor = {
      getVastXmlWithTracking: sinon.stub().returns('<VAST>tracked inline ad</VAST>'),
      buildVastWrapper: sinon.stub().returns('<VAST>tracked wrapper</VAST>')
    };
  });

  describe('identifier lookup', function () {
    let verifier;

    beforeEach(function () {
      verifier = baseImpressionVerifier(bidTracker);
    });

    it('stores only bid identifiers and consumes them after the first successful match', function () {
      const expected = { ...bid };
      bid.vastXml = 'creative content';
      const id = verifier.trackBid(bid);

      expect(verifier.getBidIdentifiers(id)).to.deep.equal(expected);
      expect(verifier.getBidIdentifiers(id)).to.be.undefined;
    });

    it('prefers a matching ad ID without consuming URL or wrapper matches', function () {
      const first = verifier.trackBid(bid);
      const secondBid = { ...bid, adId: 'ad-2' };
      const second = verifier.trackBid(secondBid);
      const url = `https://example.com/vast?${UUID_MARKER}=${second}`;

      expect(verifier.getBidIdentifiers(first, url, [second])).to.deep.equal(bid);
      expect(verifier.getBidIdentifiers(second)).to.deep.equal(secondBid);
    });

    [null, 'not a URL', 'https://example.com/vast', 'https://example.com/vast?pb_uuid=unknown'].forEach(url => {
      it(`falls back to wrapper IDs when the ad tag URL is ${JSON.stringify(url)}`, function () {
        const id = verifier.trackBid(bid);
        expect(verifier.getBidIdentifiers('unknown-ad', url, ['unknown-wrapper', id])).to.deep.equal(bid);
      });
    });

    [undefined, [], ['unknown-wrapper']].forEach(wrapperIds => {
      it(`returns no identifiers for unmatched wrappers ${JSON.stringify(wrapperIds)}`, function () {
        expect(verifier.getBidIdentifiers('unknown', null, wrapperIds)).to.be.undefined;
      });
    });

    it('consumes only the first matching wrapper', function () {
      const first = verifier.trackBid(bid);
      const secondBid = { ...bid, adId: 'ad-2' };
      const second = verifier.trackBid(secondBid);

      expect(verifier.getBidIdentifiers(null, null, [first, second])).to.deep.equal(bid);
      expect(verifier.getBidIdentifiers(second)).to.deep.equal(secondBid);
    });
  });

  describe('uncached videos', function () {
    let verifier;

    beforeEach(function () {
      verifier = videoImpressionVerifier(xmlEditor, bidTracker);
    });

    it('does not track bids with neither VAST XML nor a VAST URL', function () {
      const store = sinon.spy(bidTracker, 'store');
      expect(verifier.trackBid(bid)).to.be.undefined;
      expect(store.called).to.be.false;
      expect(xmlEditor.getVastXmlWithTracking.called).to.be.false;
    });

    it('adds tracking to inline XML and replaces the bid creative with the result', function () {
      bid.vastXml = '<VAST>original</VAST>';
      const id = verifier.trackBid(bid);

      expect(xmlEditor.getVastXmlWithTracking.calledOnceWithExactly('<VAST>original</VAST>', id)).to.be.true;
      expect(bid.vastXml).to.equal('<VAST>tracked inline ad</VAST>');
      expect(verifier.getBidIdentifiers(id)).to.deep.equal({
        adId: 'ad-1', adUnitCode: 'video-slot', requestId: 'request-1', auctionId: 'auction-1'
      });
    });

    it('uses the URL when a bid includes both XML and a URL', function () {
      bid.vastXml = '<VAST>original</VAST>';
      bid.vastUrl = 'https://example.com/vast';
      const id = verifier.trackBid(bid);

      expect(new URL(bid.vastUrl).searchParams.get(UUID_MARKER)).to.equal(id);
      expect(bid.vastXml).to.equal('<VAST>original</VAST>');
      expect(xmlEditor.getVastXmlWithTracking.called).to.be.false;
    });
  });

  describe('cached videos', function () {
    let verifier;

    beforeEach(function () {
      verifier = cachedVideoImpressionVerifier(xmlEditor, bidTracker);
    });

    function adUnit(tracking = {}) {
      return { code: bid.adUnitCode, video: { adServer: { tracking } } };
    }

    it('passes configured impression and error callbacks to the inline XML editor', function () {
      bid.vastXml = '<VAST>original</VAST>';
      const impressionUrl = 'https://tracker.example/impression';
      const errorUrl = 'https://tracker.example/error';
      const getImpressionUrl = sinon.stub().returns(impressionUrl);
      const getErrorUrl = sinon.stub().returns(errorUrl);
      const id = verifier.trackBid(bid, adUnit({
        impression: { id: 'custom-impression', getUrl: getImpressionUrl },
        error: { getUrl: getErrorUrl }
      }));

      expect(getImpressionUrl.calledOnceWithExactly(bid)).to.be.true;
      expect(getErrorUrl.calledOnceWithExactly(bid)).to.be.true;
      expect(xmlEditor.getVastXmlWithTracking.calledOnceWithExactly(
        '<VAST>original</VAST>', id, impressionUrl, 'custom-impression', errorUrl
      )).to.be.true;
      expect(bid.vastXml).to.equal('<VAST>tracked inline ad</VAST>');
      expect(xmlEditor.buildVastWrapper.called).to.be.false;
    });

    it('wraps the marked VAST URL and defaults the impression ID to the bid ad ID', function () {
      bid.vastUrl = 'https://example.com/vast';
      const id = verifier.trackBid(bid, adUnit({
        impression: { getUrl: () => 'https://tracker.example/impression' }
      }));

      expect(bid.vastUrl).to.equal(`https://example.com/vast?${UUID_MARKER}=${id}`);
      expect(xmlEditor.buildVastWrapper.calledOnceWithExactly(
        id, bid.vastUrl, 'https://tracker.example/impression', 'ad-1-impression', undefined
      )).to.be.true;
      expect(bid.vastXml).to.equal('<VAST>tracked wrapper</VAST>');
      expect(xmlEditor.getVastXmlWithTracking.called).to.be.false;
    });

    it('adds its identifier to XML when no optional tracking callbacks are configured', function () {
      bid.vastXml = '<VAST>original</VAST>';
      bid.vastUrl = 'https://example.com/vast';
      const id = verifier.trackBid(bid, adUnit());

      expect(xmlEditor.getVastXmlWithTracking.calledOnceWithExactly(
        '<VAST>original</VAST>', id, undefined, undefined, undefined
      )).to.be.true;
      expect(xmlEditor.buildVastWrapper.called).to.be.false;
    });

    [undefined, 'https://tracker.example/not-a-callback'].forEach(getUrl => {
      it(`ignores an invalid error URL callback ${JSON.stringify(getUrl)}`, function () {
        bid.vastXml = '<VAST>original</VAST>';
        const id = verifier.trackBid(bid, adUnit({ error: { getUrl } }));

        expect(xmlEditor.getVastXmlWithTracking.calledOnceWithExactly(
          '<VAST>original</VAST>', id, undefined, undefined, undefined
        )).to.be.true;
      });
    });
  });

  describe('factory wiring', function () {
    const vastXml = '<VAST version="3.0"><Ad id="original"><InLine/></Ad></VAST>';

    it('builds an uncached verifier that rewrites XML and recognizes the replacement ad ID', function () {
      const verifier = videoImpressionVerifierFactory(false, bidTracker);
      bid.vastXml = vastXml;
      const id = verifier.trackBid(bid);
      const xml = new DOMParser().parseFromString(bid.vastXml, 'application/xml');

      expect(xml.querySelector('Ad').id).to.equal(id);
      expect(verifier.getBidIdentifiers(id)).to.deep.equal({
        adId: 'ad-1', adUnitCode: 'video-slot', requestId: 'request-1', auctionId: 'auction-1'
      });
    });

    it('builds a cached verifier that creates a real VAST wrapper', function () {
      const verifier = videoImpressionVerifierFactory(true, bidTracker);
      bid.vastUrl = 'https://example.com/vast';
      const id = verifier.trackBid(bid, { code: bid.adUnitCode, video: { adServer: { tracking: {} } } });
      const xml = new DOMParser().parseFromString(bid.vastXml, 'application/xml');

      expect(xml.querySelector('Ad').id).to.equal(id);
      expect(xml.querySelector('VASTAdTagURI').textContent).to.equal(bid.vastUrl);
      expect(verifier.getBidIdentifiers(null, null, [id])).to.deep.equal({
        adId: 'ad-1', adUnitCode: 'video-slot', requestId: 'request-1', auctionId: 'auction-1'
      });
    });

    it('keeps tracking state separate between verifiers with separate trackers', function () {
      const first = videoImpressionVerifierFactory(false, bidTracker);
      const second = videoImpressionVerifierFactory(false, tracker());
      bid.vastUrl = 'https://example.com/vast';
      const id = first.trackBid(bid);

      expect(second.getBidIdentifiers(id)).to.be.undefined;
      expect(first.getBidIdentifiers(id).adId).to.equal(bid.adId);
    });
  });
});
