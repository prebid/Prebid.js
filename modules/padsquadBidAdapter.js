import { logInfo, deepAccess } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const ENDPOINT_URL = 'https://x.padsquad.com/auction';

const DEFAULT_BID_TTL = 30;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;

export const spec = {
  code: 'padsquad',
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
        format: bidRequest.sizes.map(sizeArr => ({
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
        domain: window.location.hostname,
        page: window.location.href,
        ref: bidderRequest.refererInfo ? bidderRequest.refererInfo.referer || null : null
      },
      ext: {
        exchange: {
          publisherId: publisherId,
          networkId: networkId,
        }
      }
    };

    // apply gdpr
    if (bidderRequest.gdprConsent) {
      openrtbRequest.regs = {ext: {gdpr: bidderRequest.gdprConsent.gdprApplies ? 1 : 0}};
      openrtbRequest.user = {ext: {consent: bidderRequest.gdprConsent.consentString}};
    }

    const payloadString = JSON.stringify(openrtbRequest);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString,
    };
  },

  interpretResponse: function (serverResponse, request) {
    const bidResponses = [];
    const response = (serverResponse || {}).body;
    // response is always one seat with (optional) bids for each impression
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
          meta: { advertiserDomains: bid.adomain },
          netRevenue: DEFAULT_NET_REVENUE,
          currency: DEFAULT_CURRENCY,
        })
      })
    } else {
      logInfo('padsquad.interpretResponse :: no valid responses to interpret');
    }
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    logInfo('padsquad.getUserSyncs', 'syncOptions', syncOptions, 'serverResponses', serverResponses);
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
    return syncs;
  },

};
registerBidder(spec);
