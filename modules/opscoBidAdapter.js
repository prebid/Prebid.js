import {deepAccess, deepSetValue, isArray, logInfo} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'
import {pbsExtensions} from '../libraries/pbsExtensions/pbsExtensions.js';

const ENDPOINT = 'https://exchange.ops.co/openrtb2/auction';
const BIDDER_CODE = 'opsco';
const DEFAULT_BID_TTL = 300;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;

const converter = ortbConverter({
  request(buildRequest, imps, bidderRequest, context) {
    const {bidRequests} = context;
    const data = buildRequest(imps, bidderRequest, context);

    const {publisherId, siteId} = bidRequests[0].params;

    data.site = data.site || {};
    data.site.id = siteId;

    data.site.publisher = data.site.publisher || {};
    data.site.publisher.id = publisherId;

    data.site.domain = data.site.domain || bidderRequest.refererInfo?.domain;
    data.site.page = data.site.page || bidderRequest.refererInfo?.page;
    data.site.ref = data.site.ref || bidderRequest.refererInfo?.ref;

    if (isTest(bidRequests[0])) {
      data.test = 1;
    } else {
      delete data.test;
    }

    imps.forEach(imp => {
      delete imp.ext.opsco.test;
    });

    if (bidderRequest.gdprConsent) {
      deepSetValue(data, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(data, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
    }

    if (bidderRequest.uspConsent) {
      deepSetValue(data, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    const eids = deepAccess(bidRequests[0], 'userIdAsEids');
    if (eids && eids.length !== 0) {
      deepSetValue(data, 'user.ext.eids', eids);
    }

    const schain = bidRequests[0]?.ortb2?.source?.ext?.schain;
    const schainData = schain?.nodes;
    if (isArray(schainData) && schainData.length > 0) {
      deepSetValue(data, 'source.ext.schain', schain);
    }

    return data;
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    imp.ext.opsco = imp.ext.prebid.bidder.opsco;
    delete imp.ext.prebid.bidder;

    if (!imp.bidfloor && bidRequest.params?.bidfloor) {
      imp.bidfloor = bidRequest.params.bidfloor;
      imp.bidfloorcur = bidRequest.params.currency || DEFAULT_CURRENCY;
    }

    return imp;
  },
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_BID_TTL,
    currency: DEFAULT_CURRENCY
  },
  processors: pbsExtensions
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: (bid) => !!(bid.params &&
    bid.params.placementId &&
    bid.params.publisherId &&
    bid.mediaTypes?.banner?.sizes &&
    Array.isArray(bid.mediaTypes?.banner?.sizes)),

  buildRequests: (validBidRequests, bidderRequest) => {
    if (!validBidRequests || !bidderRequest) {
      return;
    }

    const data = converter.toORTB({
      bidderRequest: bidderRequest,
      bidRequests: validBidRequests,
      context: { mediaType: BANNER }
    });

    return {
      method: 'POST',
      url: ENDPOINT,
      data: data,
    };
  },

  interpretResponse: (serverResponse) => {
    const response = (serverResponse || {}).body;
    const bidResponses = response?.seatbid?.[0]?.bid?.map(bid => ({
      requestId: bid.impid,
      cpm: bid.price,
      width: bid.w,
      height: bid.h,
      ad: bid.adm,
      ttl: typeof bid.exp === 'number' ? bid.exp : DEFAULT_BID_TTL,
      creativeId: bid.crid,
      netRevenue: DEFAULT_NET_REVENUE,
      currency: DEFAULT_CURRENCY,
      meta: {advertiserDomains: bid?.adomain || []},
      mediaType: bid.mediaType || bid.mtype
    })) || [];

    if (!bidResponses.length) {
      logInfo('opsco.interpretResponse :: No valid responses');
    }

    return bidResponses;
  },

  getUserSyncs: (syncOptions, serverResponses) => {
    logInfo('opsco.getUserSyncs', 'syncOptions', syncOptions, 'serverResponses', serverResponses);
    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      return [];
    }
    const syncs = [];
    serverResponses.forEach(resp => {
      const userSync = deepAccess(resp, 'body.ext.usersync');
      if (userSync) {
        const syncDetails = Object.values(userSync).flatMap(value => value.syncs || []);
        syncDetails.forEach(syncDetail => {
          const type = syncDetail.type === 'iframe' ? 'iframe' : 'image';
          if ((type === 'iframe' && syncOptions.iframeEnabled) || (type === 'image' && syncOptions.pixelEnabled)) {
            syncs.push({type, url: syncDetail.url});
          }
        });
      }
    });

    logInfo('opsco.getUserSyncs result=%o', syncs);
    return syncs;
  }
};

function isTest(validBidRequest) {
  return validBidRequest.params?.test === true;
}

registerBidder(spec);
