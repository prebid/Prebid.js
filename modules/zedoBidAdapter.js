import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER, VIDEO } from 'src/mediaTypes';
import find from 'core-js/library/fn/array/find';
import { Renderer } from 'src/Renderer';
import * as url from 'src/url';

const BIDDER_CODE = 'zedo';
const URL = '//z2.zedo.com/asw/fmh.json';
const SECURE_URL = '//saxp.zedo.com/asw/fmh.json';
const DIM_TYPE = {
  '7': 'display',
  '9': 'display',
  '14': 'display',
  '70': 'SBR',
  '83': 'CurtainRaiser',
  '85': 'Inarticle',
  '86': 'pswipeup',
  '88': 'Inview',
  '100': 'display',
  '101': 'display',
  '102': 'display',
  '103': 'display'
  // '85': 'pre-mid-post-roll',
};
const EVENT_PIXEL_URL = 'm1.zedo.com/log/p.gif';
const SECURE_EVENT_PIXEL_URL = 'tt1.zedo.com/log/p.gif';

export const spec = {
  code: BIDDER_CODE,
  aliases: [],
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.channelCode && bid.params.dimId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    let data = {
      placements: []
    };
    bidRequests.map(bidRequest => {
      let channelCode = parseInt(bidRequest.params.channelCode);
      let network = parseInt(channelCode / 1000000);
      let channel = channelCode % 1000000;
      let dim = getSizes(bidRequest.sizes);
      let placement = {
        id: bidRequest.bidId,
        network: network,
        channel: channel,
        width: dim[0],
        height: dim[1],
        dimension: bidRequest.params.dimId,
        version: '$prebid.version$',
        keyword: '',
        transactionId: bidRequest.transactionId
      }
      if (bidderRequest && bidderRequest.gdprConsent) {
        if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
          data.gdpr = Number(bidderRequest.gdprConsent.gdprApplies);
        }
        data.gdpr_consent = bidderRequest.gdprConsent.consentString;
      }
      let dimType = DIM_TYPE[String(bidRequest.params.dimId)]
      if (dimType) {
        placement['renderers'] = [{
          'name': dimType
        }]
      } else { // default to display
        placement['renderers'] = [{
          'name': 'display'
        }]
      }
      data['placements'].push(placement);
    });
    let reqUrl = utils.getTopWindowLocation().protocol === 'http:' ? URL : SECURE_URL;
    return {
      method: 'GET',
      url: reqUrl,
      data: 'g=' + JSON.stringify(data)
    }
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, request) {
    serverResponse = serverResponse.body;
    const bids = [];
    if (!serverResponse || serverResponse.error) {
      let errorMessage = `in response for ${request.bidderCode} adapter`;
      if (serverResponse && serverResponse.error) { errorMessage += `: ${serverResponse.error}`; }
      utils.logError(errorMessage);
      return bids;
    }

    if (serverResponse.ad) {
      serverResponse.ad.forEach(ad => {
        const creativeBid = getCreative(ad);
        if (creativeBid) {
          if (parseInt(creativeBid.cpm) !== 0) {
            const bid = newBid(ad, creativeBid, request);
            bid.mediaType = parseMediaType(creativeBid);
            bids.push(bid);
          }
        }
      });
    }
    return bids;
  },

  getUserSyncs: function (syncOptions, responses, gdprConsent) {
    if (syncOptions.iframeEnabled) {
      let url = utils.getTopWindowLocation().protocol === 'http:' ? 'http://d3.zedo.com/rs/us/fcs.html' : 'https://tt3.zedo.com/rs/us/fcs.html';
      if (gdprConsent && typeof gdprConsent.consentString === 'string') {
        // add 'gdpr' only if 'gdprApplies' is defined
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          url += `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
        } else {
          url += `?gdpr_consent=${gdprConsent.consentString}`;
        }
      }
      return [{
        type: 'iframe',
        url: url
      }];
    }
  },

  onTimeout: function (timeoutData) {
    try {
      logEvent('117', timeoutData);
    } catch (e) {
      utils.logError(e);
    }
  },

  onBidWon: function (bid) {
    try {
      logEvent('116', [bid]);
    } catch (e) {
      utils.logError(e);
    }
  },
};

function getCreative(ad) {
  return ad && ad.creatives && ad.creatives.length && find(ad.creatives, creative => creative.adId);
}
/**
 * Unpack the Server's Bid into a Prebid-compatible one.
 * @param serverBid
 * @param rtbBid
 * @param bidderRequest
 * @return Bid
 */
function newBid(serverBid, creativeBid, bidderRequest) {
  const bid = {
    requestId: serverBid.slotId,
    creativeId: creativeBid.adId,
    network: serverBid.network,
    adType: creativeBid.creativeDetails.type,
    dealId: 99999999,
    currency: 'USD',
    netRevenue: true,
    ttl: 300
  };

  if (creativeBid.creativeDetails.type === 'VAST') {
    Object.assign(bid, {
      width: creativeBid.width,
      height: creativeBid.height,
      vastXml: creativeBid.creativeDetails.adContent,
      cpm: (parseInt(creativeBid.cpm) * 0.65) / 1000000,
      ttl: 3600
    });
    const rendererOptions = utils.deepAccess(
      bidderRequest,
      'renderer.options'
    );
    let rendererUrl = utils.getTopWindowLocation().protocol === 'http:' ? 'http://c14.zedo.com/gecko/beta/fmpbgt.min.js' : 'https://ss3.zedo.com/gecko/beta/fmpbgt.min.js';
    Object.assign(bid, {
      adResponse: serverBid,
      renderer: getRenderer(bid.adUnitCode, serverBid.slotId, rendererUrl, rendererOptions)
    });
  } else {
    Object.assign(bid, {
      width: creativeBid.width,
      height: creativeBid.height,
      cpm: (parseInt(creativeBid.cpm) * 0.6) / 1000000,
      ad: creativeBid.creativeDetails.adContent,
    });
  }

  return bid;
}
/* Turn bid request sizes into compatible format */
function getSizes(requestSizes) {
  let width = 0;
  let height = 0;
  if (utils.isArray(requestSizes) && requestSizes.length === 2 &&
    !utils.isArray(requestSizes[0])) {
    width = parseInt(requestSizes[0], 10);
    height = parseInt(requestSizes[1], 10);
  } else if (typeof requestSizes === 'object') {
    for (let i = 0; i < requestSizes.length; i++) {
      let size = requestSizes[i];
      width = parseInt(size[0], 10);
      height = parseInt(size[1], 10);
      break;
    }
  }
  return [width, height];
}

function getRenderer(adUnitCode, rendererId, rendererUrl, rendererOptions = {}) {
  const renderer = Renderer.install({
    id: rendererId,
    url: rendererUrl,
    config: rendererOptions,
    loaded: false,
  });

  try {
    renderer.setRender(videoRenderer);
  } catch (err) {
    utils.logWarn('Prebid Error calling setRender on renderer', err);
  }

  renderer.setEventHandlers({
    impression: () => utils.logMessage('ZEDO video impression'),
    loaded: () => utils.logMessage('ZEDO video loaded'),
    ended: () => {
      utils.logMessage('ZEDO renderer video ended');
      document.querySelector(`#${adUnitCode}`).style.display = 'none';
    }
  });
  return renderer;
}

function videoRenderer(bid) {
  // push to render queue
  bid.renderer.push(() => {
    let channelCode = utils.deepAccess(bid, 'params.0.channelCode') || 0;
    let dimId = utils.deepAccess(bid, 'params.0.dimId') || 0;
    let options = utils.deepAccess(bid, 'params.0.options') || {};
    let channel = (channelCode > 0) ? (channelCode - (bid.network * 1000000)) : 0;
    var rndr = new ZdPBTag(bid.adUnitCode, bid.network, bid.width, bid.height, bid.adType, bid.vastXml, channel, dimId,
      (encodeURI(utils.getTopWindowUrl()) || ''), options);
    rndr.renderAd();
  });
}

function parseMediaType(creativeBid) {
  const adType = creativeBid.creativeDetails.type;
  if (adType === 'VAST') {
    return VIDEO;
  } else {
    return BANNER;
  }
}

function logEvent(eid, data) {
  let getParams = {
    protocol: utils.getTopWindowLocation().protocol === 'http:' ? 'http' : 'https',
    hostname: utils.getTopWindowLocation().protocol === 'http:' ? EVENT_PIXEL_URL : SECURE_EVENT_PIXEL_URL,
    search: getLoggingData(eid, data)
  };
  utils.triggerPixel(url.format(getParams).replace(/&/g, ';'));
}

function getLoggingData(eid, data) {
  data = (utils.isArray(data) && data) || [];

  let params = {};
  let channel, network, dim, adunitCode, timeToRespond, cpm;
  data.map((adunit) => {
    adunitCode = adunit.adUnitCode;
    channel = utils.deepAccess(adunit, 'params.0.channelCode') || 0;
    network = channel > 0 ? parseInt(channel / 1000000) : 0;
    dim = utils.deepAccess(adunit, 'params.0.dimId') * 256 || 0;
    timeToRespond = adunit.timeout ? adunit.timeout : adunit.timeToRespond;
    cpm = adunit.cpm;
  });
  params.n = network;
  params.c = channel;
  params.s = '0';
  params.x = dim;
  params.ai = encodeURI('Prebid^zedo^' + adunitCode + '^' + cpm + '^' + timeToRespond);
  params.pu = encodeURI(utils.getTopWindowUrl()) || '';
  params.eid = eid;
  params.e = 'e';
  params.z = Math.random();

  return params;
}

registerBidder(spec);
