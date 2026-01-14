import { getDNT } from '../libraries/navigatorData/dnt.js';
import {deepAccess, isArray, logWarn, isFn, isPlainObject, logError, logInfo, getWinDimensions} from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getStorageManager} from '../src/storageManager.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {ajax} from '../src/ajax.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {Renderer} from '../src/Renderer.js';

const ADAPTER_VERSION = '2.1.0';
const PREBID_VERSION = '$prebid.version$';

const BIDDER_CODE = 'jixie';
export const storage = getStorageManager({bidderCode: BIDDER_CODE});
const JX_OUTSTREAM_RENDERER_URL = 'https://scripts.jixie.media/jxhbrenderer.1.1.min.js';
const REQUESTS_URL = 'https://hb.jixie.io/v2/hbpost';
const sidTTLMins_ = 30;

/**
 * Get bid floor from Price Floors Module
 *
 * @param {Object} bid
 * @returns {(number|null)}
 */
function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return null;
  }
  const floor = bid.getFloor({
    currency: 'USD',
    mediaType: '*',
    size: '*'
  });
  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return null;
}

/**
 * Own miscellaneous support functions:
 */

function setIds_(clientId, sessionId) {
  let dd = null;
  try {
    dd = window.location.hostname.match(/[^.]*\.[^.]{2,3}(?:\.[^.]{2,3})?$/mg);
  } catch (err1) {}
  try {
    const expC = (new Date(new Date().setFullYear(new Date().getFullYear() + 1))).toUTCString();
    const expS = (new Date(new Date().setMinutes(new Date().getMinutes() + sidTTLMins_))).toUTCString();

    storage.setCookie('_jxx', clientId, expC, 'None', null);
    storage.setCookie('_jxx', clientId, expC, 'None', dd);

    storage.setCookie('_jxxs', sessionId, expS, 'None', null);
    storage.setCookie('_jxxs', sessionId, expS, 'None', dd);

    storage.setDataInLocalStorage('_jxx', clientId);
    storage.setDataInLocalStorage('_jxxs', sessionId);
  } catch (error) {}
}

/**
 * fetch some ids from cookie, LS.
 * @returns
 */
const defaultGenIds_ = [
  { id: '_jxtoko' },
  { id: '_jxifo' },
  { id: '_jxtdid' },
  { id: '_jxcomp' }
];

function fetchIds_(cfg) {
  const ret = {
    client_id_c: '',
    client_id_ls: '',
    session_id_c: '',
    session_id_ls: '',
    jxeids: {}
  };
  try {
    let tmp = storage.getCookie('_jxx');
    if (tmp) ret.client_id_c = tmp;
    tmp = storage.getCookie('_jxxs');
    if (tmp) ret.session_id_c = tmp;

    tmp = storage.getDataFromLocalStorage('_jxx');
    if (tmp) ret.client_id_ls = tmp;
    tmp = storage.getDataFromLocalStorage('_jxxs');
    if (tmp) ret.session_id_ls = tmp;

    const arr = cfg.genids ? cfg.genids : defaultGenIds_;
    arr.forEach(function(o) {
      tmp = storage.getCookie(o.ck ? o.ck : o.id);
      if (tmp) ret.jxeids[o.id] = tmp;
    });
  } catch (error) {}
  return ret;
}

// device in the payload had been a simple string ('desktop', 'mobile')
// Now changed to an object. yes the backend is able to handle it.
function getDevice_() {
  const device = config.getConfig('device') || {};
  device.w = device.w || getWinDimensions().innerWidth;
  device.h = device.h || getWinDimensions().innerHeight;
  device.ua = device.ua || navigator.userAgent;
  device.dnt = getDNT() ? 1 : 0;
  device.language = (navigator && navigator.language) ? navigator.language.split('-')[0] : '';
  return device;
}

function jxOutstreamRender_(bidAd) {
  bidAd.renderer.push(() => {
    window.JixieOutstreamVideo.init({
      sizes: [bidAd.width, bidAd.height],
      width: bidAd.width,
      height: bidAd.height,
      targetId: bidAd.adUnitCode,
      adResponse: bidAd.adResponse
    });
  });
}

function createRenderer_(bidAd, scriptUrl, createFcn) {
  const renderer = Renderer.install({
    id: bidAd.adUnitCode,
    url: scriptUrl,
    loaded: false,
    config: {'player_height': bidAd.height, 'player_width': bidAd.width},
    adUnitCode: bidAd.adUnitCode
  });
  try {
    renderer.setRender(createFcn);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}

function getMiscDims_() {
  const ret = {
    pageurl: '',
    domain: '',
    device: 'unknown',
    mkeywords: ''
  }
  try {
    // TODO: this should pick refererInfo from bidderRequest
    const refererInfo_ = getRefererInfo();
    // TODO: does the fallback make sense here?
    const url_ = refererInfo_?.page || window.location.href
    ret.pageurl = url_;
    ret.domain = refererInfo_?.domain || window.location.host
    ret.device = getDevice_();
    const keywords = document.getElementsByTagName('meta')['keywords'];
    if (keywords && keywords.content) {
      ret.mkeywords = keywords.content;
    }
  } catch (error) {}
  return ret;
}

// easier for replacement in the unit test
export const internal = {
  getDevice: getDevice_,
  getRefererInfo: getRefererInfo,
  ajax: ajax,
  getMiscDims: getMiscDims_
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function(bid) {
    if (typeof bid.params === 'undefined') {
      return false;
    }
    if (typeof bid.params.unit === 'undefined') {
      return false;
    }
    return true;
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const currencyObj = config.getConfig('currency');
    const currency = (currencyObj && currencyObj.adServerCurrency) || 'USD';

    const bids = [];
    validBidRequests.forEach(function(one) {
      const gpid = deepAccess(one, 'ortb2Imp.ext.gpid', '');
      const tmp = {
        bidId: one.bidId,
        adUnitCode: one.adUnitCode,
        mediaTypes: (one.mediaTypes === 'undefined' ? {} : one.mediaTypes),
        sizes: (one.sizes === 'undefined' ? [] : one.sizes),
        params: one.params,
        gpid: gpid
      };
      const bidFloor = getBidFloor(one);
      if (bidFloor) {
        tmp.bidFloor = bidFloor;
      }
      bids.push(tmp);
    });
    const jxCfg = config.getConfig('jixie') || {};

    const ids = fetchIds_(jxCfg);
    let eids = [];
    const miscDims = internal.getMiscDims();
    const schain = deepAccess(validBidRequests[0], 'ortb2.source.ext.schain');

    const eids1 = validBidRequests[0].userIdAsEids;
    // all available user ids are sent to our backend in the standard array layout:
    if (eids1 && eids1.length) {
      eids = eids1;
    }
    // we want to send this blob of info to our backend:
    const transformedParams = Object.assign({}, {
      // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
      auctionid: bidderRequest.auctionId || '',
      aid: jxCfg.aid || '',
      timeout: bidderRequest.timeout,
      currency: currency,
      timestamp: (new Date()).getTime(),
      device: miscDims.device,
      domain: miscDims.domain,
      pageurl: miscDims.pageurl,
      mkeywords: miscDims.mkeywords,
      bids: bids,
      eids: eids,
      schain: schain,
      pricegranularity: (config.getConfig('priceGranularity') || {}),
      ver: ADAPTER_VERSION,
      pbjsver: PREBID_VERSION,
      cfg: jxCfg
    }, ids);
    return Object.assign({}, {
      method: 'POST',
      url: REQUESTS_URL,
      data: JSON.stringify(transformedParams),
      currency: currency
    });
  },

  onTimeout: function(timeoutData) {
    logError('jixie adapter timed out for the auction.', timeoutData);
  },

  onBidWon: function(bid) {
    if (bid.trackingUrl) {
      internal.ajax(bid.trackingUrl, null, {}, {
        withCredentials: true,
        method: 'GET',
        crossOrigin: true
      });
    }
    logInfo(
      `jixie adapter won the auction. Bid id: ${bid.bidId}, Ad Unit Id: ${bid.adUnitId}`
    );
  },

  interpretResponse: function(response, bidRequest) {
    if (response && response.body && isArray(response.body.bids)) {
      const bidResponses = [];
      response.body.bids.forEach(function(oneBid) {
        const bnd = {};
        Object.assign(bnd, oneBid);
        if (oneBid.osplayer) {
          bnd.adResponse = {
            content: oneBid.vastXml,
            parameters: oneBid.osparams,
            height: oneBid.height,
            width: oneBid.width
          };
          const rendererScript = (oneBid.osparams.script ? oneBid.osparams.script : JX_OUTSTREAM_RENDERER_URL);
          bnd.renderer = createRenderer_(oneBid, rendererScript, jxOutstreamRender_);
        }
        // a note on advertiserDomains: our adserver is not responding in
        // openRTB-type json. so there is no need to copy from 'adomain' over
        // to meta: advertiserDomains
        // However, we will just make sure the property is there.
        if (!bnd.meta) {
          bnd.meta = {};
        }
        if (!bnd.meta.advertiserDomains) {
          bnd.meta.advertiserDomains = [];
        }
        bidResponses.push(bnd);
      });
      if (response.body.setids) {
        setIds_(response.body.setids.client_id,
          response.body.setids.session_id);
      }
      return bidResponses;
    } else { return []; }
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    if (!serverResponses.length || !serverResponses[0].body || !serverResponses[0].body.userSyncs) {
      return false;
    }
    const syncs = [];
    serverResponses[0].body.userSyncs.forEach(function(sync) {
      if (syncOptions.iframeEnabled) {
        syncs.push(sync.uf ? { url: sync.uf, type: 'iframe' } : { url: sync.up, type: 'image' });
      } else if (syncOptions.pixelEnabled && sync.up) {
        syncs.push({url: sync.up, type: 'image'})
      }
    })
    return syncs;
  }
}

registerBidder(spec);
