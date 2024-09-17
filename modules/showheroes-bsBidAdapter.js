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

const ENDPOINT = 'https://ads.viralize.tv/openrtb2/auction';
const BIDDER_CODE = 'showheroes-bs';
const TTL = 300;

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: TTL,
    currency: 'EUR',
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const mediaTypeContext = deepAccess(bidRequest, 'mediaTypes.video.context');
    deepSetValue(imp, 'ext.mediaType', mediaTypeContext);
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
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    // delete user agent from oRTB, we'll get it from the header
    (req?.device?.ua) && delete req.device['ua'];
    // 'sua' is 2.6 standard, we operate with 2.5
    (req?.device?.sua) && delete req.device['sua'];
    return req;
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
  interpretResponse: (response) => {
    return createBids(response.body);
  },
  getUserSyncs: (syncOptions, serverResponses) => {
    const syncs = [];

    if (!serverResponses.length || !serverResponses[0].body.userSync) {
      return syncs;
    }

    const userSync = serverResponses[0].body.userSync;

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
    logInfo(`found urls to sync:`, syncs);
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

function createBids(bidRes) {
  if (!bidRes) {
    return [];
  }
  const responseBids = bidRes.bids || bidRes.bidResponses;
  if (!Array.isArray(responseBids) || responseBids.length < 1) {
    return [];
  }

  const bids = [];

  responseBids.forEach((bid) => {
    const requestId = bid.requestId;
    const size = {
      width: bid.width || bid.size.width,
      height: bid.height || bid.size.height
    };

    let bidUnit = {};
    bidUnit.cpm = bid.cpm;
    bidUnit.requestId = requestId;
    bidUnit.adUnitCode = bid.adUnitCode;
    bidUnit.currency = bid.currency;
    bidUnit.mediaType = bid.mediaType || VIDEO;
    bidUnit.ttl = bid.exp || TTL;
    bidUnit.creativeId = 'c_' + requestId;
    bidUnit.netRevenue = bid.netRevenue ?? true;
    bidUnit.extra = bid.extra;
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
    if (bid.context === 'outstream') {
      const renderConfig = {
        rendererUrl: bid.rendererConfig?.rendererUrl,
        renderFunc: bid.rendererConfig?.renderFunc,
        renderOptions: bid.rendererConfig?.renderOptions,
      };
      if (renderConfig.renderFunc && renderConfig.rendererUrl) {
        bidUnit.renderer = createRenderer(bidUnit, renderConfig);
      }
    };
    bids.push(bidUnit);
  });

  return bids;
}

function outstreamRender(response, renderConfig) {
  response.renderer.push(() => {
    const func = deepAccess(window, renderConfig.renderFunc);
    if (!isFn(func)) {
      return;
    }
    const renderPayload = { ...response, ...renderConfig.renderOptions };
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
