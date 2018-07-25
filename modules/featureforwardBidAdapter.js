import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

export const spec = {
  code: 'featureforward',
  supportedMediaTypes: ['banner', 'video', 'native'],
  isBidRequestValid: function isBidRequestValid(bid) {
    if (bid.pubId == '000') {
      return false;
    }
    return true;
  },
  buildRequests: function(bidReqs) {
    try {
      var a = getRealDomain();
    } catch (err) {
      a = ' ';
    }
    let featureforwardImps = [];
    utils._each(bidReqs, function (bid) {
      featureforwardImps.push({
        fullBid: JSON.stringify(bid),
        bidderRequestId: bid.bidderRequestId,
        aucId: bid.auctionId,
        bidId: bid.bidId,
        sizes: bid.sizes[0],
        siteId: bid.siteId,
        pubId: bid.pubId,
        placementId: bid.plcemantId,
      });
    });
    const featureforwardBidReq = {
      id: utils.getUniqueIdentifierStr(),
      imp: featureforwardImps,
      site: {
        domain: window.location.host,
        detectedUrl: a,
        page: window.location.pathname + location.search + location.hash,
      }
    };
    return {
      method: 'POST',
      url: `//prmbdr.featureforward.com/newbidder/bidder1_pb1.php?`,
      data: JSON.stringify(featureforwardBidReq),
      options: {contentType: 'text/plain'}
    };
  },

  interpretResponse: function(body) {
    console.log('dan ff response ' + JSON.stringify(body.body));
    var bd = JSON.parse(JSON.stringify(body.body));
    var featureforwardBidResponses = [];
    featureforwardBidResponses.push({
      requestId: bd.bidId,
      cpm: parseFloat(bd.bidCpm),
      width: parseInt(bd.width),
      height: parseInt(bd.height),
      creativeId: bd.crid,
      dealId: bd.dealId || null,
      currency: bd.currency,
      netRevenue: bd.netRevenue,
      mediaType: bd.mediaType,
      ad: bd.ad,
      ttl: bd.ttl
    });
    console.log('proccessed response ' + JSON.stringify(featureforwardBidResponses));
    return featureforwardBidResponses;
  }
};

function gr(a) {
  var b = false;
  if (a.parent !== a) {
    b = gr(a.parent);
  }
  if (!b) {
    try {
      b = a.document.referrer;
    } catch (e) {
      b = false;
    }
  }
  return b;
}

function getRealDomain() {
  if (parent !== window) {
    var u = gr(this);
    if (window.location.ancestorOrigins) {
      var u2 = window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1];
      if (u2) {
        if (u.substring(0, u2.length) != u2) {
          u = u2
        }
      }
    }
  } else {
    u = top.location.href;
    console.log(u);
  }
  return u;
}

registerBidder(spec);
