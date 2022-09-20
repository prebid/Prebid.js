import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {Renderer} from '../src/Renderer.js';
import {getWindowFromDocument, logWarn} from '../src/utils.js';

const ADAPTER_VERSION = '1.1.0';
const BIDDER_CODE = 'displayio';
const BID_TTL = 300;
const SUPPORTED_AD_TYPES = [BANNER, VIDEO];
const DEFAULT_CURRENCY = 'USD';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.placementId && bid.params.siteId &&
      bid.params.adsSrvDomain && bid.params.cdnDomain);
  },
  buildRequests: function (bidRequests, bidderRequest) {
    return bidRequests.map(bid => {
      let url = '//' + bid.params.adsSrvDomain + '/srv?method=getPlacement&app=' +
        bid.params.siteId + '&placement=' + bid.params.placementId;
      const data = getPayload(bid, bidderRequest);
      return {
        method: 'POST',
        headers: {'Content-Type': 'application/json;charset=utf-8'},
        url,
        data
      };
    });
  },
  interpretResponse: function (serverResponse, serverRequest) {
    const ads = serverResponse.body.data.ads;
    const bidResponses = [];
    const { data } = serverRequest.data;
    if (ads.length) {
      const adData = ads[0].ad.data;
      const bidResponse = {
        requestId: data.id,
        cpm: adData.ecpm,
        width: adData.w,
        height: adData.h,
        netRevenue: true,
        ttl: BID_TTL,
        creativeId: adData.adId || 1,
        currency: adData.cur || DEFAULT_CURRENCY,
        referrer: data.data.ref,
        mediaType: ads[0].ad.subtype === 'videoVast' ? VIDEO : BANNER,
        ad: adData.markup,
        adUnitCode: data.adUnitCode,
        renderURL: data.renderURL,
        adData: adData
      };

      if (bidResponse.mediaType === VIDEO) {
        bidResponse.vastUrl = adData.videos[0] && adData.videos[0].url
      }

      if (bidResponse.renderURL) {
        bidResponse.renderer = newRenderer(bidResponse);
      }
      bidResponses.push(bidResponse);
    }
    return bidResponses;
  }
};

function getPayload (bid, bidderRequest) {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const userSession = 'us_web_xxxxxxxxxxxx'.replace(/[x]/g, c => {
    let r = Math.random() * 16 | 0;
    let v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  const { params, adUnitCode, bidId } = bid;
  const { siteId, placementId, renderURL, pageCategory, keywords } = params;
  const { refererInfo, uspConsent, gdprConsent } = bidderRequest;
  const mediation = {consent: '-1', gdpr: '-1'};
  if (gdprConsent && 'gdprApplies' in gdprConsent) {
    if (gdprConsent.consentString !== undefined) {
      mediation.consent = gdprConsent.consentString;
    }
    if (gdprConsent.gdprApplies !== undefined) {
      mediation.gdpr = gdprConsent.gdprApplies ? '1' : '0';
    }
  }
  return {
    userSession,
    data: {
      id: bidId,
      action: 'getPlacement',
      app: siteId,
      placement: placementId,
      adUnitCode,
      renderURL,
      data: {
        pagecat: pageCategory ? pageCategory.split(',').map(k => k.trim()) : [],
        keywords: keywords ? keywords.split(',').map(k => k.trim()) : [],
        lang_content: document.documentElement.lang,
        lang: window.navigator.language,
        domain: refererInfo.domain,
        page: refererInfo.page,
        ref: refererInfo.referer,
        userids: bid.userIdAsEids || {},
        geo: '',
      },
      complianceData: {
        child: '-1',
        us_privacy: uspConsent,
        dnt: window.doNotTrack === '1' || window.navigator.doNotTrack === '1' || false,
        iabConsent: {},
        mediation: {
          consent: mediation.consent,
          gdpr: mediation.gdpr,
        }
      },
      integration: 'JS',
      omidpn: 'Displayio',
      mediationPlatform: 0,
      prebidVersion: ADAPTER_VERSION,
      device: {
        w: window.screen.width,
        h: window.screen.height,
        connection_type: connection ? connection.effectiveType : '',
      }
    }
  }
}

function newRenderer(bid) {
  const renderer = Renderer.install({
    id: bid.requestId,
    url: bid.renderURL,
    adUnitCode: bid.adUnitCode
  });

  try {
    renderer.setRender(webisRender);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
  }

  return renderer;
}

function webisRender(bid, doc) {
  bid.renderer.push(() => {
    const win = getWindowFromDocument(doc) || window;
    win.webis.init(bid.adData, bid.adUnitCode, bid.params);
  })
}

registerBidder(spec);
