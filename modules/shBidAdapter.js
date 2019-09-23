import * as utils from '../src/utils';
import { config } from '../src/config';
import { registerBidder } from '../src/adapters/bidderFactory';
import { VIDEO, BANNER } from '../src/mediaTypes';

const PROD_ENDPOINT = 'https://bs1.showheroes.com/api/v1/bid';
const STAGE_ENDPOINT = 'https://bid-service.stage.showheroes.com/api/v1/bid';
const PROD_PUBLISHER_TAG = 'https://static.showheroes.com/publishertag.js';
const STAGE_PUBLISHER_TAG = 'https://pubtag.stage.showheroes.com/publishertag.js';
const PROD_VL = 'https://video-library.showheroes.com';
const STAGE_VL = 'https://video-library.stage.showheroes.com';
const BIDDER_CODE = 'showheroes-bs';
const TTL = 300;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['showheroesBs'],
  supportedMediaTypes: [VIDEO, BANNER],
  isBidRequestValid: function(bid) {
    return !!bid.params.playerId;
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const pageURL = validBidRequests[0].params.contentPageUrl || bidderRequest.refererInfo.referer;
    const isStage = !!validBidRequests[0].params.stage;
    const isBanner = !!validBidRequests[0].mediaTypes.banner;

    let adUnits = validBidRequests.map((bid) => {
      const vpaidMode = utils.getBidIdParameter('vpaidMode', bid.params);

      let sizes = bid.sizes.length === 1 ? bid.sizes[0] : bid.sizes;
      if (sizes && !sizes.length) {
        let mediaSize;
        if (!isBanner) {
          mediaSize = bid.mediaTypes.video.playerSize;
        } else {
          mediaSize = bid.mediaTypes.banner.sizes;
        }
        if (utils.isArray(mediaSize[0])) {
          sizes = mediaSize[0];
        } else if (utils.isNumber(mediaSize[0])) {
          sizes = mediaSize;
        }
      }

      const context = utils.deepAccess(bid, 'mediaTypes.video.context');

      let streamType = 2;

      if (vpaidMode && context === 'instream') {
        streamType = 1;
      }
      if (context === 'outstream' || isBanner) {
        streamType = 5;
      }

      return {
        type: streamType,
        bidId: bid.bidId,
        mediaType: isBanner ? BANNER : VIDEO,
        playerId: utils.getBidIdParameter('playerId', bid.params),
        auctionId: bidderRequest.auctionId,
        bidderCode: BIDDER_CODE,
        gdprConsent: bidderRequest.gdprConsent,
        start: +new Date(),
        timeout: 3000,
        video: {
          width: sizes[0],
          height: sizes[1]
        },
      };
    });

    return {
      url: isStage ? STAGE_ENDPOINT : PROD_ENDPOINT,
      method: 'POST',
      options: {contentType: 'application/json', accept: 'application/json'},
      data: {
        'user': [],
        'meta': {
          'pageURL': encodeURIComponent(pageURL),
          'vastCacheEnabled': (!!config.getConfig('cache') && !isBanner) || false,
          'isDesktop': utils.getWindowTop().document.documentElement.clientWidth > 700,
          'stage': isStage || undefined
        },
        'requests': adUnits,
        'debug': validBidRequests[0].params.debug || false,
      }
    };
  },
  interpretResponse: function(response, request) {
    return createBids(response.body, request.data);
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];

    if (!serverResponses.length || !serverResponses[0].body.userSync) {
      return syncs;
    }

    const userSync = serverResponses[0].body.userSync;

    if (syncOptions.iframeEnabled) {
      (userSync.iframes || []).forEach(url => {
        syncs.push({
          type: 'iframe',
          url
        });
      });
    }

    if (syncOptions.pixelEnabled) {
      (userSync.pixels || []).forEach(url => {
        syncs.push({
          type: 'image',
          url
        });
      });
    }
    return syncs;
  },
};

function createBids(bidRes, reqData) {
  if (bidRes && (!Array.isArray(bidRes.bids) || bidRes.bids.length < 1)) {
    return [];
  }

  const bids = [];
  const bidMap = {};
  (reqData.requests || []).forEach((bid) => {
    bidMap[bid.bidId] = bid;
  });

  bidRes.bids.forEach(function (bid) {
    const reqBid = bidMap[bid.bidId];
    let bidUnit = {};
    bidUnit.cpm = bid.cpm;
    bidUnit.requestId = bid.bidId;
    bidUnit.currency = bid.currency;
    bidUnit.mediaType = reqBid.mediaType || VIDEO;
    bidUnit.ttl = TTL;
    bidUnit.creativeId = 'c_' + bid.bidId;
    bidUnit.netRevenue = true;
    bidUnit.width = bid.video.width;
    bidUnit.height = bid.video.height;
    if (bid.vastXml) {
      bidUnit.vastXml = bid.vastXml;
      bidUnit.adResponse = {
        content: bid.vastXml,
      };
    }
    if (bid.vastTag) {
      bidUnit.vastUrl = bid.vastTag;
    }
    if (reqBid.mediaType === BANNER) {
      bidUnit.ad = getBannerHtml(bid, reqBid, reqData);
    }
    bids.push(bidUnit);
  });

  return bids;
}

function getBannerHtml (bid, reqBid, reqData) {
  const isStage = !!reqData.meta.stage;
  const pubTag = isStage ? STAGE_PUBLISHER_TAG : PROD_PUBLISHER_TAG;
  const vlHost = isStage ? STAGE_VL : PROD_VL;
  return `<html>
    <head></head>
    <body>
      <script async src="${pubTag}" 
              data-canvas=""
              data-noad-passback-listener=""
              onload="window.ShowheroesTag=this"
              data-player-host="${vlHost}"></script>
      <div class="showheroes-spot"
            data-debug="${reqData.debug ? '1' : ''}"
            data-player="${reqBid.playerId}"
            data-ad-vast-tag="${bid.vastTag}"></div>
    </body>
  </html>`;
}

registerBidder(spec);
