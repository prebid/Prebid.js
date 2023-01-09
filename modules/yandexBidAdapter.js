import { formatQS, deepAccess, triggerPixel, isArray, isNumber } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js'

const BIDDER_CODE = 'yandex';
const BIDDER_URL = 'https://bs.yandex.ru/metadsp';
const DEFAULT_TTL = 180;
const DEFAULT_CURRENCY = 'EUR';
const SSP_ID = 10500;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['ya'], // short code
  supportedMediaTypes: [ BANNER ],

  isBidRequestValid: function(bid) {
    const { params } = bid;
    if (!params) {
      return false;
    }
    const { pageId, impId } = extractPlacementIds(params);
    if (!(pageId && impId)) {
      return false;
    }
    const sizes = bid.mediaTypes?.banner?.sizes;
    return isArray(sizes) && isArray(sizes[0]) && isNumber(sizes[0][0]) && isNumber(sizes[0][1]);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const gdprApplies = deepAccess(bidderRequest, 'gdprConsent.gdprApplies');
    const consentString = deepAccess(bidderRequest, 'gdprConsent.consentString');

    let referrer = '';
    let domain = '';
    let page = '';

    if (bidderRequest && bidderRequest.refererInfo) {
      referrer = bidderRequest.refererInfo.ref;
      domain = bidderRequest.refererInfo.domain;
      page = bidderRequest.refererInfo.page;
    }

    let timeout = null;
    if (bidderRequest) {
      timeout = bidderRequest.timeout;
    }

    return validBidRequests.map((bidRequest) => {
      const { params } = bidRequest;
      const { targetRef, withCredentials = true } = params;
      const sizes = bidRequest.mediaTypes.banner.sizes;
      const size = sizes[0];
      const [ w, h ] = size;

      const { pageId, impId } = extractPlacementIds(params);

      const queryParams = {
        'imp-id': impId,
        'target-ref': targetRef || domain,
        'ssp-id': SSP_ID,
      };
      if (gdprApplies !== undefined) {
        queryParams['gdpr'] = 1;
        queryParams['tcf-consent'] = consentString;
      }

      const imp = {
        id: impId,
        banner: {
          format: sizes,
          w,
          h,
        }
      };

      if (bidRequest.getFloor) {
        const floorInfo = bidRequest.getFloor({
          currency: DEFAULT_CURRENCY,
          size
        });

        imp.bidfloor = floorInfo.floor;
        imp.bidfloorcur = floorInfo.currency;
      }

      const queryParamsString = formatQS(queryParams);
      return {
        method: 'POST',
        url: BIDDER_URL + `/${pageId}?${queryParamsString}`,
        data: {
          id: bidRequest.bidId,
          imp: [imp],
          site: {
            ref_url: referrer,
            page_url: page,
          },
          tmax: timeout,
        },
        options: {
          withCredentials,
        },
        bidRequest,
      };
    });
  },

  interpretResponse: function(serverResponse, {bidRequest}) {
    let response = serverResponse.body;
    if (!response.seatbid) {
      return [];
    }

    const { cur, seatbid } = serverResponse.body;
    const rtbBids = seatbid
      .map(seatbid => seatbid.bid)
      .reduce((a, b) => a.concat(b), []);

    return rtbBids.map(rtbBid => {
      let prBid = {
        requestId: bidRequest.bidId,
        cpm: rtbBid.price,
        currency: cur || DEFAULT_CURRENCY,
        width: rtbBid.w,
        height: rtbBid.h,
        creativeId: rtbBid.adid,
        nurl: rtbBid.nurl,

        netRevenue: true,
        ttl: DEFAULT_TTL,

        meta: {
          advertiserDomains: rtbBid.adomain && rtbBid.adomain.length > 0 ? rtbBid.adomain : [],
        }
      };

      prBid.ad = rtbBid.adm;

      return prBid;
    });
  },

  onBidWon: function (bid) {
    let nurl = bid['nurl'];
    if (!nurl) {
      return;
    }

    const cpm = deepAccess(bid, 'adserverTargeting.hb_pb') || '';
    const curr = (bid.hasOwnProperty('originalCurrency') && bid.hasOwnProperty('originalCpm'))
      ? bid.originalCurrency
      : bid.currency;

    nurl = nurl
      .replace(/\${AUCTION_PRICE}/, cpm)
      .replace(/\${AUCTION_CURRENCY}/, curr)
    ;

    triggerPixel(nurl);
  }
}

function extractPlacementIds(bidRequestParams) {
  const { placementId } = bidRequestParams;
  const result = { pageId: null, impId: null };

  let pageId, impId;
  if (placementId) {
    /*
     * Possible formats
     * R-I-123456-2
     * R-123456-1
     * 123456-789
     */
    const num = placementId.lastIndexOf('-');
    if (num === -1) {
      return result;
    }
    const num2 = placementId.lastIndexOf('-', num - 1);
    pageId = placementId.slice(num2 + 1, num);
    impId = placementId.slice(num + 1);
  } else {
    pageId = bidRequestParams.pageId;
    impId = bidRequestParams.impId;
  }

  if (!parseInt(pageId, 10) || !parseInt(impId, 10)) {
    return result;
  }

  result.pageId = pageId;
  result.impId = impId;

  return result;
}

registerBidder(spec);
