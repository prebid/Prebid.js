// HUBVISOR
import { registerBidder } from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import { Renderer } from '../src/Renderer.js';

const HUBVISOR_ENDPOINT = "https://relay.hubvisor.io/v1/bid";
const HUBVISOR_PLAYER_URL = "https://cdn.hubvisor.io/wrapper/common/player.js";
const VERSION = '1.0.0';

const videoParams = {};

const pageViewId = utils.generateUUID();

const _container = (containerOrSelector) => {
  if (utils.isStr(containerOrSelector)) {
    const container = document.querySelector(containerOrSelector);
    if (container) {
      return container;
    }
    return utils.logError(
      "Player container not found for selector " + containerOrSelector
    );
  }
  return containerOrSelector;
};

const playOutstream = (containerOrSelector, options) => {
  const container = _container(containerOrSelector);

  if (!window.HbvPlayer) {
    return utils.logError("Failed to load player!");
  }
  window.HbvPlayer.playOutstream(container, options);
};

const getSelector = (config, bid) => {
  if (config.selector) {
    return config.selector;
  }
  if (window.CSS) {
    return `#${window.CSS.escape(bid.adUnitCode)}`;
  }
  return `#${bid.adUnitCode}`;
};

function render(bid) {
  const config = bid.renderer.getConfig();

  bid.renderer.push(() => {
    playOutstream(getSelector(config, bid), {
      vastXml: bid.vastXml,
      vastUrl: bid.vastUrl,
      targetWidth: bid.width,
      targetHeight: bid.height,
      fitHeight: config.fitHeight,
      maxWidth: config.maxWidth,
      targetRatio: config.targetRatio,
      expand: "no-lazy-load",
      onEvent: (event) => {
        switch (event) {
          case "impression":
            return utils.logInfo("video impression for " + bid.adUnitCode);
          case "error":
            return utils.logWarn(
              "Error while playing video for " + bid.adUnitCode
            );
        }
      },
    });
  });
}

function createRenderer(bid) {
  const params = videoParams[bid.bidId] || {};
  const renderer = Renderer.install({
    url: HUBVISOR_PLAYER_URL,
    config: {
      fitHeight: params.fitHeight,
      maxWidth: params.maxWidth,
      targetRatio: params.targetRatio,
      selector: params.selector,
    },
  });
  renderer.setRender(render);
  return renderer;
}

export const spec = {
  code: "shortcut",
  supportedMediaTypes: ["banner", "video"],
  gvlid: 1112,

  isBidRequestValid: function (bid) {
    return bid.params && !!bid.params.placementId;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    if (!validBidRequests) {
      return [];
    }

    const data = {
      auctionId: bidderRequest.auctionId,
      timeout: bidderRequest.timeout,
      referer: bidderRequest.refererInfo.referer,
      pageViewId,
      bids: [],
      version: VERSION,
      ortb2: bidderRequest.ortb2
    };

    utils._each(validBidRequests, function (bid) {
      const newBid = {
        bidId: bid.bidId,
        adUnitCode: bid.adUnitCode,
        placementId: `${bid.params.placementId}`,
        mediaTypes: bid.mediaTypes,
        transactionId: bid.transactionId,
        ortb2Imp: bid.ortb2Imp
      };

      if (typeof bid.getFloor === 'function') {
        const bidFloor = bid.getFloor();
        if (bidFloor) {
          newBid.floor = { value: bidFloor.floor, currency: bidFloor.currency };
        }
      }

      data.bids.push(newBid);

      if (bid.mediaTypes.video) {
        videoParams[bid.bidId] = bid.params.video;
      }
    });

    const userIds = validBidRequests[0] && validBidRequests[0].userIdAsEids;
    if (userIds) {
      data.userIds = userIds;
    }

    if (data.bids.length === 0) {
      return [];
    }

    if (bidderRequest && bidderRequest.gdprConsent) {
      data.gdpr = {
        applies: bidderRequest.gdprConsent.gdprApplies,
        consent: bidderRequest.gdprConsent.consentString,
      };
    }

    return [
      {
        method: "POST",
        url: HUBVISOR_ENDPOINT,
        data: data,
        options: { withCredentials: false },
      },
    ];
  },

  interpretResponse: function (serverResponses, request) {
    const bidResponses = [];
    const bids = utils.deepAccess(serverResponses.body, "bids");

    utils._each(bids, function (response) {
      if (response.cpm <= 0) {
        return;
      }

      const bidResponse = {
        requestId: response.bidId,
        creativeId: response.creativeId,
        cpm: response.cpm,
        width: response.width,
        height: response.height,
        currency: response.currency || "USD",
        netRevenue: true,
        ttl: response.ttl,
        ad: response.adm,
        dealId: response.dealId,
        mediaType: response.mediaType,
        meta: {
          networkId: response.networkId,
          networkName: response.networkName,
          agencyId: response.agencyId,
          agencyName: response.agencyName,
          advertiserId: response.advertiserId,
          advertiserName: response.advertiserName,
          advertiserDomains:
            response.adomain && response.adomain.length > 0
              ? response.adomain
              : [],
          brandId: response.brandId,
          brandName: response.brandName,
          dchain: response.dchain,
          primaryCatId: response.primaryCatId,
          secondaryCatIds:
            response.secondaryCatIds && response.secondaryCatIds.length > 0
              ? response.secondaryCatIds
              : [],
          mediaType: response.mediaType,
        },
      };

      if (response.mediaType === "video") { // TODO and check context for outstream ?? (or not necessary ?)
        bidResponse.vastXml = response.vastXml;
        bidResponse.vastUrl = response.vastUrl;

        bidResponse.renderer = createRenderer(response);
      }

      bidResponses.push(bidResponse);
    });

    return bidResponses;
  },
};

registerBidder(spec);
