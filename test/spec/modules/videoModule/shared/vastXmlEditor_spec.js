import { vastXmlEditorFactory } from 'libraries/video/shared/vastXmlEditor.js';
import { expect } from 'chai';
import { server } from '../../../../mocks/xhr';

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
    const vastXml = vastXmlEditor.getVastXmlWithTracking(adWrapperXml, null, expectedImpressionUrl, expectedImpressionId);
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
    const vastXml = vastXmlEditor.getVastXmlWithTracking(inlineXml, null, expectedImpressionUrl, expectedImpressionId);
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
    const vastXml = vastXmlEditor.getVastXmlWithTracking(inLineWithWrapper, null, expectedImpressionUrl, expectedImpressionId);
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
    const vastXml = vastXmlEditor.getVastXmlWithTracking(adWrapperXml, null, null, null, expectedErrorUrl);
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
    const vastXml = vastXmlEditor.getVastXmlWithTracking(inlineXml, null, null, null, expectedErrorUrl);
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
    const vastXml = vastXmlEditor.getVastXmlWithTracking(inLineWithWrapper, null, null, null, expectedErrorUrl);
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

  it('should add Impression Nodes and Error Nodes to the Ad Wrapper', function () {
    const vastXml = vastXmlEditor.getVastXmlWithTracking(adWrapperXml, null, expectedImpressionUrl, expectedImpressionId, expectedErrorUrl);
    const expectedXml = `<VAST version="4.0">
    <Ad id="123">
        <Wrapper>
            <AdSystem version="6">Prebid org</AdSystem>
            <VASTAdTagURI><![CDATA[https://random.adTag.com]]></VASTAdTagURI>
        <Impression id="${expectedImpressionId}"><![CDATA[${expectedImpressionUrl}]]></Impression><Error><![CDATA[${expectedErrorUrl}]]></Error></Wrapper>
    </Ad>
</VAST>`;
    expect(vastXml).to.equal(expectedXml);
  });

  it('should add Impression Nodes and Error Nodes to the InLine', function () {
    const vastXml = vastXmlEditor.getVastXmlWithTracking(inlineXml, null, expectedImpressionUrl, expectedImpressionId, expectedErrorUrl);
    const expectedXml = `<VAST version="4.0">
    <Ad id="abc">
        <InLine>
            <AdSystem version="6">Prebid org</AdSystem>
            <AdTitle>Random Title</AdTitle>
        <Impression id="${expectedImpressionId}"><![CDATA[${expectedImpressionUrl}]]></Impression><Error><![CDATA[${expectedErrorUrl}]]></Error></InLine>
    </Ad>
</VAST>`;
    expect(vastXml).to.equal(expectedXml);
  });

  it('should add Impression Nodes and Error Nodes to the Ad Wrapper and Inline', function () {
    const vastXml = vastXmlEditor.getVastXmlWithTracking(inLineWithWrapper, null, expectedImpressionUrl, expectedImpressionId, expectedErrorUrl);
    const expectedXml = `<VAST version="4.0">
    <Ad id="123">
        <Wrapper>
            <AdSystem version="6">Prebid org</AdSystem>
            <VASTAdTagURI><![CDATA[https://random.adTag.com]]></VASTAdTagURI>
        <Impression id="${expectedImpressionId}"><![CDATA[${expectedImpressionUrl}]]></Impression><Error><![CDATA[${expectedErrorUrl}]]></Error></Wrapper>
    </Ad>
    <Ad id="abc">
        <InLine>
            <AdSystem version="6">Prebid org</AdSystem>
            <AdTitle>Random Title</AdTitle>
        <Impression id="${expectedImpressionId}"><![CDATA[${expectedImpressionUrl}]]></Impression><Error><![CDATA[${expectedErrorUrl}]]></Error></InLine>
    </Ad>
</VAST>`;
    expect(vastXml).to.equal(expectedXml);
  });

  it('should override the ad id in inline', function () {
    const vastXml = vastXmlEditor.getVastXmlWithTracking(inlineXml, 'adIdOverride');
    const expectedXml = `<VAST version="4.0">
    <Ad id="adIdOverride">
        <InLine>
            <AdSystem version="6">Prebid org</AdSystem>
            <AdTitle>Random Title</AdTitle>
        </InLine>
    </Ad>
</VAST>`;
    expect(vastXml).to.equal(expectedXml);
  });

  it('should override the ad id in the Ad Wrapper', function () {
    const vastXml = vastXmlEditor.getVastXmlWithTracking(adWrapperXml, 'adIdOverride');
    const expectedXml = `<VAST version="4.0">
    <Ad id="adIdOverride">
        <Wrapper>
            <AdSystem version="6">Prebid org</AdSystem>
            <VASTAdTagURI><![CDATA[https://random.adTag.com]]></VASTAdTagURI>
        </Wrapper>
    </Ad>
</VAST>`;
    expect(vastXml).to.equal(expectedXml);
  });

  it('should replace vast ad tag uri properly with blob content in data uri format', (done) => {
    const uuid = '1234325';
    const bidCacheUrl = 'https://prebid-test-cache-server.org/cache?uuid' + uuid;
    const input = (
      `<VAST version="3.0">` +
        `<Ad>` +
          `<Wrapper>` +
           `<AdSystem>prebid.org wrapper</AdSystem>` +
            `<VASTAdTagURI><![CDATA[${bidCacheUrl}]]></VASTAdTagURI>` +
          `</Wrapper>` +
       `</Ad>` +
      `</VAST>`
    );
    const blobUrl = 'blob:http://localhost:9999/uri';

    const blobContent = '<VAST version="3.0>EXAMPLE VAST BLOB</VAST>'
    const dataUrl = `data://text/xml;base64,${btoa(blobContent)}`;
    const expectedOutput = (
      `<VAST version="3.0">` +
        `<Ad>` +
         `<Wrapper>` +
            `<AdSystem>prebid.org wrapper</AdSystem>` +
            `<VASTAdTagURI><![CDATA[${dataUrl}]]></VASTAdTagURI>` +
          `</Wrapper>` +
       `</Ad>` +
      `</VAST>`
    );

    server.respondWith('GET', blobUrl, [200, {}, blobContent]);

    vastXmlEditor.replaceVastAdTagWithBlobContent(input, blobUrl, uuid)
      .then((vastXml) => {
        expect(vastXml).to.deep.eql(expectedOutput);
        done();
      })
      .catch(done);

    server.respond();
  });
});
