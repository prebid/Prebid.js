import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

const BIDDER_VERSION = '1.0.0';
const BIDDER_CODE = 'displayio';
const GVLID = 999;
const BID_TTL = 300;
const SUPPORTED_AD_TYPES = [BANNER, VIDEO];
const DEFAULT_CURRENCY = 'USD';

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.placementId && bid.params.siteId &&
      bid.params.adsSrvDomain && bid.params.cdnDomain);
  },
  buildRequests: function (bidRequests, bidderRequest) {
    return bidRequests.map(bid => {
      let url = '//' + bid.params.adsSrvDomain + '/srv?method=getPlacement&app=' +
        bid.params.siteId + '&placement=' + bid.params.placementId;
      const data = this._getPayload(bid, bidderRequest);
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
        creativeId: adData.adId || 0,
        currency: DEFAULT_CURRENCY,
        referrer: data.data.ref,
        mediaType: ads[0].ad.subtype,
        ad: adData.markup,
        placement: data.placement,
        adData: adData
      };
      if (bidResponse.vastUrl === 'videoVast') {
        bidResponse.vastUrl = adData.videos[0].url
      }
      bidResponses.push(bidResponse);
    }
    return bidResponses;
  },
  _getPayload: function (bid, bidderRequest) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const userSession = 'us_web_xxxxxxxxxxxx'.replace(/[x]/g, c => {
      let r = Math.random() * 16 | 0;
      let v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    const { params } = bid;
    const { siteId, placementId } = params;
    const { refererInfo, uspConsent, gdprConsent } = bidderRequest;
    const mediation = {consent: '-1', gdpr: '-1'};
    if (gdprConsent) {
      if (gdprConsent.consentString !== undefined) {
        mediation.consent = gdprConsent.consentString;
      }
      if (gdprConsent.gdprApplies !== undefined) {
        mediation.gdpr = gdprConsent.gdprApplies ? '1' : '0';
      }
    }
    const payload = {
      userSession,
      data: {
        id: bid.bidId,
        action: 'getPlacement',
        app: siteId,
        placement: placementId,
        data: {
          pagecat: params.pageCategory ? params.pageCategory.split(',').map(k => k.trim()) : [],
          keywords: params.keywords ? params.keywords.split(',').map(k => k.trim()) : [],
          lang_content: document.documentElement.lang,
          lang: window.navigator.language,
          // TODO: are these the correct refererInfo values?
          domain: refererInfo.domain,
          page: refererInfo.page,
          ref: refererInfo.ref,
          userids: _getUserIDs(),
          geo: '',
        },
        complianceData: {
          child: '-1',
          us_privacy: uspConsent,
          dnt: window.navigator.doNotTrack,
          iabConsent: {},
          mediation: {
            consent: mediation.consent,
            gdpr: mediation.gdpr,
          }
        },
        integration: 'JS',
        omidpn: 'Displayio',
        mediationPlatform: 0,
        prebidVersion: BIDDER_VERSION,
        device: {
          w: window.screen.width,
          h: window.screen.height,
          connection_type: connection ? connection.effectiveType : '',
        }
      }
    }
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((result) => {
          if (result.state === 'granted') {
            payload.data.data.geo = _getGeoData();
          }
        });
    }
    return payload
  }
};

function _getUserIDs () {
  let ids = {};
  try {
    ids = window.owpbjs.getUserIdsAsEids();
  } catch (e) {}
  return ids;
}

async function _getGeoData () {
  let geoData = null;
  const getCurrentPosition = () => {
    return new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject)
    );
  }
  try {
    const position = await getCurrentPosition();
    let {latitude, longitude, accuracy} = position.coords;
    geoData = {
      'lat': latitude,
      'lng': longitude,
      'precision': accuracy
    };
  } catch (e) {}
  return geoData
}

registerBidder(spec);
