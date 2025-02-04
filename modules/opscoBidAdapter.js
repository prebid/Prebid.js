import {deepAccess, deepSetValue, isArray, logInfo} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const ENDPOINT = 'https://exchange.ops.co/openrtb2/auction';
const BIDDER_CODE = 'opsco';
const DEFAULT_BID_TTL = 300;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;

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

    const {publisherId, siteId} = validBidRequests[0].params;

    const payload = {
      id: bidderRequest.bidderRequestId,
      imp: validBidRequests.map(bidRequest => ({
        id: bidRequest.bidId,
        banner: {format: extractSizes(bidRequest)},
        ext: {
          opsco: {
            placementId: bidRequest.params.placementId,
            publisherId: publisherId,
          }
        }
      })),
      site: {
        id: siteId,
        publisher: {id: publisherId},
        domain: bidderRequest.refererInfo?.domain,
        page: bidderRequest.refererInfo?.page,
        ref: bidderRequest.refererInfo?.ref,
      },
    };

    if (isTest(validBidRequests[0])) {
      payload.test = 1;
    }

    if (bidderRequest.gdprConsent) {
      deepSetValue(payload, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(payload, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
    }
    const eids = deepAccess(validBidRequests[0], 'userIdAsEids');
    if (eids && eids.length !== 0) {
      deepSetValue(payload, 'user.ext.eids', eids);
    }

    const schainData = deepAccess(validBidRequests[0], 'schain.nodes');
    if (isArray(schainData) && schainData.length > 0) {
      deepSetValue(payload, 'source.ext.schain', validBidRequests[0].schain);
    }

    if (bidderRequest.uspConsent) {
      deepSetValue(payload, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(payload),
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
    let syncs = [];
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

function extractSizes(bidRequest) {
  return (bidRequest.mediaTypes?.banner?.sizes || []).map(([width, height]) => ({w: width, h: height}));
}

function isTest(validBidRequest) {
  return validBidRequest.params?.test === true;
}

registerBidder(spec);
