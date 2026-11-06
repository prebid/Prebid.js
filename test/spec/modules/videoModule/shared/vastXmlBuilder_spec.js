import {
  buildVastWrapper, getVastNode, getAdNode, getWrapperNode, getAdSystemNode,
  getAdTagUriNode, getErrorNode, getImpressionNode, getLinearTrackingCreativesNode, getTrackingNode
} from 'libraries/video/shared/vastXmlBuilder.js';
import { expect } from 'chai';
import { getGlobal } from '../../../../../src/prebidGlobal.js';

function compactXml(indentedXml) {
  return indentedXml.trim().replace(/>\s+</g, '><');
}

describe('buildVastWrapper', function () {
  it('should include impression and error nodes when requested', function () {
    const vastXml = buildVastWrapper(
      'adId123',
      'http://wwww.testUrl.com/redirectUrl.xml',
      'http://wwww.testUrl.com/impression.jpg',
      'impressionId123',
      'http://wwww.testUrl.com/error.jpg'
    );
    expect(vastXml).to.be.equal(`<VAST version="4.2"><Ad id="adId123"><Wrapper><AdSystem version="${getGlobal().version}">Prebid org</AdSystem><VASTAdTagURI><![CDATA[http://wwww.testUrl.com/redirectUrl.xml]]></VASTAdTagURI><Impression id="impressionId123"><![CDATA[http://wwww.testUrl.com/impression.jpg]]></Impression><Error><![CDATA[http://wwww.testUrl.com/error.jpg]]></Error></Wrapper></Ad></VAST>`);
  });

  it('should omit error nodes when excluded', function () {
    const vastXml = buildVastWrapper(
      'adId123',
      'http://wwww.testUrl.com/redirectUrl.xml',
      'http://wwww.testUrl.com/impression.jpg',
      'impressionId123',
    );
    expect(vastXml).to.be.equal(`<VAST version="4.2"><Ad id="adId123"><Wrapper><AdSystem version="${getGlobal().version}">Prebid org</AdSystem><VASTAdTagURI><![CDATA[http://wwww.testUrl.com/redirectUrl.xml]]></VASTAdTagURI><Impression id="impressionId123"><![CDATA[http://wwww.testUrl.com/impression.jpg]]></Impression></Wrapper></Ad></VAST>`);
  });

  it('should omit impression nodes when excluded', function () {
    const vastXml = buildVastWrapper(
      'adId123',
      'http://wwww.testUrl.com/redirectUrl.xml',
    );
    expect(vastXml).to.be.equal(`<VAST version="4.2"><Ad id="adId123"><Wrapper><AdSystem version="${getGlobal().version}">Prebid org</AdSystem><VASTAdTagURI><![CDATA[http://wwww.testUrl.com/redirectUrl.xml]]></VASTAdTagURI></Wrapper></Ad></VAST>`);
  });
  it('should include the bidder\'s vast trackers', function () {
    const vastXml = buildVastWrapper(
      'adId123',
      'http://wwww.testUrl.com/redirectUrl.xml',
      'http://wwww.testUrl.com/impression.jpg',
      'impressionId123',
      'http://wwww.testUrl.com/error.jpg',
      {
        impression: ['http://wwww.testUrl.com/bidderImpression.jpg'],
        error: ['http://wwww.testUrl.com/bidderError.jpg'],
        trackingEvents: [{ event: 'start', url: 'http://wwww.testUrl.com/start.jpg' }]
      }
    );
    expect(vastXml).to.be.equal(compactXml(`
      <VAST version="4.2">
        <Ad id="adId123">
          <Wrapper>
            <AdSystem version="${getGlobal().version}">Prebid org</AdSystem>
            <VASTAdTagURI><![CDATA[http://wwww.testUrl.com/redirectUrl.xml]]></VASTAdTagURI>
            <Impression id="impressionId123"><![CDATA[http://wwww.testUrl.com/impression.jpg]]></Impression>
            <Impression><![CDATA[http://wwww.testUrl.com/bidderImpression.jpg]]></Impression>
            <Error><![CDATA[http://wwww.testUrl.com/error.jpg]]></Error>
            <Error><![CDATA[http://wwww.testUrl.com/bidderError.jpg]]></Error>
            <Creatives>
              <Creative>
                <Linear>
                  <TrackingEvents>
                    <Tracking event="start"><![CDATA[http://wwww.testUrl.com/start.jpg]]></Tracking>
                  </TrackingEvents>
                </Linear>
              </Creative>
            </Creatives>
          </Wrapper>
        </Ad>
      </VAST>
    `));
  });

  it('should omit the tracker nodes when the vast trackers are empty', function () {
    const vastXml = buildVastWrapper(
      'adId123',
      'http://wwww.testUrl.com/redirectUrl.xml',
      undefined,
      undefined,
      undefined,
      { impression: [], error: [], trackingEvents: [] }
    );
    expect(vastXml).to.be.equal(compactXml(`
      <VAST version="4.2">
        <Ad id="adId123">
          <Wrapper>
            <AdSystem version="${getGlobal().version}">Prebid org</AdSystem>
            <VASTAdTagURI><![CDATA[http://wwww.testUrl.com/redirectUrl.xml]]></VASTAdTagURI>
          </Wrapper>
        </Ad>
      </VAST>
    `));
  });
});

describe('getLinearTrackingCreativesNode', function () {
  it('should return well formed Creatives node with one Tracking node per tracking event', function () {
    const creativesNode = getLinearTrackingCreativesNode([
      { event: 'start', url: 'http://wwww.testUrl.com/start.jpg' },
      { event: 'complete', url: 'http://wwww.testUrl.com/complete.jpg' }
    ]);
    expect(creativesNode).to.be.equal(compactXml(`
      <Creatives>
        <Creative>
          <Linear>
            <TrackingEvents>
              <Tracking event="start"><![CDATA[http://wwww.testUrl.com/start.jpg]]></Tracking>
              <Tracking event="complete"><![CDATA[http://wwww.testUrl.com/complete.jpg]]></Tracking>
            </TrackingEvents>
          </Linear>
        </Creative>
      </Creatives>
    `));
  });
});

describe('getTrackingNode', function () {
  it('should return well formed Tracking node', function () {
    const trackingNode = getTrackingNode('midpoint', 'http://wwww.testUrl.com/midpoint.jpg');
    expect(trackingNode).to.be.equal('<Tracking event="midpoint"><![CDATA[http://wwww.testUrl.com/midpoint.jpg]]></Tracking>');
  });
});

describe('getVastNode', function () {
  it('should return well formed Vast node', function () {
    const vastNode = getVastNode('body', '4.0');
    expect(vastNode).to.be.equal('<VAST version=\"4.0\">body</VAST>');
  });

  it('should omit version when missing', function() {
    const vastNode = getVastNode('body');
    expect(vastNode).to.be.equal('<VAST>body</VAST>');
  });
});

describe('getAdNode', function () {
  it('should return well formed Ad node', function () {
    const adNode = getAdNode('body', 'adId123');
    expect(adNode).to.be.equal('<Ad id=\"adId123\">body</Ad>');
  });

  it('should omit id when missing', function() {
    const adNode = getAdNode('body');
    expect(adNode).to.be.equal('<Ad>body</Ad>');
  });
});

describe('getWrapperNode', function () {
  it('should return well formed Wrapper node', function () {
    const wrapperNode = getWrapperNode('body');
    expect(wrapperNode).to.be.equal('<Wrapper>body</Wrapper>');
  });
});

describe('getAdSystemNode', function () {
  it('should return well formed AdSystem node', function () {
    const adSystemNode = getAdSystemNode('testSysName', '5.0');
    expect(adSystemNode).to.be.equal('<AdSystem version=\"5.0\">testSysName</AdSystem>');
  });

  it('should omit version when missing', function() {
    const adSystemNode = getAdSystemNode('testSysName');
    expect(adSystemNode).to.be.equal('<AdSystem>testSysName</AdSystem>');
  });
});

describe('getAdTagUriNode', function () {
  it('should return well formed ad tag URI node', function () {
    const adTagNode = getAdTagUriNode('http://wwww.testUrl.com/ad.xml');
    expect(adTagNode).to.be.equal('<VASTAdTagURI><![CDATA[http://wwww.testUrl.com/ad.xml]]></VASTAdTagURI>');
  });
});

describe('getImpressionNode', function () {
  it('should return well formed Impression node', function () {
    const impressionNode = getImpressionNode('http://wwww.testUrl.com/adImpression.jpg', 'impresionId123');
    expect(impressionNode).to.be.equal('<Impression id=\"impresionId123\"><![CDATA[http://wwww.testUrl.com/adImpression.jpg]]></Impression>');
  });

  it('should omit id when missing', function() {
    const impressionNode = getImpressionNode('http://wwww.testUrl.com/adImpression.jpg');
    expect(impressionNode).to.be.equal('<Impression><![CDATA[http://wwww.testUrl.com/adImpression.jpg]]></Impression>');
  });
});

describe('getErrorNode', function () {
  it('should return well formed Error node', function () {
    const errorNode = getErrorNode('http://wwww.testUrl.com/adError.jpg');
    expect(errorNode).to.be.equal('<Error><![CDATA[http://wwww.testUrl.com/adError.jpg]]></Error>');
  });
});

// Nodes are built by string concatenation, so values placed in them must not be able to close the
// element or attribute they sit in.
describe('values containing XML syntax', function () {
  function parse(xml) {
    const doc = new DOMParser().parseFromString(`<Root>${xml}</Root>`, 'application/xml');
    expect(doc.getElementsByTagName('parsererror')).to.have.lengthOf(0);
    return doc;
  }

  // ']]>' closes a CDATA section; the text after it would otherwise be parsed as markup.
  const BREAKOUT = 'http://wwww.testUrl.com/i]]></Impression><Impression><![CDATA[http://evil.example/pwn';

  it('keeps a url containing ]]> in a single element', function () {
    const impressions = parse(getImpressionNode(BREAKOUT)).getElementsByTagName('Impression');
    expect(impressions).to.have.lengthOf(1);
    expect(impressions[0].textContent).to.equal(BREAKOUT);
  });

  it('keeps an error url containing ]]> in a single element', function () {
    const errors = parse(getErrorNode(BREAKOUT)).getElementsByTagName('Error');
    expect(errors).to.have.lengthOf(1);
    expect(errors[0].textContent).to.equal(BREAKOUT);
  });

  it('does not let an id attribute add attributes to the node', function () {
    const id = 'a" foo="bar';
    const impression = parse(getImpressionNode('http://wwww.testUrl.com/i.jpg', id)).getElementsByTagName('Impression')[0];
    expect(impression.getAttributeNames()).to.eql(['id']);
    expect(impression.getAttribute('id')).to.equal(id);
  });

  it('does not let an ad id add attributes to the Ad node', function () {
    const adId = 'a" foo="bar';
    const ad = parse(buildVastWrapper(adId, 'http://wwww.testUrl.com/redirectUrl.xml')).getElementsByTagName('Ad')[0];
    expect(ad.getAttributeNames()).to.eql(['id']);
    expect(ad.getAttribute('id')).to.equal(adId);
  });

  it('does not let a tracking event add attributes to the Tracking node', function () {
    const event = 'start" foo="bar';
    const tracking = parse(getTrackingNode(event, 'http://wwww.testUrl.com/t.jpg')).getElementsByTagName('Tracking')[0];
    expect(tracking.getAttributeNames()).to.eql(['event']);
    expect(tracking.getAttribute('event')).to.equal(event);
  });

  it('keeps the ad tag uri in a single VASTAdTagURI element', function () {
    const uri = 'http://wwww.testUrl.com/r.xml]]></VASTAdTagURI><Impression><![CDATA[http://evil.example/x';
    const doc = parse(buildVastWrapper('adId123', uri));
    const uris = doc.getElementsByTagName('VASTAdTagURI');
    expect(uris).to.have.lengthOf(1);
    expect(uris[0].textContent).to.equal(uri);
    expect(doc.getElementsByTagName('Impression')).to.have.lengthOf(0);
  });
});
