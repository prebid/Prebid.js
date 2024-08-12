import {
  deepAccess,
  deepSetValue,
  triggerPixel,
  formatQS,
  isFn,
  logInfo} from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO, BANNER } from '../src/mediaTypes.js';

const VIRALIZE_ENDPOINT = 'https://ads.viralize.tv/openrtb2/auction';
const PROD_PUBLISHER_TAG = 'https://static.showheroes.com/publishertag.js';
const STAGE_PUBLISHER_TAG = 'https://pubtag.stage.showheroes.com/publishertag.js';
const PROD_VL = 'https://video-library.showheroes.com';
const STAGE_VL = 'https://video-library.stage.showheroes.com';
const BIDDER_CODE = 'showheroes-bs';
const TTL = 300;

const converter = ortbConverter({
  context: {
    netRevenue: false,
    ttl: TTL
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    // video has higher priority, so if there is banner configured at the same time, send video only
    if (imp?.video) {
      delete imp['banner']
    }
    let mediaTypeContenxt = deepAccess(bidRequest, 'mediaTypes.video.context');
    if (!mediaTypeContenxt) {
      mediaTypeContenxt = BANNER;
    }
    deepSetValue(imp, 'ext.mediaType', mediaTypeContenxt);
    imp.ext.params = bidRequest.params;
    imp.ext.adUnitCode = bidRequest.adUnitCode;
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

var hasSynced = false;

export function resetUserSync() {
  hasSynced = false;
}

function getEnvURLs(isStage) {
  return {
    pubTag: isStage ? STAGE_PUBLISHER_TAG : PROD_PUBLISHER_TAG,
    vlHost: isStage ? STAGE_VL : PROD_VL
  }
}

const GVLID = 111;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: ['showheroesBs'],
  supportedMediaTypes: [VIDEO, BANNER],
  isBidRequestValid: function (bid) {
    return !!bid.params.unitId;
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const QA = validBidRequests[0].params.qa;

    const ortbData = converter.toORTB({ validBidRequests, bidderRequest })
    if (QA?.pageURL) {
      deepSetValue(ortbData, 'site.page', QA.pageURL);
      const u = new URL(QA.pageURL);
      deepSetValue(ortbData, 'site.domain', u.host);
      ortbData.test = 1;
    }

    return {
      url: QA?.endpoint || VIRALIZE_ENDPOINT,
      method: 'POST',
      options: { contentType: 'application/json', accept: 'application/json' },
      data: ortbData,
    };
  },
  interpretResponse: function (response, request) {
    return createBids(response.body, request.data);
  },
  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent, gppConsent) {
    if (hasSynced || !syncOptions.iframeEnabled) return

    // data is only assigned if params are available to pass to syncEndpoint
    let params = {};

    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        params['gdpr'] = Number(gdprConsent.gdprApplies);
      }
      if (typeof gdprConsent.consentString === 'string') {
        params['gdpr_consent'] = gdprConsent.consentString;
      }
    }

    if (uspConsent) {
      params['usp'] = encodeURIComponent(uspConsent);
    }

    if (gppConsent?.gppString) {
      params['gpp'] = gppConsent.gppString;
      params['gpp_sid'] = gppConsent.applicableSections?.toString();
    }

    params = Object.keys(params).length ? `?${formatQS(params)}` : '';

    hasSynced = true;
    return {
      type: 'iframe',
      url: `https://sync.dev.showheroes.com/cookie_sync` + params
    };
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
      bidUnit.ad = getBannerHtml(bid, bid, reqData);
    }
    bids.push(bidUnit);
  });

  return bids;
}

function getBannerHtml(bid, reqBid, reqData) {
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
