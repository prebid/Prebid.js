import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';

const BIDDER_CODE = 'eplanning';
const rnd = Math.random();
const DEFAULT_SV = 'ads.us.e-planning.net';
const DEFAULT_ISV = 'i.e-planning.net';
const PARAMS = ['ci', 'sv', 't'];
const DOLLARS = 'USD';
const NET_REVENUE = true;
const TTL = 120;
const NULL_SIZE = '1x1';
const FILE = 'file';

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    return Boolean(bid.params.ci) || Boolean(bid.params.t);
  },

  buildRequests: function(bidRequests) {
    const method = 'GET';
    const dfpClientId = '1';
    const sec = 'ROS';
    let url;
    let params;
    const urlConfig = getUrlConfig(bidRequests);
    const pcrs = getCharset();

    if (urlConfig.t) {
      url = urlConfig.isv + '/layers/t_pbjs_2.json';
      params = {};
    } else {
      url = '//' + (urlConfig.sv || DEFAULT_SV) + '/hb/1/' + urlConfig.ci + '/' + dfpClientId + '/' + (utils.getTopWindowLocation().hostname || FILE) + '/' + sec;
      const referrerUrl = utils.getTopWindowReferrer();
      const spacesString = getSpacesString(bidRequests);
      params = {
        rnd: rnd,
        e: spacesString,
        ur: utils.getTopWindowUrl() || FILE,
        r: 'pbjs',
        pbv: '$prebid.version$',
        ncb: '1'
      };

      if (pcrs) {
        params.crs = pcrs;
      }

      if (referrerUrl) {
        params.fr = referrerUrl;
      }
    }

    return {
      method: method,
      url: url,
      data: params,
      adUnitToBidId: getBidIdMap(bidRequests),
    };
  },
  interpretResponse: function(serverResponse, request) {
    const response = serverResponse.body;
    let bidResponses = [];

    if (response && !utils.isEmpty(response.sp)) {
      response.sp.forEach(space => {
        if (!utils.isEmpty(space.a)) {
          space.a.forEach(ad => {
            const bidResponse = {
              requestId: request.adUnitToBidId[space.k],
              cpm: ad.pr,
              width: ad.w,
              height: ad.h,
              ad: ad.adm,
              ttl: TTL,
              creativeId: ad.crid,
              netRevenue: NET_REVENUE,
              currency: DOLLARS,
            };
            bidResponses.push(bidResponse);
          });
        }
      });
    }

    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];
    const response = !utils.isEmpty(serverResponses) && serverResponses[0].body;

    if (response && !utils.isEmpty(response.cs)) {
      const responseSyncs = response.cs;
      responseSyncs.forEach(sync => {
        if (typeof sync === 'string' && syncOptions.pixelEnabled) {
          syncs.push({
            type: 'image',
            url: sync,
          });
        } else if (typeof sync === 'object' && sync.ifr && syncOptions.iframeEnabled) {
          syncs.push({
            type: 'iframe',
            url: sync.u,
          })
        }
      });
    }

    return syncs;
  },
}

function cleanName(name) {
  return name.replace(/_|\.|-|\//g, '').replace(/\)\(|\(|\)|:/g, '_').replace(/^_+|_+$/g, '');
}
function getUrlConfig(bidRequests) {
  if (isTestRequest(bidRequests)) {
    return getTestConfig(bidRequests.filter(br => br.params.t));
  }

  let config = {};
  bidRequests.forEach(bid => {
    PARAMS.forEach(param => {
      if (bid.params[param] && !config[param]) {
        config[param] = bid.params[param];
      }
    });
  });

  if (config.sv) {
    config.sv = '//' + config.sv;
  }

  return config;
}
function isTestRequest(bidRequests) {
  let isTest = false;
  bidRequests.forEach(bid => isTest = bid.params.t);
  return isTest;
}
function getTestConfig(bidRequests) {
  let isv;
  bidRequests.forEach(br => isv = isv || br.params.isv);
  return {
    t: true,
    isv: '//' + (isv || DEFAULT_ISV)
  };
}
function getSpacesString(bids) {
  const spacesString = bids.map(bid =>
    cleanName(bid.adUnitCode) + ':' + (bid.sizes && bid.sizes.length ? utils.parseSizesInput(bid.sizes).join(',') : NULL_SIZE)
  ).join('+');

  return spacesString;
}

function getCharset() {
  try {
    return window.top.document.charset || window.top.document.characterSet;
  } catch (e) {
    return document.charset || document.characterSet;
  }
}

function getBidIdMap(bidRequests) {
  let map = {};
  bidRequests.forEach(bid => map[cleanName(bid.adUnitCode)] = bid.bidId);
  return map;
}

registerBidder(spec);
