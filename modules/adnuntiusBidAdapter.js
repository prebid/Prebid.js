import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'adnuntius';
const ENDPOINT_URL = 'https://delivery.adnuntius.com/i?tzo=';

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function (bid) {
    return !!(bid.bidId || (bid.params.member && bid.params.invCode));
  },

  buildRequests: function (validBidRequests) {
    const networks = {};
    const bidRequests = {};
    const requests = [];
    const tzo = new Date().getTimezoneOffset();

    for (var i = 0; i < validBidRequests.length; i++) {
      const bid = validBidRequests[i]
      const network = bid.params.network || 'network';
      bidRequests[network] = bidRequests[network] || [];
      bidRequests[network].push(bid);

      networks[network] = networks[network] || {};
      networks[network].adUnits = networks[network].adUnits || [];
      networks[network].adUnits.push({ ...bid.params.targeting, auId: bid.params.auId, targetId: bid.bidId });
    }

    const networkKeys = Object.keys(networks)
    for (var j = 0; j < networkKeys.length; j++) {
      const network = networkKeys[j];
      requests.push({
        method: 'POST',
        url: ENDPOINT_URL + tzo + '&format=json',
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
