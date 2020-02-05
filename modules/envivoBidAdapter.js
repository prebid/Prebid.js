import { registerBidder } from '../src/adapters/bidderFactory';
import { config } from '../src/config';
import * as utils from '../src/utils';
import {BANNER, VIDEO} from '../src/mediaTypes';
import { ajax } from '../src/ajax';
import {Renderer} from '../src/Renderer';

const SUPPORTED_AD_TYPES = [BANNER, VIDEO];
const BIDDER_CODE = 'envivo';
const DOMAIN = 'https://ad.nvivo.tv/';
const RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

function isBidRequestValid(bid) {
  return (typeof bid.params !== 'undefined' && parseInt(utils.getValue(bid.params, 'publisherId')) > 0);
}

function buildRequests(validBidRequests) {
  return {
    method: 'POST',
    url: DOMAIN + 'ads/www/admin/plugins/Prebid/getAd.php',
    options: {
      withCredentials: false,
      crossOrigin: true
    },
    data: validBidRequests,
  };
}

function interpretResponse(serverResponse, request) {
  const response = serverResponse.body;
  const bidResponses = [];
  var bidRequestResponses = [];

  utils._each(response, function(bidAd) {
    bidAd.adResponse = {
      content: bidAd.vastXml,
      height: bidAd.height,
      width: bidAd.width
    };
    bidAd.ttl = config.getConfig('_bidderTimeout')
    bidAd.renderer = bidAd.context === 'outstream' ? createRenderer(bidAd, {
      id: bidAd.adUnitCode,
      url: RENDERER_URL
    }, bidAd.adUnitCode) : undefined;
    bidResponses.push(bidAd);
  });

  bidRequestResponses.push({
    function: 'saveResponses',
    request: request,
    response: bidResponses
  });
  sendResponseToServer(bidRequestResponses);
  return bidResponses;
}

function outstreamRender(bidAd) {
  bidAd.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      sizes: [bidAd.width, bidAd.height],
      width: bidAd.width,
      height: bidAd.height,
      targetId: bidAd.adUnitCode,
      adResponse: bidAd.adResponse,
      rendererOptions: {
        showVolume: false,
        allowFullscreen: false
      }
    });
  });
}

function createRenderer(bidAd, rendererParams, adUnitCode) {
  const renderer = Renderer.install({
    id: rendererParams.id,
    url: rendererParams.url,
    loaded: false,
    config: {'player_height': bidAd.height, 'player_width': bidAd.width},
    adUnitCode
  });
  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    utils.logWarn('Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}

function onBidWon(bid) {
  let wonBids = [];
  wonBids.push(bid);
  wonBids[0].function = 'onBidWon';
  sendResponseToServer(wonBids);
}

function onTimeout(details) {
  details.unshift({ 'function': 'onTimeout' });
  sendResponseToServer(details);
}

function sendResponseToServer(data) {
  ajax(DOMAIN + 'ads/www/admin/plugins/Prebid/tracking/track.php', null, JSON.stringify(data), {
    withCredentials: false,
    method: 'POST',
    crossOrigin: true
  });
}

function getUserSyncs(syncOptions) {
  if (syncOptions.iframeEnabled) {
    return [{
      type: 'iframe',
      url: DOMAIN + 'ads/www/admin/plugins/Prebid/userSync.php'
    }];
  }
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onBidWon,
  onTimeout
};

registerBidder(spec);
