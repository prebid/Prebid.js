import { registerBidder } from '../src/adapters/bidderFactory';
import { config } from '../src/config';
import * as utils from '../src/utils';

const BIDDER_CODE = 'contentignite';

export const spec = {
  code: BIDDER_CODE,
  pageID: Math.floor(Math.random() * 10e6),

  isBidRequestValid: (bid) => {
    return !!(bid.params.accountID && bid.params.zoneID);
  },

  buildRequests: (validBidRequests) => {
    let i;
    let zoneID;
    let bidRequest;
    let accountID;
    let keyword;
    let requestURI;
    const serverRequests = [];
    const zoneCounters = {};

    for (i = 0; i < validBidRequests.length; i++) {
      bidRequest = validBidRequests[i];
      zoneID = utils.getBidIdParameter('zoneID', bidRequest.params);
      accountID = utils.getBidIdParameter('accountID', bidRequest.params);
      keyword = utils.getBidIdParameter('keyword', bidRequest.params);

      if (!(zoneID in zoneCounters)) {
        zoneCounters[zoneID] = 0;
      }

      requestURI =
        location.protocol + '//serve.connectignite.com/adserve/;type=hbr;';
      requestURI += `ID=${encodeURIComponent(accountID)};`;
      requestURI += `setID=${encodeURIComponent(zoneID)};`;
      requestURI += `pid=${spec.pageID};`;
      requestURI += `place=${encodeURIComponent(zoneCounters[zoneID])};`;

      // append the keyword for targeting if one was passed in
      if (keyword !== '') {
        requestURI += `kw=${encodeURIComponent(keyword)};`;
      }

      zoneCounters[zoneID]++;
      serverRequests.push({
        method: 'GET',
        url: requestURI,
        data: {},
        bidRequest: bidRequest
      });
    }
    return serverRequests;
  },

  // tslint:disable-next-line:cyclomatic-complexity
  interpretResponse: (serverResponse, bidRequest) => {
    const bidObj = bidRequest.bidRequest;
    const bidResponses = [];
    const bidResponse = {};
    let isCorrectSize = false;
    let isCorrectCPM = true;
    let cpm;
    let minCPM;
    let maxCPM;
    let width;
    let height;

    serverResponse = serverResponse.body;
    if (serverResponse && serverResponse.status === 'SUCCESS' && bidObj) {
      cpm = serverResponse.cpm;
      minCPM = utils.getBidIdParameter('minCPM', bidObj.params);
      maxCPM = utils.getBidIdParameter('maxCPM', bidObj.params);
      width = parseInt(serverResponse.width);
      height = parseInt(serverResponse.height);

      // Ensure response CPM is within the given bounds
      if (minCPM !== '' && cpm < parseFloat(minCPM)) {
        isCorrectCPM = false;
        utils.logWarn('ContentIgnite: CPM did not meet minCPM requirements.');
      } else if (maxCPM !== '' && cpm > parseFloat(maxCPM)) {
        isCorrectCPM = false;
        utils.logWarn('ContentIgnite: CPM did not meet maxCPM requirements.');
      }

      // Ensure that response ad matches one of the placement sizes.
      utils._each(bidObj.sizes, (size) => {
        if (width === size[0] && height === size[1]) {
          isCorrectSize = true;
        } else {
          utils.logWarn(
            'ContentIgnite: Returned ad is of a different size to that requested.'
          );
        }
      });
      if (isCorrectCPM && isCorrectSize) {
        bidResponse.requestId = bidObj.bidId;
        bidResponse.creativeId = serverResponse.placement_id;
        bidResponse.cpm = cpm;
        bidResponse.width = width;
        bidResponse.height = height;
        bidResponse.ad = serverResponse.ad_code;
        bidResponse.currency = 'USD';
        bidResponse.netRevenue = true;
        bidResponse.ttl = config.getConfig('_bidderTimeout');
        bidResponse.referrer = utils.getTopWindowUrl();
        bidResponses.push(bidResponse);
      }
    }
    return bidResponses;
  }
};
registerBidder(spec);
