import {deepSetValue, logInfo, deepAccess} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const ENDPOINT_URL = 'https://x.yieldlift.com/auction';

const DEFAULT_BID_TTL = 30;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;

export const spec = {
  code: 'yieldlift',
  aliases: ['yl'],
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    return (!!bid.params.unitId && typeof bid.params.unitId === 'string') ||
      (!!bid.params.networkId && typeof bid.params.networkId === 'string') ||
      (!!bid.params.publisherId && typeof bid.params.publisherId === 'string');
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    if (!validBidRequests || !bidderRequest) {
      return;
    }
    const publisherId = validBidRequests[0].params.publisherId;
    const networkId = validBidRequests[0].params.networkId;
    const impressions = validBidRequests.map(bidRequest => ({
      id: bidRequest.bidId,
      banner: {
        format: bidRequest.mediaTypes.banner.sizes.map(sizeArr => ({
          w: sizeArr[0],
          h: sizeArr[1]
        }))
      },
      ext: {
        exchange: {
          unitId: bidRequest.params.unitId
        }
      }
    }));

    const openrtbRequest = {
      id: bidderRequest.auctionId,
      imp: impressions,
      site: {
        domain: bidderRequest.refererInfo?.domain,
        page: bidderRequest.refererInfo?.page,
        ref: bidderRequest.refererInfo?.ref,
      },
      ext: {
        exchange: {
          publisherId: publisherId,
          networkId: networkId,
        }
      }
    };

    // adding schain object
    if (validBidRequests[0].schain) {
      deepSetValue(openrtbRequest, 'source.ext.schain', validBidRequests[0].schain);
    }

    // Attaching GDPR Consent Params
    if (bidderRequest.gdprConsent) {
      deepSetValue(openrtbRequest, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(openrtbRequest, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
    }

    // CCPA
    if (bidderRequest.uspConsent) {
      deepSetValue(openrtbRequest, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    // EIDS
    const eids = deepAccess(validBidRequests[0], 'userIdAsEids');
    if (Array.isArray(eids) && eids.length > 0) {
      deepSetValue(openrtbRequest, 'user.ext.eids', eids);
    }

    const payloadString = JSON.stringify(openrtbRequest);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString,
    };
  },

  interpretResponse: function (serverResponse) {
    const bidResponses = [];
    const response = (serverResponse || {}).body;
    // response is always one seat (exchange) with (optional) bids for each impression
    if (response && response.seatbid && response.seatbid.length === 1 && response.seatbid[0].bid && response.seatbid[0].bid.length) {
      response.seatbid[0].bid.forEach(bid => {
        bidResponses.push({
          requestId: bid.impid,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          ad: bid.adm,
          ttl: DEFAULT_BID_TTL,
          creativeId: bid.crid,
          netRevenue: DEFAULT_NET_REVENUE,
          currency: DEFAULT_CURRENCY,
          meta: { advertiserDomains: bid && bid.advertiserDomains ? bid.advertiserDomains : [] }
        })
      })
    } else {
      logInfo('yieldlift.interpretResponse :: no valid responses to interpret');
    }
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    logInfo('yieldlift.getUserSyncs', 'syncOptions', syncOptions, 'serverResponses', serverResponses);
    let syncs = [];

    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      return syncs;
    }

    serverResponses.forEach(resp => {
      const userSync = deepAccess(resp, 'body.ext.usersync');
      if (userSync) {
        let syncDetails = [];
        Object.keys(userSync).forEach(key => {
          const value = userSync[key];
          if (value.syncs && value.syncs.length) {
            syncDetails = syncDetails.concat(value.syncs);
          }
        });
        syncDetails.forEach(syncDetails => {
          syncs.push({
            type: syncDetails.type === 'iframe' ? 'iframe' : 'image',
            url: syncDetails.url
          });
        });

        if (!syncOptions.iframeEnabled) {
          syncs = syncs.filter(s => s.type !== 'iframe')
        }
        if (!syncOptions.pixelEnabled) {
          syncs = syncs.filter(s => s.type !== 'image')
        }
      }
    });
    logInfo('yieldlift.getUserSyncs result=%o', syncs);
    return syncs;
  },

};
registerBidder(spec);
