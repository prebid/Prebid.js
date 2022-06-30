import { buildVastWrapper, getVastNode, getAdNode, getWrapperNode, getAdSystemNode,
  getAdTagUriNode, getErrorNode, getImpressionNode } from 'libraries/video/shared/vastXmlBuilder.js';
import { expect } from 'chai';

describe('buildVastWrapper', function () {
  it('should include impression and error nodes when requested', function () {
    const vastXml = buildVastWrapper(
      'adId123',
      'http://wwww.testUrl.com/redirectUrl.xml',
      'http://wwww.testUrl.com/impression.jpg',
      'impressionId123',
      'http://wwww.testUrl.com/error.jpg'
    );
    expect(vastXml).to.be.equal(`<VAST version="4.2"><Ad id="adId123"><Wrapper><AdSystem version="${$$PREBID_GLOBAL$$.version}">Prebid org</AdSystem><VASTAdTagURI><![CDATA[http://wwww.testUrl.com/redirectUrl.xml]]></VASTAdTagURI><Impression id="impressionId123"><![CDATA[http://wwww.testUrl.com/impression.jpg]]></Impression><Error><![CDATA[http://wwww.testUrl.com/error.jpg]]></Error></Wrapper></Ad></VAST>`);
  });

  it('should omit error nodes when excluded', function () {
    const vastXml = buildVastWrapper(
      'adId123',
      'http://wwww.testUrl.com/redirectUrl.xml',
      'http://wwww.testUrl.com/impression.jpg',
      'impressionId123',
    );
    expect(vastXml).to.be.equal(`<VAST version="4.2"><Ad id="adId123"><Wrapper><AdSystem version="${$$PREBID_GLOBAL$$.version}">Prebid org</AdSystem><VASTAdTagURI><![CDATA[http://wwww.testUrl.com/redirectUrl.xml]]></VASTAdTagURI><Impression id="impressionId123"><![CDATA[http://wwww.testUrl.com/impression.jpg]]></Impression></Wrapper></Ad></VAST>`);
  });

  it('should omit impression nodes when excluded', function () {
    const vastXml = buildVastWrapper(
      'adId123',
      'http://wwww.testUrl.com/redirectUrl.xml',
    );
    expect(vastXml).to.be.equal(`<VAST version="4.2"><Ad id="adId123"><Wrapper><AdSystem version="${$$PREBID_GLOBAL$$.version}">Prebid org</AdSystem><VASTAdTagURI><![CDATA[http://wwww.testUrl.com/redirectUrl.xml]]></VASTAdTagURI></Wrapper></Ad></VAST>`);
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
