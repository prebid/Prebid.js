import {registerBidder} from 'src/adapters/bidderFactory';
const BIDDER_CODE = 'justpremium';
const ENDPOINT_URL = 'http://pre.ads.justpremium.com/v/2.0/t/ixhr';

export const spec = {
  code: BIDDER_CODE,
  time: 60000,

  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.zone);
  },

  buildRequests: function(validBidRequests) {
    var c = preparePubCond(validBidRequests);
    var payload = {
      zone: [].concat(toConsumableArray(new Set(validBidRequests.map(function (b) {
        return parseInt(b.params.zone);
      })))).join(','),
      hostname: top.document.location.hostname,
      protocol: top.document.location.protocol.replace(':', ''),
      sw: window.top.screen.width,
      sh: window.top.screen.height,
      ww: window.top.innerWidth,
      wh: window.top.innerHeight,
      c: c,
      id: validBidRequests[0].params.zone,
      i: +new Date()
    };

    var payloadString = JSON.stringify(payload);

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString,
      bids: validBidRequests
    };
  },

  interpretResponse: function interpretResponse(serverResponse, bidRequests) {
    var bidResponses = [];
    bidRequests.bids.forEach(function (adUnit) {
      var bidId = adUnit.bidId;
      var bid = findBid(adUnit.params, serverResponse.bid);
      if (bid) {
        var bidResponse = {
          requestId: bidId,
          bidderCode: spec.code,
          width: bid.width,
          height: bid.height,
          ad: bid.adm,
          cpm: bid.price,
          currency: 'USD',
          ttl: spec.time
        };
        bidResponses.push(bidResponse);
      }
    });

    return bidResponses;
  },

  getUserSyncs: function() {
    return [{
      type: 'script',
      url: top.document.location.protocol + '//ox-d.justpremium.com/w/1.0/cj'
    }];
  }
}

function toConsumableArray (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
      arr2[i] = arr[i];
    }
    return arr2;
  } else {
    return Array.from(arr);
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
      } else {
        cond[zone][1][e]++;
      }
    });

    count[zone] = count[zone] || 0;
    if (exclude.length) {
      count[zone]++;
    }
  });

  Object.keys(count).forEach(function(zone) {
    if (cond[zone] === 1) return;

    const exclude = [];
    Object.keys(cond[zone][1]).forEach(function(format) {
      if (cond[zone][1][format] === count[zone]) {
        exclude.push(format);
      }
    });
    cond[zone][1] = exclude;
  });

  Object.keys(cond).forEach(function(zone) {
    if (cond[zone] !== 1 && cond[zone][1].length) {
      cond[zone][0].forEach(function(r) {
        var idx = cond[zone][1].indexOf(r);
        if (idx > -1) {
          cond[zone][1].splice(idx, 1);
        }
      });
      cond[zone][0].length = 0;
    }

    if (cond[zone] !== 1 && !cond[zone][0].length && !cond[zone][1].length) {
      cond[zone] = 1;
    }
  });

  return cond;
}

function arrayUnique(array) {
  const a = array.concat();
  for (var i = 0; i < a.length; ++i) {
    for (var j = i + 1; j < a.length; ++j) {
      if (a[i] === a[j]) {
        a.splice(j--, 1);
      }
    }
  }

  return a;
}

registerBidder(spec);
