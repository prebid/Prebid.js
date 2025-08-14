import {
  deepAccess,
  deepSetValue,
  triggerPixel,
  isFn,
  logInfo
} from '../src/utils.js';
import { Renderer } from '../src/Renderer.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO } from '../src/mediaTypes.js';

const ENDPOINT = 'https://ads.viralize.tv/openrtb2/auction/';
const BIDDER_CODE = 'showheroes-bs';
const TTL = 300;

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: TTL,
    currency: 'EUR',
    mediaType: VIDEO,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const videoContext = deepAccess(bidRequest, 'mediaTypes.video.context');
    deepSetValue(imp, 'video.ext.context', videoContext);
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

    let floor = bidRequest.getFloor({
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
    bidResponse.callbacks = bid.ext?.callbacks;
    bidResponse.extra = bid.ext?.extra;
    return bidResponse;
  },
})

const GVLID = 111;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: ['showheroesBs'],
  supportedMediaTypes: [VIDEO],
  isBidRequestValid: (bid) => {
    return !!bid.params.unitId;
  },
  buildRequests: (bidRequests, bidderRequest) => {
    const QA = bidRequests[0].params.qa;

    const ortbData = converter.toORTB({ bidRequests, bidderRequest })

    return {
      url: QA?.endpoint || ENDPOINT,
      method: 'POST',
      data: ortbData,
    };
  },
  interpretResponse: (response, request) => {
    if (!response.body) {
      return [];
    }

    const bids = converter.fromORTB({response: response.body, request: request.data}).bids;
    return bids;
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

  onBidWon(bid) {
    if (bid.callbacks) {
      triggerPixel(bid.callbacks.won);
    }
    logInfo(
      `Showheroes adapter won the auction. Bid id: ${bid.bidId || bid.requestId}`
    );
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

registerBidder(spec);
