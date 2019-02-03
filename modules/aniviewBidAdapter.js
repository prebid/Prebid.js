import { VIDEO } from '../src/mediaTypes';
import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { Renderer } from '../src/Renderer';

const BIDDER_CODE = 'aniview';
const TTL = 600;

function avRenderer(bid) {
  bid.renderer.push(function() {
    let eventCallback = bid && bid.renderer && bid.renderer.handleVideoEvent ? bid.renderer.handleVideoEvent : null;
    window.aniviewRenderer.renderAd({
      id: bid.adUnitCode + '_' + bid.adId,
      debug: window.location.href.indexOf('pbjsDebug') >= 0,
      placement: bid.adUnitCode,
      width: bid.width,
      height: bid.height,
      vastUrl: bid.vastUrl,
      vastXml: bid.vastXml,
      config: bid.params[0].rendererConfig,
      eventsCallback: eventCallback,
      bid: bid
    });
  });
}

function newRenderer(bidRequest) {
  const renderer = Renderer.install({
    url: 'https://player.aniview.com/script/6.1/prebidRenderer.js',
    config: {},
    loaded: false,
  });

  try {
    renderer.setRender(avRenderer);
  } catch (err) {
  }

  return renderer;
}

function isBidRequestValid(bid) {
  if (!bid.params || !bid.params.AV_PUBLISHERID || !bid.params.AV_CHANNELID) { return false; }

  return true;
}

function buildRequests(validBidRequests) {
  let bidRequests = [];

  for (let i = 0; i < validBidRequests.length; i++) {
    let bidRequest = validBidRequests[i];

    if (!bidRequest.sizes || !bidRequest.sizes.length) {
      bidRequest.sizes = [[640, 480]];
    }

    if (bidRequest.sizes.length === 2 && typeof bidRequest.sizes[0] === 'number' && typeof bidRequest.sizes[1] === 'number') {
      let adWidth = bidRequest.sizes[0];
      let adHeight = bidRequest.sizes[1];
      bidRequest.sizes = [[adWidth, adHeight]];
    }

    for (let j = 0; j < bidRequest.sizes.length; j++) {
      let size = bidRequest.sizes[j];
      let playerWidth;
      let playerHeight;
      if (size && size.length == 2) {
        playerWidth = size[0];
        playerHeight = size[1];
      } else {
        playerWidth = 640;
        playerHeight = 480;
      }

      let s2sParams = {};

      for (var attrname in bidRequest.params) {
        if (bidRequest.params.hasOwnProperty(attrname) && attrname.indexOf('AV_') == 0) {
          s2sParams[attrname] = bidRequest.params[attrname];
        }
      };

      if (s2sParams.AV_APPPKGNAME && !s2sParams.AV_URL) { s2sParams.AV_URL = s2sParams.AV_APPPKGNAME; }
      if (!s2sParams.AV_IDFA && !s2sParams.AV_URL) { s2sParams.AV_URL = utils.getTopWindowUrl(); }
      if (s2sParams.AV_IDFA && !s2sParams.AV_AID) { s2sParams.AV_AID = s2sParams.AV_IDFA; }
      if (s2sParams.AV_AID && !s2sParams.AV_IDFA) { s2sParams.AV_IDFA = s2sParams.AV_AID; }

      s2sParams.pbjs = 1;
      s2sParams.cb = Math.floor(Math.random() * 999999999);
      s2sParams.AV_WIDTH = playerWidth;
      s2sParams.AV_HEIGHT = playerHeight;
      s2sParams.s2s = '1';
      s2sParams.bidId = bidRequest.bidId;
      s2sParams.bidWidth = playerWidth;
      s2sParams.bidHeight = playerHeight;

      if (bidRequest && bidRequest.gdprConsent) {
        if (bidRequest.gdprConsent.gdprApplies) {
          AV_GDPR = 1;
          AV_CONSENT = bidRequest.gdprConsent.consentString
        }
      }

      bidRequests.push({
        method: 'GET',
        url: 'https://gov.aniview.com/api/adserver/vast3/',
        data: s2sParams
      });
    }
  }

  return bidRequests;
}

function interpretResponse(serverResponse, bidRequest) {
  let bidResponses = [];
  if (serverResponse && serverResponse.body) {
    if (serverResponse.error) {
      return bidResponses;
    } else {
      try {
        let bidResponse = {};
        if (bidRequest && bidRequest.data && bidRequest.data.bidId && bidRequest.data.bidId !== '') {
          let xmlStr = serverResponse.body;
          let xml = new window.DOMParser().parseFromString(xmlStr, 'text/xml');
          if (xml && xml.getElementsByTagName('parsererror').length == 0) {
            bidResponse.requestId = bidRequest.data.bidId;
            bidResponse.bidderCode = BIDDER_CODE;
            bidResponse.ad = '';
            bidResponse.cpm = '1'; // xml.getElementsByTagName('Pricing')[0].textContent);
            bidResponse.width = bidRequest.data.AV_WIDTH;
            bidResponse.height = bidRequest.data.AV_HEIGHT;
            bidResponse.ttl = TTL;
            bidResponse.creativeId = xml.getElementsByTagName('Ad')[0].getAttribute('id') || '1';
            bidResponse.currency = 'USD'; // xml.getElementsByTagName('Pricing')[0].getAttribute('currency');
            bidResponse.netRevenue = true;
            var blob = new Blob([xmlStr], {
              type: 'application/xml'
            });
            bidResponse.vastUrl = window.URL.createObjectURL(blob);
            bidResponse.vastXml = xmlStr;
            bidResponse.mediaType = VIDEO;
            bidResponse.renderer = newRenderer(bidRequest);

            bidResponses.push(bidResponse);
          } else {}
        } else {}
      } catch (e) {}
    }
  } else {}

  return bidResponses;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse
}

registerBidder(spec);
