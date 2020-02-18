import { VIDEO } from '../src/mediaTypes';
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

function buildRequests(validBidRequests, bidderRequest) {
  let bidRequests = [];

  for (let i = 0; i < validBidRequests.length; i++) {
    let bidRequest = validBidRequests[i];
    var sizes = [[640, 480]];

    if (bidRequest.mediaTypes && bidRequest.mediaTypes.video && bidRequest.mediaTypes.video.playerSize) {
      sizes = bidRequest.mediaTypes.video.playerSize;
    } else {
      if (bidRequest.sizes) {
        sizes = bidRequest.sizes;
      }
    }
    if (sizes.length === 2 && typeof sizes[0] === 'number') {
      sizes = [[sizes[0], sizes[1]]];
    }

    for (let j = 0; j < sizes.length; j++) {
      let size = sizes[j];
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
      if (!s2sParams.AV_IDFA && !s2sParams.AV_URL) {
        if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.referer) {
          s2sParams.AV_URL = bidderRequest.refererInfo.referer;
        } else {
          s2sParams.AV_URL = window.location.href;
        }
      }
      if (s2sParams.AV_IDFA && !s2sParams.AV_AID) { s2sParams.AV_AID = s2sParams.AV_IDFA; }
      if (s2sParams.AV_AID && !s2sParams.AV_IDFA) { s2sParams.AV_IDFA = s2sParams.AV_AID; }

      s2sParams.cb = Math.floor(Math.random() * 999999999);
      s2sParams.AV_WIDTH = playerWidth;
      s2sParams.AV_HEIGHT = playerHeight;
      s2sParams.bidWidth = playerWidth;
      s2sParams.bidHeight = playerHeight;
      s2sParams.bidId = bidRequest.bidId;
      s2sParams.pbjs = 1;
      s2sParams.tgt = 10;
      s2sParams.s2s = '1';

      if (bidderRequest && bidderRequest.gdprConsent) {
        if (bidderRequest.gdprConsent.gdprApplies) {
          s2sParams.AV_GDPR = 1;
          s2sParams.AV_CONSENT = bidderRequest.gdprConsent.consentString;
        }
      }
      if (bidderRequest && bidderRequest.uspConsent) {
        s2sParams.AV_CCPA = bidderRequest.uspConsent;
      }

      let serverDomain = bidRequest.params && bidRequest.params.serverDomain ? bidRequest.params.serverDomain : 'gov.aniview.com';
      let servingUrl = 'https://' + serverDomain + '/api/adserver/vast3/';

      bidRequests.push({
        method: 'GET',
        url: servingUrl,
        data: s2sParams,
        bidRequest
      });
    }
  }

  return bidRequests;
}
function getCpmData(xml) {
  let ret = {cpm: 0, currency: 'USD'};
  if (xml) {
    let ext = xml.getElementsByTagName('Extensions');
    if (ext && ext.length > 0) {
      ext = ext[0].getElementsByTagName('Extension');
      if (ext && ext.length > 0) {
        for (var i = 0; i < ext.length; i++) {
          if (ext[i].getAttribute('type') == 'ANIVIEW') {
            let price = ext[i].getElementsByTagName('Cpm');
            if (price && price.length == 1) {
              ret.cpm = price[0].textContent;
            }
            break;
          }
        }
      }
    }
  }
  return ret;
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
            let cpmData = getCpmData(xml);
            if (cpmData && cpmData.cpm > 0) {
              bidResponse.requestId = bidRequest.data.bidId;
              bidResponse.bidderCode = BIDDER_CODE;
              bidResponse.ad = '';
              bidResponse.cpm = cpmData.cpm;
              bidResponse.width = bidRequest.data.AV_WIDTH;
              bidResponse.height = bidRequest.data.AV_HEIGHT;
              bidResponse.ttl = TTL;
              bidResponse.creativeId = xml.getElementsByTagName('Ad') && xml.getElementsByTagName('Ad')[0] && xml.getElementsByTagName('Ad')[0].getAttribute('id') ? xml.getElementsByTagName('Ad')[0].getAttribute('id') : 'creativeId';
              bidResponse.currency = cpmData.currency;
              bidResponse.netRevenue = true;
              var blob = new Blob([xmlStr], {
                type: 'application/xml'
              });
              bidResponse.vastUrl = window.URL.createObjectURL(blob);
              bidResponse.vastXml = xmlStr;
              bidResponse.mediaType = VIDEO;
              if (bidRequest.bidRequest && bidRequest.bidRequest.mediaTypes && bidRequest.bidRequest.mediaTypes.video && bidRequest.bidRequest.mediaTypes.video.context === 'outstream') { bidResponse.renderer = newRenderer(bidRequest); }

              bidResponses.push(bidResponse);
            }
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
