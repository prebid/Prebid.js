import { config } from '../src/config';
import { registerBidder } from '../src/adapters/bidderFactory';
import * as utils from '../src/utils';
import { BANNER } from '../src/mediaTypes';

const SUPPORTED_AD_TYPES = [BANNER];
const BIDDER_CODE = 'openxoutstream';
const BIDDER_CONFIG = 'hb_pb_ym';
const BIDDER_VERSION = '1.0.1';
const CURRENCY = 'USD';
const NET_REVENUE = true;
const TIME_TO_LIVE = 300;
const YM_SCRIPT = `!function(e,t){if(void 0===t._ym){var a=Math.round(5*Math.random()/3)+'';t._ym='';var m=e.createElement('script');m.type='text/javascript',m.async=!0,m.src='//static.yieldmo.com/ym.'+a+'.js',(e.getElementsByTagName('head')[0]||e.getElementsByTagName('body')[0]).appendChild(m)}else t._ym instanceof String||void 0===t._ym.chkPls||t._ym.chkPls()}(document,window);`;
const PLACEMENT_ID = '1986307928000988495';
const PUBLISHER_ID = '1986307525700126029';
const CR_ID = '2052941939925262540';
const AD_ID = '1991358644725162800';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: function(bidRequest) {
    return !!(bidRequest.params.delDomain && bidRequest.params.unit)
  },
  buildRequests: function(bidRequests, bidderRequest) {
    if (bidRequests.length === 0) {
      return [];
    }
    let requests = [];
    bidRequests.forEach(bid => {
      requests.push(buildOXBannerRequest(bid, bidderRequest));
    })
    return requests;
  },
  interpretResponse: function(bid, serverResponse) {
    return handleVastResponse(bid, serverResponse.payload)
  },
};

function getViewportDimensions(isIfr) {
  let width;
  let height;
  let tWin = window;
  let body;

  if (isIfr) {
    let tDoc;
    try {
      tWin = window.top;
      tDoc = window.top.document;
    } catch (e) {
      return;
    }
    body = tDoc.body;

    width = tWin.innerWidth || docEl.clientWidth || body.clientWidth;
    height = tWin.innerHeight || docEl.clientHeight || body.clientHeight;
  } else {
    width = tWin.innerWidth || docEl.clientWidth;
    height = tWin.innerHeight || docEl.clientHeight;
  }

  return `${width}x${height}`;
}

function buildCommonQueryParamsFromBids(bid, bidderRequest) {
  const isInIframe = utils.inIframe();
  let defaultParams;
  const height = '184';
  const width = '414';
  const aus = '304x184%7C412x184%7C375x184%7C414x184';
  defaultParams = {
    ju: config.getConfig('pageUrl') || bidderRequest.refererInfo.referer,
    ch: document.charSet || document.characterSet,
    res: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    ifr: isInIframe,
    tz: new Date().getTimezoneOffset(),
    tws: getViewportDimensions(isInIframe),
    be: 1,
    bc: bid.params.bc || `${BIDDER_CONFIG}_${BIDDER_VERSION}`,
    auid: bid.params.unit,
    dddid: bid.transactionId,
    openrtb: '%7B%22mimes%22%3A%5B%22video%2Fmp4%22%5D%7D',
    nocache: new Date().getTime(),
    vht: height,
    vwd: width,
    aus: aus
  };

  if (utils.deepAccess(bidderRequest, 'gdprConsent')) {
    let gdprConsentConfig = bidderRequest.gdprConsent;

    if (gdprConsentConfig.consentString !== undefined) {
      defaultParams.gdpr_consent = gdprConsentConfig.consentString;
    }

    if (gdprConsentConfig.gdprApplies !== undefined) {
      defaultParams.gdpr = gdprConsentConfig.gdprApplies ? 1 : 0;
    }

    if (config.getConfig('consentManagement.cmpApi') === 'iab') {
      defaultParams.x_gdpr_f = 1;
    }
  }

  return defaultParams;
}

function buildOXBannerRequest(bid, bidderRequest) {
  let queryParams = buildCommonQueryParamsFromBids(bid, bidderRequest);

  if (bid.params.doNotTrack) {
    queryParams.ns = 1;
  }

  if (config.getConfig('coppa') === true || bid.params.coppa) {
    queryParams.tfcd = 1;
  }

  let url = `https://${bid.params.delDomain}/v/1.0/avjp`;
  return {
    method: 'GET',
    url: url,
    data: queryParams,
    payload: {'bid': bid}
  };
}

function handleVastResponse(response, serverResponse) {
  const body = response.body
  let bidResponses = [];
  if (response !== undefined && body.vastUrl !== '' && body.pub_rev && body.pub_rev > 0) {
    const openHtmlTag = '<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body>';
    const closeHtmlTag = '</body></html>';
    const sdkScript = createSdkScript().outerHTML;
    const placementDiv = createPlacementDiv();
    placementDiv.dataset.pId = PUBLISHER_ID;
    const placementDivString = placementDiv.outerHTML;
    const adResponse = getTemplateAdResponse(body.vastUrl);
    const adResponseString = JSON.stringify(adResponse);
    const ymAdsScript = '<script type="text/javascript"> window.__ymAds =' + adResponseString + '</script>';

    let bidResponse = {};
    bidResponse.requestId = serverResponse.bid.bidId;
    bidResponse.bidderCode = BIDDER_CODE;
    bidResponse.netRevenue = NET_REVENUE;
    bidResponse.currency = CURRENCY;
    bidResponse.cpm = Number(body.pub_rev) / 1000;
    bidResponse.creativeId = body.adid;
    bidResponse.height = body.height;
    bidResponse.width = body.width;
    bidResponse.vastUrl = body.vastUrl;
    bidResponse.ttl = TIME_TO_LIVE;
    bidResponse.mediaType = BANNER;
    bidResponse.ad = openHtmlTag + placementDivString + ymAdsScript + sdkScript + closeHtmlTag;

    bidResponses.push(bidResponse);
  }
  return bidResponses;
}
registerBidder(spec);

// HELPER FUNCTIONS
function createSdkScript() {
  const script = document.createElement('script');
  script.innerHTML = YM_SCRIPT;
  return script;
}
function createPlacementDiv() {
  const div = document.createElement('div');
  div.id = `ym_${PLACEMENT_ID}`;
  div.classList.add('ym');
  div.dataset.lfId = CR_ID;
  return div
}

/**
 * Create a nativeplay template with the placement id and vastURL.
 * @param vastUrl
 */
const getTemplateAdResponse = (vastUrl) => {
  return {
    loader: 'openxoutstream',
    availability_zone: '',
    data: [
      {
        ads: [
          {
            actions: {},
            adv_id: AD_ID,
            configurables: {
              cta_button_copy: 'Learn More',
              vast_click_tracking: 'true',
              vast_url: vastUrl,
            },
            cr_id: CR_ID,
          }
        ],
        column_count: 1,
        configs: {
          allowable_height: '248',
          header_copy: 'You May Like',
          ping: 'true',
        },
        creative_format_id: 40,
        css: '',
        placement_id: PLACEMENT_ID,
      }
    ],
    nc: 0,
  };
};
