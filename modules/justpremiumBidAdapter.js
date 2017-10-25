import {registerBidder} from 'src/adapters/bidderFactory';
const BIDDER_CODE = 'justpremium';
const ENDPOINT_URL = top.document.location.protocol + '//pre.ads.justpremium.com/v/2.0/t/xhr';

export const spec = {
  code: BIDDER_CODE,
  time: 60000,

  isBidRequestValid: (bid) => {
    return !!(bid && bid.params && bid.params.zone);
  },

  buildRequests: (validBidRequests) => {
    const c = preparePubCond(validBidRequests);
    const payload = {
      zone: [...new Set(validBidRequests.map((b) => {
        return parseInt(b.params.zone);
      }))].join(','),
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

    const payloadString = JSON.stringify(payload);

    return {
      method: 'POST',
      url: ENDPOINT_URL + '?i=' + (+new Date()),
      data: payloadString,
      bids: validBidRequests
    };
  },

  interpretResponse: (serverResponse, bidRequests) => {
    let bidResponses = [];
    bidRequests.bids.forEach((adUnit) => {
      let bidId = adUnit.bidId;
      let bid = findBid(adUnit.params, serverResponse.bid);
      if (bid) {
        let bidResponse = {
          requestId: bidId,
          bidderCode: spec.code,
          width: bid.width,
          height: bid.height,
          ad: bid.adm,
          cpm: bid.price,
          currency: bid.currency || 'USD',
          ttl: bid.ttl || spec.time
        };
        bidResponses.push(bidResponse);
      }
    });

    return bidResponses;
  },

  getUserSyncs: () => {
    return [{
      type: 'script',
      url: top.document.location.protocol + '//ox-d.justpremium.com/w/1.0/cj'
    }];
  }
}

function findBid(params, bids) {
  const tagId = params.zone;
  if (bids[tagId]) {
    let len = bids[tagId].length;
    while (len--) {
      if (passCond(params, bids[tagId][len])) {
        return bids[tagId].splice(len, 1).pop();
      }
    }
  }

  return false;
};

function passCond(params, bid) {
  const format = bid.format;

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

  bids.forEach((bid) => {
    const params = bid.params;
    const zone = params.zone;

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
    exclude.forEach((e) => {
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

  Object.keys(count).forEach((zone) => {
    if (cond[zone] === 1) return;

    const exclude = [];
    Object.keys(cond[zone][1]).forEach((format) => {
      if (cond[zone][1][format] === count[zone]) {
        exclude.push(format);
      }
    });
    cond[zone][1] = exclude;
  });

  Object.keys(cond).forEach((zone) => {
    if (cond[zone] !== 1 && cond[zone][1].length) {
      cond[zone][0].forEach((r) => {
        let idx = cond[zone][1].indexOf(r);
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
