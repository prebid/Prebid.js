/* eslint-disable no-tabs */
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { getStorageManager } from '../src/storageManager.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import { config } from '../src/config.js';
import * as utils from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'tpmn';
const DEFAULT_BID_TTL = 500;
const DEFAULT_CURRENCY = 'USD';
const SUPPORTED_AD_TYPES = [BANNER, VIDEO];
// const BIDDER_ENDPOINT_URL = 'http://localhost:8081/ortb/pbjs_bidder';
const BIDDER_ENDPOINT_URL = 'https://gat.tpmn.io/ortb/pbjs_bidder';
const IFRAMESYNC = 'https://gat.tpmn.io/sync/iframe';
const COMMON_PARAMS = [
  'battr'
];

export const VIDEO_RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';
export const ADAPTER_VERSION = '2.0';
export const storage = getStorageManager({bidderCode: BIDDER_CODE});
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} bid The bid that won the auction
   */
  onBidWon: function (bid) {
    if (bid.burl) {
      utils.triggerPixel(bid.burl);
    }
  }
}

function isBidRequestValid(bid) {
  return (isValidInventoryId(bid) && (isValidBannerRequest(bid) || isValidVideoRequest(bid)));
}

function isValidInventoryId(bid) {
  return 'params' in bid && 'inventoryId' in bid.params && utils.isNumber(bid.params.inventoryId);
}

function isValidBannerRequest(bid) {
  const bannerSizes = utils.deepAccess(bid, `mediaTypes.${BANNER}.sizes`);
  return utils.isArray(bannerSizes) && bannerSizes.length > 0 && bannerSizes.every(size => utils.isNumber(size[0]) && utils.isNumber(size[1]));
}

function isValidVideoRequest(bid) {
  const videoSizes = utils.deepAccess(bid, `mediaTypes.${VIDEO}.playerSize`);
  const videoMimes = utils.deepAccess(bid, `mediaTypes.${VIDEO}.mimes`);

  const isValidVideoSize = utils.isArray(videoSizes) && videoSizes.length > 0 && videoSizes.every(size => utils.isNumber(size[0]) && utils.isNumber(size[1]));
  const isValidVideoMimes = utils.isArray(videoMimes) && videoMimes.length > 0;
  return isValidVideoSize && isValidVideoMimes;
}

function buildRequests(validBidRequests, bidderRequest) {
  let requests = [];
  try {
    if (validBidRequests.length === 0 || !bidderRequest) return [];
    let bannerBids = validBidRequests.filter(bid => utils.deepAccess(bid, 'mediaTypes.banner'));
    let videoBids = validBidRequests.filter(bid => utils.deepAccess(bid, 'mediaTypes.video'));

    bannerBids.forEach(bid => {
      requests.push(createRequest([bid], bidderRequest, BANNER));
    });

    videoBids.forEach(bid => {
      requests.push(createRequest([bid], bidderRequest, VIDEO));
    });
  } catch (err) {
    utils.logWarn('buildRequests', err);
  }

  return requests;
}

function createRequest(bidRequests, bidderRequest, mediaType) {
  const rtbData = CONVERTER.toORTB({ bidRequests, bidderRequest, context: { mediaType } })

  const bid = bidRequests.find((b) => b.params.inventoryId)

  if (bid.params.inventoryId) rtbData.ext = {};
  if (bid.params.inventoryId) rtbData.ext.inventoryId = bid.params.inventoryId

  const ortb2Data = bidderRequest?.ortb2 || {};
  const bcat = ortb2Data?.bcat || bid.params.bcat || [];
  const badv = ortb2Data?.badv || bid.params.badv || [];
  const bapp = ortb2Data?.bapp || bid.params.bapp || [];

  if (bcat.length > 0) {
    rtbData.bcat = bcat;
  }
  if (badv.length > 0) {
    rtbData.badv = badv;
  }
  if (badv.length > 0) {
    rtbData.bapp = bapp;
  }

  return {
    method: 'POST',
    url: BIDDER_ENDPOINT_URL + '?v=' + ADAPTER_VERSION,
    data: rtbData
  }
}

function interpretResponse(response, request) {
  return CONVERTER.fromORTB({ request: request.data, response: response.body }).bids;
}

registerBidder(spec);

const CONVERTER = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_BID_TTL,
    currency: DEFAULT_CURRENCY
  },
  imp(buildImp, bidRequest, context) {
    let imp = buildImp(bidRequest, context);
    if (!imp.bidfloor && bidRequest.params.bidFloor) {
      imp.bidfloor = bidRequest.params.bidFloor;
    }
    [VIDEO, BANNER].forEach(namespace => {
      COMMON_PARAMS.forEach(param => {
        if (bidRequest.params.hasOwnProperty(param)) {
          utils.deepSetValue(imp, `${namespace}.${param}`, bidRequest.params[param])
        }
      })
    })
    return imp;
  },
  bidResponse(buildBidResponse, bid, context) {
    const {bidRequest} = context;
    const bidResponse = buildBidResponse(bid, context);
    if (bidResponse.mediaType === BANNER) {
      bidResponse.ad = bid.adm;
    } else if (bidResponse.mediaType === VIDEO) {
      if (bidRequest.mediaTypes.video.context === 'outstream') {
        bidResponse.rendererUrl = VIDEO_RENDERER_URL;
        bidResponse.renderer = createRenderer(bidRequest);
      }
    }
    return bidResponse;
  },
  overrides: {
    imp: {
      video(orig, imp, bidRequest, context) {
        let videoParams = bidRequest.mediaTypes[VIDEO];
        if (videoParams) {
          videoParams = Object.assign({}, videoParams, bidRequest.params.video);
          bidRequest = {...bidRequest, mediaTypes: {[VIDEO]: videoParams}}
        }
        orig(imp, bidRequest, context);
      },
    },
  }
});

function createRenderer(bid) {
  const renderer = Renderer.install({
    id: bid.bidId,
    url: VIDEO_RENDERER_URL,
    config: utils.deepAccess(bid, 'renderer.options'),
    loaded: false,
    adUnitCode: bid.adUnitCode
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    utils.logWarn('Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}

function outstreamRender(bid, doc) {
  bid.renderer.push(() => {
    const win = (doc) ? doc.defaultView : window;
    win.ANOutstreamVideo.renderAd({
      sizes: [bid.playerWidth, bid.playerHeight],
      targetId: bid.adUnitCode,
      rendererOptions: bid.renderer.getConfig(),
      adResponse: { content: bid.vastXml }

    }, handleOutstreamRendererEvents.bind(null, bid));
  });
}

function handleOutstreamRendererEvents(bid, id, eventName) {
  bid.renderer.handleVideoEvent({ id, eventName });
}

function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
  const syncArr = [];
  if (syncOptions.iframeEnabled) {
    let policyParam = '';
    if (gdprConsent && gdprConsent.consentString) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        policyParam += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        policyParam += `&gdpr=0&gdpr_consent=${gdprConsent.consentString}`;
      }
    }
    if (uspConsent && uspConsent.consentString) {
      policyParam += `&ccpa_consent=${uspConsent.consentString}`;
    }
    const coppa = config.getConfig('coppa') ? 1 : 0;
    policyParam += `&coppa=${coppa}`;
    syncArr.push({
      type: 'iframe',
      url: IFRAMESYNC + '?' + policyParam
    });
  } else {
    syncArr.push({
      type: 'image',
      url: 'https://x.bidswitch.net/sync?ssp=tpmn'
    });
    syncArr.push({
      type: 'image',
      url: 'https://gocm.c.appier.net/tpmn'
    });
    syncArr.push({
      type: 'image',
      url: 'https://info.mmnneo.com/getGuidRedirect.info?url=https%3A%2F%2Fad.tpmn.co.kr%2Fcookiesync.tpmn%3Ftpmn_nid%3Dbf91e8b3b9d3f1af3fc1d657f090b4fb%26tpmn_buid%3D'
    });
    syncArr.push({
      type: 'image',
      url: 'https://sync.aralego.com/idSync?redirect=https%3A%2F%2Fad.tpmn.co.kr%2FpixelCt.tpmn%3Ftpmn_nid%3Dde91e8b3b9d3f1af3fc1d657f090b815%26tpmn_buid%3DSspCookieUserId'
    });
  }
  return syncArr;
}
