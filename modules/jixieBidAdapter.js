import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ajax } from '../src/ajax.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { Renderer } from '../src/Renderer.js';
export const storage = getStorageManager();

const BIDDER_CODE = 'jixie';
const EVENTS_URL = 'https://jxhbtrackers.azurewebsites.net/sync/evt?';
const JX_OUTSTREAM_RENDERER_URL = 'https://scripts.jixie.io/jxhboutstream.js';
const REQUESTS_URL = 'https://hb.jixie.io/v2/hbpost';
const sidTTLMins_ = 30;

/**
 * Own miscellaneous support functions:
 */

function setIds_(clientId, sessionId) {
  let dd = null;
  try {
    dd = window.location.hostname.match(/[^.]*\.[^.]{2,3}(?:\.[^.]{2,3})?$/mg);
  } catch (err1) {}
  try {
    let expC = (new Date(new Date().setFullYear(new Date().getFullYear() + 1))).toUTCString();
    let expS = (new Date(new Date().setMinutes(new Date().getMinutes() + sidTTLMins_))).toUTCString();

    storage.setCookie('_jx', clientId, expC, 'None', null);
    storage.setCookie('_jx', clientId, expC, 'None', dd);

    storage.setCookie('_jxs', sessionId, expS, 'None', null);
    storage.setCookie('_jxs', sessionId, expS, 'None', dd);

    storage.setDataInLocalStorage('_jx', clientId);
    storage.setDataInLocalStorage('_jxs', sessionId);
  } catch (error) {}
}

function fetchIds_() {
  let ret = {
    client_id_c: '',
    client_id_ls: '',
    session_id_c: '',
    session_id_ls: ''
  };
  try {
    let tmp = storage.getCookie('_jx');
    if (tmp) ret.client_id_c = tmp;
    tmp = storage.getCookie('_jxs');
    if (tmp) ret.session_id_c = tmp;

    tmp = storage.getDataFromLocalStorage('_jx');
    if (tmp) ret.client_id_ls = tmp;
    tmp = storage.getDataFromLocalStorage('_jxs');
    if (tmp) ret.session_id_ls = tmp;
  } catch (error) {}
  return ret;
}

function getDevice_() {
  return ((/(ios|ipod|ipad|iphone|android|blackberry|iemobile|opera mini|webos)/i).test(navigator.userAgent)
    ? 'mobile' : 'desktop');
}

function pingTracking_(endpointOverride, qpobj) {
  internal.ajax((endpointOverride || EVENTS_URL), null, qpobj, {
    withCredentials: true,
    method: 'GET',
    crossOrigin: true
  });
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
    utils.logWarn('Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}

function getMiscDims_() {
  let ret = {
    pageurl: '',
    domain: '',
    device: 'unknown'
  }
  try {
    let refererInfo_ = getRefererInfo();
    let url_ = ((refererInfo_ && refererInfo_.referer) ? refererInfo_.referer : window.location.href);
    ret.pageurl = url_;
    ret.domain = utils.parseUrl(url_).host;
    ret.device = getDevice_();
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
  EVENTS_URL: EVENTS_URL,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function(bid) {
    if (bid.bidder !== BIDDER_CODE || typeof bid.params === 'undefined') {
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

    let bids = [];
    validBidRequests.forEach(function(one) {
      bids.push({
        bidId: one.bidId,
        adUnitCode: one.adUnitCode,
        mediaTypes: (one.mediaTypes === 'undefined' ? {} : one.mediaTypes),
        sizes: (one.sizes === 'undefined' ? [] : one.sizes),
        params: one.params,
      });
    });

    let jixieCfgBlob = config.getConfig('jixie');
    if (!jixieCfgBlob) {
      jixieCfgBlob = {};
    }

    let ids = fetchIds_();
    let miscDims = internal.getMiscDims();
    let transformedParams = Object.assign({}, {
      auctionid: bidderRequest.auctionId,
      timeout: bidderRequest.timeout,
      currency: currency,
      timestamp: (new Date()).getTime(),
      device: miscDims.device,
      domain: miscDims.domain,
      pageurl: miscDims.pageurl,
      bids: bids,
      cfg: jixieCfgBlob
    }, ids);
    return Object.assign({}, {
      method: 'POST',
      url: REQUESTS_URL,
      data: JSON.stringify(transformedParams),
      currency: currency
    });
  },

  onTimeout: function(timeoutData) {
    let jxCfgBlob = config.getConfig('jixie');
    if (jxCfgBlob && jxCfgBlob.onTimeout == 'off') {
      return;
    }
    let url = null;// default
    if (jxCfgBlob && jxCfgBlob.onTimeoutUrl && typeof jxCfgBlob.onTimeoutUrl == 'string') {
      url = jxCfgBlob.onTimeoutUrl;
    }
    let miscDims = internal.getMiscDims();
    pingTracking_(url, // no overriding ping URL . just use default
      {
        action: 'hbtimeout',
        device: miscDims.device,
        pageurl: encodeURIComponent(miscDims.pageurl),
        domain: encodeURIComponent(miscDims.domain),
        auctionid: utils.deepAccess(timeoutData, '0.auctionId'),
        timeout: utils.deepAccess(timeoutData, '0.timeout'),
        count: timeoutData.length
      });
  },

  onBidWon: function(bid) {
    if (bid.notrack) {
      return;
    }
    if (bid.trackingUrl) {
      pingTracking_(bid.trackingUrl, {});
    } else {
      let miscDims = internal.getMiscDims();
      pingTracking_((bid.trackingUrlBase ? bid.trackingUrlBase : null), {
        action: 'hbbidwon',
        device: miscDims.device,
        pageurl: encodeURIComponent(miscDims.pageurl),
        domain: encodeURIComponent(miscDims.domain),
        cid: bid.cid,
        cpid: bid.cpid,
        jxbidid: bid.jxBidId,
        auctionid: bid.auctionId,
        cpm: bid.cpm,
        requestid: bid.requestId
      });
    }
  },

  interpretResponse: function(response, bidRequest) {
    if (response && response.body && utils.isArray(response.body.bids)) {
      const bidResponses = [];
      response.body.bids.forEach(function(oneBid) {
        let bnd = {};

        Object.assign(bnd, oneBid);
        if (oneBid.osplayer) {
          bnd.adResponse = {
            content: oneBid.vastXml,
            parameters: oneBid.osparams,
            height: oneBid.height,
            width: oneBid.width
          };
          let rendererScript = (oneBid.osparams.script ? oneBid.osparams.script : JX_OUTSTREAM_RENDERER_URL);
          bnd.renderer = createRenderer_(oneBid, rendererScript, jxOutstreamRender_);
        }
        bidResponses.push(bnd);
      });
      if (response.body.setids) {
        setIds_(response.body.setids.client_id,
          response.body.setids.session_id);
      }
      return bidResponses;
    } else { return []; }
  }
}

registerBidder(spec);
