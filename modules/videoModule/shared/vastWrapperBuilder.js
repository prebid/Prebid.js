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

export function getVastNode(body, vastVersion) {
  return `<VAST version="${vastVersion}">${body}</VAST>`;
}

export function getAdNode(body, adId) {
  return `<Ad id="${adId}">${body}</Ad>`
}

export function getWrapperNode(body) {
  return `<Wrapper>${body}</Wrapper>`;
}

export function getAdSystemNode(system, version) {
  return `<AdSystem version="${version}">${system}</AdSystem>`;
}

export function getAdTagUriNode(adTagUrl) {
  return `<VASTAdTagURI><![CDATA[${adTagUrl}]]></VASTAdTagURI>`;
}

// function getVerificationNode() {
// }

export function getImpressionNode(pingUrl, id) {
  return `<Impression><![CDATA[${pingUrl}]]></Impression>`;
}

export function getErrorNode(pingUrl) {
  return `<Error><![CDATA[${pingUrl}]]></Error>`;
}

// function getUrlNode(name, url, attributes) {
//   const openLabel = getOpenLabel(name, attributes);
//   return `<${openLabel}><![CDATA[${url}]]></${name}>`;
// }
//
// function getOpenLabel(name, attributes) {
//   return `${name}` + attributes;
// }
//
// function getCDataBody(url) {
//   return `<![CDATA[${url}]]>`;
// }
