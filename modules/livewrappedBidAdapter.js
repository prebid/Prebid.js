import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import find from 'core-js/library/fn/array/find.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';

export const storage = getStorageManager();

const BIDDER_CODE = 'livewrapped';
export const URL = 'https://lwadm.com/ad';
const VERSION = '1.3';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],

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
    bidUrl = bidUrl ? bidUrl.params.bidUrl : URL;
    url = url ? url.params.url : (getAppDomain() || getTopWindowLocation(bidderRequest));
    test = test ? test.params.test : undefined;
    var adRequests = bidRequests.map(bidToAdRequest);

    const payload = {
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
      cookieSupport: !utils.isSafariBrowser() && storage.cookiesAreEnabled(),
      rcv: getAdblockerRecovered(),
      adRequests: [...adRequests],
      rtbData: handleEids(bidRequests)
    };
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

    serverResponse.body.ads.forEach(function(ad) {
      var bidResponse = {
        requestId: ad.bidId,
        bidderCode: BIDDER_CODE,
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
        bidResponse.mediaType = NATIVE
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

function bidToAdRequest(bid) {
  var adRequest = {
    adUnitId: bid.params.adUnitId,
    callerAdUnitId: bid.params.adUnitName || bid.adUnitCode || bid.placementCode,
    bidId: bid.bidId,
    transactionId: bid.transactionId,
    formats: getSizes(bid).map(sizeToFormat),
    options: bid.params.options
  };

  adRequest.native = utils.deepAccess(bid, 'mediaTypes.native');

  if (adRequest.native && utils.deepAccess(bid, 'mediaTypes.banner')) {
    adRequest.banner = true;
  }

  return adRequest;
}

function getSizes(bid) {
  if (utils.deepAccess(bid, 'mediaTypes.banner.sizes')) {
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

function getAdblockerRecovered() {
  try {
    return utils.getWindowTop().I12C && utils.getWindowTop().I12C.Morph === 1;
  } catch (e) {}
}

function AddExternalUserId(eids, value, source, atype, rtiPartner) {
  if (utils.isStr(value)) {
    var eid = {
      source,
      uids: [{
        id: value,
        atype
      }]
    };

    if (rtiPartner) {
      eid.uids[0] = {ext: {rtiPartner}};
    }

    eids.push(eid);
  }
}

function handleEids(bidRequests) {
  let eids = [];
  const bidRequest = bidRequests[0];
  if (bidRequest && bidRequest.userId) {
    AddExternalUserId(eids, utils.deepAccess(bidRequest, `userId.pubcid`), 'pubcommon', 1); // Also add this to eids
    AddExternalUserId(eids, utils.deepAccess(bidRequest, `userId.id5id`), 'id5-sync.com', 1);
  }
  if (eids.length > 0) {
    return {user: {ext: {eids}}};
  }

  return undefined;
}

function getTopWindowLocation(bidderRequest) {
  let url = bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.referer;
  return config.getConfig('pageUrl') || url;
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
  let device = config.getConfig('device');
  if (typeof device === 'object' && device.width) {
    return device.width;
  }

  return window.innerWidth;
}

function getDeviceHeight() {
  let device = config.getConfig('device');
  if (typeof device === 'object' && device.height) {
    return device.height;
  }

  return window.innerHeight;
}

registerBidder(spec);
