import {deepAccess, getDNT, isArray, logWarn} from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getStorageManager} from '../src/storageManager.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {ajax} from '../src/ajax.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {Renderer} from '../src/Renderer.js';
import {createEidsArray} from './userId/eids.js';

const BIDDER_CODE = 'jixie';
export const storage = getStorageManager({bidderCode: BIDDER_CODE});
const EVENTS_URL = 'https://hbtra.jixie.io/sync/hb?';
const JX_OUTSTREAM_RENDERER_URL = 'https://scripts.jixie.media/jxhbrenderer.1.1.min.js';
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

    storage.setCookie('_jxx', clientId, expC, 'None', null);
    storage.setCookie('_jxx', clientId, expC, 'None', dd);

    storage.setCookie('_jxxs', sessionId, expS, 'None', null);
    storage.setCookie('_jxxs', sessionId, expS, 'None', dd);

    storage.setDataInLocalStorage('_jxx', clientId);
    storage.setDataInLocalStorage('_jxxs', sessionId);
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
    let tmp = storage.getCookie('_jxx');
    if (tmp) ret.client_id_c = tmp;
    tmp = storage.getCookie('_jxxs');
    if (tmp) ret.session_id_c = tmp;

    tmp = storage.getDataFromLocalStorage('_jxx');
    if (tmp) ret.client_id_ls = tmp;
    tmp = storage.getDataFromLocalStorage('_jxxs');
    if (tmp) ret.session_id_ls = tmp;
  } catch (error) {}
  return ret;
}

// device in the payload had been a simple string ('desktop', 'mobile')
// Now changed to an object. yes the backend is able to handle it.
function getDevice_() {
  const device = config.getConfig('device') || {};
  device.w = device.w || window.innerWidth;
  device.h = device.h || window.innerHeight;
  device.ua = device.ua || navigator.userAgent;
  device.dnt = getDNT() ? 1 : 0;
  device.language = (navigator && navigator.language) ? navigator.language.split('-')[0] : '';
  return device;
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
    logWarn('Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}

function getMiscDims_() {
  let ret = {
    pageurl: '',
    domain: '',
    device: 'unknown',
    mkeywords: ''
  }
  try {
    // TODO: this should pick refererInfo from bidderRequest
    let refererInfo_ = getRefererInfo();
    // TODO: does the fallback make sense here?
    let url_ = refererInfo_?.page || window.location.href
    ret.pageurl = url_;
    ret.domain = refererInfo_?.domain || window.location.host
    ret.device = getDevice_();
    let keywords = document.getElementsByTagName('meta')['keywords'];
    if (keywords && keywords.content) {
      ret.mkeywords = keywords.content;
    }
  } catch (error) {}
  return ret;
}

/* function addUserId(eids, id, source, rti) {
  if (id) {
    if (rti) {
      eids.push({ source, id, rti_partner: rti });
    } else {
      eids.push({ source, id });
    }
  }
  return eids;
} */

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
    let eids = [];
    let miscDims = internal.getMiscDims();
    let schain = deepAccess(validBidRequests[0], 'schain');

    // all available user ids are sent to our backend in the standard array layout:
    if (validBidRequests[0].userId) {
      let eids1 = createEidsArray(validBidRequests[0].userId);
      if (eids1.length) {
        eids = eids1;
      }
    }
    // we want to send this blob of info to our backend:
    let pg = config.getConfig('priceGranularity');
    if (!pg) {
      pg = {};
    }

    let transformedParams = Object.assign({}, {
      auctionid: bidderRequest.auctionId,
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
      pricegranularity: pg,
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
        auctionid: deepAccess(timeoutData, '0.auctionId'),
        timeout: deepAccess(timeoutData, '0.timeout'),
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
    if (response && response.body && isArray(response.body.bids)) {
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
  }
}

registerBidder(spec);
