import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
const BIDDER_CODE = 'marsmedia';

function getDomain() {
  if (!utils.inIframe()) {
    return window.location.hostname
  }
  let origins = window.document.location.ancestorOrigins
  if (origins && origins.length > 0) {
    return origins[origins.length - 1]
  }
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['mars'],
  isBidRequestValid: function(bid) {
    return (bid.params.publisherID !== null);
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    try {
      let protocol = (window.location.protocol === 'https:');
      const parse = getSize(validBidRequests[0].sizes);
      const publisherId = validBidRequests[0].params.publisherID;
      const payload = {
        id: validBidRequests[0].bidId,
        cur: ['USD'],

        language: window.navigator.userLanguage || window.navigator.language,
        site: {
          id: publisherId,
          domain: getDomain(),
          page: document.URL,
          ref: document.referrer,
          publisher: {
            id: publisherId,
            domain: getDomain()
          }
        },
        imp: [{
          id: utils.getUniqueIdentifierStr(),
          banner: {
            w: parse.width,
            h: parse.height,
            secure: protocol
          },
          bidfloor: parseFloat(validBidRequests[0].params.floor) > 0 ? validBidRequests[0].params.floor : 0
        }],
        device: {
          ua: navigator.userAgent
        },
        user: {
          id: publisherId
        },
        publisher: {
          id: publisherId,
          domain: getDomain()
        }
      };

      if (bidderRequest && bidderRequest.gdprConsent) {
        payload.gdpr = {
          applies: bidderRequest.gdprConsent.gdprApplies,
          consent: bidderRequest.gdprConsent.consentString
        };
      }

      return {
        method: 'POST',
        url: '//bid306.rtbsrv.com/bidder/?bid=3mhdom',
        data: JSON.stringify(payload)
      };
    } catch (e) {
      utils.logError(e, {validBidRequests, bidderRequest});
    }
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    let res = serverResponse.body;
    if (!res) {
      return []
    }

    for (let x = 0; x < res.seatbid.length; x++) {
      var bidAd = res.seatbid[x].bid[0];

      bidResponses.push({
        requestId: res.id,
        cpm: Number(bidAd.price),
        width: bidAd.w,
        height: bidAd.h,
        ad: bidAd.adm,
        ttl: 60,
        creativeId: bidAd.cid,
        netRevenue: true,
        currency: 'USD'
      })
    }

    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    return [];
  }
};

function getSize(requestSizes) {
  const parsed = {};
  const size = utils.parseSizesInput(requestSizes)[0];

  if (typeof size !== 'string') {
    return parsed;
  }

  const parsedSize = size.toUpperCase().split('X');
  const width = parseInt(parsedSize[0], 10);
  if (width) {
    parsed.width = width;
  }

  const height = parseInt(parsedSize[1], 10);
  if (height) {
    parsed.height = height;
  }

  return parsed;
}

registerBidder(spec);
