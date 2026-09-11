import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {
  getParameterByName,
  isNumber,
  logError,
  logInfo,
} from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import { sendBeacon } from '../src/ajax.js';
import { isAutoplayEnabled } from '../libraries/autoplayDetection/autoplay.js';
import { getAdUnitElement } from '../src/utils/adUnits.js';

const BIDDER_CODE = 'cwire';
const CWID_KEY = 'cw_cwid';

export const BID_ENDPOINT = 'https://prebid2.cwi.re/v1/bid';
export const EVENT_ENDPOINT = 'https://prebid2.cwi.re/v1/event';
export const GVL_ID = 1081;

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

function getCwid() {
  return storage.localStorageIsEnabled()
    ? storage.getDataFromLocalStorage(CWID_KEY)
    : null;
}

function updateCwid(cwid) {
  if (storage.localStorageIsEnabled()) {
    storage.setDataInLocalStorage(CWID_KEY, cwid);
  } else {
    logInfo(`Could not set CWID ${cwid} in localstorage`);
  }
}

function getRefGroups() {
  const groups = getParameterByName('cwgroups');
  return groups ? groups.split(',') : [];
}

function getFeatureFlags() {
  const ff = getParameterByName('cwfeatures');
  return ff ? ff.split(',') : [];
}

function getConnectionDownLink(nav) {
  return nav?.connection?.downlink >= 0 ? nav.connection.downlink.toString() : '';
}

function getSlotSignals(bidRequest) {
  const slotEl = getAdUnitElement(bidRequest);
  if (!slotEl) return {};
  const { width, height } = getBoundingClientRect(slotEl);
  const maxWidth = slotEl.style?.maxWidth;
  const maxHeight = slotEl.style?.maxHeight;
  return {
    dimensions: { width, height },
    style: {
      ...(maxWidth && { maxWidth }),
      ...(maxHeight && { maxHeight }),
    },
  };
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 360,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    const bidderParams = {};
    if (bidRequest.params?.domainId != null) bidderParams.domainId = bidRequest.params.domainId;
    if (bidRequest.params?.pageId != null) bidderParams.pageId = bidRequest.params.pageId;
    if (bidRequest.params?.placementId != null) bidderParams.placementId = bidRequest.params.placementId;
    if (Object.keys(bidderParams).length) {
      imp.ext = imp.ext || {};
      imp.ext.bidder = { ...(imp.ext.bidder || {}), ...bidderParams };
    }

    const slotSignals = getSlotSignals(bidRequest);
    const cwireExt = {
      ...slotSignals,
      autoplay: isAutoplayEnabled(),
    };
    imp.ext = imp.ext || {};
    imp.ext.cwire = cwireExt;

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    const cwid = getCwid();
    const refgroups = getRefGroups();
    const featureFlags = getFeatureFlags();
    const cwcreative = getParameterByName('cwcreative');
    const debug = getParameterByName('cwdebug');

    const cwExt = {
      ...(cwid && { cwid }),
      ...(refgroups.length && { refgroups }),
      ...(featureFlags.length && { featureFlags }),
      ...(cwcreative && { cwcreative }),
      ...(debug && { debug: true }),
      pageViewId: bidderRequest.pageViewId,
      networkBandwidth: getConnectionDownLink(window.navigator),
      sdk: { version: '$prebid.version$' },
    };

    request.ext = request.ext || {};
    request.ext.cwire = cwExt;
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    if (!bid.mtype && context.bidRequest) {
      const mt = context.bidRequest.mediaTypes;
      if (mt?.video && !mt?.banner) context.mediaType = VIDEO;
      else if (mt?.banner && !mt?.video) context.mediaType = BANNER;
    }
    return buildBidResponse(bid, context);
  },
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function (bid) {
    if (!bid.params?.domainId || !isNumber(bid.params.domainId)) {
      logError('domainId not provided or not a number');
      if (!bid.params?.placementId || !isNumber(bid.params.placementId)) {
        logError('placementId not provided or not a number');
        return false;
      }
      if (!bid.params?.pageId || !isNumber(bid.params.pageId)) {
        logError('pageId not provided or not a number');
        return false;
      }
      return true;
    }
    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const data = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });
    return {
      method: 'POST',
      url: BID_ENDPOINT,
      data,
      bids: validBidRequests,
    };
  },

  interpretResponse: function (serverResponse, request) {
    if (!serverResponse?.body) return [];

    const cwid = serverResponse.body?.ext?.cwire?.cwid;
    if (cwid && !getCwid()) {
      updateCwid(cwid);
    }

    return converter.fromORTB({
      response: serverResponse.body,
      request: request.data,
    }).bids;
  },

  onBidWon: function (bid) {
    logInfo('Bid won.');
    const event = { type: 'BID_WON', payload: { bid } };
    sendBeacon(EVENT_ENDPOINT, JSON.stringify(event));
  },

  onBidderError: function ({ error, bidderRequest }) {
    logInfo(`Bidder error: ${error}`);
    const event = { type: 'BID_ERROR', payload: { error, bidderRequest } };
    sendBeacon(EVENT_ENDPOINT, JSON.stringify(event));
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    logInfo(
      'Collecting user-syncs: ',
      JSON.stringify({ syncOptions, gdprConsent, uspConsent, serverResponses })
    );

    const syncs = [];
    if (hasPurpose1Consent(gdprConsent) && gdprConsent.consentString) {
      logInfo('GDPR purpose 1 consent was given, adding user-syncs');
      const type = syncOptions.pixelEnabled
        ? 'image'
        : syncOptions.iframeEnabled
          ? 'iframe'
          : null;
      if (type) {
        syncs.push({
          type,
          url: `https://ib.adnxs.com/getuid?https://prebid.cwi.re/v1/cookiesync?xandrId=$UID&gdpr=${
            gdprConsent.gdprApplies ? 1 : 0
          }&gdpr_consent=${gdprConsent.consentString}`,
        });
      }
    }
    logInfo('Collected user-syncs: ', JSON.stringify({ syncs }));
    return syncs;
  },
};

registerBidder(spec);
