import {
  _each,
  isStr,
  getBidIdParameter,
  triggerPixel,
  logWarn,
  deepSetValue,
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'setupad';
const ENDPOINT = 'https://prebid.setupad.io/openrtb2/auction';
const SYNC_ENDPOINT = 'https://cookie.stpd.cloud/sync?';
const REPORT_ENDPOINT = 'https://adapter-analytics.setupad.io/api/adapter-analytics?';
const GVLID = 1241;
const TIME_TO_LIVE = 360;
export const biddersCreativeIds = {}; // export only for tests
const NET_REVENUE = true;
const TEST_REQUEST = 0; // used only for testing

const converter = ortbConverter({
  context: {
    netRevenue: NET_REVENUE,
    ttl: TIME_TO_LIVE,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    deepSetValue(
      imp,
      'ext.prebid.storedrequest.id',
      getBidIdParameter('placement_id', bidRequest.params)
    );
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    deepSetValue(request, 'test', TEST_REQUEST);
    deepSetValue(
      request,
      'ext.prebid.storedrequest.id',
      getBidIdParameter(
        'account_id',
        bidderRequest.bids.find((bid) => bid.hasOwnProperty('params')).params
      )
    );
    deepSetValue(request, 'setupad', 'adapter');
    return request;
  },
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  gvlid: GVLID,

  isBidRequestValid: function (bid) {
    return !!(
      bid.params.placement_id &&
      isStr(bid.params.placement_id) &&
      bid.params.account_id &&
      isStr(bid.params.account_id)
    );
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const data = converter.toORTB({ validBidRequests, bidderRequest });

    return {
      method: 'POST',
      url: ENDPOINT,
      data,
      options: {
        contentType: 'text/plain',
        withCredentials: true,
      },
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    if (
      !serverResponse ||
      !serverResponse.body ||
      typeof serverResponse.body !== 'object' ||
      Object.keys(serverResponse.body).length === 0
    ) {
      logWarn('no response or body is malformed');
      return [];
    }

    // set a seat for creativeId for triggerPixel url
    _each(serverResponse.body.seatbid, (res) => {
      _each(res.bid, (bid) => {
        biddersCreativeIds[bid.crid] = res.seat;
      });
    });

    // used for a test case "should update biddersCreativeIds correctly" to return early and not throw ORTB error
    if (serverResponse.testCase === 1) return;

    const bids = converter.fromORTB({
      response: serverResponse.body,
      request: bidRequest.data,
    }).bids;

    return bids;
  },

  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent) {
    if (!responses?.length) return [];

    const syncs = [];
    const bidders = getBidders(responses);

    if (syncOptions.iframeEnabled && bidders) {
      const queryParams = [];

      queryParams.push(`bidders=${bidders}`);
      queryParams.push('gdpr=' + +gdprConsent?.gdprApplies);
      queryParams.push('gdpr_consent=' + gdprConsent?.consentString);
      queryParams.push('usp_consent=' + (uspConsent || ''));

      const strQueryParams = queryParams.join('&');

      syncs.push({
        type: 'iframe',
        url: SYNC_ENDPOINT + strQueryParams + '&type=iframe',
      });

      return syncs;
    }

    return [];
  },

  onBidWon: function (bid) {
    let bidder = bid.bidder || bid.bidderCode;
    const auctionId = bid.auctionId;

    let params;
    if (bid.params) {
      params = Array.isArray(bid.params) ? bid.params : [bid.params];
    } else {
      if (Array.isArray(bid.bids)) {
        params = bid.bids.map((singleBid) => singleBid.params);
      }
    }

    if (!params?.length) return;

    const placementIdsArray = [];
    params.forEach((param) => {
      if (!param.placement_id) return;
      placementIdsArray.push(param.placement_id);
    });

    const placementIds = (placementIdsArray.length && placementIdsArray.join(';')) || '';

    if (!placementIds) return;

    // find the winning bidder by using creativeId as identification
    if (biddersCreativeIds.hasOwnProperty(bid.creativeId) && biddersCreativeIds[bid.creativeId]) {
      bidder = biddersCreativeIds[bid.creativeId];
    }

    const queryParams = [];
    queryParams.push(`event=bidWon`);
    queryParams.push('bidder=' + bidder);
    queryParams.push('placementIds=' + placementIds);
    queryParams.push('auctionId=' + auctionId);
    queryParams.push('cpm=' + bid.originalCpm);
    queryParams.push('currency=' + bid.originalCurrency);
    queryParams.push('timestamp=' + Date.now());

    const strQueryParams = queryParams.join('&');

    const url = REPORT_ENDPOINT + strQueryParams;
    triggerPixel(url);
  },
};

function getBidders(serverResponse) {
  const bidders = serverResponse
    .map((res) => Object.keys(res.body.ext.responsetimemillis || []))
    .flat(1);

  if (bidders.length) {
    return encodeURIComponent(JSON.stringify([...new Set(bidders)]));
  }
}

registerBidder(spec);
