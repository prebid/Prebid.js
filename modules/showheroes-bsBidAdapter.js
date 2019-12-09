import * as utils from '../src/utils';
import { config } from '../src/config';
import { Renderer } from '../src/Renderer';
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

function getEnvURLs(isStage) {
  return {
    pubTag: isStage ? STAGE_PUBLISHER_TAG : PROD_PUBLISHER_TAG,
    vlHost: isStage ? STAGE_VL : PROD_VL
  }
}

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
    const isOutstream = utils.deepAccess(validBidRequests[0], 'mediaTypes.video.context') === 'outstream';
    const isCustomRender = utils.deepAccess(validBidRequests[0], 'params.outstreamOptions.customRender');
    const isNodeRender = utils.deepAccess(validBidRequests[0], 'params.outstreamOptions.slot') || utils.deepAccess(validBidRequests[0], 'params.outstreamOptions.iframe');
    const isNativeRender = utils.deepAccess(validBidRequests[0], 'renderer');
    const outstreamOptions = utils.deepAccess(validBidRequests[0], 'params.outstreamOptions');
    const isBanner = !!validBidRequests[0].mediaTypes.banner || (isOutstream && !(isCustomRender || isNativeRender || isNodeRender));

    let adUnits = validBidRequests.map((bid) => {
      const vpaidMode = utils.getBidIdParameter('vpaidMode', bid.params);

      let sizes = bid.sizes.length === 1 ? bid.sizes[0] : bid.sizes;
      if (sizes && !sizes.length) {
        let mediaSize;
        let mediaVideoSize = utils.deepAccess(bid, 'mediaTypes.video.playerSize');
        if (utils.isArray(mediaVideoSize)) {
          mediaSize = mediaVideoSize;
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
      if (isBanner || context === 'outstream') {
        streamType = 5;
      }

      return {
        type: streamType,
        bidId: bid.bidId,
        mediaType: isBanner ? BANNER : VIDEO,
        context: context,
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
        params: bid.params,
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
          'vastCacheEnabled': (!!config.getConfig('cache') && !isBanner && !outstreamOptions) || false,
          'isDesktop': utils.getWindowTop().document.documentElement.clientWidth > 700,
          'xmlAndTag': !!(isOutstream && isCustomRender) || false,
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
    const currentBidParams = reqBid.params;
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
    } else if (reqBid.context === 'outstream') {
      const renderer = Renderer.install({
        id: bid.bidId,
        url: '//',
        config: {
          playerId: reqBid.playerId,
          width: bid.video.width,
          height: bid.video.height,
          vastUrl: bid.vastTag,
          vastXml: bid.vastXml,
          debug: reqData.debug,
          isStage: !!reqData.meta.stage,
          customRender: utils.getBidIdParameter('customRender', currentBidParams.outstreamOptions),
          slot: utils.getBidIdParameter('slot', currentBidParams.outstreamOptions),
          iframe: utils.getBidIdParameter('iframe', currentBidParams.outstreamOptions),
        }
      });
      renderer.setRender(outstreamRender);
      bidUnit.renderer = renderer;
    }
    bids.push(bidUnit);
  });

  return bids;
}

function outstreamRender(bid) {
  const embedCode = createOutstreamEmbedCode(bid);
  if (typeof bid.renderer.config.customRender === 'function') {
    bid.renderer.config.customRender(bid, embedCode);
  } else {
    try {
      const inIframe = utils.getBidIdParameter('iframe', bid.renderer.config);
      if (inIframe && window.document.getElementById(inIframe).nodeName === 'IFRAME') {
        const iframe = window.document.getElementById(inIframe);
        let framedoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        framedoc.body.appendChild(embedCode);
        return;
      }

      const slot = utils.getBidIdParameter('slot', bid.renderer.config);
      if (slot && window.document.getElementById(slot)) {
        window.document.getElementById(slot).appendChild(embedCode);
      } else if (slot) {
        utils.logError('[ShowHeroes][renderer] Error: spot not found');
      }
    } catch (err) {
      utils.logError('[ShowHeroes][renderer] Error:' + err.message)
    }
  }
}

function createOutstreamEmbedCode(bid) {
  const isStage = utils.getBidIdParameter('isStage', bid.renderer.config);
  const urls = getEnvURLs(isStage);

  const fragment = window.document.createDocumentFragment();

  const script = window.document.createElement('script');
  script.type = 'text/javascript';
  script.src = urls.pubTag;
  script.onload = function () {
    window.ShowheroesTag = this;
  };
  script.setAttribute('data-player-host', urls.vlHost);

  const spot = window.document.createElement('div');
  spot.setAttribute('class', 'showheroes-spot');
  spot.setAttribute('data-player', utils.getBidIdParameter('playerId', bid.renderer.config));
  spot.setAttribute('data-debug', utils.getBidIdParameter('debug', bid.renderer.config));
  spot.setAttribute('data-ad-vast-tag', utils.getBidIdParameter('vastUrl', bid.renderer.config));
  spot.setAttribute('data-stream-type', 'outstream');

  fragment.appendChild(spot);
  fragment.appendChild(script);
  return fragment;
}

function getBannerHtml (bid, reqBid, reqData) {
  const isStage = !!reqData.meta.stage;
  const urls = getEnvURLs(isStage);
  return `<html>
    <head></head>
    <body>
      <script async src="${urls.pubTag}"
              data-canvas=""
              data-noad-passback-listener=""
              onload="window.ShowheroesTag=this"
              data-player-host="${urls.vlHost}"></script>
      <div class="showheroes-spot"
            data-debug="${reqData.debug ? '1' : ''}"
            data-player="${reqBid.playerId}"
            data-ad-vast-tag="${bid.vastTag}"></div>
    </body>
  </html>`;
}

registerBidder(spec);
