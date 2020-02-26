// import * as utils from 'src/utils';
// import { config } from 'src/config';
import { registerBidder } from '../src/adapters/bidderFactory.js';
const BIDDER_CODE = 'adnuntius';
const ENDPOINT_URL = 'https://delivery.adnuntius.com/i?tzo=-60&format=json';

const getTopWindowReferrer = () => {
  try {
    return window.top.document.referrer;
  } catch (e) {
    return '';
  }
}

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function (bid) {
    return !!(bid.params.auId || (bid.params.member && bid.params.invCode));
  },

  buildRequests: function (validBidRequests) {
    const networks = {}
    const bidRequests = {}
    const requests = []

    for (const bid of validBidRequests) {
      const network = bid.params.network
      bidRequests[network] = bidRequests[network] || []
      bidRequests[network].push(bid)

      networks[network] = networks[network] || {}
      networks[network].adUnits = networks[network].adUnits || []
      networks[network].adUnits.push({ ...bid.params.targeting, auId: bid.params.auId })
    }

    for (const network in networks) {
      requests.push({
        method: 'POST',
        url: ENDPOINT_URL,
        data: JSON.stringify(networks[network]),
        bid: bidRequests[network]
      })
    }

    return requests;
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const serverBody = serverResponse.body;

    for (const [i, adUnit] of serverBody.adUnits.entries()) {
      if (adUnit.matchedAdCount > 0) {
        const bid = adUnit.ads[0]
        bidResponses.push({
          requestId: bidRequest.bid[i].bidId,
          cpm: (bid.cpm) ? bid.cpm.amount : 0,
          width: Number(bid.creativeWidth),
          height: Number(bid.creativeHeight),
          creativeId: bid.creativeId,
          currency: (bid.cpm) ? bid.cpm.currency : 'EUR',
          netRevenue: false,
          ttl: 360,
          referrer: getTopWindowReferrer(),
          ad: adUnit.html
        });
      }
    }
    // const headerValue = serverResponse.headers.get('some-response-header');
    console.log('RESPONSES', bidResponses)
    return bidResponses;
  },

  // getUserSyncs: function(syncOptions, serverResponses) {
  //   const syncs = []
  //   if (syncOptions.iframeEnabled) {
  //     syncs.push({
  //       type: 'iframe',
  //       url: '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html'
  //     });
  //   }
  //   if (syncOptions.pixelEnabled && serverResponses.length > 0) {
  //     syncs.push({
  //       type: 'image',
  //       url: serverResponses[0].body.userSync.url
  //     });
  //   }
  //   return syncs;
  // },

  // onTimeout: function(data) {
  //   // Bidder specifc code
  // },

  // onBidWon: function(bid) {
  //   // Bidder specific code
  // },
  // onSetTargeting: function(bid) {
  //   // Bidder specific code
  // }
}
registerBidder(spec);
