import {registerBidder} from 'src/adapters/bidderFactory';
const BIDDER_CODE = 'justpremium';
// const ENDPOINT_URL = 'http://pre.ads.justpremium.com/v/2.0/t/ixhr';
const ENDPOINT_URL = 'http://localhost:63342/header-bidder/public/xhr.txt';

export const spec = {
  code: BIDDER_CODE,
  time: 60000,
  aliases: ['jpx'], // short code
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.zone);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests) {
    const c = preparePubCond(validBidRequests);
    const payload = {
      zone: [...new Set(validBidRequests.map(b => parseInt(b.params.zone)))].join(','),
      hostname: top.document.location.hostname,
      protocol: top.document.location.protocol.replace(':', ''),
      sw: window.top.screen.width,
      sh: window.top.screen.height,
      ww: window.top.innerWidth,
      wh: window.top.innerHeight,
      c: encodeURIComponent(JSON.stringify(c)),
      id: validBidRequests[0].params.zone,
      i: (+new Date())
    };

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString,
      bidRequests: validBidRequests
    }
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    const allRequests = Object.keys(bidRequest.bidRequests);

    allRequests.forEach(function (key) {
      const adUnit = bidRequest.bidRequests[key].params;
      const bidId = bidRequest.bidRequests[key].bidId;
      const bid = findBid(adUnit, serverResponse.bid);

      if (bid) {
        const bidResponse = {
          requestId: bidId,
          bidderCode: spec.code,
          width: bid.width,
          height: bid.height,
          ad: bid.adm,
          cpm: bid.price,
          currency: 'USD',
          ttl: spec.time,
        };
        bidResponses.push(bidResponse);
      }
    });

    return bidResponses;
  },

  getUserSyncs: function(syncOptions) {
    // if (syncOptions.iframeEnabled) {
    return [{
      type: 'iframe',
      url: top.document.location.protocol + '//ox-d.justpremium.com/w/1.0/cj'
    }];
    // }
  }
}

function findBid(params, bids) {
  var tagId = params.zone;
  if (bids[tagId]) {
    var len = bids[tagId].length;
    while (len--) {
      if (passCond(params, bids[tagId][len])) {
        return bids[tagId].splice(len, 1).pop();
      }
    }
  }

  return false;
};

function passCond(params, bid) {
  var format = bid.format;

  if (params.allow && params.allow.length) {
    return params.allow.indexOf(format) > -1;
  }

  if (params.exclude && params.exclude.length) {
    return params.exclude.indexOf(format) < 0;
  }

  return true;
};

function preparePubCond(bids) {
  const cond = {};
  const count = {};

  bids.forEach(function (bid) {
    const params = bid.params || {};
    const zone = params.zone;

    if (!zone) {
      throw new Error('JustPremium: Bid should contains zone id.');
    }

    if (cond[zone] === 1) {
      return;
    }

    const allow = params.allow || params.formats || [];
    const exclude = params.exclude || [];

    if (allow.length === 0 && exclude.length === 0) {
      return cond[params.zone] = 1;
    }

    cond[zone] = cond[zone] || [[], {}];
    cond[zone][0] = arrayUnique(cond[zone][0].concat(allow));
    exclude.forEach(function (e) {
      if (!cond[zone][1][e]) {
        cond[zone][1][e] = 1;
      } else cond[zone][1][e]++;
    });

    count[zone] = count[zone] || 0;
    if (exclude.length) count[zone]++;
  });

  Object.keys(count).forEach(zone => {
    if (cond[zone] === 1) return;

    const exclude = [];
    Object.keys(cond[zone][1]).forEach(format => {
      if (cond[zone][1][format] === count[zone]) exclude.push(format);
    });
    cond[zone][1] = exclude;
  });

  Object.keys(cond).forEach(zone => {
    if (cond[zone] !== 1 && cond[zone][1].length) {
      cond[zone][0].forEach(r => {
        var idx = cond[zone][1].indexOf(r);
        if (idx > -1) {
          cond[zone][1].splice(idx, 1);
        }
      });
      cond[zone][0].length = 0;
    }

    if (cond[zone] !== 1 && !cond[zone][0].length && !cond[zone][1].length) cond[zone] = 1;
  });

  return cond;
}

function arrayUnique(array) {
  const a = array.concat();
  for (let i = 0; i < a.length; ++i) {
    for (let j = i + 1; j < a.length; ++j) {
      if (a[i] === a[j]) {
        a.splice(j--, 1);
      }
    }
  }

  return a;
}

registerBidder(spec);
