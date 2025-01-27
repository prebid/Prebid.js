import { fetch } from '../../../src/ajax.js';
import { logError } from '../../../src/utils.js';
import { getErrorNode, getImpressionNode, buildVastWrapper } from './vastXmlBuilder.js';

export const XML_MIME_TYPE = 'application/xml';
export const VAST_TAG_URI_TAGNAME = 'VASTAdTagURI';

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
    buildVastWrapper,
    replaceVastAdTagWithBlobContent
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

  function replaceVastAdTagUri(xmlString, match, newContent) {
    try {
      const xmlDoc = xmlUtil.parse(xmlString);
      const vastAdTagUriElements = xmlDoc.querySelectorAll(VAST_TAG_URI_TAGNAME);
      const vastAdTagUriElement = Array.from(vastAdTagUriElements).find(adTag => adTag.textContent.includes(match));

      if (vastAdTagUriElement) {
        const cdata = xmlDoc.createCDATASection(newContent);
        vastAdTagUriElement.textContent = '';
        vastAdTagUriElement.appendChild(cdata);
        return xmlUtil.serialize(xmlDoc);
      } else {
        throw new Error();
      }
    } catch (error) {
      logError('Unable to process xml', error);
      return xmlString;
    }
  };

  async function replaceVastAdTagWithBlobContent(vastXml, blobUrl, videoCacheKey) {
    try {
      const response = await fetch(blobUrl);
      if (!response.ok) {
        logError('Unable to fetch blob');
        return vastXml;
      }

      // Mechanism to handle cases where VAST tags are fetched
      // from a context where the blob resource is not accessible.
      // like IMA SDK iframe
      const blobContent = await response.text();
      const dataUrl = `data://text/xml;base64,${btoa(blobContent)}`;

      return replaceVastAdTagUri(vastXml, videoCacheKey, dataUrl);
    } catch (e) {
      return vastXml;
    }
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
