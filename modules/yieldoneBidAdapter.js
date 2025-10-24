import {deepAccess, isEmpty, isStr, logWarn, parseSizesInput} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {Renderer} from '../src/Renderer.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getBrowser, getOS} from '../libraries/userAgentUtils/index.js';
import {browserTypes, osTypes} from '../libraries/userAgentUtils/userAgentTypes.enums.js';
import {BOL_LIKE_USER_AGENTS} from '../libraries/userAgentUtils/constants.js';

/**
 * @typedef {import('../src/adapters/bidderFactory').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory').BidderSpec} BidderSpec
 * @typedef {import('../src/adapters/bidderFactory').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory').UserSync} UserSync
 * @typedef {import('../src/auction').BidderRequest} BidderRequest
 */

const BIDDER_CODE = 'yieldone';
const ENDPOINT_URL = 'https://y.one.impact-ad.jp/h_bid';
const USER_SYNC_URL = 'https://y.one.impact-ad.jp/push_sync';
const VIDEO_PLAYER_URL = 'https://img.ak.impact-ad.jp/ic/pone/ivt/firstview/js/dac-video-prebid.min.js';
const CMER_PLAYER_URL = 'https://an.cmertv.com/hb/renderer/cmertv-video-yone-prebid.min.js';
const VIEWABLE_PERCENTAGE_URL = 'https://img.ak.impact-ad.jp/ic/pone/ivt/firstview/js/prebid-adformat-config.js';

const DEFAULT_VIDEO_SIZE = {w: 640, h: 360};

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  aliases: ['y1'],
  supportedMediaTypes: [BANNER, VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   * @param {BidRequest} bid The bid params to validate.
   * @returns {boolean} True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.placementId);
  },
  /**
   * Make a server request from the list of BidRequests.
   * @param {Bid[]} validBidRequests - An array of bids.
   * @param {BidderRequest} bidderRequest - bidder request object.
   * @returns {ServerRequest|ServerRequest[]} ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      const params = bidRequest.params;
      const placementId = params.placementId;
      const cb = Math.floor(Math.random() * 99999999999);
      // TODO: is 'page' the right value here?
      const referrer = bidderRequest.refererInfo.page;
      const bidId = bidRequest.bidId;
      const transactionId = bidRequest.ortb2Imp?.ext?.tid;
      const unitCode = bidRequest.adUnitCode;
      const timeout = bidderRequest.timeout;
      const language = window.navigator.language;
      const screenSize = window.screen.width + 'x' + window.screen.height;
      const payload = {
        v: 'hb1',
        p: placementId,
        cb: cb,
        r: referrer,
        uid: bidId,
        tid: transactionId,
        uc: unitCode,
        tmax: timeout,
        t: 'i',
        language: language,
        screen_size: screenSize
      };

      const mediaType = getMediaType(bidRequest);
      switch (mediaType) {
        case BANNER:
          payload.sz = getBannerSizes(bidRequest);
          break;
        case VIDEO:
          const videoSize = getVideoSize(bidRequest);
          payload.w = videoSize.w;
          payload.h = videoSize.h;
          break;
        default:
          break;
      }

      // LiveRampID
      const idlEnv = deepAccess(bidRequest, 'userId.idl_env');
      if (isStr(idlEnv) && !isEmpty(idlEnv)) {
        payload.lr_env = idlEnv;
      }

      // IMID
      const imuid = deepAccess(bidRequest, 'userId.imuid');
      if (isStr(imuid) && !isEmpty(imuid)) {
        payload.imuid = imuid;
      }

      // DACID
      const fuuid = deepAccess(bidRequest, 'userId.dacId.fuuid');
      const dacid = deepAccess(bidRequest, 'userId.dacId.id');
      if (isStr(fuuid) && !isEmpty(fuuid)) {
        payload.fuuid = fuuid;
      }
      if (isStr(dacid) && !isEmpty(dacid)) {
        payload.dac_id = dacid;
      }

      // ID5
      const id5id = deepAccess(bidRequest, 'userId.id5id.uid');
      if (isStr(id5id) && !isEmpty(id5id)) {
        payload.id5Id = id5id;
      }

      // UID2.0
      const uid2 = deepAccess(bidRequest, 'userId.uid2.id');
      if (isStr(uid2) && !isEmpty(uid2)) {
        payload.uid2id = uid2;
      }

      // GPID
      const gpid = deepAccess(bidRequest, 'ortb2Imp.ext.gpid');
      if (isStr(gpid) && !isEmpty(gpid)) {
        payload.gpid = gpid;
      }

      return {
        method: 'GET',
        url: ENDPOINT_URL,
        data: payload,
      };
    });
  },
  /**
   * Unpack the response from the server into a list of bids.
   * @param {ServerResponse} serverResponse - A successful response from the server.
   * @param {BidRequest} bidRequest
   * @returns {Bid[]} - An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;
    const crid = response.crid || 0;
    const width = response.width || 0;
    const height = response.height || 0;
    const cpm = response.cpm * 1000 || 0;
    if (width !== 0 && height !== 0 && cpm !== 0 && crid !== 0) {
      const dealId = response.dealId || '';
      const renderId = response.renderid || '';
      const currency = response.currency || 'JPY';
      const netRevenue = (response.netRevenue === undefined) ? true : response.netRevenue;
      const referrer = bidRequest.data.r || '';
      const bidResponse = {
        requestId: response.uid,
        cpm: cpm,
        width: response.width,
        height: response.height,
        creativeId: crid,
        dealId: dealId,
        currency: currency,
        netRevenue: netRevenue,
        ttl: 60,
        referrer: referrer,
        meta: {
          advertiserDomains: response.adomain ? response.adomain : []
        },
      };

      if (response.adTag && renderId === 'ViewableRendering') {
        bidResponse.mediaType = BANNER;
        const viewableScript = `
        <script src="${VIEWABLE_PERCENTAGE_URL}"></script>
        <script>
        let width =${bidResponse.width};
        let height =${bidResponse.height};
        let adTag = \`${response.adTag.replace(/\\/g, '\\\\').replace(/\//g, '\\/').replace(/'/g, "\\'").replace(/"/g, '\\"')}\`;
        let targetId ="${bidRequest.data.uc}";
        window.YONEPBViewable = {};
        window.YONEPBViewable.executed = false;
        const viewablePercentage = window.pb_conf.viewablePercentage;
        const viewableRange = height * 0.01 * viewablePercentage;
        const iframe = document.createElement('iframe');
        iframe.setAttribute("style", "border: 0; margin: 0 auto; left: 0; top: 0; width:" + width + "px; height:" + height + "px;");
        iframe.frameBorder = 0; iframe.scrolling = 'no';
        const inDap = document.createElement('script');
        inDap.innerHTML = "inDapIF = true;";
        iframe.appendChild(inDap);
        window.frameElement.parentElement.appendChild(iframe);
        const doc = iframe.contentWindow ? iframe.contentWindow.document : iframe.contentDocument;
        if(!window.parent.$sf){
          let target = window.top.document.getElementById(targetId);
          window.top.addEventListener('scroll', () => {
              const targetRect = target.getBoundingClientRect();
              if (!window.YONEPBViewable.executed && window.top.innerHeight - targetRect.top > viewableRange) {
                  window.YONEPBViewable.executed = true;
                  doc.open(); doc.write(adTag); doc.close();
                  window.frameElement.style.display = "none";
              }
            }, false);
        }else{
          let disp = function(){
            if(!window.YONEPBViewable.executed && window.parent.$sf.ext.inViewPercentage() > viewablePercentage){
                window.YONEPBViewable.executed = true;
                doc.open(); doc.write(adTag); doc.close();
                window.frameElement.style.display = "none";
            }
            let id = setTimeout(disp, 100);
            if(window.YONEPBViewable.executed){clearTimeout(id);}
          };
          disp();
        }
        </script>
        `;
        bidResponse.ad = viewableScript;
      } else if (response.adTag) {
        bidResponse.mediaType = BANNER;
        bidResponse.ad = response.adTag;
      } else if (response.adm) {
        bidResponse.mediaType = VIDEO;
        bidResponse.vastXml = response.adm;
        if (renderId === 'cmer') {
          bidResponse.renderer = newCmerRenderer(response);
        } else {
          bidResponse.renderer = newRenderer(response);
        }
      }

      bidResponses.push(bidResponse);
    }
    return bidResponses;
  },
  /**
   * Register the user sync pixels which should be dropped after the auction.
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @param {Object} gdprConsent Is the GDPR Consent object wrapping gdprApplies {boolean} and consentString {string} attributes.
   * @returns {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent) {
    if (syncOptions.iframeEnabled && !skipSync(gdprConsent)) {
      return [{
        type: 'iframe',
        url: USER_SYNC_URL
      }];
    }
  },
}

/**
 * NOTE: server side does not yet support multiple formats.
 * @param  {Object} bidRequest -
 * @param  {boolean} [enabledOldFormat = true] - default: `true`.
 * @returns {string|null} - `"banner"` or `"video"` or `null`.
 */
function getMediaType(bidRequest, enabledOldFormat = true) {
  let hasBannerType = Boolean(deepAccess(bidRequest, 'mediaTypes.banner'));
  let hasVideoType = Boolean(deepAccess(bidRequest, 'mediaTypes.video'));

  if (enabledOldFormat) {
    hasBannerType = hasBannerType || bidRequest.mediaType === BANNER ||
      (isEmpty(bidRequest.mediaTypes) && isEmpty(bidRequest.mediaType));
    hasVideoType = hasVideoType || bidRequest.mediaType === VIDEO;
  }

  if (hasBannerType && hasVideoType) {
    const playerParams = deepAccess(bidRequest, 'params.playerParams');
    if (playerParams) {
      return VIDEO;
    } else {
      return BANNER;
    }
  } else if (hasBannerType) {
    return BANNER;
  } else if (hasVideoType) {
    return VIDEO;
  }

  return null;
}

/**
 * NOTE:
 *   If `mediaTypes.banner` exists, then `mediaTypes.banner.sizes` must also exist.
 *   The reason for this is that Prebid.js will perform the verification and
 *   if `mediaTypes.banner.sizes` is inappropriate, it will delete the entire `mediaTypes.banner`.
 * @param  {Object} bidRequest -
 * @param  {Object} bidRequest.banner -
 * @param  {Array<string>} bidRequest.banner.sizes -
 * @param  {boolean} [enabledOldFormat = true] - default: `true`.
 * @returns {string} - strings like `"300x250"` or `"300x250,728x90"`.
 */
function getBannerSizes(bidRequest, enabledOldFormat = true) {
  let sizes = deepAccess(bidRequest, 'mediaTypes.banner.sizes');

  if (enabledOldFormat) {
    sizes = sizes || bidRequest.sizes;
  }

  return parseSizesInput(sizes).join(',');
}

/**
 * @param  {Object} bidRequest -
 * @param  {boolean} [enabledOldFormat = true] - default: `true`.
 * @param  {boolean} [enabled1x1 = true] - default: `true`.
 * @returns {{w: number, h: number}} -
 */
function getVideoSize(bidRequest, enabledOldFormat = true, enabled1x1 = true) {
  /**
   * @param  {Array<number, number> | Array<Array<number, number>>} sizes -
   * @return {{w: number, h: number} | null} -
   */
  const _getPlayerSize = (sizes) => {
    let result = null;

    const size = parseSizesInput(sizes)[0];
    if (isEmpty(size)) {
      return result;
    }

    const splited = size.split('x');
    const sizeObj = {w: parseInt(splited[0], 10), h: parseInt(splited[1], 10)};
    const _isValidPlayerSize = !(isEmpty(sizeObj)) && (isFinite(sizeObj.w) && isFinite(sizeObj.h));
    if (!_isValidPlayerSize) {
      return result;
    }

    result = sizeObj;
    return result;
  }

  let playerSize = _getPlayerSize(deepAccess(bidRequest, 'mediaTypes.video.playerSize'));

  if (enabledOldFormat) {
    playerSize = playerSize || _getPlayerSize(bidRequest.sizes);
  }

  if (enabled1x1) {
    // NOTE: `video.playerSize` in 1x1 is always [1,1].
    if (playerSize && (playerSize.w === 1 && playerSize.h === 1)) {
      // NOTE: `params.playerSize` is a specific object to support `1x1`.
      playerSize = _getPlayerSize(deepAccess(bidRequest, 'params.playerSize'));
    }
  }

  return playerSize || DEFAULT_VIDEO_SIZE;
}

/**
 * Create render for outstream video.
 * @param {Object} response -
 * @returns {Renderer} - Prebid Renderer object
 */
function newRenderer(response) {
  const renderer = Renderer.install({
    id: response.uid,
    url: VIDEO_PLAYER_URL,
    loaded: false,
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logWarn('Prebid Error calling setRender on newRenderer', err);
  }

  return renderer;
}

/**
 * Handles an outstream response after the library is loaded
 * @param {Object} bid
 */
function outstreamRender(bid) {
  bid.renderer.push(() => {
    window.DACIVTPREBID.renderPrebid(bid);
  });
}

/**
 * Create render for cmer outstream video.
 * @param {Object} response -
 * @returns {Renderer} - Prebid Renderer object
 */
function newCmerRenderer(response) {
  const renderer = Renderer.install({
    id: response.uid,
    url: CMER_PLAYER_URL,
    loaded: false,
  });

  try {
    renderer.setRender(cmerRender);
  } catch (err) {
    logWarn('Prebid Error calling setRender on newRenderer', err);
  }

  return renderer;
}

/**
 * Handles an outstream response after the library is loaded
 * @param {Object} bid
 */
function cmerRender(bid) {
  bid.renderer.push(() => {
    window.CMERYONEPREBID.renderPrebid(bid);
  });
}

/**
 * Stop sending push_sync requests in case it's either Safari browser OR iOS device OR GDPR applies OR it's bot-like traffic.
 * Data extracted from navigator's userAgent
 * @param {Object} gdprConsent Is the GDPR Consent object wrapping gdprApplies {boolean} and consentString {string} attributes.
 */
function skipSync(gdprConsent) {
  return (getBrowser() === browserTypes.SAFARI || getOS() === osTypes.IOS) || gdprApplies(gdprConsent) || isBotLikeTraffic();
}

/**
 * Check if GDPR applies.
 */
function gdprApplies(gdprConsent) {
  return gdprConsent && typeof gdprConsent.gdprApplies === 'boolean' && gdprConsent.gdprApplies;
}

/**
 * Check if the user agent is bot-like
 * @returns {boolean}
 */
function isBotLikeTraffic() {
  const botPattern = new RegExp(BOL_LIKE_USER_AGENTS.join('|'), 'i');
  return botPattern.test(navigator.userAgent);
}

registerBidder(spec);
