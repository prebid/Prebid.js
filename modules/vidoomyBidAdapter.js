import { logError, deepAccess } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import { Renderer } from '../src/Renderer.js';
import { INSTREAM, OUTSTREAM } from '../src/video.js';

const ENDPOINT = `https://d.vidoomy.com/api/rtbserver/prebid/`;
const BIDDER_CODE = 'vidoomy';
const GVLID = 380;

const COOKIE_SYNC_JSON = 'https://vpaid.vidoomy.com/sync/urls.json';

const isBidRequestValid = bid => {
  if (!bid.params) {
    logError(BIDDER_CODE + ': bid.params should be non-empty');
    return false;
  }

  if (!+bid.params.pid) {
    logError(BIDDER_CODE + ': bid.params.pid should be non-empty Number');
    return false;
  }

  if (!+bid.params.id) {
    logError(BIDDER_CODE + ': bid.params.id should be non-empty Number');
    return false;
  }

  if (bid.params && bid.params.mediaTypes && bid.params.mediaTypes.video && bid.params.mediaTypes.video.context === INSTREAM && !bid.params.mediaTypes.video.playerSize) {
    logError(BIDDER_CODE + ': bid.params.mediaType.video should have a playerSize property to tell player size when is INSTREAM');
    return false;
  }

  return true;
};

const isBidResponseValid = bid => {
  if (!bid.requestId || !bid.cpm || !bid.ttl || !bid.currency) {
    return false;
  }
  switch (bid.mediaType) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad);
    case VIDEO:
      return Boolean(bid.vastUrl);
    default:
      return false;
  }
}

const buildRequests = (validBidRequests, bidderRequest) => {
  const serverRequests = validBidRequests.map(bid => {
    let adType = BANNER;
    let w, h;
    if (bid.mediaTypes && bid.mediaTypes[BANNER] && bid.mediaTypes[BANNER].sizes) {
      [w, h] = bid.mediaTypes[BANNER].sizes[0];
      adType = BANNER;
    } else if (bid.mediaTypes && bid.mediaTypes[VIDEO] && bid.mediaTypes[VIDEO].playerSize) {
      [w, h] = bid.mediaTypes[VIDEO].playerSize;
      adType = VIDEO;
    }

    const aElement = document.createElement('a');
    aElement.href = (bidderRequest.refererInfo && bidderRequest.refererInfo.referer) || top.location.href;
    const hostname = aElement.hostname

    const videoContext = deepAccess(bid, 'mediaTypes.video.context');

    const queryParams = [];
    queryParams.push(['id', bid.params.id]);
    queryParams.push(['adtype', adType]);
    queryParams.push(['w', w]);
    queryParams.push(['h', h]);
    queryParams.push(['pos', parseInt(bid.params.position) || 1]);
    queryParams.push(['ua', navigator.userAgent]);
    queryParams.push(['l', navigator.language && navigator.language.indexOf('-') !== -1 ? navigator.language.split('-')[0] : '']);
    queryParams.push(['dt', /Mobi/.test(navigator.userAgent) ? 2 : 1]);
    queryParams.push(['pid', bid.params.pid]);
    queryParams.push(['requestId', bid.bidId]);
    queryParams.push(['d', getDomainWithoutSubdomain(hostname)]);
    queryParams.push(['sp', encodeURIComponent(aElement.href)]);
    if (bidderRequest.gdprConsent) {
      queryParams.push(['gdpr', bidderRequest.gdprConsent.gdprApplies]);
      queryParams.push(['gdprcs', bidderRequest.gdprConsent.consentString]);
    }
    queryParams.push(['usp', bidderRequest.uspConsent || '']);
    queryParams.push(['coppa', !!config.getConfig('coppa')]);

    const rawQueryParams = queryParams.map(qp => qp.join('=')).join('&');

    cookieSync(bidderRequest)

    const url = `${ENDPOINT}?${rawQueryParams}`;
    return {
      method: 'GET',
      url: url,
      data: {videoContext}
    }
  });
  return serverRequests;
};

const render = (bid) => {
  bid.ad = bid.vastUrl;
  var obj = {
    vastTimeout: 5000,
    maxAllowedVastTagRedirects: 3,
    allowVpaid: true,
    autoPlay: true,
    preload: true,
    mute: true,
  }
  window.outstreamPlayer(bid, bid.adUnitCode, obj);
}

const interpretResponse = (serverResponse, bidRequest) => {
  try {
    let responseBody = serverResponse.body;
    if (responseBody.mediaType === 'video') {
      responseBody.ad = responseBody.vastUrl;
      const videoContext = bidRequest.data.videoContext;

      if (videoContext === OUTSTREAM) {
        try {
          const renderer = Renderer.install({
            id: bidRequest.bidId,
            adunitcode: bidRequest.tagId,
            loaded: false,
            config: responseBody.mediaType,
            url: responseBody.meta.rendererUrl
          });
          renderer.setRender(render);

          responseBody.renderer = renderer;
        } catch (e) {
          responseBody.ad = responseBody.vastUrl;
          logError(BIDDER_CODE + ': error while installing renderer to show outstream ad');
        }
      }
    }
    const bid = {
      vastUrl: responseBody.vastUrl,
      ad: responseBody.ad,
      renderer: responseBody.renderer,
      mediaType: responseBody.mediaType,
      requestId: responseBody.requestId,
      cpm: responseBody.cpm,
      currency: responseBody.currency,
      width: responseBody.width,
      height: responseBody.height,
      creativeId: responseBody.creativeId,
      netRevenue: responseBody.netRevenue,
      ttl: responseBody.ttl,
      meta: {
        mediaType: responseBody.meta.mediaType,
        rendererUrl: responseBody.meta.rendererUrl,
        advertiserDomains: responseBody.meta.advertiserDomains,
        advertiserId: responseBody.meta.advertiserId,
        advertiserName: responseBody.meta.advertiserName,
        agencyId: responseBody.meta.agencyId,
        agencyName: responseBody.meta.agencyName,
        brandId: responseBody.meta.brandId,
        brandName: responseBody.meta.brandName,
        dchain: responseBody.meta.dchain,
        networkId: responseBody.meta.networkId,
        networkName: responseBody.meta.networkName,
        primaryCatId: responseBody.meta.primaryCatId,
        secondaryCatIds: responseBody.meta.secondaryCatIds
      }
    };

    const bids = [];

    if (isBidResponseValid(bid)) {
      bids.push(bid);
    } else {
      logError(BIDDER_CODE + ': server returns invalid response');
    }

    return bids;
  } catch (e) {
    logError(BIDDER_CODE + ': error parsing server response to Prebid format');
    return [];
  }
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  gvlid: GVLID,
};

registerBidder(spec);

let cookieSynced = false;
function cookieSync(bidderRequest) {
  if (cookieSynced) return;
  const xhr = new XMLHttpRequest();
  xhr.open('GET', COOKIE_SYNC_JSON)
  xhr.addEventListener('load', function () {
    const macro = Macro({
      gpdr: bidderRequest.gdprConsent ? bidderRequest.gdprConsent.gdprApplies : '0',
      gpdr_consent: bidderRequest.gdprConsent ? bidderRequest.gdprConsent.consentString : '',
    });
    JSON.parse(this.responseText).filter(Boolean).forEach(url => {
      firePixel(macro.replace(url))
    })
  })
  xhr.send()
  cookieSynced = true;
}

function firePixel(url) {
  const img = document.createElement('img');
  img.width = 1;
  img.height = 1;
  img.src = url;
  document.body.appendChild(img);
  setTimeout(() => {
    img.remove();
  }, 10000)
}

function normalizeKey (x) {
  return x.replace(/_/g, '').toLowerCase();
}

function Macro (obj) {
  const macros = {};
  for (const key in obj) {
    macros[normalizeKey(key)] = obj[key];
  }

  const set = (key, value) => {
    macros[normalizeKey(key)] = typeof value === 'function' ? value : String(value);
  };

  return {
    set,
    setAll (obj) {
      for (const key in obj) {
        macros[normalizeKey(key)] = set(obj[key]);
      }
    },
    replace (string, extraMacros = {}) {
      const allMacros = {
        ...macros,
        ...extraMacros,
      };
      const regexes = [
        /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
        /\$\$\s*([a-zA-Z0-9_]+)\s*\$\$/g,
        /\[\s*([a-zA-Z0-9_]+)\s*\]/g,
        /\{\s*([a-zA-Z0-9_]+)\s*\}/g,
      ];
      regexes.forEach(regex => {
        string = string.replace(regex, (str, x) => {
          x = normalizeKey(x);
          let value = allMacros[x];
          value = typeof value === 'function' ? value(allMacros) : value;
          return !value && value !== 0 ? '' : value;
        });
      });
      return string;
    },
  };
}

function getDomainWithoutSubdomain (hostname) {
  const parts = hostname.split('.');
  const newParts = [];
  for (let i = parts.length - 1; i >= 0; i--) {
    newParts.push(parts[i]);
    if (newParts.length !== 1 && parts[i].length > 3) {
      break;
    }
  }
  return newParts.reverse().join('.');
}
