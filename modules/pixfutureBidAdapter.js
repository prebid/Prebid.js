import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getStorageManager} from '../src/storageManager.js';
import {BANNER} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import {find, includes} from '../src/polyfill.js';
import {
  convertCamelToUnderscore,
  deepAccess,
  isArray,
  isEmpty,
  isFn,
  isNumber,
  isPlainObject,
  transformBidderParamKeywords
} from '../src/utils.js';
import {auctionManager} from '../src/auctionManager.js';

const SOURCE = 'pbjs';
const storageManager = getStorageManager({bidderCode: 'pixfuture'});
const USER_PARAMS = ['age', 'externalUid', 'segments', 'gender', 'dnt', 'language'];
export const spec = {
  code: 'pixfuture',
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
    return !!(bid.sizes && bid.bidId && bid.params &&
                (bid.params.pix_id && (typeof bid.params.pix_id === 'string')));
  },

  buildRequests(validBidRequests, bidderRequest) {
    const tags = validBidRequests.map(bidToTag);
    const hostname = this.getHostname();
    return validBidRequests.map((bidRequest) => {
      let referer = '';
      if (bidderRequest && bidderRequest.refererInfo) {
        referer = bidderRequest.refererInfo.referer || '';
      }

      const userObjBid = find(validBidRequests, hasUserInfo);
      let userObj = {};
      if (config.getConfig('coppa') === true) {
        userObj = {'coppa': true};
      }

      if (userObjBid) {
        Object.keys(userObjBid.params.user)
          .filter(param => includes(USER_PARAMS, param))
          .forEach((param) => {
            let uparam = convertCamelToUnderscore(param);
            if (param === 'segments' && isArray(userObjBid.params.user[param])) {
              let segs = [];
              userObjBid.params.user[param].forEach(val => {
                if (isNumber(val)) {
                  segs.push({'id': val});
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

      const schain = validBidRequests[0].schain;

      const payload = {
        tags: [...tags],
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
        let refererinfo = {
          rd_ref: encodeURIComponent(bidderRequest.refererInfo.referer),
          rd_top: bidderRequest.refererInfo.reachedTop,
          rd_ifs: bidderRequest.refererInfo.numIframes,
          rd_stk: bidderRequest.refererInfo.stack.map((url) => encodeURIComponent(url)).join(',')
        };
        payload.referrer_detection = refererinfo;
      }

      if (validBidRequests[0].userId) {
        let eids = [];

        addUserId(eids, deepAccess(validBidRequests[0], `userId.flocId.id`), 'chrome.com', null);
        addUserId(eids, deepAccess(validBidRequests[0], `userId.criteoId`), 'criteo.com', null);
        addUserId(eids, deepAccess(validBidRequests[0], `userId.unifiedId`), 'thetradedesk.com', null);
        addUserId(eids, deepAccess(validBidRequests[0], `userId.id5Id`), 'id5.io', null);
        addUserId(eids, deepAccess(validBidRequests[0], `userId.sharedId`), 'thetradedesk.com', null);
        addUserId(eids, deepAccess(validBidRequests[0], `userId.identityLink`), 'liveramp.com', null);
        addUserId(eids, deepAccess(validBidRequests[0], `userId.liveIntentId`), 'liveintent.com', null);
        addUserId(eids, deepAccess(validBidRequests[0], `userId.fabrickId`), 'home.neustar', null);

        if (eids.length) {
          payload.eids = eids;
        }
      }

      if (tags[0].publisher_id) {
        payload.publisher_id = tags[0].publisher_id;
      }

      const ret = {
        url: `${hostname}/pixservices`,
        method: 'POST',
        options: {withCredentials: false},
        data: {
          v: $$PREBID_GLOBAL$$.version,
          pageUrl: referer,
          bidId: bidRequest.bidId,
          auctionId: bidRequest.auctionId,
          transactionId: bidRequest.transactionId,
          adUnitCode: bidRequest.adUnitCode,
          bidRequestCount: bidRequest.bidRequestCount,
          sizes: bidRequest.sizes,
          params: bidRequest.params,
          pubext: payload
        }
      };
      if (bidderRequest && bidderRequest.gdprConsent) {
        ret.data.gdprConsent = {
          consentString: bidderRequest.gdprConsent.consentString,
          consentRequired: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') && bidderRequest.gdprConsent.gdprApplies
        };
      }
      return ret;
    });
  },

  interpretResponse: function (serverResponse, { bidderRequest }) {
    serverResponse = serverResponse.body;
    const bids = [];
    if (serverResponse.creatives.bids && serverResponse.placements) {
      serverResponse.placements.forEach(serverBid => {
        serverBid.creatives.forEach(creative => {
          const bid = newBid(serverBid, creative, serverBid.placement_id, serverBid.uuid);
          bid.mediaType = BANNER;
          bids.push(bid);
        });
      });
    }

    return bids;
  },
  getUserSyncs: function (syncOptions, bid, gdprConsent) {
    var pixid = '';
    if (typeof bid[0] === 'undefined' || bid[0] === null) { pixid = '0'; } else { pixid = bid[0].body.pix_id; }
    if (syncOptions.iframeEnabled && hasPurpose1Consent({gdprConsent})) {
      return [{
        type: 'iframe',
        url: 'https://gosrv.pixfuture.com/cookiesync?adsync=' + gdprConsent.consentString + '&pixid=' + pixid + '&gdprconcent=' + gdprConsent.gdprApplies
      }];
    }
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

  Object.assign(bid, {
    width: rtbBid.width,
    height: rtbBid.height,
    ad: rtbBid.code
  });

  return bid;
}

function hasPurpose1Consent(bidderRequest) {
  let result = true;
  if (bidderRequest && bidderRequest.gdprConsent) {
    if (bidderRequest.gdprConsent.gdprApplies && bidderRequest.gdprConsent.apiVersion === 2) {
      result = !!(deepAccess(bidderRequest.gdprConsent, 'vendorData.purpose.consents.1') === true);
    }
  }
  return result;
}

// Functions related optional parameters
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
  tag.use_pmt_rule = bid.params.usePaymentRule || false
  tag.prebid = true;
  tag.disable_psa = true;
  let bidFloor = getBidFloor(bid);
  if (bidFloor) {
    tag.reserve = bidFloor;
  }
  if (bid.params.position) {
    tag.position = {'above': 1, 'below': 2}[bid.params.position] || 0;
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
  if (!isEmpty(bid.params.keywords)) {
    let keywords = transformBidderParamKeywords(bid.params.keywords);

    if (keywords.length > 0) {
      keywords.forEach(deleteValues);
    }
    tag.keywords = keywords;
  }

  let gpid = deepAccess(bid, 'ortb2Imp.ext.data.pbadslot');
  if (gpid) {
    tag.gpid = gpid;
  }

  if (bid.renderer) {
    tag.video = Object.assign({}, tag.video, {custom_renderer_present: true});
  }

  if (bid.params.frameworks && isArray(bid.params.frameworks)) {
    tag['banner_frameworks'] = bid.params.frameworks;
  }

  let adUnit = find(auctionManager.getAdUnits(), au => bid.transactionId === au.transactionId);
  if (adUnit && adUnit.mediaTypes && adUnit.mediaTypes.banner) {
    tag.ad_types.push(BANNER);
  }

  if (tag.ad_types.length === 0) {
    delete tag.ad_types;
  }

  return tag;
}

function addUserId(eids, id, source, rti) {
  if (id) {
    if (rti) {
      eids.push({source, id, rti_partner: rti});
    } else {
      eids.push({source, id});
    }
  }
  return eids;
}

function hasUserInfo(bid) {
  return !!bid.params.user;
}

function transformSizes(requestSizes) {
  let sizes = [];
  let sizeObj = {};

  if (isArray(requestSizes) && requestSizes.length === 2 &&
            !isArray(requestSizes[0])) {
    sizeObj.width = parseInt(requestSizes[0], 10);
    sizeObj.height = parseInt(requestSizes[1], 10);
    sizes.push(sizeObj);
  } else if (typeof requestSizes === 'object') {
    for (let i = 0; i < requestSizes.length; i++) {
      let size = requestSizes[i];
      sizeObj = {};
      sizeObj.width = parseInt(size[0], 10);
      sizeObj.height = parseInt(size[1], 10);
      sizes.push(sizeObj);
    }
  }

  return sizes;
}

function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return (bid.params.reserve) ? bid.params.reserve : null;
  }

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

function deleteValues(keyPairObj) {
  if (isPopulatedArray(keyPairObj.value) && keyPairObj.value[0] === '') {
    delete keyPairObj.value;
  }
}

function isPopulatedArray(arr) {
  return !!(isArray(arr) && arr.length > 0);
}

registerBidder(spec);
