import {BID_RESPONSE, IMP, REQUEST, RESPONSE} from '../../../src/pbjsORTB.js';
import {isPlainObject, isStr, mergeDeep} from '../../../src/utils.js';
import {extPrebidMediaType} from './mediaType.js';
import {setRequestExtPrebidAliases} from './aliases.js';
import {setImpBidParams} from './params.js';
import {setImpAdUnitCode} from './adUnitCode.js';
import {setRequestExtPrebid, setRequestExtPrebidChannel} from './requestExtPrebid.js';
import {setBidResponseVideoCache} from './video.js';
import {addEventTrackers} from './eventTrackers.js';
import {setRequestExtPrebidPageViewIds} from './pageViewIds.js';

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
    },
    extPrebidPageViewIds: {
      // sets ext.prebid.page_view_ids
      fn: setRequestExtPrebidPageViewIds
    },
  },
  [IMP]: {
    params: {
      // sets bid ext.prebid.bidder.[bidderCode] with bidRequest.params, passed through transformBidParams if necessary
      fn: setImpBidParams
    },
    adUnitCode: {
      // sets bid ext.prebid.adunitcode
      fn: setImpAdUnitCode
    }
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
        bidResponse.adapterCode = bid?.ext?.prebid?.meta?.adaptercode || context.bidRequest?.bidder || bidResponse.bidderCode;
      }
    },
    pbsBidId: {
      // sets bidResponse.pbsBidId from ext.prebid.bidid
      fn(bidResponse, bid) {
        const bidId = bid?.ext?.prebid?.bidid;
        if (isStr(bidId)) {
          bidResponse.pbsBidId = bidId;
        }
      }
    },
    adserverTargeting: {
      // sets bidResponse.adserverTargeting from ext.prebid.targeting
      fn(bidResponse, bid) {
        const targeting = bid?.ext?.prebid?.targeting;
        if (isPlainObject(targeting)) {
          bidResponse.adserverTargeting = targeting;
        }
      }
    },
    extPrebidMeta: {
      // sets bidResponse.meta from ext.prebid.meta
      fn(bidResponse, bid) {
        bidResponse.meta = mergeDeep({}, bid?.ext?.prebid?.meta, bidResponse.meta);
      }
    },
    pbsWinTrackers: {
      // converts "legacy" burl and ext.prebid.events.win into eventtrackers
      fn: addEventTrackers
    },
  },
  [RESPONSE]: {
    serverSideStats: {
      // updates bidderRequest and bidRequests with fields from response.ext
      // - bidder-scoped for 'errors' and 'responsetimemillis'
      // - copy-as-is for all other fields
      fn(response, ortbResponse, context) {
        const bidder = context.bidderRequest?.bidderCode;
        const ext = ortbResponse?.ext;
        if (!ext) return;

        const FIELD_MAP = {
          errors: 'serverErrors',
          responsetimemillis: 'serverResponseTimeMs'
        };

        Object.entries(ext).forEach(([field, extValue]) => {
          if (FIELD_MAP[field]) {
            // Skip mapped fields if no bidder
            if (!bidder) return;
            const value = extValue?.[bidder];
            if (value !== undefined) {
              const clientName = FIELD_MAP[field];
              context.bidderRequest[clientName] = value;
              context.bidRequests?.forEach(bid => {
                bid[clientName] = value;
              });
            }
          } else if (extValue !== undefined) {
            context.bidderRequest.pbsExt = context.bidderRequest.pbsExt || {};
            context.bidderRequest.pbsExt[field] = extValue;
          }
        });
      }
    },
  }
}
