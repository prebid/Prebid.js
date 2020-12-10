import { registerBidder } from '../src/adapters/bidderFactory.js';
const BIDDER_CODE = 'adnuntius';
const ENDPOINT_URL = 'https://delivery.adnuntius.com/';

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function (bid) {
    return !!(bid.params.auId || (bid.params.member && bid.params.invCode));
  },

  buildRequests: function (validBidRequests) {
    const networks = {};
    const bidRequests = {};
    const requests = [];
    let tzo = '0'

    for (var i = 0; i < validBidRequests.length; i++) {
      const bid = validBidRequests[i]
      const network = bid.params.network || 'network';
      bidRequests[network] = bidRequests[network] || [];
      bidRequests[network].push(bid);

      networks[network] = networks[network] || {};
      networks[network].adUnits = networks[network].adUnits || [];
      networks[network].adUnits.push({ ...bid.params.targeting, auId: bid.params.auId });
      tzo = bid.params.tzo || '0'
    }

    const tzo = bid.params.tzo || '0'

    const networkKeys = Object.keys(networks)
    for (var j = 0; j < networkKeys.length; j++) {
      const network = networkKeys[j];
      requests.push({
        method: 'POST',
        url: ENDPOINT_URL + 'i?tzo=' + tzo + '&format=json',
        data: JSON.stringify(networks[network]),
        bid: bidRequests[network]
      });
    }

    return requests;
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const serverBody = serverResponse.body;

    for (var k = 0; k < serverBody.adUnits.length; k++) {
      const adUnit = serverBody.adUnits[k]
      if (adUnit.matchedAdCount > 0) {
        const bid = adUnit.ads[0];
        bidResponses.push({
          requestId: bidRequest.bid[k].bidId,
          cpm: (bid.cpm) ? bid.cpm.amount : (bid.cpc) ? bid.bid.amount : 0,
          width: Number(bid.creativeWidth),
          height: Number(bid.creativeHeight),
          creativeId: bid.creativeId,
          currency: (bid.cpm) ? bid.cpm.currency : (bid.cpc) ? bid.cpc.currency : 'USD',
          netRevenue: false,
          ttl: 360,
          ad: adUnit.html
        });
      }
    }
    return bidResponses;
  },

}
registerBidder(spec);
