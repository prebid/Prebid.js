import { deepAccess, getBidIdParameter, getWindowTop, logError } from '../src/utils.js';
import { config } from '../src/config.js';
import { Renderer } from '../src/Renderer.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO, BANNER } from '../src/mediaTypes.js';
import { loadExternalScript } from '../src/adloader.js';

const PROD_ENDPOINT = 'https://bs.showheroes.com/api/v1/bid';
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
    let adUnits = [];
    const pageURL = validBidRequests[0].params.contentPageUrl || bidderRequest.refererInfo.referer;
    const isStage = !!validBidRequests[0].params.stage;
    const isOutstream = deepAccess(validBidRequests[0], 'mediaTypes.video.context') === 'outstream';
    const isCustomRender = deepAccess(validBidRequests[0], 'params.outstreamOptions.customRender');
    const isNodeRender = deepAccess(validBidRequests[0], 'params.outstreamOptions.slot') || deepAccess(validBidRequests[0], 'params.outstreamOptions.iframe');
    const isNativeRender = deepAccess(validBidRequests[0], 'renderer');
    const outstreamOptions = deepAccess(validBidRequests[0], 'params.outstreamOptions');
    const isBanner = !!validBidRequests[0].mediaTypes.banner || (isOutstream && !(isCustomRender || isNativeRender || isNodeRender));
    const defaultSchain = validBidRequests[0].schain || {};

    validBidRequests.forEach((bid) => {
      const videoSizes = getVideoSizes(bid);
      const bannerSizes = getBannerSizes(bid);
      const vpaidMode = getBidIdParameter('vpaidMode', bid.params);

      const makeBids = (type, size) => {
        let context = '';
        let streamType = 2;

        if (type === BANNER) {
          streamType = 5;
        } else {
          context = deepAccess(bid, 'mediaTypes.video.context');
          if (vpaidMode && context === 'instream') {
            streamType = 1;
          }
          if (context === 'outstream') {
            streamType = 5;
          }
        }

        const consentData = bidderRequest.gdprConsent || {};

        const gdprConsent = {
          apiVersion: consentData.apiVersion || 2,
          gdprApplies: consentData.gdprApplies || 0,
          consentString: consentData.consentString || '',
        }

        return {
          type: streamType,
          adUnitCode: bid.adUnitCode,
          bidId: bid.bidId,
          mediaType: type,
          context: context,
          playerId: getBidIdParameter('playerId', bid.params),
          auctionId: bidderRequest.auctionId,
          bidderCode: BIDDER_CODE,
          gdprConsent: gdprConsent,
          start: +new Date(),
          timeout: 3000,
          size: {
            width: size[0],
            height: size[1]
          },
          params: bid.params,
          schain: bid.schain || defaultSchain,
        };
      };

      videoSizes.forEach((size) => {
        adUnits.push(makeBids(VIDEO, size));
      });

      bannerSizes.forEach((size) => {
        adUnits.push(makeBids(BANNER, size));
      });
    });

    return {
      url: isStage ? STAGE_ENDPOINT : PROD_ENDPOINT,
      method: 'POST',
      options: {contentType: 'application/json', accept: 'application/json'},
      data: {
        'user': [],
        'meta': {
          'adapterVersion': 2,
          'pageURL': encodeURIComponent(pageURL),
          'vastCacheEnabled': (!!config.getConfig('cache') && !isBanner && !outstreamOptions) || false,
          'isDesktop': getWindowTop().document.documentElement.clientWidth > 700,
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
    bidUnit.adUnitCode = reqBid.adUnitCode;
    bidUnit.currency = bid.currency;
    bidUnit.mediaType = bid.mediaType || VIDEO;
    bidUnit.ttl = TTL;
    bidUnit.creativeId = 'c_' + bid.bidId;
    bidUnit.netRevenue = true;
    bidUnit.width = bid.size.width;
    bidUnit.height = bid.size.height;
    bidUnit.meta = {
      advertiserDomains: bid.adomain || []
    };
    if (bid.vastXml) {
      bidUnit.vastXml = bid.vastXml;
      bidUnit.adResponse = {
        content: bid.vastXml,
      };
    }
    if (bid.vastTag) {
      bidUnit.vastUrl = bid.vastTag;
    }
    if (bid.mediaType === BANNER) {
      bidUnit.ad = getBannerHtml(bid, reqBid, reqData);
    } else if (bid.context === 'outstream') {
      const renderer = Renderer.install({
        id: bid.bidId,
        url: 'https://static.showheroes.com/renderer.js',
        adUnitCode: reqBid.adUnitCode,
        config: {
          playerId: reqBid.playerId,
          width: bid.size.width,
          height: bid.size.height,
          vastUrl: bid.vastTag,
          vastXml: bid.vastXml,
          debug: reqData.debug,
          isStage: !!reqData.meta.stage,
          customRender: getBidIdParameter('customRender', currentBidParams.outstreamOptions),
          slot: getBidIdParameter('slot', currentBidParams.outstreamOptions),
          iframe: getBidIdParameter('iframe', currentBidParams.outstreamOptions),
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
      const inIframe = getBidIdParameter('iframe', bid.renderer.config);
      if (inIframe && window.document.getElementById(inIframe).nodeName === 'IFRAME') {
        const iframe = window.document.getElementById(inIframe);
        let framedoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        framedoc.body.appendChild(embedCode);
        return;
      }

      const slot = getBidIdParameter('slot', bid.renderer.config) || bid.adUnitCode;
      if (slot && window.document.getElementById(slot)) {
        window.document.getElementById(slot).appendChild(embedCode);
      } else if (slot) {
        logError('[ShowHeroes][renderer] Error: spot not found');
      }
    } catch (err) {
      logError('[ShowHeroes][renderer] Error:' + err.message)
    }
  }
}

function createOutstreamEmbedCode(bid) {
  const isStage = getBidIdParameter('isStage', bid.renderer.config);
  const urls = getEnvURLs(isStage);

  const fragment = window.document.createDocumentFragment();

  let script = loadExternalScript(urls.pubTag, 'outstream', function () {
    window.ShowheroesTag = this;
  });
  script.setAttribute('data-player-host', urls.vlHost);

  const spot = window.document.createElement('div');
  spot.setAttribute('class', 'showheroes-spot');
  spot.setAttribute('data-player', getBidIdParameter('playerId', bid.renderer.config));
  spot.setAttribute('data-debug', getBidIdParameter('debug', bid.renderer.config));
  spot.setAttribute('data-ad-vast-tag', getBidIdParameter('vastUrl', bid.renderer.config));
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

function getVideoSizes(bidRequest) {
  return formatSizes(deepAccess(bidRequest, 'mediaTypes.video.playerSize') || []);
}

function getBannerSizes(bidRequest) {
  return formatSizes(deepAccess(bidRequest, 'mediaTypes.banner.sizes') || []);
}

function formatSizes(sizes) {
  if (!sizes || !sizes.length) {
    return []
  }
  return Array.isArray(sizes[0]) ? sizes : [sizes];
}

registerBidder(spec);
