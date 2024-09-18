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
  interpretResponse: (response, request) => {
    return createBids(response.body, request.data);
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

function createBids(bidRes, bidReq) {
  if (!bidRes || !bidRes.seatbid) {
    return [];
  }
  const bids = [];

  bidRes.seatbid.forEach((seatbid) => {
    if (!seatbid.bid?.length) {
      return;
    }
    seatbid.bid.forEach((bid) => {
      const imp = bidReq.imp.find((imp) => imp.id === bid.impid);
      const bidUnit = {
        cpm: bid.price,
        requestId: bid.impid,
        adUnitCode: imp?.ext?.adUnitCode,
        currency: bidRes.cur,
        mediaType: VIDEO,
        ttl: bid.exp || TTL,
        netRevenue: true,
        extra: bid.extra,
        width: bid.w,
        height: bid.h,
        creativeId: bid.crid,
        callbacks: bid?.ext?.callbacks,
        meta: {
          advertiserDomains: bid.adomain || [],
        },
      };
      if (bid.adm) {
        bidUnit.vastXml = bid.adm;
        bidUnit.adResponse = {
          content: bid.adm,
        };
      }
      if (bid.nurl) {
        bidUnit.vastUrl = bid.nurl;
      }
      if (imp?.ext?.mediaType === 'outstream') {
        const renderConfig = {
          rendererUrl: bid.ext?.rendererConfig?.rendererUrl,
          renderFunc: bid.ext?.rendererConfig?.renderFunc,
          renderOptions: bid.ext?.rendererConfig?.renderOptions,
        };
        if (renderConfig.renderFunc && renderConfig.rendererUrl) {
          bidUnit.renderer = createRenderer(bidUnit, renderConfig);
        }
      };
      bids.push(bidUnit);
    });
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
