import {
  deepAccess,
  mergeDeep,
  logError,
  replaceMacros,
  triggerPixel,
  deepSetValue,
  isStr,
  isArray,
  getWinDimensions,
} from "../src/utils.js";
import { registerBidder } from "../src/adapters/bidderFactory.js";
import { config } from "../src/config.js";
import { VIDEO, BANNER } from "../src/mediaTypes.js";
import { getConnectionType } from "../libraries/connectionInfo/connectionUtils.js";

export const ENDPOINT = "https://bid.virgul.com/prebid";

const BIDDER_CODE = "empower";
const GVLID = 1248;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [VIDEO, BANNER],

  isBidRequestValid: (bid) =>
    !!(bid && bid.params && bid.params.zone && bid.bidder === BIDDER_CODE),

  buildRequests: (bidRequests, bidderRequest) => {
    const currencyObj = config.getConfig("currency");
    const currency = (currencyObj && currencyObj.adServerCurrency) || "USD";

    const request = {
      id: bidRequests[0].bidderRequestId,
      at: 1,
      imp: bidRequests.map((slot) => impression(slot, currency)),
      site: {
        page: bidderRequest.refererInfo.page,
        domain: bidderRequest.refererInfo.domain,
        ref: bidderRequest.refererInfo.ref,
        publisher: { domain: bidderRequest.refererInfo.domain },
      },
      device: {
        ua: navigator.userAgent,
        js: 1,
        dnt:
          navigator.doNotTrack === "yes" ||
          navigator.doNotTrack === "1" ||
          navigator.msDoNotTrack === "1"
            ? 1
            : 0,
        h: screen.height,
        w: screen.width,
        language: navigator.language,
        connectiontype: getConnectionType(),
      },
      cur: [currency],
      source: {
        fd: 1,
        tid: bidderRequest.ortb2?.source?.tid,
        ext: {
          prebid: "$prebid.version$",
        },
      },
      user: {},
      regs: {},
      ext: {},
    };

    if (bidderRequest.gdprConsent) {
      request.user = {
        ext: {
          consent: bidderRequest.gdprConsent.consentString || "",
        },
      };
      request.regs = {
        ext: {
          gdpr:
            bidderRequest.gdprConsent.gdprApplies !== undefined
              ? bidderRequest.gdprConsent.gdprApplies
              : true,
        },
      };
    }

    if (bidderRequest.ortb2?.source?.ext?.schain) {
      request.schain = bidderRequest.ortb2.source.ext.schain;
    }

    let bidUserIdAsEids = deepAccess(bidRequests, "0.userIdAsEids");
    if (isArray(bidUserIdAsEids) && bidUserIdAsEids.length > 0) {
      deepSetValue(request, "user.eids", bidUserIdAsEids);
    }

    const commonFpd = bidderRequest.ortb2 || {};
    const { user, device, site, bcat, badv } = commonFpd;
    if (site) {
      mergeDeep(request, { site: site });
    }
    if (user) {
      mergeDeep(request, { user: user });
    }
    if (badv) {
      mergeDeep(request, { badv: badv });
    }
    if (bcat) {
      mergeDeep(request, { bcat: bcat });
    }

    if (user?.geo && device?.geo) {
      request.device.geo = { ...request.device.geo, ...device.geo };
      request.user.geo = { ...request.user.geo, ...user.geo };
    } else {
      if (user?.geo || device?.geo) {
        request.user.geo = request.device.geo = user?.geo
          ? { ...request.user.geo, ...user.geo }
          : { ...request.user.geo, ...device.geo };
      }
    }

    if (bidderRequest.ortb2?.device) {
      mergeDeep(request.device, bidderRequest.ortb2.device);
    }

    return {
      method: "POST",
      url: ENDPOINT,
      data: JSON.stringify(request),
    };
  },

  interpretResponse: (bidResponse, bidRequest) => {
    const idToImpMap = {};
    const idToBidMap = {};

    if (!bidResponse["body"]) {
      return [];
    }
    if (!bidRequest.data) {
      return [];
    }
    const requestImps = parse(bidRequest.data);
    if (!requestImps) {
      return [];
    }
    requestImps.imp.forEach((imp) => {
      idToImpMap[imp.id] = imp;
    });
    bidResponse = bidResponse.body;
    if (bidResponse) {
      bidResponse.seatbid.forEach((seatBid) =>
        seatBid.bid.forEach((bid) => {
          idToBidMap[bid.impid] = bid;
        })
      );
    }
    const bids = [];
    Object.keys(idToImpMap).forEach((id) => {
      const imp = idToImpMap[id];
      const result = idToBidMap[id];

      if (result) {
        const bid = {
          requestId: id,
          cpm: result.price,
          creativeId: result.crid,
          ttl: 300,
          netRevenue: true,
          mediaType: imp.video ? VIDEO : BANNER,
          currency: bidResponse.cur,
        };
        if (imp.video) {
          bid.vastXml = result.adm;
        } else if (imp.banner) {
          bid.ad = result.adm;
        }
        bid.width = result.w;
        bid.height = result.h;
        if (result.burl) bid.burl = result.burl;
        if (result.nurl) bid.nurl = result.nurl;
        if (result.adomain) {
          bid.meta = {
            advertiserDomains: result.adomain,
          };
        }
        bids.push(bid);
      }
    });
    return bids;
  },

  onBidWon: (bid) => {
    if (bid.nurl && isStr(bid.nurl)) {
      bid.nurl = replaceMacros(bid.nurl, {
        AUCTION_PRICE: bid.cpm,
        AUCTION_CURRENCY: bid.cur,
      });
      triggerPixel(bid.nurl);
    }
  },
};

function impression(slot, currency) {
  let bidFloorFromModule;
  if (typeof slot.getFloor === "function") {
    const floorInfo = slot.getFloor({
      currency: "USD",
      mediaType: "*",
      size: "*",
    });
    bidFloorFromModule =
      floorInfo?.currency === "USD" ? floorInfo?.floor : undefined;
  }
  const imp = {
    id: slot.bidId,
    bidfloor: bidFloorFromModule || slot.params.bidfloor || 0,
    bidfloorcur:
      (bidFloorFromModule && "USD") ||
      slot.params.bidfloorcur ||
      currency ||
      "USD",
    tagid: "" + (slot.params.zone || ""),
  };

  if (slot.mediaTypes.banner) {
    imp.banner = bannerImpression(slot);
  } else if (slot.mediaTypes.video) {
    imp.video = deepAccess(slot, "mediaTypes.video");
  }
  imp.ext = slot.params || {};
  const { innerWidth, innerHeight } = getWinDimensions();
  imp.ext.ww = innerWidth || "";
  imp.ext.wh = innerHeight || "";
  return imp;
}

function bannerImpression(slot) {
  const sizes = slot.mediaTypes.banner.sizes || slot.sizes;
  return {
    format: sizes.map((s) => ({ w: s[0], h: s[1] })),
    w: sizes[0][0],
    h: sizes[0][1],
  };
}

function parse(rawResponse) {
  try {
    if (rawResponse) {
      if (typeof rawResponse === "object") {
        return rawResponse;
      } else {
        return JSON.parse(rawResponse);
      }
    }
  } catch (ex) {
    logError("empowerBidAdapter", "ERROR", ex);
  }
  return null;
}

registerBidder(spec);
