import {deepAccess, logError, parseSizesInput} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import {Renderer} from '../src/Renderer.js';
import {INSTREAM, OUTSTREAM} from '../src/video.js';

const ENDPOINT = `https://d.vidoomy.com/api/rtbserver/prebid/`;
const BIDDER_CODE = 'vidoomy';
const GVLID = 380;

const COOKIE_SYNC_FALLBACK_URLS = [
  'https://x.bidswitch.net/sync?ssp=vidoomy&gdpr={{GDPR}}&gdpr_consent={{GDPR_CONSENT}}&us_privacy=',
  'https://pixel-sync.sitescout.com/dmp/pixelSync?nid=120&gdpr={{GDPR}}&gdpr_consent={{GDPR_CONSENT}}&redir=https%3A%2F%2Fa.vidoomy.com%2Fapi%2Frtbserver%2Fcookie%3Fi%3DCEN%26uid%3D%7BuserId%7D',
  'https://cm.adform.net/cookie?redirect_url=https%3A%2F%2Fa-prebid.vidoomy.com%2Fsetuid%3Fbidder%3Dadf%26gdpr%3D{{GDPR}}%26gdpr_consent%3D{{GDPR_CONSENT}}%26uid%3D%24UID',
  'https://pixel.rubiconproject.com/exchange/sync.php?p=pbs-vidoomy&gdpr={{GDPR}}&gdpr_consent={{GDPR_CONSENT}}&us_privacy=',
  'https://rtb.openx.net/sync/prebid?gdpr={{GDPR}}&gdpr_consent={{GDPR_CONSENT}}&r=https%3A%2F%2Fa-prebid.vidoomy.com%2Fsetuid%3Fbidder%3Dopenx%26uid%3D$%7BUID%7D',
  'https://ads.pubmatic.com/AdServer/js/user_sync.html?gdpr={{GDPR}}&gdpr_consent={{GDPR_CONSENT}}&us_privacy=&predirect=https%3A%2F%2Fa-prebid.vidoomy.com%2Fsetuid%3Fbidder%3Dpubmatic%26gdpr%3D{{GDPR}}%26gdpr_consent%3D{{GDPR_CONSENT}}%26uid%3D'
];

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

  if (bid.params.bidfloor && (isNaN(bid.params.bidfloor) || bid.params.bidfloor < 0)) {
    logError(BIDDER_CODE + ': bid.params.bidfloor should be a number equal or greater than zero');
    return false;
  }

  return true;
};

/**
 * Schain Object needed encodes URI Component with exlamation mark
 * @param {String} str
 * @returns {String}
 */
function encodeURIComponentWithExlamation(str) {
  return encodeURIComponent(str).replace(/!/g, '%21');
}

/**
 * Serializes the supply chain object based on IAB standards
 * @see https://github.com/InteractiveAdvertisingBureau/openrtb/blob/master/supplychainobject.md
 * @param {Object} schainObj supply chain object
 * @returns {string} serialized supply chain value
 */
function serializeSupplyChainObj(schainObj) {
  if (!schainObj || !schainObj.nodes) {
    return '';
  }
  const nodeProps = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];
  const serializedNodes = schainObj.nodes.map(node =>
    nodeProps.map(prop => encodeURIComponentWithExlamation(node[prop] || '')).join(',')
  ).join('!');

  const serializedSchain = `${schainObj.ver},${schainObj.complete}!${serializedNodes}`;
  return serializedSchain;
}

/**
 * Gets highest floor between getFloor.floor and params.bidfloor
 * @param {Object} bid
 * @param {Object} mediaType
 * @param {Array} sizes
 * @param {Number} bidfloor
 * @returns {Number} floor
 */
function getBidFloor(bid, mediaType, sizes, bidfloor) {
  let floor = bidfloor;
  var size = sizes && sizes.length > 0 ? sizes[0] : '*';
  if (typeof bid.getFloor === 'function') {
    const floorInfo = bid.getFloor({currency: 'USD', mediaType, size});
    if (typeof floorInfo === 'object' && floorInfo.currency === 'USD' && !isNaN(parseFloat(floorInfo.floor))) {
      floor = Math.max(bidfloor, parseFloat(floorInfo.floor));
    }
  }
  return floor;
}

const isBidResponseValid = bid => {
  if (!bid || !bid.requestId || !bid.cpm || !bid.ttl || !bid.currency) {
    return false;
  }
  switch (bid.mediaType) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad);
    case VIDEO:
      return Boolean(bid.vastUrl || bid.vastXml);
    default:
      return false;
  }
}

const buildRequests = (validBidRequests, bidderRequest) => {
  const serverRequests = validBidRequests.map(bid => {
    let adType = BANNER;
    let sizes;
    if (bid.mediaTypes && bid.mediaTypes[BANNER] && bid.mediaTypes[BANNER].sizes) {
      sizes = bid.mediaTypes[BANNER].sizes;
      adType = BANNER;
    } else if (bid.mediaTypes && bid.mediaTypes[VIDEO] && bid.mediaTypes[VIDEO].playerSize) {
      sizes = bid.mediaTypes[VIDEO].playerSize;
      adType = VIDEO;
    }
    const [w, h] = (parseSizesInput(sizes)[0] || '0x0').split('x');

    // TODO: is 'domain' the right value here?
    const hostname = bidderRequest.refererInfo.domain || window.location.hostname;

    const videoContext = deepAccess(bid, 'mediaTypes.video.context');
    const bidfloor = deepAccess(bid, `params.bidfloor`, 0);
    const floor = getBidFloor(bid, adType, sizes, bidfloor);

    const ortb2 = bidderRequest.ortb2 || {
      bcat: [],
      badv: [],
      bapp: [],
      btype: [],
      battr: []
    };

    let eids;
    const userEids = deepAccess(bid, 'userIdAsEids');
    if (Array.isArray(userEids) && userEids.length > 0) {
      eids = JSON.stringify(userEids) || '';
    }

    const queryParams = {
      id: bid.params.id,
      adtype: adType,
      auc: bid.adUnitCode,
      w,
      h,
      pos: parseInt(bid.params.position) || 1,
      ua: navigator.userAgent,
      l: navigator.language && navigator.language.indexOf('-') !== -1 ? navigator.language.split('-')[0] : '',
      dt: /Mobi/.test(navigator.userAgent) ? 2 : 1,
      pid: bid.params.pid,
      requestId: bid.bidId,
      schain: serializeSupplyChainObj(bid.schain) || '',
      eids: eids || '',
      bidfloor: floor,
      d: getDomainWithoutSubdomain(hostname), // 'vidoomy.com',
      // TODO: does the fallback make sense here?
      sp: encodeURIComponent(bidderRequest.refererInfo.page || bidderRequest.refererInfo.topmostLocation),
      usp: bidderRequest.uspConsent || '',
      coppa: !!config.getConfig('coppa'),
      videoContext: videoContext || '',
      bcat: ortb2.bcat || bid.params.bcat || [],
      badv: ortb2.badv || bid.params.badv || [],
      bapp: ortb2.bapp || bid.params.bapp || [],
      btype: ortb2.btype || bid.params.btype || [],
      battr: ortb2.battr || bid.params.battr || []
    };

    if (bidderRequest.gdprConsent) {
      queryParams.gdpr = bidderRequest.gdprConsent.gdprApplies;
      queryParams.gdprcs = bidderRequest.gdprConsent.consentString;
    }

    return {
      method: 'GET',
      url: ENDPOINT,
      data: queryParams
    };
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
    if (!responseBody) return;
    if (responseBody.mediaType === 'video') {
      responseBody.ad = responseBody.vastUrl || responseBody.vastXml;
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
          responseBody.ad = responseBody.vastUrl || responseBody.vastXml;
          logError(BIDDER_CODE + ': error while installing renderer to show outstream ad');
        }
      }
    }
    const bid = {
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
    if (responseBody.vastUrl) {
      bid.vastUrl = responseBody.vastUrl;
    } else if (responseBody.vastXml) {
      bid.vastXml = responseBody.vastXml;
    }

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

function getUserSyncs(syncOptions, responses, gdprConsent, uspConsent) {
  if (syncOptions.iframeEnabled || syncOptions.pixelEnabled) {
    const pixelType = syncOptions.pixelEnabled ? 'image' : 'iframe';
    const urls = deepAccess(responses, '0.body.pixels') || COOKIE_SYNC_FALLBACK_URLS;

    return [].concat(urls).map(url => ({
      type: pixelType,
      url: url
        .replace('{{GDPR}}', gdprConsent ? (gdprConsent.gdprApplies ? '1' : '0') : '0')
        .replace('{{GDPR_CONSENT}}', gdprConsent ? encodeURIComponent(gdprConsent.consentString) : '')
        .replace('{{USP_CONSENT}}', uspConsent ? encodeURIComponent(uspConsent) : '')
    }));
  }
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  gvlid: GVLID,
  getUserSyncs,
};

registerBidder(spec);

function getDomainWithoutSubdomain(hostname) {
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
