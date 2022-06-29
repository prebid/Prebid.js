import { VIDEO, BANNER } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
import { logError } from '../src/utils.js';

const BIDDER_CODE = 'aniview';
const GVLID = 780;
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
  let playerDomain = 'player.aniview.com';
  const config = {};

  if (bidRequest && bidRequest.bidRequest && bidRequest.bidRequest.params) {
    const params = bidRequest.bidRequest.params

    if (params.playerDomain) {
      playerDomain = params.playerDomain;
    }

    if (params.AV_PUBLISHERID) {
      config.AV_PUBLISHERID = params.AV_PUBLISHERID;
    }

    if (params.AV_CHANNELID) {
      config.AV_CHANNELID = params.AV_CHANNELID;
    }
  }

  const renderer = Renderer.install({
    url: 'https://' + playerDomain + '/script/6.1/prebidRenderer.js',
    config: config,
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
let irc = 0;
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
        // TODO: does it make sense to fall back to window.location here?
        s2sParams.AV_URL = bidderRequest?.refererInfo?.page || window.location.href;
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
      s2sParams.irc = irc;
      irc++;
      s2sParams.wpm = 1;

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
function buildBanner(xmlStr, bidRequest, bidResponse) {
  var rendererData = JSON.stringify({
    id: bidRequest.adUnitCode,
    debug: window.location.href.indexOf('pbjsDebug') >= 0,
    placement: bidRequest.bidRequest.adUnitCode,
    width: bidResponse.width,
    height: bidResponse.height,
    vastXml: xmlStr,
    bid: bidResponse,
    config: bidRequest.bidRequest.params.rendererConfig
  });
  var playerDomain = bidRequest.bidRequest.params.playerDomain || 'player.aniview.com';
  var ad = '<script src="https://' + playerDomain + '/script/6.1/prebidRenderer.js"></script>';
  ad += '<script> window.aniviewRenderer.renderAd(' + rendererData + ') </script>'
  return ad;
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
          let mediaType = VIDEO;
          if (bidRequest.bidRequest && bidRequest.bidRequest.mediaTypes && !bidRequest.bidRequest.mediaTypes[VIDEO]) {
            mediaType = BANNER;
          }
          let xmlStr = serverResponse.body;
          let xml = new window.DOMParser().parseFromString(xmlStr, 'text/xml');
          if (xml && xml.getElementsByTagName('parsererror').length == 0) {
            let cpmData = getCpmData(xml);
            if (cpmData && cpmData.cpm > 0) {
              bidResponse.requestId = bidRequest.data.bidId;
              bidResponse.ad = '';
              bidResponse.cpm = cpmData.cpm;
              bidResponse.width = bidRequest.data.AV_WIDTH;
              bidResponse.height = bidRequest.data.AV_HEIGHT;
              bidResponse.ttl = TTL;
              bidResponse.creativeId = xml.getElementsByTagName('Ad') && xml.getElementsByTagName('Ad')[0] && xml.getElementsByTagName('Ad')[0].getAttribute('id') ? xml.getElementsByTagName('Ad')[0].getAttribute('id') : 'creativeId';
              bidResponse.currency = cpmData.currency;
              bidResponse.netRevenue = true;
              bidResponse.mediaType = mediaType;
              if (mediaType === VIDEO) {
                try {
                  var blob = new Blob([xmlStr], {
                    type: 'application/xml'
                  });
                  bidResponse.vastUrl = window.URL.createObjectURL(blob);
                } catch (ex) {
                  logError('Aniview Debug create vastXml error:\n\n' + ex);
                }
                bidResponse.vastXml = xmlStr;
                if (bidRequest.bidRequest && bidRequest.bidRequest.mediaTypes && bidRequest.bidRequest.mediaTypes.video && bidRequest.bidRequest.mediaTypes.video.context === 'outstream') {
                  bidResponse.renderer = newRenderer(bidRequest);
                }
              } else {
                bidResponse.ad = buildBanner(xmlStr, bidRequest, bidResponse);
              }
              bidResponse.meta = {
                advertiserDomains: []
              };

              bidResponses.push(bidResponse);
            }
          } else {}
        } else {}
      } catch (e) {}
    }
  } else {}

  return bidResponses;
}

function getSyncData(xml, options) {
  let ret = [];
  if (xml) {
    let ext = xml.getElementsByTagName('Extensions');
    if (ext && ext.length > 0) {
      ext = ext[0].getElementsByTagName('Extension');
      if (ext && ext.length > 0) {
        for (var i = 0; i < ext.length; i++) {
          if (ext[i].getAttribute('type') == 'ANIVIEW') {
            let syncs = ext[i].getElementsByTagName('AdServingSync');
            if (syncs && syncs.length == 1) {
              try {
                let data = JSON.parse(syncs[0].textContent);
                if (data && data.trackers && data.trackers.length) {
                  data = data.trackers;
                  for (var j = 0; j < data.length; j++) {
                    if (typeof data[j] === 'object' &&
                      typeof data[j].url === 'string' &&
                      (data[j].e === 'inventory' || data[j].e === 'sync')
                    ) {
                      if (data[j].t == 1 && options.pixelEnabled) {
                        ret.push({url: data[j].url, type: 'image'});
                      } else {
                        if (data[j].t == 3 && options.iframeEnabled) {
                          ret.push({url: data[j].url, type: 'iframe'});
                        }
                      }
                    }
                  }
                }
              } catch (e) {}
            }
            break;
          }
        }
      }
    }
  }
  return ret;
}

function getUserSyncs(syncOptions, serverResponses) {
  if (serverResponses && serverResponses[0] && serverResponses[0].body) {
    if (serverResponses.error) {
      return [];
    } else {
      try {
        let xmlStr = serverResponses[0].body;
        let xml = new window.DOMParser().parseFromString(xmlStr, 'text/xml');
        if (xml && xml.getElementsByTagName('parsererror').length == 0) {
          let syncData = getSyncData(xml, syncOptions);
          return syncData;
        }
      } catch (e) {}
    }
  }
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: ['avantisvideo', 'selectmediavideo', 'vidcrunch', 'openwebvideo', 'didnavideo', 'ottadvisors'],
  supportedMediaTypes: [VIDEO, BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs
};

registerBidder(spec);
