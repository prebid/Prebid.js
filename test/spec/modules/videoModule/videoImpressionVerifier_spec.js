import {
  baseImpressionVerifier,
  cachedVideoImpressionVerifier,
  PB_PREFIX,
  tracker,
  UUID_MARKER,
  videoImpressionVerifier,
  videoImpressionVerifierFactory
} from 'modules/videoModule/videoImpressionVerifier.js';

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

    it('matches a tracking marker in an ad tag URL', function () {
      const id = verifier.trackBid(bid);
      const url = `https://example.com/vast?other=value&${UUID_MARKER}=${id}`;

      expect(verifier.getBidIdentifiers('not-tracked', url)).to.deep.equal(bid);
      expect(verifier.getBidIdentifiers(null, url)).to.be.undefined;
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

    it('adds its tracking marker while preserving existing URL parameters and fragments', function () {
      bid.vastUrl = 'https://example.com/vast?existing=one%20two#creative';
      const id = verifier.trackBid(bid);
      const url = new URL(bid.vastUrl);

      expect(url.searchParams.get(UUID_MARKER)).to.equal(id);
      expect(url.searchParams.get('existing')).to.equal('one two');
      expect(url.hash).to.equal('#creative');
      expect(verifier.getBidIdentifiers(null, bid.vastUrl)).to.deep.equal({
        adId: 'ad-1', adUnitCode: 'video-slot', requestId: 'request-1', auctionId: 'auction-1'
      });
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

    function adUnits(tracking = {}) {
      return [
        { code: 'other-slot' },
        { code: bid.adUnitCode, video: { adServer: { tracking } } }
      ];
    }

    it('passes configured impression and error callbacks to the inline XML editor', function () {
      bid.vastXml = '<VAST>original</VAST>';
      const impressionUrl = 'https://tracker.example/impression';
      const errorUrl = 'https://tracker.example/error';
      const getImpressionUrl = sinon.stub().returns(impressionUrl);
      const getErrorUrl = sinon.stub().returns(errorUrl);
      const id = verifier.trackBid(bid, adUnits({
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

    it('wraps a remote VAST URL and defaults the impression ID to the bid ad ID', function () {
      bid.vastUrl = 'https://example.com/vast';
      const id = verifier.trackBid(bid, adUnits({
        impression: { getUrl: () => 'https://tracker.example/impression' }
      }));

      expect(xmlEditor.buildVastWrapper.calledOnceWithExactly(
        id, bid.vastUrl, 'https://tracker.example/impression', 'ad-1-impression', undefined
      )).to.be.true;
      expect(bid.vastXml).to.equal('<VAST>tracked wrapper</VAST>');
      expect(bid.vastUrl).to.equal('https://example.com/vast');
      expect(xmlEditor.getVastXmlWithTracking.called).to.be.false;
    });

    it('adds its identifier to XML when no optional tracking callbacks are configured', function () {
      bid.vastXml = '<VAST>original</VAST>';
      bid.vastUrl = 'https://example.com/vast';
      const id = verifier.trackBid(bid, adUnits());

      expect(xmlEditor.getVastXmlWithTracking.calledOnceWithExactly(
        '<VAST>original</VAST>', id, undefined, undefined, undefined
      )).to.be.true;
      expect(xmlEditor.buildVastWrapper.called).to.be.false;
    });

    [undefined, 'https://tracker.example/not-a-callback'].forEach(getUrl => {
      it(`ignores an invalid error URL callback ${JSON.stringify(getUrl)}`, function () {
        bid.vastXml = '<VAST>original</VAST>';
        const id = verifier.trackBid(bid, adUnits({ error: { getUrl } }));

        expect(xmlEditor.getVastXmlWithTracking.calledOnceWithExactly(
          '<VAST>original</VAST>', id, undefined, undefined, undefined
        )).to.be.true;
      });
    });

    it('does not invoke the XML editor when the bid has no VAST creative', function () {
      const id = verifier.trackBid(bid, adUnits());
      expect(id).to.match(/^pb_/);
      expect(bid.vastXml).to.be.undefined;
      expect(xmlEditor.getVastXmlWithTracking.called).to.be.false;
      expect(xmlEditor.buildVastWrapper.called).to.be.false;
    });

    it('ignores URL markers for cached ads and falls back to wrapper identifiers', function () {
      const id = baseImpressionVerifier(bidTracker).trackBid(bid);
      const url = `https://example.com/cache?${UUID_MARKER}=${id}`;

      expect(verifier.getBidIdentifiers('unknown', url)).to.be.undefined;
      expect(verifier.getBidIdentifiers('unknown', url, ['unknown', id])).to.deep.equal(bid);
      expect(verifier.getBidIdentifiers(id)).to.be.undefined;
    });
  });

  describe('factory wiring', function () {
    const vastXml = '<VAST version="3.0"><Ad id="original"><InLine/></Ad></VAST>';

    it('builds an uncached verifier that rewrites XML and recognizes the replacement ad ID', function () {
      const verifier = videoImpressionVerifierFactory(false);
      bid.vastXml = vastXml;
      const id = verifier.trackBid(bid);
      const xml = new DOMParser().parseFromString(bid.vastXml, 'application/xml');

      expect(xml.querySelector('Ad').id).to.equal(id);
      expect(verifier.getBidIdentifiers(id)).to.deep.equal({
        adId: 'ad-1', adUnitCode: 'video-slot', requestId: 'request-1', auctionId: 'auction-1'
      });
    });

    it('builds a cached verifier that creates a real VAST wrapper', function () {
      const verifier = videoImpressionVerifierFactory(true);
      bid.vastUrl = 'https://example.com/vast';
      const id = verifier.trackBid(bid, [{ code: bid.adUnitCode, video: { adServer: { tracking: {} } } }]);
      const xml = new DOMParser().parseFromString(bid.vastXml, 'application/xml');

      expect(xml.querySelector('Ad').id).to.equal(id);
      expect(xml.querySelector('VASTAdTagURI').textContent).to.equal(bid.vastUrl);
      expect(verifier.getBidIdentifiers(null, null, [id])).to.deep.equal({
        adId: 'ad-1', adUnitCode: 'video-slot', requestId: 'request-1', auctionId: 'auction-1'
      });
    });

    it('keeps tracking state separate between factory instances', function () {
      const first = videoImpressionVerifierFactory(false);
      const second = videoImpressionVerifierFactory(false);
      bid.vastUrl = 'https://example.com/vast';
      const id = first.trackBid(bid);

      expect(second.getBidIdentifiers(id)).to.be.undefined;
      expect(first.getBidIdentifiers(id).adId).to.equal(bid.adId);
    });
  });
});
