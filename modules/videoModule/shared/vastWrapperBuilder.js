export function buildVastWrapper(adId, adTagUrl, verification) {

}


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

function getVastNode(vastVersion, body) {
  return `<VAST version="${vastVersion}">${body}</VAST>`;
}

function getAdNode(adId, body) {
  return `<Ad id="${adId}">${body}</Ad>`
}

function getWrapperNode(body) {
  return `<Wrapper>${body}</Wrapper>`;
}

function getAdSystemNode(system, version) {
  return `<AdSystem version="${version}">${system}</AdSystem>`;
}

function getAdTagUriNode(adTagUrl) {
  return `<VASTAdTagURI><![CDATA[${adTagUrl}]]></VASTAdTagURI>`;
}

function getVerificationNode() {
}

function getImpressionNode(id, pingUrl) {
  return `<Impression><![CDATA[${pingUrl}]]></Impression>`;
}

function getErrorNode(pingUrl) {
  return `<Error><![CDATA[${pingUrl}]]></Error>`;
}

function getUrlNode(name, url, attributes) {
  const openLabel = getOpenLabel(name, attributes);
  return `<${openLabel}><![CDATA[${url}]]></${name}>`;
}

function getOpenLabel(name, attributes) {
  return `${name}` + attributes;
}

function getCDataBody(url) {
  return `<![CDATA[${url}]]>`;
}


