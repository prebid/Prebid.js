
import {logError, getTopWindowLocation, getTopWindowReferrer, parseSizesInput} from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

export const spec = {

  code: 'kumma',

  isBidRequestValid: bid => (
    !!(bid && bid.params && bid.params.pubId && bid.params.siteId)
  ),
  buildRequests: bidRequests => {
    const request = {
      id: bidRequests[0].bidderRequestId,
      at: 2,
      imp: bidRequests.map(slot => impression(slot)),
      site: site(bidRequests),
      device: device(),
    };
    return {
      method: 'POST',
      url: '//hb.kumma.com/',
      data: JSON.stringify(request),
    };
  },
  interpretResponse: (response, request) => (
    bidResponseAvailable(request, response.body)
  ),
};
function bidResponseAvailable(bidRequest, bidResponse) {
  const idToImpMap = {};
  const idToBidMap = {};
  let ortbRequest = null;
  try {
    ortbRequest = JSON.parse(bidRequest.data);
  } catch (ex) {
    logError('kumma.parse', 'ERROR', ex);
  }
  ortbRequest.imp.forEach(imp => {
    idToImpMap[imp.id] = imp;
  });
  if (bidResponse) {
    bidResponse.seatbid.forEach(seatBid => seatBid.bid.forEach(bid => {
      idToBidMap[bid.impid] = bid;
    }));
  }
  const bids = [];
  Object.keys(idToImpMap).forEach(id => {
    if (idToBidMap[id]) {
      const bid = {};
      bid.requestId = id;
      bid.creativeId = idToBidMap[id].adid;
      bid.cpm = idToBidMap[id].price;
      bid.currency = bidResponse.cur;
      bid.ttl = 360;
      bid.netRevenue = true;
      bid.ad = idToBidMap[id].adm;
      bid.ad = bid.ad.replace(/\$(%7B|\{)AUCTION_IMP_ID(%7D|\})/gi, idToBidMap[id].impid);
      bid.ad = bid.ad.replace(/\$(%7B|\{)AUCTION_AD_ID(%7D|\})/gi, idToBidMap[id].adid);
      bid.ad = bid.ad.replace(/\$(%7B|\{)AUCTION_PRICE(%7D|\})/gi, idToBidMap[id].price);
      bid.ad = bid.ad.replace(/\$(%7B|\{)AUCTION_CURRENCY(%7D|\})/gi, bidResponse.cur);
      bid.ad = bid.ad.replace(/\$(%7B|\{)AUCTION_BID_ID(%7D|\})/gi, bidResponse.bidid);
      bid.width = idToImpMap[id].banner.w;
      bid.height = idToImpMap[id].banner.h;
      bids.push(bid);
    }
  });
  return bids;
}
function impression(slot) {
  return {
    id: slot.bidId,
    banner: banner(slot),
    bidfloor: slot.params.bidFloor || '0.000001',
    tagid: slot.params.placementId.toString(),
  };
}
function banner(slot) {
  const size = parseSizesInput(slot.sizes)[0].split('x');
  const width = parseInt(size[0]);
  const height = parseInt(size[1]);
  return {
    w: width,
    h: height,
  };
}
function site(bidderRequest) {
  const pubId = bidderRequest && bidderRequest.length > 0 ? bidderRequest[0].params.pubId : '0';
  const siteId = bidderRequest && bidderRequest.length > 0 ? bidderRequest[0].params.siteId : '0';
  const appParams = bidderRequest[0].params.app;
  if (!appParams) {
    return {
      publisher: {
        id: pubId.toString(),
        domain: getTopWindowLocation().hostname,
      },
      id: siteId.toString(),
      ref: getTopWindowReferrer(),
      page: getTopWindowLocation().href,
    }
  }
  return null;
}
function device() {
  return {
    ua: navigator.userAgent,
    language: (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage),
    w: (window.screen.width || window.innerWidth),
    h: (window.screen.height || window.innerHeigh),
  };
}

registerBidder(spec);
