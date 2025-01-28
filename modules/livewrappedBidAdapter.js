import {deepAccess, getWindowTop, isSafariBrowser, mergeDeep, isFn, isPlainObject} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {find} from '../src/polyfill.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'livewrapped';
export const storage = getStorageManager({bidderCode: BIDDER_CODE});
export const URL = 'https://lwadm.com/ad';
const VERSION = '1.4';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],
  gvlid: 919,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * Parameters should be
   *
   * adUnitId:    LiveWrapped's id of the ad unit.    Optional. A guid identifying the ad unit.
   * adUnitName:  LiveWrapped's name of the ad unit   Optional. (Prebid's ad unit code will be used otherwise.)
   * publisherId: Publisher id.                       Required if adUnitName is used or both adUnitName and adUnitId is omitted, otherwise optional.
   * userId:      A persistent user id if available.  Optional.
   * url:         Page url                            Optional. Use if page url cannot be determined due to use of iframes.
   * bidUrl:      Bidding endpoint                    Optional.
   * seats:       List of bidders and seats           Optional. {"bidder name": ["seat 1", "seat 2"], ...}
   * deviceId:    Device id if available              Optional.
   * ifa:         Advertising ID                      Optional.
   * bundle:      App bundle                          Optional. Read from config if exists.
   * options      Dynamic data                        Optional. Optional data to send into adapter.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return (bid.params.adUnitId || ((bid.params.adUnitName || bid.adUnitCode || bid.placementCode) && bid.params.publisherId)) !== undefined;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests, bidderRequest) {
    const userId = find(bidRequests, hasUserId);
    const pubcid = find(bidRequests, hasPubcid);
    const publisherId = find(bidRequests, hasPublisherId);
    const auctionId = find(bidRequests, hasAuctionId);
    let bidUrl = find(bidRequests, hasBidUrl);
    let url = find(bidRequests, hasUrl);
    let test = find(bidRequests, hasTestParam);
    const seats = find(bidRequests, hasSeatsParam);
    const deviceId = find(bidRequests, hasDeviceIdParam);
    const ifa = find(bidRequests, hasIfaParam);
    const bundle = find(bidRequests, hasBundleParam);
    const tid = find(bidRequests, hasTidParam);
    const schain = bidRequests[0].schain;
    let ortb2 = bidderRequest.ortb2;
    const eids = handleEids(bidRequests);
    bidUrl = bidUrl ? bidUrl.params.bidUrl : URL;
    url = url ? url.params.url : (getAppDomain() || getTopWindowLocation(bidderRequest));
    test = test ? test.params.test : undefined;
    const currency = config.getConfig('currency.adServerCurrency') || 'USD';
    var adRequests = bidRequests.map(b => bidToAdRequest(b, currency));
    const adRequestsContainFloors = adRequests.some(r => r.flr !== undefined);

    if (eids) {
      ortb2 = mergeDeep(mergeDeep({}, ortb2 || {}), eids);
    }

    const payload = {
      // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
      auctionId: auctionId ? auctionId.auctionId : undefined,
      publisherId: publisherId ? publisherId.params.publisherId : undefined,
      userId: userId ? userId.params.userId : (pubcid ? pubcid.crumbs.pubcid : undefined),
      url: url,
      test: test,
      seats: seats ? seats.params.seats : undefined,
      deviceId: deviceId ? deviceId.params.deviceId : undefined,
      ifa: ifa ? ifa.params.ifa : getDeviceIfa(),
      bundle: bundle ? bundle.params.bundle : getAppBundle(),
      width: getDeviceWidth(),
      height: getDeviceHeight(),
      tid: tid ? tid.params.tid : undefined,
      version: VERSION,
      gdprApplies: bidderRequest.gdprConsent ? bidderRequest.gdprConsent.gdprApplies : undefined,
      gdprConsent: bidderRequest.gdprConsent ? bidderRequest.gdprConsent.consentString : undefined,
      coppa: getCoppa(),
      usPrivacy: bidderRequest.uspConsent,
      cookieSupport: !isSafariBrowser() && storage.cookiesAreEnabled(),
      rcv: getAdblockerRecovered(),
      adRequests: [...adRequests],
      rtbData: ortb2,
      schain: schain,
      flrCur: adRequestsContainFloors ? currency : undefined
    };

    if (config.getConfig().debug) {
      payload.dbg = true;
    }

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: bidUrl,
      data: payloadString,
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse) {
    const bidResponses = [];

    if (serverResponse.body.dbg && window.livewrapped && window.livewrapped.s2sDebug) {
      window.livewrapped.s2sDebug(serverResponse.body.dbg);
    }

    serverResponse.body.ads.forEach(function(ad) {
      var bidResponse = {
        requestId: ad.bidId,
        cpm: ad.cpmBid,
        width: ad.width,
        height: ad.height,
        ad: ad.tag,
        ttl: ad.ttl,
        creativeId: ad.creativeId,
        netRevenue: true,
        currency: serverResponse.body.currency,
        meta: ad.meta
      };

      if (ad.native) {
        bidResponse.native = ad.native;
        bidResponse.mediaType = NATIVE;
      }

      if (ad.video) {
        bidResponse.mediaType = VIDEO;
        bidResponse.vastXml = ad.tag;
      }

      bidResponses.push(bidResponse);
    });

    return bidResponses;
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    if (serverResponses.length == 0) return [];

    let syncList = [];
    let userSync = serverResponses[0].body.pixels || [];

    userSync.forEach(function(sync) {
      if (syncOptions.pixelEnabled && sync.type == 'Redirect') {
        syncList.push({type: 'image', url: sync.url});
      }

      if (syncOptions.iframeEnabled && sync.type == 'Iframe') {
        syncList.push({type: 'iframe', url: sync.url});
      }
    });

    return syncList;
  }
}

function hasUserId(bid) {
  return !!bid.params.userId;
}

function hasPublisherId(bid) {
  return !!bid.params.publisherId;
}

function hasUrl(bid) {
  return !!bid.params.url;
}

function hasBidUrl(bid) {
  return !!bid.params.bidUrl;
}

function hasAuctionId(bid) {
  return !!bid.auctionId;
}

function hasTestParam(bid) {
  return !!bid.params.test;
}

function hasSeatsParam(bid) {
  return !!bid.params.seats;
}

function hasDeviceIdParam(bid) {
  return !!bid.params.deviceId;
}

function hasIfaParam(bid) {
  return !!bid.params.ifa;
}

function hasBundleParam(bid) {
  return !!bid.params.bundle;
}

function hasTidParam(bid) {
  return !!bid.params.tid;
}

function hasPubcid(bid) {
  return !!bid.crumbs && !!bid.crumbs.pubcid;
}

function bidToAdRequest(bid, currency) {
  var adRequest = {
    adUnitId: bid.params.adUnitId,
    callerAdUnitId: bid.params.adUnitName || bid.adUnitCode || bid.placementCode,
    bidId: bid.bidId,
    formats: getSizes(bid).map(sizeToFormat),
    flr: getBidFloor(bid, currency),
    rtbData: bid.ortb2Imp,
    options: bid.params.options
  };

  if (bid.auc !== undefined) {
    adRequest.auc = bid.auc;
  }

  adRequest.native = deepAccess(bid, 'mediaTypes.native');

  adRequest.video = deepAccess(bid, 'mediaTypes.video');

  if ((adRequest.native || adRequest.video) && deepAccess(bid, 'mediaTypes.banner')) {
    adRequest.banner = true;
  }

  return adRequest;
}

function getSizes(bid) {
  if (deepAccess(bid, 'mediaTypes.banner.sizes')) {
    return bid.mediaTypes.banner.sizes;
  } else if (Array.isArray(bid.sizes) && bid.sizes.length > 0) {
    return bid.sizes;
  }
  return [];
}

function sizeToFormat(size) {
  return {
    width: size[0],
    height: size[1]
  }
}

function getBidFloor(bid, currency) {
  if (!isFn(bid.getFloor)) {
    return undefined;
  }

  const floor = bid.getFloor({
    currency: currency,
    mediaType: '*',
    size: '*'
  });

  return isPlainObject(floor) && !isNaN(floor.floor) && floor.currency == currency
    ? floor.floor
    : undefined;
}

function getAdblockerRecovered() {
  try {
    return getWindowTop().I12C && getWindowTop().I12C.Morph === 1;
  } catch (e) {}
}

function handleEids(bidRequests) {
  const bidRequest = bidRequests[0];
  if (bidRequest && bidRequest.userIdAsEids) {
    return {user: {ext: {eids: bidRequest.userIdAsEids}}};
  }

  return undefined;
}

function getTopWindowLocation(bidderRequest) {
  return bidderRequest?.refererInfo?.page;
}

function getAppBundle() {
  if (typeof config.getConfig('app') === 'object') {
    return config.getConfig('app').bundle;
  }
}

function getAppDomain() {
  if (typeof config.getConfig('app') === 'object') {
    return config.getConfig('app').domain;
  }
}

function getDeviceIfa() {
  if (typeof config.getConfig('device') === 'object') {
    return config.getConfig('device').ifa;
  }
}

function getDeviceWidth() {
  const device = config.getConfig('device') || {};
  return device.w || window.innerWidth;
}

function getDeviceHeight() {
  const device = config.getConfig('device') || {};
  return device.h || window.innerHeight;
}

function getCoppa() {
  if (typeof config.getConfig('coppa') === 'boolean') {
    return config.getConfig('coppa');
  }
}
registerBidder(spec);
