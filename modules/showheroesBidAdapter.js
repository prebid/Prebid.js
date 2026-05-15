import {
  deepAccess,
  deepSetValue,
  isFn,
} from '../src/utils.js';
import { Renderer } from '../src/Renderer.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const ENDPOINT = 'https://ads.viralize.tv/openrtb2/auction/';
const BIDDER_CODE = 'showheroes';
const TTL = 300;
const DEFAULT_GZIP_ENABLED = true;

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: TTL,
    currency: 'EUR',
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const videoContext = deepAccess(bidRequest, 'mediaTypes.video.context');
    if (videoContext) {
      deepSetValue(imp, 'video.ext.context', videoContext);
    }
    imp.ext = imp.ext || {};
    imp.ext.params = bidRequest.params;
    imp.ext.adUnitCode = bidRequest.adUnitCode;

    if (!imp.displaymanager) {
      imp.displaymanager = 'Prebid.js';
      imp.displaymanagerver = '$prebid.version$'; // prebid version
    }

    if (!isFn(bidRequest.getFloor)) {
      return imp
    }

    const floor = bidRequest.getFloor({
      currency: 'EUR',
      mediaType: '*',
      size: '*',
    });
    if (!isNaN(floor?.floor) && floor?.currency === 'EUR') {
      imp.bidfloor = floor.floor;
      imp.bidfloorcur = 'EUR';
    }
    return imp;
  },

  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);

    if (context.imp?.video?.ext?.context === 'outstream') {
      const renderConfig = {
        rendererUrl: bid.ext?.rendererConfig?.rendererUrl,
        renderFunc: bid.ext?.rendererConfig?.renderFunc,
        renderOptions: bid.ext?.rendererConfig?.renderOptions,
      };
      if (renderConfig.renderFunc && renderConfig.rendererUrl) {
        bidResponse.renderer = createRenderer(bidResponse, renderConfig);
      }
    }
    bidResponse.extra = bid.ext?.extra;
    return bidResponse;
  },
})

const GVLID = 111;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: ['showheroesBs'],
  supportedMediaTypes: [VIDEO, BANNER],
  isBidRequestValid: (bid) => {
    return !!bid.params.unitId;
  },
  buildRequests: (bidRequests, bidderRequest) => {
    const QA = bidRequests[0].params.qa;

    const ortbData = converter.toORTB({ bidRequests, bidderRequest });

    return {
      url: QA?.endpoint || ENDPOINT,
      method: 'POST',
      data: ortbData,
      options: {
        endpointCompression: getGzipSetting(),
      }
    };
  },
  interpretResponse: (response, request) => {
    if (!response.body) {
      return [];
    }

    return converter.fromORTB({ response: response.body, request: request.data }).bids;
  },
  getUserSyncs: (syncOptions, serverResponses) => {
    const syncs = [];

    if (!serverResponses.length || !serverResponses[0].body?.ext?.userSync) {
      return syncs;
    }

    const userSync = serverResponses[0].body.ext.userSync;

    if (syncOptions.iframeEnabled && userSync?.iframes?.length) {
      userSync.iframes.forEach(url => {
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

function outstreamRender(response, renderConfig) {
  response.renderer.push(() => {
    const func = deepAccess(window, renderConfig.renderFunc);
    if (!isFn(func)) {
      return;
    }
    const renderPayload = { ...renderConfig.renderOptions };
    if (response.vastXml) {
      renderPayload.adResponse = {
        content: response.vastXml,
      };
    }
    func(renderPayload);
  });
}

function createRenderer(bid, renderConfig) {
  const renderer = Renderer.install({
    id: bid.id,
    url: renderConfig.rendererUrl,
    loaded: false,
    adUnitCode: bid.adUnitCode,
  });
  renderer.setRender((render) => {
    return outstreamRender(render, renderConfig);
  });
  return renderer;
}

function getGzipSetting() {
  const gzipSetting = deepAccess(config.getBidderConfig(), 'showheroes.gzipEnabled');

  if (gzipSetting === true || gzipSetting === "true") {
    return true;
  }
  if (gzipSetting === false || gzipSetting === "false") {
    return false;
  }

  return DEFAULT_GZIP_ENABLED;
}

registerBidder(spec);
