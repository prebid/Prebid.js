import { getGlobal } from '../../../src/prebidGlobal.js';
import { attributeValue, cdata } from '../../../src/utils/xml.js';

export function buildVastWrapper(adId, adTagUrl, impressionUrl, impressionId, errorUrl) {
  let wrapperBody = getAdSystemNode('Prebid org', getGlobal().version);

  if (adTagUrl) {
    wrapperBody += getAdTagUriNode(adTagUrl);
  }

  if (impressionUrl) {
    wrapperBody += getImpressionNode(impressionUrl, impressionId);
  }

  if (errorUrl) {
    wrapperBody += getErrorNode(errorUrl);
  }

  return getVastNode(getAdNode(getWrapperNode(wrapperBody), adId), '4.2');
}

export function getVastNode(body, vastVersion) {
  return getNode('VAST', body, { version: vastVersion });
}

export function getAdNode(body, adId) {
  return getNode('Ad', body, { id: adId });
}

export function getWrapperNode(body) {
  return getNode('Wrapper', body);
}

export function getAdSystemNode(system, version) {
  return getNode('AdSystem', system, { version });
}

export function getAdTagUriNode(adTagUrl) {
  return getUrlNode('VASTAdTagURI', adTagUrl);
}

export function getImpressionNode(pingUrl, id) {
  return getUrlNode('Impression', pingUrl, { id });
}

export function getErrorNode(pingUrl) {
  return getUrlNode('Error', pingUrl);
}

// Helpers

function getUrlNode(labelName, url, attributes) {
  const body = cdata(url);
  return getNode(labelName, body, attributes);
}

function getNode(labelName, body, attributes) {
  const openingLabel = getOpeningLabel(labelName, attributes);
  return `<${openingLabel}>${body}</${labelName}>`;
}

/*
attributes is a KVP Object. Keys become attribute names verbatim, so they must be literals: a
name taken from untrusted input would need validating against the XML Name grammar, which escaping
cannot do. Only the values are escaped.
 */
function getOpeningLabel(name, attributes) {
  if (!attributes) {
    return name;
  }

  return Object.keys(attributes).reduce((label, key) => {
    const value = attributes[key];
    if (!value) {
      return label;
    }

    return label + ` ${key}="${attributeValue(value)}"`;
  }, name);
}
