import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { pbsExtensions } from '../libraries/pbsExtensions/pbsExtensions.js';
import { convertTypes } from '../libraries/transformParamsUtils/convertTypes.js';
import { Renderer } from '../src/Renderer.js';
import {
  deepSetValue,
  formatQS,
  mergeDeep,
  logWarn,
  isPlainObject
} from '../src/utils.js';

const GVL_ID = 52;
export const REQUEST_URL = 'https://fastlane.rubiconproject.com/a/api/prebid-exchange.json';
export const SYNC_URL = 'https://eus.rubiconproject.com/usync.html';
const DEFAULT_INTEGRATION = 'pbjs';

const DEFAULT_RENDERER_URL = 'https://video-outstream.rubiconproject.com/apex-2.3.7.js';
// renderer code at https://github.com/rubicon-project/apex2

let mgniConf = {};

// For transition period we need to listen to both rubicon and magnite configs
['magnite', 'rubicon'].forEach(confName => {
  // get anything set as of now
  mergeDeep(mgniConf, config.getConfig(confName) || {});

  // listen for future things
  config.getConfig(confName, config => {
    mergeDeep(mgniConf, config[confName]);
  });
});
export function resetMgniConf() {
  mgniConf = {};
}

export const spec = {
  code: 'magnite',
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  transformBidParams
};

registerBidder(spec);

/**
 * Lets Prebid-Core know if the bid is valid before sending it to the adapter
 * @param {object} bid
 */
function isBidRequestValid(bid) {
  return ['accountId', 'siteId', 'zoneId'].every(param => !Number.isNaN(Number.parseInt(bid?.params?.[param])));
}

const posMap = {
  atf: 1,
  btf: 3
}

export function masSizeOrdering(sizes) {
  const MAS_SIZE_PRIORITY = [
    { w: 300, h: 250 },
    { w: 728, h: 90 },
    { w: 160, h: 600 }
  ];

  const compareSizes = (left, right) => left.w === right.w && left.h === right.h;

  return sizes.sort((first, second) => {
    // sort by MAS_SIZE_PRIORITY priority order
    const firstPriority = MAS_SIZE_PRIORITY.findIndex(masSize => compareSizes(masSize, first));
    const secondPriority = MAS_SIZE_PRIORITY.findIndex(masSize => compareSizes(masSize, second));

    // Handle cases where only one size is in the priority list
    if (firstPriority !== -1 || secondPriority !== -1) {
      if (firstPriority === -1) return 1;
      if (secondPriority === -1) return -1;
      return firstPriority - secondPriority;
    }

    // If neither size is in priority list, maintain original order
    return 0;
  });
}

function getPpuidFromEids(eids) {
  for (const eid of eids) {
    const ppId = eid.uids.find(uid => uid?.ext?.stype === 'ppuid' && uid?.id);
    if (ppId) {
      return ppId.id;
    }
  }
}

function getPpuid(req) {
  const user = req.user;
  if (user?.id) {
    return user.id;
  }

  const userConfigId = config.getConfig('user.id');
  if (userConfigId) {
    return userConfigId;
  }

  const eids = user?.ext?.eids || [];
  return getPpuidFromEids(eids);
}

function cleanFpd(fpdObj) {
  // DV+ wants first party data as object of keys / val where val is array
  Object.entries(fpdObj || {}).forEach(([key, val]) => {
    // if not array, wrap in array
    if (!Array.isArray(val)) {
      fpdObj[key] = [val];
    }
  });
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
    currency: 'USD'
  },
  processors: pbsExtensions,
  imp(buildImp, bidRequest, context) {
    // Building imps of request
    const imp = buildImp(bidRequest, context);

    // remove any mediaTypes on imp that are not in our context
    [BANNER, NATIVE, VIDEO].forEach(mediaType => {
      if (mediaType !== context.mediaType) {
        delete imp[mediaType];
      }
    });

    // move params to new location and delete old
    imp.ext.prebid.bidder.dvplus = imp.ext.prebid.bidder[bidRequest.bidder];
    delete imp.ext?.prebid?.bidder?.[bidRequest.bidder];

    // Need to convert bad input for visitor and inventory objects (convert all to array of string / numbers)
    ['visitor', 'inventory'].forEach(fpdParam => {
      if (isPlainObject(imp.ext.prebid.bidder.dvplus[fpdParam])) {
        cleanFpd(imp.ext.prebid.bidder.dvplus[fpdParam]);
      }
    });

    // Signal which formats are in the bid request (if more than one)
    if (Object.keys(bidRequest.mediaTypes).length > 1) {
      deepSetValue(imp, 'ext.rp.rtb.formats', Object.keys(bidRequest.mediaTypes));
    }

    // If params has pos and not already set by ORTB Converter => set it
    if (bidRequest.params.position && typeof imp[context.mediaType].pos !== 'number') {
      imp[context.mediaType].pos = posMap[bidRequest.params.position];
    }

    // Sort banner sizes
    if (context.mediaType === BANNER && imp[context.mediaType]?.format?.length > 1) {
      imp[context.mediaType].format = masSizeOrdering(imp[context.mediaType].format);
    }

    // Set secure
    imp.secure = 1;

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);

    // Do not send in tmax
    delete req.tmax;

    // we always deal in USD so just remove
    delete req.cur;

    // Set to channel to int_type if avail
    deepSetValue(req, 'ext.prebid.channel.name', mgniConf.int_type || DEFAULT_INTEGRATION);

    // we do not need to send addtlConsent to DV+
    delete req?.ext?.ConsentedProvidersSettings?.consented_providers;

    // If user.id is not set try pub conf user.id else undefined
    const ppuid = getPpuid(req);
    if (ppuid) {
      deepSetValue(req, 'user.id', ppuid);
    } else {
      delete req.user?.id;
    }

    // delete buyeruid always
    delete req.user?.buyeruid;

    // delete device ifa if falsy
    if (!req.device?.ifa) {
      delete req.device?.ifa;
    }

    // let AE determine dnt from headers not payload
    delete req.device?.dnt;

    return req;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);

    bidResponse.bidderCode = context.bidRequest.bidder;

    // Attach renderer and w and h if outstream
    if (bidResponse.mediaType === VIDEO && context.bidRequest?.mediaTypes?.video?.context === 'outstream') {
      bidResponse.renderer = outstreamRenderer(bidResponse);
      // generate local vastUrl using createObjectURL
      bidResponse.vastUrl = URL.createObjectURL(new Blob([bidResponse.vastXml], { type: 'text/xml' }));
    }

    // If its video and the width and height are not set
    if (bidResponse.mediaType === VIDEO && bidShouldUsePlayerWidthAndHeight(bidResponse)) {
      bidResponse.width = bidResponse.playerWidth;
      bidResponse.height = bidResponse.playerHeight;
    }

    // If it is a video response up the ttl
    if (bidResponse.mediaType === VIDEO) {
      bidResponse.ttl = 900;
    }

    return bidResponse;
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    const response = buildResponse(bidResponses, ortbResponse, context);
    return response;
  },
  overrides: {
    imp: {
      bidfloor(setBidFloor, imp, bidRequest, context) {
        // Floors should always be in USD
        const floor = {};
        setBidFloor(floor, bidRequest, { ...context, currency: 'USD' });
        if (floor.bidfloorcur === 'USD') {
          Object.assign(imp, floor);
        }
      },
    }
  }
});

function bidShouldUsePlayerWidthAndHeight(bidResponse) {
  const doesNotHaveDimensions = typeof bidResponse.width !== 'number' || typeof bidResponse.height !== 'number';
  const hasPlayerSize = typeof bidResponse.playerWidth === 'number' && typeof bidResponse.playerHeight === 'number';
  return doesNotHaveDimensions && hasPlayerSize;
}

function hideGoogleAdsDiv(adUnit) {
  const el = adUnit.querySelector("div[id^='google_ads']");
  if (el) {
    el.style.setProperty('display', 'none');
  }
}

function hideSmartAdServerIframe(adUnit) {
  const el = adUnit.querySelector("script[id^='sas_script']");
  const nextSibling = el && el.nextSibling;
  if (nextSibling && nextSibling.localName === 'iframe') {
    nextSibling.style.setProperty('display', 'none');
  }
}

function renderBid(bid) {
  // hide existing ad units
  let adUnitElement = document.getElementById(bid.adUnitCode);
  if (!adUnitElement) {
    logWarn(`Magnite: unable to find ad unit element with id "${bid.adUnitCode}" for rendering.`);
    return;
  }

  // try to get child element of adunit
  const firstChild = adUnitElement.firstElementChild;
  if (firstChild?.tagName === 'DIV') {
    adUnitElement = firstChild;
  }

  hideGoogleAdsDiv(adUnitElement);
  hideSmartAdServerIframe(adUnitElement);

  // configure renderer
  const config = bid.renderer.getConfig();
  bid.renderer.push(() => {
    globalThis.MagniteApex.renderAd({
      width: bid.width,
      height: bid.height,
      vastUrl: bid.vastUrl,
      placement: {
        attachTo: adUnitElement,
        align: config.align || 'center',
        position: config.position || 'prepend'
      },
      closeButton: config.closeButton || false,
      label: config.label || undefined,
      replay: config.replay ?? true
    });
  });
}

function outstreamRenderer(rtbBid) {
  const renderer = Renderer.install({
    id: rtbBid.adId,
    url: mgniConf.rendererUrl || DEFAULT_RENDERER_URL,
    config: mgniConf.rendererConfig || {},
    loaded: false,
    adUnitCode: rtbBid.adUnitCode
  });

  try {
    renderer.setRender(renderBid);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
  }

  return renderer;
}

function transformBidParams(params) {
  return convertTypes({
    'accountId': 'number',
    'siteId': 'number',
    'zoneId': 'number'
  }, params);
}

function shouldAddBid(bid, mediaType) {
  const enabledTypes = bid.params?.enabledMediaTypes;
  return !Array.isArray(enabledTypes) || enabledTypes.includes(mediaType);
}

/**
 * We must split our bids into different requests with the following criteria
 *  - Each accountId - siteId - mediaType combo gets own request
 *  - Max of 10 imps per request
 * @param bids
 * @param bidderRequest
 * @returns Array of HTTP Request Objects
 */
function buildRequests(bids, bidderRequest) {
  const bidsMap = {};

  // Loop through all bids and group them by accountId, siteId, and mediaType
  for (const bid of bids) {
    const { accountId, siteId } = bid.params;
    for (const mediaType of Object.keys(bid.mediaTypes)) {
      if (shouldAddBid(bid, mediaType)) {
        const key = `${accountId}-${siteId}-${mediaType}`;
        if (!bidsMap[key]) {
          bidsMap[key] = [];
        }
        bidsMap[key].push(bid);
      }
    }
  }

  const impLimit = mgniConf.impLimit ?? 10;
  const requests = [];

  // Loop through the grouped bids and create requests
  // We need to split the bids into chunks of impLimit
  // and create a request for each chunk
  for (const [key, groupBids] of Object.entries(bidsMap)) {
    const [accountId, siteId, mediaType] = key.split('-');

    for (let i = 0; i < groupBids.length; i += impLimit) {
      const chunk = groupBids.slice(i, i + impLimit);
      requests.push(createRequest(chunk, bidderRequest, `${accountId}-${siteId}`, mediaType));
    }
  }

  return requests;
}

function createRequest(bidRequests, bidderRequest, acctSite, mediaType) {
  return {
    method: 'POST',
    url: `${(mgniConf.bidEndpoint || REQUEST_URL)}?as=${acctSite}&m=${mediaType}&s=${bidRequests.length}`,
    data: converter.toORTB({ bidRequests, bidderRequest, context: { mediaType } })
  }
}

function interpretResponse(resp, req) {
  if (!resp.body) {
    resp.body = { nbr: 0 };
  }
  return converter.fromORTB({ request: req.data, response: resp.body })?.bids;
}

/**
 * @param syncOptions
 * @param responses
 * @param gdprConsent
 * @param uspConsent
 * @param gppConsent
 * @return {{type: (string), url: (*|string)}[]}
 */
function getUserSyncs(syncOptions, responses, gdprConsent, uspConsent, gppConsent) {
  if (!syncOptions.iframeEnabled) {
    return;
  }

  const params = {};

  if (gdprConsent && typeof gdprConsent.gdprApplies === 'boolean') {
    params['gdpr'] = Number(gdprConsent.gdprApplies);
  }
  if (gdprConsent && typeof gdprConsent.consentString === 'string') {
    params['gdpr_consent'] = gdprConsent.consentString;
  }

  if (uspConsent) {
    params['us_privacy'] = encodeURIComponent(uspConsent);
  }

  if (gppConsent?.gppString) {
    params['gpp'] = gppConsent.gppString;
    params['gpp_sid'] = gppConsent.applicableSections?.toString();
  }

  const queryString = Object.keys(params).length ? `?${formatQS(params)}` : '';
  const syncEndpoint = mgniConf.syncEndpoint || SYNC_URL;

  return {
    type: 'iframe',
    url: syncEndpoint + queryString
  };
}
