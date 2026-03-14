import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { deepAccess, isArray, isNumber, isPlainObject } from '../src/utils.js';
import { auctionManager } from '../src/auctionManager.js';
import { getANKeywordParam } from '../libraries/appnexusUtils/anKeywords.js';
import { convertCamelToUnderscore } from '../libraries/appnexusUtils/anUtils.js';
import { transformSizes } from '../libraries/sizeUtils/tranformSize.js';
import { addUserId, hasUserInfo, getBidFloor } from '../libraries/adrelevantisUtils/bidderUtils.js';

const SOURCE = 'pbjs';
const storageManager = getStorageManager({ bidderCode: 'pixfuture' });
const USER_PARAMS = ['age', 'externalUid', 'segments', 'gender', 'dnt', 'language'];
let pixID = '';
const GVLID = 839;

export const spec = {
  code: 'pixfuture',
  supportedMediaTypes: [BANNER, VIDEO],
  gvlid: GVLID,
  hostname: 'https://gosrv.pixfuture.com',

  getHostname() {
    let ret = this.hostname;
    try {
      ret = storageManager.getDataFromLocalStorage('ov_pixbidder_host') || ret;
    } catch (e) {
    }
    return ret;
  },

  isBidRequestValid(bid) {
    const hasBanner = bid.sizes && bid.sizes.length;
    const hasVideo = bid.mediaTypes && bid.mediaTypes.video;

    return !!(
      bid.bidId &&
      bid.params &&
      typeof bid.params.pix_id === 'string' &&
      (hasBanner || hasVideo)
    );
  },
  buildRequests(validBidRequests, bidderRequest) {
    const tags = validBidRequests.map(bidToTag);
    const hostname = this.getHostname();

    return validBidRequests.map((bidRequest, index) => {
      if (bidRequest.params.pix_id) {
        pixID = bidRequest.params.pix_id;
      }

      let referer = '';
      if (bidderRequest && bidderRequest.refererInfo) {
        referer = bidderRequest.refererInfo.page || '';
      }

      const userObjBid = (validBidRequests || []).find(hasUserInfo);
      let userObj = {};
      if (config.getConfig('coppa') === true) {
        userObj = { coppa: true };
      }

      if (userObjBid) {
        Object.keys(userObjBid.params.user)
          .filter(param => USER_PARAMS.includes(param))
          .forEach((param) => {
            const uparam = convertCamelToUnderscore(param);
            if (param === 'segments' && isArray(userObjBid.params.user[param])) {
              const segs = [];
              userObjBid.params.user[param].forEach(val => {
                if (isNumber(val)) {
                  segs.push({ id: val });
                } else if (isPlainObject(val)) {
                  segs.push(val);
                }
              });
              userObj[uparam] = segs;
            } else if (param !== 'segments') {
              userObj[uparam] = userObjBid.params.user[param];
            }
          });
      }

      const schain = validBidRequests[0]?.ortb2?.source?.ext?.schain;

      const payload = {
        tags: [tags[index]],
        user: userObj,
        sdk: {
          source: SOURCE,
          version: '$prebid.version$'
        },
        schain: schain
      };

      if (bidderRequest && bidderRequest.uspConsent) {
        payload.us_privacy = bidderRequest.uspConsent;
      }

      if (bidderRequest && bidderRequest.refererInfo) {
        payload.referrer_detection = {
          rd_ref: encodeURIComponent(bidderRequest.refererInfo.topmostLocation),
          rd_top: bidderRequest.refererInfo.reachedTop,
          rd_ifs: bidderRequest.refererInfo.numIframes,
          rd_stk: bidderRequest.refererInfo.stack.map((url) => encodeURIComponent(url)).join(',')
        };
      }

      if (validBidRequests[0]?.ortb2?.user?.ext?.eids?.length) {
        const eids = [];
        const ortbEids = validBidRequests[0].ortb2.user.ext.eids;

        ortbEids.forEach(eid => {
          const source = eid.source;
          const uids = eid.uids || [];
          uids.forEach(uidObj => {
            addUserId(eids, uidObj.id, source, uidObj.atype || null);
          });
        });

        if (eids.length) {
          payload.eids = eids;
        }
      }

      if (tags[index].publisher_id) {
        payload.publisher_id = tags[index].publisher_id;
      }

      const mediaTypes = [];
      if (bidRequest.mediaTypes?.banner) mediaTypes.push('banner');
      if (bidRequest.mediaTypes?.video) mediaTypes.push('video');

      const ret = {
        url: `${hostname}/pixservices`,
        method: 'POST',
        options: { withCredentials: true },
        data: {
          v: 'v' + '$prebid.version$',
          pageUrl: referer,
          bidId: bidRequest.bidId,
          auctionId: bidRequest.auctionId,
          transactionId: bidRequest.ortb2Imp?.ext?.tid,
          adUnitCode: bidRequest.adUnitCode,
          bidRequestCount: bidRequest.bidRequestCount,
          sizes: bidRequest.sizes,
          mediaTypes: mediaTypes,
          video: bidRequest.mediaTypes?.video || null,
          params: bidRequest.params,
          pubext: payload
        }
      };

      if (bidderRequest && bidderRequest.gdprConsent) {
        ret.data.gdprConsent = {
          consentString: bidderRequest.gdprConsent.consentString,
          consentRequired:
            (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') &&
            bidderRequest.gdprConsent.gdprApplies
        };
      }

      return ret;
    });
  },

  interpretResponse: function (serverResponse, { bidderRequest }) {
    serverResponse = serverResponse.body;
    const bids = [];

    if (serverResponse?.creatives?.bids && serverResponse?.placements) {
      serverResponse.placements.forEach(serverBid => {
        serverBid.creatives.forEach(creative => {
          bids.push(newBid(serverBid, creative, serverBid.placement_id, serverBid.uuid));
        });
      });
    }

    return bids;
  },
  getUserSyncs: function (syncOptions, bid, gdprConsent, uspConsent) {
    const syncs = [];

    let syncurl = 'pixid=' + pixID;
    const gdpr = (gdprConsent && gdprConsent.gdprApplies) ? 1 : 0;
    const consent = gdprConsent ? encodeURIComponent(gdprConsent.consentString || '') : '';

    syncurl += '&gdprconcent=' + gdpr + '&adsync=' + consent;

    if (uspConsent) {
      syncurl += '&us_privacy=' + encodeURIComponent(uspConsent);
    }

    if (config.getConfig('coppa') === true) {
      syncurl += '&coppa=1';
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: 'https://gosrv.pixfuture.com/cookiesync?f=b&' + syncurl
      });
    } else {
      syncs.push({
        type: 'image',
        url: 'https://gosrv.pixfuture.com/cookiesync?f=i&' + syncurl
      });
    }

    return syncs;
  }
};

function newBid(serverBid, rtbBid, placementId, uuid) {
  const bid = {
    requestId: uuid,
    cpm: rtbBid.cpm,
    creativeId: rtbBid.creative_id,
    currency: 'USD',
    netRevenue: true,
    ttl: 300,
    adUnitCode: placementId
  };

  if (rtbBid.adomain) {
    bid.meta = Object.assign({}, bid.meta, { advertiserDomains: [rtbBid.adomain] });
  };

  if (rtbBid.vastUrl) {
    Object.assign(bid, {
      mediaType: VIDEO,
      width: rtbBid.width || 640,
      height: rtbBid.height || 360,
      vastUrl: rtbBid.vastUrl
    });
  } else if (isVastCreative(rtbBid.code)) {
    Object.assign(bid, {
      mediaType: VIDEO,
      width: rtbBid.width || 640,
      height: rtbBid.height || 360,
      vastXml: rtbBid.code
    });
  } else {
    Object.assign(bid, {
      mediaType: BANNER,
      width: rtbBid.width,
      height: rtbBid.height,
      ad: rtbBid.code
    });
  }

  return bid;
}

function bidToTag(bid) {
  const tag = {};
  tag.sizes = transformSizes(bid.sizes);
  tag.primary_size = tag.sizes[0];
  tag.ad_types = [];
  tag.uuid = bid.bidId;

  if (bid.params.placementId) {
    tag.id = parseInt(bid.params.placementId, 10);
  } else {
    tag.code = bid.params.invCode;
  }

  tag.allow_smaller_sizes = bid.params.allowSmallerSizes || false;
  tag.use_pmt_rule = bid.params.usePaymentRule || false;
  tag.prebid = true;
  tag.disable_psa = true;

  const bidFloor = getBidFloor(bid);
  if (bidFloor) {
    tag.reserve = bidFloor;
  }

  if (bid.params.position) {
    tag.position = { 'above': 1, 'below': 2 }[bid.params.position] || 0;
  } else {
    const mediaTypePos = deepAccess(bid, 'mediaTypes.banner.pos') || deepAccess(bid, 'mediaTypes.video.pos');
    if (mediaTypePos === 0 || mediaTypePos === 1 || mediaTypePos === 3) {
      tag.position = (mediaTypePos === 3) ? 2 : mediaTypePos;
    }
  }

  if (bid.params.trafficSourceCode) {
    tag.traffic_source_code = bid.params.trafficSourceCode;
  }
  if (bid.params.privateSizes) {
    tag.private_sizes = transformSizes(bid.params.privateSizes);
  }
  if (bid.params.supplyType) {
    tag.supply_type = bid.params.supplyType;
  }
  if (bid.params.pubClick) {
    tag.pubclick = bid.params.pubClick;
  }
  if (bid.params.extInvCode) {
    tag.ext_inv_code = bid.params.extInvCode;
  }
  if (bid.params.publisherId) {
    tag.publisher_id = parseInt(bid.params.publisherId, 10);
  }
  if (bid.params.externalImpId) {
    tag.external_imp_id = bid.params.externalImpId;
  }
  tag.keywords = getANKeywordParam(bid.ortb2, bid.params.keywords);

  const gpid = deepAccess(bid, 'ortb2Imp.ext.gpid');
  if (gpid) {
    tag.gpid = gpid;
  }

  const adUnit = ((auctionManager.getAdUnits()) || []).find(au => bid.transactionId === au.transactionId);

  if (adUnit && adUnit.mediaTypes) {
    if (adUnit.mediaTypes.banner) {
      tag.ad_types.push(BANNER);
    }

    if (adUnit.mediaTypes.video) {
      const video = adUnit.mediaTypes.video;

      tag.ad_types.push('video');
      tag.video = {
        player_size: video.playerSize || bid.sizes || [[640, 360]],
        context: video.context,
        mimes: video.mimes,
        protocols: video.protocols,
        playbackmethod: video.playbackmethod,
        api: video.api,
        placement: video.placement,
        minduration: video.minduration,
        maxduration: video.maxduration,
        startdelay: video.startdelay,
        skip: video.skip
      };

      if (bid.renderer) {
        tag.video.custom_renderer_present = true;
      }
    }
  }

  if (bid.params.frameworks && isArray(bid.params.frameworks)) {
    tag.banner_frameworks = bid.params.frameworks;
  }

  if (tag.ad_types.length === 0) {
    delete tag.ad_types;
  }

  return tag;
}
function isVastCreative(code) {
  return typeof code === 'string' && /<VAST[\s>]/i.test(code);
}

registerBidder(spec);
