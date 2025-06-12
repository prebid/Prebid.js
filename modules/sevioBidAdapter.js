import * as utils from "../src/utils.js";
import { registerBidder } from "../src/adapters/bidderFactory.js";
import { BANNER, NATIVE } from "../src/mediaTypes.js";
import { config } from "src/config.js";

const BIDDER_CODE = "sevio";
const GVLID = `1393`;
const ENDPOINT_URL = "https://work.targetblankdev.com/prebid"; //'http://localhost:3000/ad'; // 'https://req.adx.ws/ad';
const ACTION_METHOD = "POST";

const detectAdType = (bid) =>
  (
    ["native", "banner"].find((t) => bid.mediaTypes?.[t]) || "unknown"
  ).toUpperCase();

const detectWalletsPresence = function () {
  const _wallets = [
    "ethereum",
    "web3",
    "cardano",
    "BinanceChain",
    "solana",
    "tron",
    "tronLink",
    "tronWeb",
    "tronLink",
    "starknet_argentX",
    "walletLinkExtension",
    "coinbaseWalletExtension",
    "__venom",
    "martian",
    "razor",
    "razorWallet",
    "ic", // plug wallet,
    "cosmos",
    "ronin",
    "starknet_braavos",
    "XverseProviders",
    "compass",
    "solflare",
    "solflareWalletStandardInitialized",
    "sender",
    "rainbow",
  ];
  return _wallets.some((prop) => typeof window[prop] !== "undefined") ? 1 : 0;
};

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
      const size = bidRequest.mediaTypes.banner.sizes[0];
      const width = size[0];
      const height = size[1];
      const payload = {
        bidId: bidRequest.bidId,
        referrer: window.document.referrer,
        gdpr: gdpr?.gdprApplies === true ? 1 : 0,
        userAgent: navigator.userAgent,
        language: navigator.language,
        pageUrl: bidRequest?.refererInfo?.page,
        pageDomain: bidRequest?.refererInfo?.referer,
        topframe: bidderRequest?.refererInfo?.reachedTop,
        timestamp: Date.now(),
        sizes: bidRequest.sizes,
        mediaTypes: bidRequest.mediaTypes,
        userId: bidRequest.userId,
        eids: bidRequest.userIdAsEids,
        fpd: bidRequest.ortb2 || {},
        ads: [
          {
            maxSize: {
              width: width,
              height: height,
            },
            referenceId: bidRequest.params.referenceId,
            tagId: bidRequest.params.zone,
            type: detectAdType(bidRequest),
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
