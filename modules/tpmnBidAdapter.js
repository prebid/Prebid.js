/* eslint-disable no-tabs */
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { getStorageManager } from '../src/storageManager.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import { config } from '../src/config.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'tpmn';
const DEFAULT_BID_TTL = 500;
const DEFAULT_CURRENCY = 'USD';
const SUPPORTED_AD_TYPES = [BANNER, VIDEO];
// const BIDDER_ENDPOINT_URL = 'http://localhost:8081/ortb/pbjs_bidder';
const BIDDER_ENDPOINT_URL = 'https://gat.tpmn.io/ortb/pbjs_bidder';
const IFRAMESYNC = 'https://gat.tpmn.io/sync/iframe';
const VIDEO_ORTB_PARAMS = [
  'mimes',
  'minduration',
  'maxduration',
  'placement',
  'protocols',
  'startdelay',
  'skip',
  'skipafter',
  'minbitrate',
  'maxbitrate',
  'delivery',
  'playbackmethod',
  'api',
  'linearity',
  'battr'
];
const BANNER_ORTB_PARAMS = [
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
  if (validBidRequests.length === 0 || !bidderRequest) return [];
  let bannerBids = validBidRequests.filter(bid => utils.deepAccess(bid, 'mediaTypes.banner'));
  let videoBids = validBidRequests.filter(bid => utils.deepAccess(bid, 'mediaTypes.video'));
  let requests = [];

  bannerBids.forEach(bid => {
    requests.push(createRequest([bid], bidderRequest, BANNER));
  });

  videoBids.forEach(bid => {
    requests.push(createRequest([bid], bidderRequest, VIDEO));
  });

  return requests;
}

function createRequest(bidRequests, bidderRequest, mediaType) {
  const rtbData = CONVERTER.toORTB({ bidRequests, bidderRequest, context: { mediaType } })

  const bid = bidRequests.find((b) => b.params.inventoryId)
  // console.log('createRequest : ', mediaType, bid);

  if (!rtbData.site) rtbData.site = {}
  rtbData.site = createSite(bidderRequest.refererInfo)

  if (bidderRequest.gdprConsent) {
    if (!rtbData.user) rtbData.user = {};
    if (!rtbData.user.ext) rtbData.user.ext = {};
    if (!rtbData.regs) rtbData.regs = {};
    if (!rtbData.regs.ext) rtbData.regs.ext = {};
    rtbData.user.ext.consent = bidderRequest.gdprConsent.consentString;
    rtbData.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
  }
  if (bid.params.inventoryId) rtbData.ext = {};
  if (bid.params.inventoryId) rtbData.ext.inventoryId = bid.params.inventoryId
  if (bid.params.bcat) rtbData.bcat = bid.params.bcat;
  if (bid.params.badv) rtbData.badv = bid.params.badv;
  if (bid.params.bapp) rtbData.bapp = bid.params.bapp;

  return {
    method: 'POST',
    url: BIDDER_ENDPOINT_URL + '?v=' + ADAPTER_VERSION,
    data: rtbData,
    options: { contentType: 'application/json;charset=UTF-8', withCredentials: false }
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
    imp.secure = Number(window.location.protocol === 'https:');
    if (!imp.bidfloor && bidRequest.params.bidFloor) {
      imp.bidfloor = bidRequest.params.bidFloor;
    }
    if (bidRequest.mediaTypes[VIDEO]) {
      imp = buildVideoImp(bidRequest, imp);
    } else if (bidRequest.mediaTypes[BANNER]) {
      imp = buildBannerImp(bidRequest, imp);
    }

    return imp;
  },
  bidResponse(buildBidResponse, bid, context) {
    const {bidRequest} = context;
    const bidResponse = buildBidResponse(bid, context);

    utils.logWarn('Building bidResponse');
    utils.logWarn('bid', bid);
    utils.logWarn('bidRequest', bidRequest);
    utils.logWarn('bidResponse', bidResponse);

    if (bidResponse.mediaType === BANNER) {
      bidResponse.ad = bid.adm;
    } else if (bidResponse.mediaType === VIDEO) {
      if (bidRequest.mediaTypes.video.context === 'outstream') {
        bidResponse.rendererUrl = VIDEO_RENDERER_URL;
        bidResponse.renderer = createRenderer(bidRequest);
      }
    }
    return bidResponse;
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
    const win = utils.getWindowFromDocument(doc) || window;
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

/**
 * Creates site description object
 */
function createSite(refInfo) {
  let url = utils.parseUrl(refInfo.page || '');
  let site = {
    'domain': url.hostname,
    'page': url.protocol + '://' + url.hostname + url.pathname
  };

  if (refInfo.ref) {
    site.ref = refInfo.ref
  }
  let keywords = document.getElementsByTagName('meta')['keywords'];
  if (keywords && keywords.content) {
    site.keywords = keywords.content;
  }
  return site;
}

function buildVideoImp(bidRequest, imp) {
  const videoAdUnitParams = utils.deepAccess(bidRequest, `mediaTypes.${VIDEO}`, {});
  const videoBidderParams = utils.deepAccess(bidRequest, `params.${VIDEO}`, {});

  const videoParams = { ...videoAdUnitParams, ...videoBidderParams };

  const videoSizes = (videoAdUnitParams && videoAdUnitParams.playerSize) || [];

  if (videoSizes && videoSizes.length > 0) {
    utils.deepSetValue(imp, 'video.w', videoSizes[0][0]);
    utils.deepSetValue(imp, 'video.h', videoSizes[0][1]);
  }

  VIDEO_ORTB_PARAMS.forEach((param) => {
    if (videoParams.hasOwnProperty(param)) {
      utils.deepSetValue(imp, `video.${param}`, videoParams[param]);
    }
  });

  if (imp.video && videoParams?.context === 'outstream') {
    imp.video.placement = imp.video.placement || 4;
  }

  return { ...imp };
}

function buildBannerImp(bidRequest, imp) {
  const bannerAdUnitParams = utils.deepAccess(bidRequest, `mediaTypes.${BANNER}`, {});
  const bannerBidderParams = utils.deepAccess(bidRequest, `params.${BANNER}`, {});

  const bannerParams = { ...bannerAdUnitParams, ...bannerBidderParams };

  let sizes = bidRequest.mediaTypes.banner.sizes;

  if (sizes) {
    utils.deepSetValue(imp, 'banner.w', sizes[0][0]);
    utils.deepSetValue(imp, 'banner.h', sizes[0][1]);
  }

  BANNER_ORTB_PARAMS.forEach((param) => {
    if (bannerParams.hasOwnProperty(param)) {
      utils.deepSetValue(imp, `banner.${param}`, bannerParams[param]);
    }
  });

  return { ...imp };
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
