import * as utils from "../src/utils.js";
import { detectWalletsPresence} from "../libraries/cryptoUtils/wallets.js";
import { registerBidder } from "../src/adapters/bidderFactory.js";
import { BANNER, NATIVE } from "../src/mediaTypes.js";
import { config } from "../src/config.js";

const BIDDER_CODE = "sevio";
const GVLID = `1393`;
const ENDPOINT_URL = "https://req.adx.ws/prebid";
const ACTION_METHOD = "POST";

const detectAdType = (bid) =>
  (
    ["native", "banner"].find((t) => bid.mediaTypes?.[t]) || "unknown"
  ).toUpperCase();

const parseNativeAd = function (bid) {
  try {
    const nativeAd = JSON.parse(bid.ad);
    const native = {};

    nativeAd.assets?.forEach(asset => {
      if (asset.title?.text) {
        native.title = asset.title.text;
      }
      if (asset.data) {
        const value = asset.data.value;
        switch (asset.data.type) {
          case 1: if (value) native.sponsored = value; break;
          case 2: if (value) native.desc = value; break;
          case 3: if (value) native.rating = value; break;
          case 4: if (value) native.likes = value; break;
          case 5: if (value) native.downloads = value; break;
          case 6: if (value) native.price = value; break;
          case 7: if (value) native.saleprice = value; break;
          case 8: if (value) native.phone = value; break;
          case 9: if (value) native.address = value; break;
          case 10: if (value) native.desc2 = value; break;
          case 11: if (value) native.displayurl = value; break;
          case 12: if (value) native.ctatext = value; break;
          default: break;
        }
      }
      if (asset.img) {
        const { url, w = 0, h = 0, type } = asset.img;

        if (type === 1 && url) {
          native.icon = url;
          native.icon_width = w;
          native.icon_height = h;
        } else if (type === 3 && url) {
          native.image = url;
          native.image_width = w;
          native.image_height = h;
        }
      }
    });

    if (nativeAd.link?.url) {
      native.clickUrl = nativeAd.link.url;
    }

    const eventTrackers = nativeAd.eventtrackers || [];

    const impressionTrackers = eventTrackers
      .filter(tracker => tracker.event === 1)
      .map(tracker => tracker.url)
      .filter(Boolean);

    const viewableTrackers = eventTrackers
      .filter(tracker => tracker.event === 2)
      .map(tracker => tracker.url)
      .filter(Boolean);

    if (impressionTrackers.length) {
      native.impressionTrackers = impressionTrackers;
    }

    if (viewableTrackers.length) {
      native.viewableTrackers = viewableTrackers; // custom field
    }

    if (Array.isArray(nativeAd.link?.clicktrackers) && nativeAd.link.clicktrackers.length > 0) {
      native.clickTrackers = nativeAd.link.clicktrackers;
    }

    if (nativeAd.privacy?.url) native.privacyLink = nativeAd.privacy.url;
    if (nativeAd.privacy?.icon) native.privacyIcon = nativeAd.privacy.icon;

    return native;
  } catch (e) {
    utils.logWarn('Invalid native JSON', e);
    return null;
  }
}
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  isBidRequestValid: function (bid) {
    if (!bid) {
      utils.logWarn(BIDDER_CODE, "Invalid bid", bid);

      return false;
    }

    if (!bid.params) {
      utils.logWarn(BIDDER_CODE, "bid.params is required");

      return false;
    }

    if (!bid.params.zone) {
      utils.logWarn(BIDDER_CODE, "bid.params.zone is required");

      return false;
    }

    return true;
  },

  buildRequests: function (bidRequests, bidderRequest) {
    const userSyncEnabled = config.getConfig("userSync.syncEnabled");

    if (bidRequests.length === 0) {
      return [];
    }
    const gdpr = bidderRequest.gdprConsent;
    const usp = bidderRequest.uspConsent;
    const gpp = bidderRequest.gppConsent;
    const hasWallet = detectWalletsPresence();

    return bidRequests.map((bidRequest) => {
      const isNative = detectAdType(bidRequest)?.toLowerCase() === 'native';
      const size = bidRequest.mediaTypes?.banner?.sizes[0] || bidRequest.mediaTypes?.native?.sizes[0] || [];
      const width = size[0];
      const height = size[1];
      const originalAssets = bidRequest.mediaTypes?.native?.ortb?.assets || [];
      // convert icon to img type 1
      const processedAssets = originalAssets.map(asset => {
        if (asset.icon) {
          return {
            id: asset.id,
            required: asset.required || 0,
            img: {
              type: 1,
              w: asset.icon.w,
              h: asset.icon.h,
            }
          };
        }
        return asset;
      });
      const payload = {
        userLanguage: navigator.language,
        pageUrl: bidRequest?.refererInfo?.page,
        pageDomain: bidRequest?.refererInfo?.referer,
        userId: bidRequest.userId,
        eids: (bidRequest.userIdAsEids || []).map(eid => ({
          source: eid.source,
          id: eid.uids?.[0]?.id
        })).filter(eid => eid.source && eid.id),
        ads: [
          {
            maxSize: {
              width: width,
              height: height,
            },
            referenceId: bidRequest.params.referenceId,
            tagId: bidRequest.params.zone,
            type: detectAdType(bidRequest),
            ...(isNative && { nativeRequest: { ver: "1.2", assets: processedAssets || {}} })
          },
        ],
        keywords: { tokens: bidRequest.params?.keywords || [] },
        privacy: {
          gpp: gpp?.consentString || "",
          tcfeu: gdpr?.consentString || "",
          usp: usp?.uspString || "",
        },
        xPageUrl: window.location.href,
        wdb: hasWallet,
        externalRef: bidRequest.bidId,
        userSyncOption: userSyncEnabled === false ? "OFF" : "BIDDERS",
      };

      return {
        method: ACTION_METHOD,
        url: ENDPOINT_URL,
        data: payload,
        bidRequest: bidRequests[0],
      };
    });
  },

  interpretResponse(serverResponse) {
    if (
      !serverResponse ||
      typeof serverResponse !== "object" ||
      !serverResponse.body ||
      typeof serverResponse.body !== "object" ||
      !Array.isArray(serverResponse.body.bids)
    ) {
      return [];
    }

    const bids = serverResponse.body.bids;

    bids.forEach((bid) => {
      if (bid && typeof bid === "object") {
        bid.bidder = BIDDER_CODE;
        if ((bid.mediaType || '').toLowerCase() === 'native') {
          const native = parseNativeAd(bid);
          if (native) {
            bid.native = native;
          }
        }
      }
    });

    return bids;
  },
  onBidWon: function (bid) {},
  onBidderError: function (bidderError) {},
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];

    if (syncOptions.pixelEnabled && serverResponses.length > 0) {
      serverResponses.forEach((response) => {
        if (response.body && response.body.userSyncs) {
          response.body.userSyncs.forEach((sync) => {
            if (sync.type === "image" && sync.url) {
              syncs.push({
                type: "image",
                url: sync.url,
              });
            } else if (sync.type === "iframe" && syncOptions.iframeEnabled) {
              syncs.push({
                type: "iframe",
                url: sync.url,
              });
            }
          });
        }
      });
    }

    return syncs;
  },
  onTimeout: function (timeoutData) {},
  supportedMediaTypes: [BANNER, NATIVE],
};

registerBidder(spec);
