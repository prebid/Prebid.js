import { getErrorNode, getImpressionNode } from './vastXmlBuilder.js';

export const XML_MIME_TYPE = 'application/xml';

export function VastXmlEditor(xmlUtil_) {
  const xmlUtil = xmlUtil_;

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

  function getVastXmlWithTrackingNodes(vastXml, impressionUrl, impressionId, errorUrl) {
    const impressionDoc = getImpressionDoc(impressionUrl, impressionId);
    const errorDoc = getErrorDoc(errorUrl);
    if (!impressionDoc && !errorDoc) {
      return vastXml;
    }

    const vastXmlDoc = xmlUtil.parse(vastXml);
    const nodes = vastXmlDoc.querySelectorAll('InLine,Wrapper');
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (impressionDoc) {
        // console.log('node ' + i + ' - ', node);
        node.appendChild(impressionDoc.documentElement);
      }

      if (errorDoc) {
        node.appendChild(errorDoc.documentElement);
      }
    }

    return xmlUtil.serialize(vastXmlDoc);
  }

  return {
    getVastXmlWithTrackingNodes
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
