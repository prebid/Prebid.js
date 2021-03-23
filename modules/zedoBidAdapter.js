import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import find from 'core-js-pure/features/array/find';
import { Renderer } from '../src/Renderer.js';
import { getRefererInfo } from '../src/refererDetection.js';

const BIDDER_CODE = 'zedo';
const SECURE_URL = 'https://saxp.zedo.com/asw/fmh.json';
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
        publisher: bidRequest.params.pubId ? bidRequest.params.pubId : 0,
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
      // Add CCPA consent string
      if (bidderRequest && bidderRequest.uspConsent) {
        data.usp = bidderRequest.uspConsent;
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
    // adding schain object
    if (bidRequests[0].schain) {
      data['supplyChain'] = getSupplyChain(bidRequests[0].schain);
    }
    return {
      method: 'GET',
      url: SECURE_URL,
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
      let url = 'https://tt3.zedo.com/rs/us/fcs.html';
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
  }

};

function getSupplyChain (supplyChain) {
  return {
    complete: supplyChain.complete,
    nodes: supplyChain.nodes
  }
};

function getCreative(ad) {
  return ad && ad.creatives && ad.creatives.length && find(ad.creatives, creative => creative.adId);
};
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
      cpm: parseInt(creativeBid.bidCpm) / 1000000,
      ttl: 3600
    });
    const rendererOptions = utils.deepAccess(
      bidderRequest,
      'renderer.options'
    );
    let rendererUrl = 'https://ss3.zedo.com/gecko/beta/fmpbgt.min.js';
    Object.assign(bid, {
      adResponse: serverBid,
      renderer: getRenderer(bid.adUnitCode, serverBid.slotId, rendererUrl, rendererOptions)
    });
  } else {
    Object.assign(bid, {
      width: creativeBid.width,
      height: creativeBid.height,
      cpm: parseInt(creativeBid.bidCpm) / 1000000,
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
  const refererInfo = getRefererInfo();
  let referrer = '';
  if (refererInfo) {
    referrer = refererInfo.referer;
  }
  bid.renderer.push(() => {
    let channelCode = utils.deepAccess(bid, 'params.0.channelCode') || 0;
    let dimId = utils.deepAccess(bid, 'params.0.dimId') || 0;
    let publisher = utils.deepAccess(bid, 'params.0.pubId') || 0;
    let options = utils.deepAccess(bid, 'params.0.options') || {};
    let channel = (channelCode > 0) ? (channelCode - (bid.network * 1000000)) : 0;

    var rndr = new window.ZdPBTag(bid.adUnitCode, bid.network, bid.width, bid.height, bid.adType, bid.vastXml, channel, dimId,
      (encodeURI(referrer) || ''), options);
    rndr.renderAd(publisher);
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
    protocol: 'https',
    hostname: SECURE_EVENT_PIXEL_URL,
    search: getLoggingData(eid, data)
  };
  let eventUrl = utils.buildUrl(getParams).replace(/&/g, ';');
  utils.triggerPixel(eventUrl);
}

function getLoggingData(eid, data) {
  data = (utils.isArray(data) && data) || [];

  let params = {};
  let channel, network, dim, publisher, adunitCode, timeToRespond, cpm;
  data.map((adunit) => {
    adunitCode = adunit.adUnitCode;
    channel = utils.deepAccess(adunit, 'params.0.channelCode') || 0;
    network = channel > 0 ? parseInt(channel / 1000000) : 0;
    dim = utils.deepAccess(adunit, 'params.0.dimId') * 256 || 0;
    publisher = utils.deepAccess(adunit, 'params.0.pubId') || 0;
    timeToRespond = adunit.timeout ? adunit.timeout : adunit.timeToRespond;
    cpm = adunit.cpm;
  });
  let referrer = '';
  const refererInfo = getRefererInfo();
  if (refererInfo) {
    referrer = refererInfo.referer;
  }
  params.n = network;
  params.c = channel;
  params.s = publisher;
  params.x = dim;
  params.ai = encodeURI('Prebid^zedo^' + adunitCode + '^' + cpm + '^' + timeToRespond);
  params.pu = encodeURI(referrer) || '';
  params.eid = eid;
  params.e = 'e';
  params.z = Math.random();

  return params;
}

registerBidder(spec);
