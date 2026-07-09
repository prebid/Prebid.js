import { _each, deepAccess, deepSetValue, isEmpty, isFn, isPlainObject } from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { isAutoplayEnabled } from '../libraries/autoplayDetection/autoplay.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const BIDDER_CODE = 'fluct';
const END_POINT = 'https://hb.adingo.jp/prebid/';
const VERSION = '1.8';
const NET_REVENUE = true;
const TTL = 300;
const DEFAULT_CURRENCY = 'JPY';

/**
 * Get bid floor price for a specific size
 * @param {BidRequest} bid
 * @param {Array} size - [width, height]
 * @returns {{floor: number, currency: string}|null} floor price data
 */
function getBidFloorForSize(bid, size) {
  if (!isFn(bid.getFloor)) {
    return null;
  }

  const floorInfo = bid.getFloor({
    currency: DEFAULT_CURRENCY,
    mediaType: '*',
    size: size
  });

  if (isPlainObject(floorInfo) && !isNaN(floorInfo.floor) && floorInfo.currency === DEFAULT_CURRENCY) {
    return {
      floor: floorInfo.floor,
      currency: floorInfo.currency
    };
  }

  return null;
}

/**
 * Get the highest bid floor price across all sizes
 * @param {BidRequest} bid
 * @returns {{floor: number, currency: string}|null} floor price data
 */
function getHighestBidFloor(bid) {
  const sizes = bid.sizes || [];
  let highestFloor = 0;
  let floorCurrency = DEFAULT_CURRENCY;

  if (sizes.length > 0) {
    sizes.forEach(size => {
      const floorData = getBidFloorForSize(bid, size);
      if (floorData && floorData.floor > highestFloor) {
        highestFloor = floorData.floor;
        floorCurrency = floorData.currency;
      }
    });

    if (highestFloor > 0) {
      return {
        floor: highestFloor,
        currency: floorCurrency
      };
    }
  }

  // Final fallback: use params.bidfloor if available
  if (bid.params.bidfloor) {
    // Check currency if specified - only JPY is supported
    if (bid.params.currency && bid.params.currency !== DEFAULT_CURRENCY) {
      return null;
    }
    const floorValue = parseFloat(bid.params.bidfloor);
    if (isNaN(floorValue)) {
      return null;
    }
    return {
      floor: floorValue,
      currency: DEFAULT_CURRENCY
    };
  }

  return null;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['adingo'],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    return !!(bid.params.groupId && bid.params.tagId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests} validBidRequests an array of bids.
   * @param {BidderRequest} bidderRequest bidder request object.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    const serverRequests = [];
    const page = bidderRequest.refererInfo.page;
    const wrapperName = config.getConfig('fluct')?.wrapperName;
    // The device autoplay capability is constant for this auction, so detect it
    // once and reuse it for every bid request.
    const autoplay = isAutoplayEnabled() ? 1 : 0;

    _each(validBidRequests, (request) => {
      const impExt = request.ortb2Imp?.ext;
      const data = {};

      data.page = page;
      data.adapterVersion = VERSION;
      if (wrapperName) data.wrapperName = wrapperName;

      const ortb2Site = bidderRequest.ortb2?.site;
      if (ortb2Site) {
        data.site = {};
        if (ortb2Site.name) data.site.name = ortb2Site.name;
        if (ortb2Site.cat) data.site.cat = ortb2Site.cat;
        if (ortb2Site.sectioncat) data.site.sectioncat = ortb2Site.sectioncat;
        if (ortb2Site.pagecat) data.site.pagecat = ortb2Site.pagecat;
        if (ortb2Site.keywords) data.site.keywords = ortb2Site.keywords;
        if (ortb2Site.content) data.site.content = ortb2Site.content;
        if (ortb2Site.domain) data.site.domain = ortb2Site.domain;
        if (ortb2Site.ref) data.site.ref = ortb2Site.ref;
        if (ortb2Site.search) data.site.search = ortb2Site.search;
        if (ortb2Site.publisher) {
          data.site.publisher = {};
          if (ortb2Site.publisher.id) data.site.publisher.id = ortb2Site.publisher.id;
          if (ortb2Site.publisher.domain) data.site.publisher.domain = ortb2Site.publisher.domain;
        }
        if (ortb2Site.ext?.data) data.site.ext = { data: ortb2Site.ext.data };
      }

      data.adUnitCode = request.adUnitCode;
      data.bidId = request.bidId;
      const ortb2User = bidderRequest.ortb2?.user;
      data.user = {
        data: ortb2User?.data ?? [],
        eids: [
          ...(request.userIdAsEids ?? []),
          ...(ortb2User?.ext?.eids ?? []),
        ],
      };
      if (ortb2User?.yob != null) data.user.yob = ortb2User.yob;
      if (ortb2User?.gender != null) data.user.gender = ortb2User.gender;
      if (ortb2User?.keywords) data.user.keywords = ortb2User.keywords;
      if (ortb2User?.ext?.data) data.user.ext = { data: ortb2User.ext.data };

      if (impExt) {
        data.transactionId = impExt.tid;
        data.gpid = impExt.gpid ?? impExt.data?.adserver?.adslot;
        if (impExt.data) {
          deepSetValue(data, 'imp.ext.data', impExt.data);
        }
      }
      if (bidderRequest.gdprConsent) {
        deepSetValue(data, 'regs.gdpr', {
          consent: bidderRequest.gdprConsent.consentString,
          gdprApplies: bidderRequest.gdprConsent.gdprApplies ? 1 : 0,
        });
      }
      if (bidderRequest.uspConsent) {
        deepSetValue(data, 'regs.us_privacy', {
          consent: bidderRequest.uspConsent,
        });
      }
      if (config.getConfig('coppa') === true) {
        deepSetValue(data, 'regs.coppa', 1);
      }
      if (bidderRequest.gppConsent) {
        deepSetValue(data, 'regs.gpp', {
          string: bidderRequest.gppConsent.gppString,
          sid: bidderRequest.gppConsent.applicableSections
        });
      } else if (bidderRequest.ortb2?.regs?.gpp) {
        deepSetValue(data, 'regs.gpp', {
          string: bidderRequest.ortb2.regs.gpp,
          sid: bidderRequest.ortb2.regs.gpp_sid
        });
      }
      if (bidderRequest.ortb2?.regs?.ext?.dsa) {
        deepSetValue(data, 'regs.ext.dsa', bidderRequest.ortb2.regs.ext.dsa);
      }
      if (bidderRequest.ortb2?.regs?.ext?.gpc != null) {
        deepSetValue(data, 'regs.ext.gpc', bidderRequest.ortb2.regs.ext.gpc);
      }
      if (bidderRequest.refererInfo?.canonicalUrl) data.canonicalUrl = bidderRequest.refererInfo.canonicalUrl;
      if (bidderRequest.refererInfo?.isAmp) data.isAmp = true;
      if (bidderRequest.refererInfo?.reachedTop != null) data.reachedTop = bidderRequest.refererInfo.reachedTop;
      if (bidderRequest.refererInfo?.numIframes != null) data.numIframes = bidderRequest.refererInfo.numIframes;
      if (bidderRequest.timeout != null) data.timeout = bidderRequest.timeout;
      if (bidderRequest.ortb2?.source?.tid) deepSetValue(data, 'source.tid', bidderRequest.ortb2.source.tid);
      if (bidderRequest.ortb2?.user?.ext?.data?.im_segments) {
        deepSetValue(data, 'params.kv.imsids', bidderRequest.ortb2.user.ext.data.im_segments);
      }
      data.sizes = [];
      _each(request.sizes, (size) => {
        const sizeObj = {
          w: size[0],
          h: size[1]
        };

        // Get floor price for this specific size
        const floorData = getBidFloorForSize(request, size);
        if (floorData) {
          sizeObj.ext = {
            floor: floorData.floor
          };
        }

        data.sizes.push(sizeObj);
      });

      data.params = request.params;

      const schain = request?.ortb2?.source?.ext?.schain;
      if (schain) {
        data.schain = schain;
      }

      data.instl = deepAccess(request, 'ortb2Imp.instl') === 1 || request.params.instl === 1 ? 1 : 0;

      if (deepAccess(request, 'ortb2Imp.rwdd') === 1) data.rwdd = 1;

      const pos = deepAccess(request, 'mediaTypes.banner.pos') ?? deepAccess(request, 'ortb2Imp.ext.data.pos');
      if (pos != null) data.pos = pos;

      // Forward the device autoplay capability as a raw signal so the bidder can
      // avoid autoplay-dependent (e.g. video) inventory when autoplay is blocked.
      data.autoplay = autoplay;

      const ortb2Device = bidderRequest.ortb2?.device;
      if (ortb2Device) {
        data.device = {};
        if (ortb2Device.sua) data.device.sua = ortb2Device.sua;
        if (ortb2Device.ua) data.device.ua = ortb2Device.ua;
        if (ortb2Device.w) data.device.w = ortb2Device.w;
        if (ortb2Device.h) data.device.h = ortb2Device.h;
        if (ortb2Device.language) data.device.language = ortb2Device.language;
        if (ortb2Device.devicetype) data.device.devicetype = ortb2Device.devicetype;
        const vpw = ortb2Device.ext?.vpw;
        const vph = ortb2Device.ext?.vph;
        if (vpw != null || vph != null) {
          data.device.ext = {};
          if (vpw != null) data.device.ext.vpw = vpw;
          if (vph != null) data.device.ext.vph = vph;
        }
      }

      // Set top-level bidfloor to the highest floor across all sizes
      const highestFloorData = getHighestBidFloor(request);
      if (highestFloorData) {
        data.bidfloor = highestFloorData.floor;
        data.bidfloorcur = highestFloorData.currency;
      }

      const searchParams = new URLSearchParams({
        dfpUnitCode: request.params.dfpUnitCode,
        tagId: request.params.tagId,
        groupId: request.params.groupId,
      });

      serverRequests.push({
        method: 'POST',
        url: END_POINT + '?' + searchParams.toString(),
        options: {
          withCredentials: true,
        },
        data: data
      });
    });

    return serverRequests;
  },

  /*
   * Unpack the respnse from the server into a list of bids.
   *
   * @param {serverResponse} serverResponse A successful response from the server.
   * @return {bid[]} An array of bids which weer nested inside the server.
   */
  interpretResponse: (serverResponse, serverRequest) => {
    const bidResponses = [];

    const res = serverResponse.body;
    if (!isEmpty(res) && !isEmpty(res.seatbid) && !isEmpty(res.seatbid[0].bid)) {
      const bid = res.seatbid[0].bid[0];
      const dealId = bid.dealid;
      const beaconUrl = bid.burl;
      const callImpBeacon = `<script type="application/javascript">` +
        `(function() { var img = new Image(); img.src = "${beaconUrl}"})()` +
        `</script>`;
      const data = {
        requestId: res.id,
        currency: res.cur,
        cpm: parseFloat(bid.price) || 0,
        netRevenue: NET_REVENUE,
        width: bid.w,
        height: bid.h,
        creativeId: bid.crid,
        ttl: TTL,
        ad: bid.adm + callImpBeacon,
        meta: {
          advertiserDomains: bid.adomain || [],
        },
      };
      if (!isEmpty(dealId)) {
        data.dealId = dealId;
      }
      bidResponses.push(data);
    }
    return bidResponses;
  },

  /*
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @params {syncOptions} syncOptions which user syncs are allowed?
   * @params {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   *
   */
  getUserSyncs: (syncOptions, serverResponses) => {
    // gdpr, us_privacy, and coppa params to be handled on the server end.
    const usersyncs = serverResponses.reduce((acc, serverResponse) => [
      ...acc,
      ...(serverResponse.body.usersyncs ?? []),
    ], []);
    const syncs = usersyncs.filter(
      (sync) => (
        (sync['type'] === 'image' && syncOptions.pixelEnabled) ||
        (sync['type'] === 'iframe' && syncOptions.iframeEnabled)
      )
    ).map((sync) => ({
      type: sync.type,
      url: sync.url,
    }));
    return syncs;
  }
};

registerBidder(spec);
