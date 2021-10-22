import { getVastNode, getAdNode, getWrapperNode, getAdSystemNode,
  getAdTagUriNode, getErrorNode, getImpressionNode } from 'modules/videoModule/shared/vastWrapperBuilder.js';
import { expect } from 'chai';

describe('getVastNode', function () {
  it('should return well formed Vast node', function () {
    const vastNode = getVastNode('body', '4.0');
    expect(vastNode).to.be.equal('<VAST version=\"4.0\">body</VAST>');
  });
});

describe('getAdNode', function () {
  it('should return well formed Ad node', function () {
    const adNode = getAdNode('body', 'adId123');
    expect(adNode).to.be.equal('<Ad id=\"adId123\">body</Ad>');
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
});

describe('getAdTagUriNode', function () {
  it('should return well formed ad tag URI node', function () {
    const adTagNode = getAdTagUriNode('http://wwww.testUrl.com/ad.xml');
    expect(adTagNode).to.be.equal('<VASTAdTagURI><![CDATA[http://wwww.testUrl.com/ad.xml]]></VASTAdTagURI>');
  });
});

describe('getImpressionNode', function () {
  it('should return well formed Impression node', function () {
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
