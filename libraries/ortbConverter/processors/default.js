import {deepSetValue, logWarn, mergeDeep} from '../../../src/utils.js';
import {bannerResponseProcessor, fillBannerImp} from './banner.js';
import {fillVideoImp, fillVideoResponse} from './video.js';
import {setResponseMediaType} from './mediaType.js';
import {fillNativeImp, fillNativeResponse} from './native.js';
import {BID_RESPONSE, IMP, REQUEST} from '../../../src/pbjsORTB.js';
import {config} from '../../../src/config.js';

export const DEFAULT_PROCESSORS = {
  [REQUEST]: {
    fpd: {
      // sets initial request to bidderRequest.ortb2
      priority: 99,
      fn(ortbRequest, bidderRequest) {
        mergeDeep(ortbRequest, bidderRequest.ortb2)
      }
    },
    // override FPD app, site, and device with getConfig('app'), etc if defined
    // TODO: these should be deprecated for v8
    appFpd: fpdFromTopLevelConfig('app'),
    siteFpd: fpdFromTopLevelConfig('site'),
    deviceFpd: fpdFromTopLevelConfig('device'),
    onlyOneClient: {
      priority: -99,
      fn: onlyOneClientSection
    },
    props: {
      // sets request properties id, tmax, test, source.tid
      fn(ortbRequest, bidderRequest) {
        Object.assign(ortbRequest, {
          id: ortbRequest.id || bidderRequest.auctionId,
          test: ortbRequest.test || 0
        });
        const timeout = parseInt(bidderRequest.timeout, 10);
        if (!isNaN(timeout)) {
          ortbRequest.tmax = timeout;
        }
        deepSetValue(ortbRequest, 'source.tid', ortbRequest.source?.tid || bidderRequest.auctionId);
      }
    }
  },
  [IMP]: {
    fpd: {
      // sets initial imp to bidRequest.ortb2Imp
      priority: 99,
      fn(imp, bidRequest) {
        mergeDeep(imp, bidRequest.ortb2Imp);
      }
    },
    id: {
      // sets imp.id
      fn(imp, bidRequest) {
        imp.id = bidRequest.bidId;
      }
    },
    banner: {
      // populates imp.banner
      fn: fillBannerImp
    },
    video: {
      // populates imp.video
      fn: fillVideoImp
    },
    pbadslot: {
      // removes imp.ext.data.pbaslot if it's not a string
      // TODO: is this needed?
      fn(imp) {
        const pbadslot = imp.ext?.data?.pbadslot;
        if (!pbadslot || typeof pbadslot !== 'string') {
          delete imp.ext?.data?.pbadslot;
        }
      }
    }
  },
  [BID_RESPONSE]: {
    mediaType: {
      // sets bidResponse.mediaType from context.mediaType, falling back to seatbid.bid[].mtype
      priority: 99,
      fn: setResponseMediaType
    },
    banner: {
      // sets banner response attributes if bidResponse.mediaType === BANNER
      fn: bannerResponseProcessor(),
    },
    video: {
      // sets video response attributes if bidResponse.mediaType === VIDEO
      fn: fillVideoResponse
    },
    props: {
      // sets base bidResponse properties common to all types of bids
      fn(bidResponse, bid, context) {
        Object.entries({
          requestId: context.bidRequest?.bidId,
          seatBidId: bid.id,
          cpm: bid.price,
          currency: context.ortbResponse.cur || context.currency,
          width: bid.w,
          height: bid.h,
          dealId: bid.dealid,
          creative_id: bid.crid,
          creativeId: bid.crid,
          burl: bid.burl,
          ttl: bid.exp || context.ttl,
          netRevenue: context.netRevenue,
        }).filter(([k, v]) => typeof v !== 'undefined')
          .forEach(([k, v]) => bidResponse[k] = v);
        if (!bidResponse.meta) {
          bidResponse.meta = {};
        }
        if (bid.adomain) {
          bidResponse.meta.advertiserDomains = bid.adomain;
        }
      }
    }
  }
}

if (FEATURES.NATIVE) {
  DEFAULT_PROCESSORS[IMP].native = {
    // populates imp.native
    fn: fillNativeImp
  }
  DEFAULT_PROCESSORS[BID_RESPONSE].native = {
    // populates bidResponse.native if bidResponse.mediaType === NATIVE
    fn: fillNativeResponse
  }
}

function fpdFromTopLevelConfig(prop) {
  return {
    priority: 90, // after FPD from 'ortb2', before the rest
    fn(ortbRequest) {
      const data = config.getConfig(prop);
      if (typeof data === 'object') {
        ortbRequest[prop] = mergeDeep({}, ortbRequest[prop], data);
      }
    }
  }
}

export function onlyOneClientSection(ortbRequest, bidderRequest) {
  ['dooh', 'app', 'site'].reduce((found, section) => {
    if (ortbRequest[section] != null && Object.keys(ortbRequest[section]).length > 0) {
      if (found != null) {
        logWarn(`ORTB request specifies both '${found}' and '${section}'; dropping the latter.`)
        delete ortbRequest[section];
      } else {
        found = section;
      }
    }
    return found;
  }, null);

  // PM: We will be overwriting page, domain and ref as mentioned in UOE-8675 for s2s partners
  // const { page, domain } = bidderRequest.refererInfo;
  const page = bidderRequest?.refererInfo?.page || '';
  const domain = bidderRequest?.refererInfo?.domain || '';
  const ref = window?.document?.referrer;
  if (bidderRequest?.src === 's2s' && ortbRequest.site) {
    ortbRequest.site = Object.assign(ortbRequest.site, { page, domain });
    if (ref.length) {
      ortbRequest.site.ref = ref;
    }
  }
}
