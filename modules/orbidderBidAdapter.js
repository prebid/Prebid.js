import {detectReferer} from 'src/refererDetection';
import {ajax} from 'src/ajax';
import {registerBidder} from 'src/adapters/bidderFactory';

export const spec = {
  code: 'orbidder',
  orbidderHost: (() => {
    let ret = 'https://orbidder.otto.de';
    try {
      ret = localStorage.getItem('ov_orbidder_host') || ret;
    } catch (e) {
    }
    return ret;
  })(),

  isBidRequestValid(bid) {
    return !!(bid.sizes && bid.bidId);
  },

  buildRequests(validBidRequests, bidderRequest) {
    return validBidRequests.map((bidRequest) => {
      let referer = '';
      if (bidderRequest && bidderRequest.refererInfo) {
        referer = bidderRequest.refererInfo.referer || '';
      }
      const ret = {
        url: `${this.orbidderHost}/bid`,
        method: 'POST',
        data: {
          pageUrl: referer,
          bidId: bidRequest.bidId,
          auctionId: bidRequest.auctionId,
          transactionId: bidRequest.transactionId,
          adUnitCode: bidRequest.adUnitCode,
          sizes: bidRequest.sizes,
          params: bidRequest.params
        }
      };
      if (bidRequest && bidRequest.gdprConsent) {
        ret.data.gdprConsent = {
          consentString: bidRequest.gdprConsent.consentString,
          consentRequired: (typeof bidRequest.gdprConsent.gdprApplies === 'boolean')
            ? bidRequest.gdprConsent.gdprApplies
            : true
        };
      }
      return ret;
    });
  },

  interpretResponse(serverResponse) {
    const bidResponses = [];
    serverResponse = serverResponse.body;
    if (serverResponse && (serverResponse.length > 0)) {
      serverResponse.forEach((bid) => {
        const bidResponse = {};
        for (const requiredKey of ['requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId', 'netRevenue', 'currency']) {
          if (!bid.hasOwnProperty(requiredKey)) {
            return [];
          }
          bidResponse[requiredKey] = bid[requiredKey];
        }
        bidResponses.push(bidResponse);
      });
    }
    return bidResponses;
  },

  onBidWon(winObj) {
    const getRefererInfo = detectReferer(window);
    const refererInfo = getRefererInfo();
    winObj.pageUrl = refererInfo.referer;
    ajax(`${this.orbidderHost}/win`, null, JSON.stringify(winObj));
  }
};

registerBidder(spec);
