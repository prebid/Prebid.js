import { _each, isFn, isPlainObject, isNumber, isStr, deepAccess, parseUrl, _map, getUniqueIdentifierStr, createTrackPixelHtml } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
import { createEidsArray } from './userId/eids.js';

const BIDDER_CODE = 'freestar';
const SERVER_URL = 'https://c.deployads.com';

function transformSyncs(responses, type, syncs) {
  _each(responses, res => {
    if (res.body && res.body.ext && res.body.ext.sync_dsps && res.body.ext.sync_dsps.length) {
      _each(res.body.ext.sync_dsps, sync => {
        if (sync[0] === type && sync[1]) {
          syncs.push({type, url: sync[1]});
        }
      });
    }
  });
}

function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return bid.params.floor ? bid.params.floor : null;
  }

  // MediaType and Size will automatically get set for us if the bid only has
  // one media type or one size.
  let floor = bid.getFloor({
    currency: 'USD',
    mediaType: '*',
    size: '*'
  });
  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return null;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function(bid) {
    const fsConfig = config.getConfig('freestar');
    const haveSiteId = (fsConfig && !!fsConfig.siteId) || bid.params.siteId;
    const floor = getBidFloor(bid);
    const validFloor = !floor || isNumber(floor);
    const validKeywords = !bid.params.keywords ||
      (isPlainObject(bid.params.keywords) &&
        Object.keys(bid.params.keywords).every(key =>
          isStr(key) && isStr(bid.params.keywords[key])
        ))
    const isBanner = !bid.mediaTypes || bid.mediaTypes[BANNER];
    const bannerSizes = isBanner ? deepAccess(bid, `mediaType.${BANNER}.sizes`) || bid.sizes : null;
    return !!(bid.params.tagId && haveSiteId && validFloor && validKeywords && (!isBanner ||
      (bannerSizes && bannerSizes.length > 0 && bannerSizes.every(sizeArr => sizeArr.length == 2 && sizeArr.every(num => isNumber(num))))));
  },

  buildRequests: function(validBidReqs, bidderRequest) {
    const fsConfig = config.getConfig('freestar') || {};
    const globalSiteId = fsConfig.siteId;
    let loc = parseUrl(bidderRequest.refererInfo.referer);

    const fsImps = _map(validBidReqs, bid => {
      const rv = {
        id: bid.bidId,
        tagid: bid.params.tagId,
        ext: {}
      };
      rv.banner = {
        format: _map(bid.sizes, ([width, height]) => ({w: width, h: height}))
      };
      const floor = getBidFloor(bid);
      if (floor) {
        rv.floor = floor;
      }
      if (bid.params.keywords) {
        rv.ext.keywords = bid.params.keywords;
      }
      if (bid.params.bidderParams) {
        _each(bid.params.bidderParams, (params, partner) => {
          rv.ext[partner] = params;
        });
      }
      rv.ext.gpid = deepAccess(bid, 'ortb2Imp.ext.gpid') || deepAccess(bid, 'ortb2Imp.ext.data.pbadslot');
      return rv;
    });
    const gdprConsent = bidderRequest && bidderRequest.gdprConsent;
    const bidUserId = validBidReqs[0].userId;
    const eids = createEidsArray(bidUserId);
    const fsBidReq = {
      id: getUniqueIdentifierStr(),
      imp: fsImps,
      source: {
        ext: {
          schain: validBidReqs[0].schain
        }
      },
      regs: {
        ext: {}
      },
      site: {
        domain: loc.hostname,
        page: loc.href,
        ref: loc.href,
        publisher: {
          id: globalSiteId || validBidReqs[0].params.siteId,
        },
        device: {
          w: screen.width,
          h: screen.height
        },
      },
      user: {
        ext: {}
      }
    };
    if (bidderRequest && bidderRequest.timeout > 0) {
      fsBidReq.tmax = bidderRequest.timeout;
    }
    if (gdprConsent) {
      fsBidReq.user = {
        ext: {
          consent: gdprConsent.consentString
        }
      };
      if (typeof gdprConsent.gdprApplies == 'boolean') {
        fsBidReq.regs.ext.gdpr = gdprConsent.gdprApplies ? 1 : 0
      }
    }
    if (eids.length) {
      fsBidReq.user.ext.eids = eids;
    }
    if (bidderRequest.uspConsent) {
      fsBidReq.regs.ext.us_privacy = bidderRequest.uspConsent;
    }
    return {
      method: 'POST',
      url: `${SERVER_URL}/openrtb2/auction?src=$$REPO_AND_VERSION$$&host=${loc.hostname}`,
      data: JSON.stringify(fsBidReq),
      options: {contentType: 'text/plain'}
    };
  },

  interpretResponse: function(serverResponse) {
    const { body: {id, seatbid} } = serverResponse;
    const fsBids = [];
    if (id && seatbid) {
      _each(seatbid, seatbid => {
        _each(seatbid.bid, bid => {
          const bidObj = {
            requestId: bid.impid,
            cpm: parseFloat(bid.price),
            width: parseInt(bid.w),
            height: parseInt(bid.h),
            creativeId: bid.crid || bid.id,
            dealId: bid.dealid || null,
            currency: 'USD',
            netRevenue: true,
            mediaType: BANNER,
            ttl: 60,
            meta: {
              advertiserDomains: bid.adomain || []
            }
          };
          if (bid.adm) {
            bidObj.mediaType = BANNER;
            bidObj.ad = bid.adm;
            if (bid.nurl) {
              bidObj.ad += createTrackPixelHtml(decodeURIComponent(bid.nurl));
            }
          } else if (bid.nurl) {
            bidObj.adUrl = bid.nurl;
          }
          if (bid.ext) {
            bidObj[BIDDER_CODE] = bid.ext;
          }
          fsBids.push(bidObj);
        });
      });
    }
    return fsBids;
  },

  getUserSyncs: (syncOptions, responses) => {
    const syncs = [];
    if (syncOptions.iframeEnabled) {
      transformSyncs(responses, 'iframe', syncs);
    }
    if (syncOptions.pixelEnabled) {
      transformSyncs(responses, 'image', syncs);
    }
    return syncs;
  },

  onTimeout(details) {
    fetch(`${SERVER_URL}/prebid/timeout`, {
      method: 'POST',
      body: JSON.stringify(details),
      mode: 'no-cors',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
};

registerBidder(spec);
