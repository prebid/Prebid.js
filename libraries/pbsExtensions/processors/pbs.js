import {BID_RESPONSE, IMP, REQUEST, RESPONSE} from '../../../src/pbjsORTB.js';
import {deepAccess, isPlainObject, isStr, mergeDeep} from '../../../src/utils.js';
import {extPrebidMediaType} from './mediaType.js';
import {setRequestExtPrebidAliases} from './aliases.js';
import {setImpBidParams} from './params.js';
import {setRequestExtPrebid, setRequestExtPrebidChannel} from './requestExtPrebid.js';
import {setBidResponseVideoCache} from './video.js';

export const PBS_PROCESSORS = {
  [REQUEST]: {
    extPrebid: {
      // set request.ext.prebid.auctiontimestamp, .debug and .targeting
      fn: setRequestExtPrebid
    },
    extPrebidChannel: {
      // sets request.ext.prebid.channel
      fn: setRequestExtPrebidChannel
    },
    extPrebidAliases: {
      // sets ext.prebid.aliases
      fn: setRequestExtPrebidAliases
    }
  },
  [IMP]: {
    params: {
      // sets bid ext.prebid.bidder.[bidderCode] with bidRequest.params, passed through transformBidParams if necessary
      fn: setImpBidParams
    },
  },
  [BID_RESPONSE]: {
    mediaType: {
      // sets bidResponse.mediaType according to context.mediaType, falling back to imp.ext.prebid.type
      fn: extPrebidMediaType,
      priority: 99,
    },
    videoCache: {
      // sets response video attributes; in addition, looks at ext.prebid.cache and .targeting to set video cache key and URL
      fn: setBidResponseVideoCache,
      priority: -10, // after 'video'
    },
    bidderCode: {
      // sets bidderCode from on seatbid.seat
      fn(bidResponse, bid, context) {
        bidResponse.bidderCode = context.seatbid.seat;
        bidResponse.adapterCode = deepAccess(bid, 'ext.prebid.meta.adaptercode') || context.bidRequest?.bidder || bidResponse.bidderCode;
      }
    },
    pbsBidId: {
      // sets bidResponse.pbsBidId from ext.prebid.bidid
      fn(bidResponse, bid) {
        const bidId = deepAccess(bid, 'ext.prebid.bidid');
        if (isStr(bidId)) {
          bidResponse.pbsBidId = bidId;
        }
      }
    },
    adserverTargeting: {
      // sets bidResponse.adserverTargeting from ext.prebid.targeting
      fn(bidResponse, bid) {
        const targeting = deepAccess(bid, 'ext.prebid.targeting');
        if (isPlainObject(targeting)) {
          bidResponse.adserverTargeting = targeting;
        }
      }
    },
    extPrebidMeta: {
      // sets bidResponse.meta from ext.prebid.meta
      fn(bidResponse, bid) {
        bidResponse.meta = mergeDeep({}, deepAccess(bid, 'ext.prebid.meta'), bidResponse.meta);
      }
    },
    pbsWurl: {
      // sets bidResponse.pbsWurl from ext.prebid.events.win
      fn(bidResponse, bid) {
        const wurl = deepAccess(bid, 'ext.prebid.events.win');
        if (isStr(wurl)) {
          bidResponse.pbsWurl = wurl;
        }
      }
    },
  },
  [RESPONSE]: {
    serverSideStats: {
      // updates bidderRequest and bidRequests with serverErrors from ext.errors and serverResponseTimeMs from ext.responsetimemillis
      fn(response, ortbResponse, context) {
        Object.entries({
          errors: 'serverErrors',
          responsetimemillis: 'serverResponseTimeMs'
        }).forEach(([serverName, clientName]) => {
          const value = deepAccess(ortbResponse, `ext.${serverName}.${context.bidderRequest.bidderCode}`);
          if (value) {
            context.bidderRequest[clientName] = value;
            context.bidRequests.forEach(bid => bid[clientName] = value);
          }
        })
      }
    },
  }
}
