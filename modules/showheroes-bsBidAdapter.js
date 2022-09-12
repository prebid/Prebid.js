import {
  deepAccess,
  getBidIdParameter,
  getWindowTop,
  triggerPixel,
  logInfo,
  logError
} from '../src/utils.js';
import { config } from '../src/config.js';
import { Renderer } from '../src/Renderer.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO, BANNER } from '../src/mediaTypes.js';
import { loadExternalScript } from '../src/adloader.js';

const PROD_ENDPOINT = 'https://bs.showheroes.com/api/v1/bid';
const STAGE_ENDPOINT = 'https://bid-service.stage.showheroes.com/api/v1/bid';
const VIRALIZE_ENDPOINT = 'https://ads.viralize.tv/prebid-sh/';
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
    return !!bid.params.playerId || !!bid.params.unitId;
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    let adUnits = [];
    const pageURL = validBidRequests[0].params.contentPageUrl || bidderRequest.refererInfo.referer;
    const isStage = !!validBidRequests[0].params.stage;
    const isViralize = !!validBidRequests[0].params.unitId;
    const isOutstream = deepAccess(validBidRequests[0], 'mediaTypes.video.context') === 'outstream';
    const isCustomRender = deepAccess(validBidRequests[0], 'params.outstreamOptions.customRender');
    const isNodeRender = deepAccess(validBidRequests[0], 'params.outstreamOptions.slot') || deepAccess(validBidRequests[0], 'params.outstreamOptions.iframe');
    const isNativeRender = deepAccess(validBidRequests[0], 'renderer');
    const outstreamOptions = deepAccess(validBidRequests[0], 'params.outstreamOptions');
    const isBanner = !!validBidRequests[0].mediaTypes.banner || (isOutstream && !(isCustomRender || isNativeRender || isNodeRender));
    const defaultSchain = validBidRequests[0].schain || {};

    const consentData = bidderRequest.gdprConsent || {};
    const gdprConsent = {
      apiVersion: consentData.apiVersion || 2,
      gdprApplies: consentData.gdprApplies || 0,
      consentString: consentData.consentString || '',
    }

    validBidRequests.forEach((bid) => {
      const videoSizes = getVideoSizes(bid);
      const bannerSizes = getBannerSizes(bid);
      const vpaidMode = getBidIdParameter('vpaidMode', bid.params);

      const makeBids = (type, size, isViralize) => {
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

        let rBid = {
          type: streamType,
          adUnitCode: bid.adUnitCode,
          bidId: bid.bidId,
          context: context,
          auctionId: bidderRequest.auctionId,
          bidderCode: BIDDER_CODE,
          start: +new Date(),
          timeout: 3000,
          params: bid.params,
          schain: bid.schain || defaultSchain
        };

        if (isViralize) {
          rBid.unitId = getBidIdParameter('unitId', bid.params);
          rBid.sizes = size;
          rBid.mediaTypes = {
            [type]: {'context': context}
          };
        } else {
          rBid.playerId = getBidIdParameter('playerId', bid.params);
          rBid.mediaType = type;
          rBid.size = {
            width: size[0],
            height: size[1]
          };
          rBid.gdprConsent = gdprConsent;
        }

        return rBid;
      };

      if (isViralize) {
        if (videoSizes && videoSizes[0]) {
          adUnits.push(makeBids(VIDEO, videoSizes, isViralize));
        }
        if (bannerSizes && bannerSizes[0]) {
          adUnits.push(makeBids(BANNER, bannerSizes, isViralize));
        }
      } else {
        videoSizes.forEach((size) => {
          adUnits.push(makeBids(VIDEO, size));
        });

        bannerSizes.forEach((size) => {
          adUnits.push(makeBids(BANNER, size));
        });
      }
    });

    let endpointUrl;
    let data;

    const QA = validBidRequests[0].params.qa || {};

    if (isViralize) {
      endpointUrl = VIRALIZE_ENDPOINT;
      data = {
        'bidRequests': adUnits,
        'context': {
          'gdprConsent': gdprConsent,
          'schain': defaultSchain,
          'pageURL': QA.pageURL || encodeURIComponent(pageURL)
        }
      }
    } else {
      endpointUrl = isStage ? STAGE_ENDPOINT : PROD_ENDPOINT;

      data = {
        'user': [],
        'meta': {
          'adapterVersion': 2,
          'pageURL': QA.pageURL || encodeURIComponent(pageURL),
          'vastCacheEnabled': (!!config.getConfig('cache') && !isBanner && !outstreamOptions) || false,
          'isDesktop': getWindowTop().document.documentElement.clientWidth > 700,
          'xmlAndTag': !!(isOutstream && isCustomRender) || false,
          'stage': isStage || undefined
        },
        'requests': adUnits,
        'debug': validBidRequests[0].params.debug || false,
      }
    }

    return {
      url: QA.endpoint || endpointUrl,
      method: 'POST',
      options: {contentType: 'application/json', accept: 'application/json'},
      data: data
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

  onBidWon(bid) {
    if (bid.callbacks) {
      triggerPixel(bid.callbacks.won);
    }
    logInfo(
      `Showheroes adapter won the auction. Bid id: ${bid.bidId || bid.requestId}`
    );
  },
};

function createBids(bidRes, reqData) {
  if (!bidRes) {
    return [];
  }
  const responseBids = bidRes.bids || bidRes.bidResponses;
  if (!Array.isArray(responseBids) || responseBids.length < 1) {
    return [];
  }

  const bids = [];
  const bidMap = {};
  (reqData.requests || reqData.bidRequests || []).forEach((bid) => {
    bidMap[bid.bidId] = bid;
  });

  responseBids.forEach(function (bid) {
    const requestId = bid.bidId || bid.requestId;
    const reqBid = bidMap[requestId];
    const currentBidParams = reqBid.params;
    const isViralize = !!reqBid.params.unitId;
    const size = {
      width: bid.width || bid.size.width,
      height: bid.height || bid.size.height
    };

    let bidUnit = {};
    bidUnit.cpm = bid.cpm;
    bidUnit.requestId = requestId;
    bidUnit.adUnitCode = reqBid.adUnitCode;
    bidUnit.currency = bid.currency;
    bidUnit.mediaType = bid.mediaType || VIDEO;
    bidUnit.ttl = TTL;
    bidUnit.creativeId = 'c_' + requestId;
    bidUnit.netRevenue = true;
    bidUnit.width = size.width;
    bidUnit.height = size.height;
    bidUnit.meta = {
      advertiserDomains: bid.adomain || []
    };
    if (bid.vastXml) {
      bidUnit.vastXml = bid.vastXml;
      bidUnit.adResponse = {
        content: bid.vastXml,
      };
    }
    if (bid.vastTag || bid.vastUrl) {
      bidUnit.vastUrl = bid.vastTag || bid.vastUrl;
    }
    if (bid.mediaType === BANNER) {
      bidUnit.ad = getBannerHtml(bid, reqBid, reqData);
    } else if (bid.context === 'outstream') {
      const renderer = Renderer.install({
        id: requestId,
        url: 'https://static.showheroes.com/renderer.js',
        adUnitCode: reqBid.adUnitCode,
        config: {
          playerId: reqBid.playerId,
          width: size.width,
          height: size.height,
          vastUrl: bid.vastTag,
          vastXml: bid.vastXml,
          ad: bid.ad,
          debug: reqData.debug,
          isStage: reqData.meta && !!reqData.meta.stage,
          isViralize: isViralize,
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
  let embedCode;
  if (bid.renderer.config.isViralize) {
    embedCode = createOutstreamEmbedCodeV2(bid);
  } else {
    embedCode = createOutstreamEmbedCode(bid);
  }
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
      logError('[ShowHeroes][renderer] Error:' + err.message);
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

function createOutstreamEmbedCodeV2(bid) {
  const range = document.createRange();
  range.selectNode(document.getElementsByTagName('body')[0]);
  return range.createContextualFragment(getBidIdParameter('ad', bid.renderer.config));
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
