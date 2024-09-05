import { getErrorNode, getImpressionNode, buildVastWrapper } from './vastXmlBuilder.js';

export const XML_MIME_TYPE = 'application/xml';

export function VastXmlEditor(xmlUtil_) {
  const xmlUtil = xmlUtil_;

  function getVastXmlWithTracking(vastXml, adId, impressionUrl, impressionId, errorUrl) {
    const impressionDoc = getImpressionDoc(impressionUrl, impressionId);
    const errorDoc = getErrorDoc(errorUrl);
    if (!adId && !impressionDoc && !errorDoc) {
      return vastXml;
    }

    const vastXmlDoc = xmlUtil.parse(vastXml);
    appendTrackingNodes(vastXmlDoc, impressionDoc, errorDoc);
    replaceAdId(vastXmlDoc, adId);
    return xmlUtil.serialize(vastXmlDoc);
  }

  function appendTrackingNodes(vastXmlDoc, impressionDoc, errorDoc) {
    const nodes = vastXmlDoc.querySelectorAll('InLine,Wrapper');
    const nodeCount = nodes.length;
    for (let i = 0; i < nodeCount; i++) {
      const node = nodes[i];
      // A copy of the child is required until we reach the last node.
      const requiresCopy = i < nodeCount - 1;
      appendChild(node, impressionDoc, requiresCopy);
      appendChild(node, errorDoc, requiresCopy);
    }
  }

  function replaceAdId(vastXmlDoc, adId) {
    if (!adId) {
      return;
    }

    const adNode = vastXmlDoc.querySelector('Ad');
    if (!adNode) {
      return;
    }

    adNode.id = adId;
  }

  return {
    getVastXmlWithTracking,
    buildVastWrapper
  }

  function getImpressionDoc(impressionUrl, impressionId) {
    if (!impressionUrl) {
      return;
    }

    const impressionNode = getImpressionNode(impressionUrl, impressionId);
    return xmlUtil.parse(impressionNode);
  }

  function getErrorDoc(errorUrl) {
    if (!errorUrl) {
      return;
    }

    const errorNode = getErrorNode(errorUrl);
    return xmlUtil.parse(errorNode);
  }

  function appendChild(node, child, copy) {
    if (!child) {
      return;
    }

    const doc = copy ? child.cloneNode(true) : child;
    node.appendChild(doc.documentElement);
  }
}

function XMLUtil() {
  let parser;
  let serializer;

  function getParser() {
    if (!parser) {
      // DOMParser instantiation is costly; instantiate only once throughout Prebid lifecycle.
      parser = new DOMParser();
    }
    return parser;
  }

  function getSerializer() {
    if (!serializer) {
      // XMLSerializer instantiation is costly; instantiate only once throughout Prebid lifecycle.
      serializer = new XMLSerializer();
    }
    return serializer;
  }

  function parse(xmlString) {
    return getParser().parseFromString(xmlString, XML_MIME_TYPE);
  }

  function serialize(xmlDoc) {
    return getSerializer().serializeToString(xmlDoc);
  }

  return {
    parse,
    serialize
  };
}

export function vastXmlEditorFactory() {
  return VastXmlEditor(XMLUtil());
}
