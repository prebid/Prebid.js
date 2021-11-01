import { vastXmlEditorFactory } from 'modules/videoModule/shared/vastXmlEditor.js';
import { expect } from 'chai';

describe('Vast XML Editor', function () {
  const adWrapperXml = `
<VAST version="4.0">
    <Ad id="123">
        <Wrapper>
            <AdSystem version="6">Prebid org</AdSystem>
            <VASTAdTagURI><![CDATA[https://random.adTag.com]]></VASTAdTagURI>
        </Wrapper>
    </Ad>
</VAST>
`;

  const inlineXml = `
<VAST version="4.0">
    <Ad id="abc">
        <InLine>
            <AdSystem version="6">Prebid org</AdSystem>
            <AdTitle>Random Title</AdTitle>
        </InLine>
    </Ad>
</VAST>
`;

  const inLineWithWrapper = `
<VAST version="4.0">
    <Ad id="123">
        <Wrapper>
            <AdSystem version="6">Prebid org</AdSystem>
            <VASTAdTagURI><![CDATA[https://random.adTag.com]]></VASTAdTagURI>
        </Wrapper>
    </Ad>
    <Ad id="abc">
        <InLine>
            <AdSystem version="6">Prebid org</AdSystem>
            <AdTitle>Random Title</AdTitle>
        </InLine>
    </Ad>
</VAST>
`;

  const vastXmlEditor = vastXmlEditorFactory();
  const expectedImpressionUrl = 'https://test.impression.com/ping.gif';
  const expectedImpressionId = 'test-impression-id';
  const expectedErrorUrl = 'https://test.error.com/ping.gif';

  it('should add Impression Nodes to the Ad Wrapper', function () {
    const vastXml = vastXmlEditor.getVastXmlWithTrackingNodes(adWrapperXml, expectedImpressionUrl, expectedImpressionId);
    const expectedXml = `<VAST version="4.0">
    <Ad id="123">
        <Wrapper>
            <AdSystem version="6">Prebid org</AdSystem>
            <VASTAdTagURI><![CDATA[https://random.adTag.com]]></VASTAdTagURI>
        <Impression id="${expectedImpressionId}"><![CDATA[${expectedImpressionUrl}]]></Impression></Wrapper>
    </Ad>
</VAST>`;
    expect(vastXml).to.equal(expectedXml);
  });

  it('should add Impression Nodes to the InLine', function () {
    const vastXml = vastXmlEditor.getVastXmlWithTrackingNodes(inlineXml, expectedImpressionUrl, expectedImpressionId);
    const expectedXml = `<VAST version="4.0">
    <Ad id="abc">
        <InLine>
            <AdSystem version="6">Prebid org</AdSystem>
            <AdTitle>Random Title</AdTitle>
        <Impression id="${expectedImpressionId}"><![CDATA[${expectedImpressionUrl}]]></Impression></InLine>
    </Ad>
</VAST>`;
    expect(vastXml).to.equal(expectedXml);
  });

  it('should add Impression Nodes to the Ad Wrapper and Inline', function () {
    const vastXml = vastXmlEditor.getVastXmlWithTrackingNodes(inLineWithWrapper, expectedImpressionUrl, expectedImpressionId);
    const expectedXml = `<VAST version="4.0">
    <Ad id="123">
        <Wrapper>
            <AdSystem version="6">Prebid org</AdSystem>
            <VASTAdTagURI><![CDATA[https://random.adTag.com]]></VASTAdTagURI>
        <Impression id="${expectedImpressionId}"><![CDATA[${expectedImpressionUrl}]]></Impression></Wrapper>
    </Ad>
    <Ad id="abc">
        <InLine>
            <AdSystem version="6">Prebid org</AdSystem>
            <AdTitle>Random Title</AdTitle>
        <Impression id="${expectedImpressionId}"><![CDATA[${expectedImpressionUrl}]]></Impression></InLine>
    </Ad>
</VAST>`;
    expect(vastXml).to.equal(expectedXml);
  });

  it('should add Error Nodes to the Ad Wrapper', function () {
    const vastXml = vastXmlEditor.getVastXmlWithTrackingNodes(adWrapperXml, null, null, expectedErrorUrl);
    const expectedXml = `<VAST version="4.0">
    <Ad id="123">
        <Wrapper>
            <AdSystem version="6">Prebid org</AdSystem>
            <VASTAdTagURI><![CDATA[https://random.adTag.com]]></VASTAdTagURI>
        <Error><![CDATA[${expectedErrorUrl}]]></Error></Wrapper>
    </Ad>
</VAST>`;
    expect(vastXml).to.equal(expectedXml);
  });

  it('should add Error Nodes to the InLine', function () {
    const vastXml = vastXmlEditor.getVastXmlWithTrackingNodes(inlineXml, null, null, expectedErrorUrl);
    const expectedXml = `<VAST version="4.0">
    <Ad id="abc">
        <InLine>
            <AdSystem version="6">Prebid org</AdSystem>
            <AdTitle>Random Title</AdTitle>
        <Error><![CDATA[${expectedErrorUrl}]]></Error></InLine>
    </Ad>
</VAST>`;
    expect(vastXml).to.equal(expectedXml);
  });

  it('should add Error Nodes to the Ad Wrapper and Inline', function () {
    const vastXml = vastXmlEditor.getVastXmlWithTrackingNodes(inLineWithWrapper, null, null, expectedErrorUrl);
    const expectedXml = `<VAST version="4.0">
    <Ad id="123">
        <Wrapper>
            <AdSystem version="6">Prebid org</AdSystem>
            <VASTAdTagURI><![CDATA[https://random.adTag.com]]></VASTAdTagURI>
        <Error><![CDATA[${expectedErrorUrl}]]></Error></Wrapper>
    </Ad>
    <Ad id="abc">
        <InLine>
            <AdSystem version="6">Prebid org</AdSystem>
            <AdTitle>Random Title</AdTitle>
        <Error><![CDATA[${expectedErrorUrl}]]></Error></InLine>
    </Ad>
</VAST>`;
    expect(vastXml).to.equal(expectedXml);
  });
});

/*
<VAST version="4.0">
    <Ad id="${adId}">
        <Wrapper>
            <AdSystem version="${$$PREBID_GLOBAL$$.version}">Prebid org</AdSystem>
            <VASTAdTagURI><![CDATA[${adUrl}]]></VASTAdTagURI>
        </Wrapper>
    </Ad>
</VAST>
*/
