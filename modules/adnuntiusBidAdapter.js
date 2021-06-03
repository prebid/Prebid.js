import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'adnuntius';
const ENDPOINT_URL = 'https://delivery.adnuntius.com/i?tzo=';
const GVLID = 855;

const checkSegment = function (segment) {
  if (utils.isStr(segment)) return segment;
  if (segment.id) return segment.id
}

const getSegmentsFromOrtb = function (ortb2) {
  const userData = utils.deepAccess(ortb2, 'user.data');
  let segments = [];
  if (userData) {
    userData.forEach(userdat => {
      if (userdat.segment) {
        segments.push(...userdat.segment.filter(checkSegment).map(checkSegment));
      }
    });
  }
  return segments
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bid) {
    return !!(bid.bidId || (bid.params.member && bid.params.invCode));
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const networks = {};
    const bidRequests = {};
    const requests = [];
    const ortb2 = config.getConfig('ortb2');
    const segments = getSegmentsFromOrtb(ortb2);
    const tzo = new Date().getTimezoneOffset();
    const gdprApplies = utils.deepAccess(bidderRequest, 'gdprConsent.gdprApplies');
    const consentString = utils.deepAccess(bidderRequest, 'gdprConsent.consentString');
    const reqConsent = (gdprApplies !== undefined) ? '&consentString=' + consentString : '';
    const reqSegments = (segments.length > 0) ? '&segments=' + segments.join(',') : '';

    for (var i = 0; i < validBidRequests.length; i++) {
      const bid = validBidRequests[i]
      const network = bid.params.network || 'network';
      const targeting = bid.params.targeting || {};

      bidRequests[network] = bidRequests[network] || [];
      bidRequests[network].push(bid);

      networks[network] = networks[network] || {};
      networks[network].adUnits = networks[network].adUnits || [];
      networks[network].adUnits.push({ ...targeting, auId: bid.params.auId, targetId: bid.bidId });
    }

    const networkKeys = Object.keys(networks)
    for (var j = 0; j < networkKeys.length; j++) {
      const network = networkKeys[j];
      requests.push({
        method: 'POST',
        url: ENDPOINT_URL + tzo + '&format=json' + reqSegments + reqConsent,
        data: JSON.stringify(networks[network]),
        bid: bidRequests[network]
      });
    }

    return requests;
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const adUnits = serverResponse.body.adUnits;
    const bidResponsesById = adUnits.reduce((response, adUnit) => {
      if (adUnit.matchedAdCount >= 1) {
        const bid = adUnit.ads[0];
        const effectiveCpm = (bid.cpc && bid.cpm) ? bid.bid.amount + bid.cpm.amount : (bid.cpc) ? bid.bid.amount : (bid.cpm) ? bid.cpm.amount : 0;
        return {
          ...response,
          [adUnit.targetId]: {
            requestId: adUnit.targetId,
            cpm: effectiveCpm,
            width: Number(bid.creativeWidth),
            height: Number(bid.creativeHeight),
            creativeId: bid.creativeId,
            currency: (bid.bid) ? bid.bid.currency : 'EUR',
            meta: {
              advertiserDomains: (bid.destinationUrls.destination) ? [bid.destinationUrls.destination.split('/')[2]] : []

            },
            netRevenue: false,
            ttl: 360,
            ad: adUnit.html
          }
        }
      } else return response
    }, {});

    const bidResponse = bidRequest.bid.map(bid => bid.bidId).reduce((request, adunitId) => {
      if (bidResponsesById[adunitId]) { request.push(bidResponsesById[adunitId]) }
      return request
    }, []);

    return bidResponse
  },

}
registerBidder(spec);
