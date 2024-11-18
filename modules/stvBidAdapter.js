import {deepAccess, logMessage} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {includes} from '../src/polyfill.js';
import {
  handleSyncUrls,
  isBannerRequest,
  isVideoRequest,
  convertMediaInfoForRequest,
  getMediaTypesInfo,
  getBidFloor,
  interpretResponse
} from '../libraries/dspxUtils/bidderUtils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 */

const BIDDER_CODE = 'stv';
const ENDPOINT_URL = 'https://ads.smartstream.tv/r/';
const ENDPOINT_URL_DEV = 'https://ads.smartstream.tv/r/';
const GVLID = 134;
const VIDEO_ORTB_PARAMS = {
  'minduration': 'min_duration',
  'maxduration': 'max_duration',
  'maxbitrate': 'max_bitrate',
  'api': 'api',
};

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: [],
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function(bid) {
    return !!(bid.params.placement);
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      const params = bidRequest.params;

      const placementId = params.placement;
      const rnd = Math.floor(Math.random() * 99999999999);
      const referrer = bidderRequest.refererInfo.page;
      const bidId = bidRequest.bidId;
      const isDev = params.devMode || false;
      const pbcode = bidRequest.adUnitCode || false; // div id

      let endpoint = isDev ? ENDPOINT_URL_DEV : ENDPOINT_URL;

      let mediaTypesInfo = getMediaTypesInfo(bidRequest);
      let type = isBannerRequest(bidRequest) ? BANNER : VIDEO;
      let sizes = mediaTypesInfo[type];

      let payload = {
        _f: 'vast2',
        alternative: 'prebid_js',
        _ps: placementId,
        srw: sizes ? sizes[0].width : 0,
        srh: sizes ? sizes[0].height : 0,
        idt: 100,
        rnd: rnd,
        ref: referrer,
        bid_id: bidId,
        pbver: '$prebid.version$',
        schain: '',
        uids: '',
      };
      if (!isVideoRequest(bidRequest)) {
        payload._f = 'html';
      }
      if (bidRequest.schain) {
        payload.schain = serializeSChain(bidRequest.schain);
      } else {
        delete payload.schain;
      }

      payload.uids = serializeUids(bidRequest);
      if (payload.uids == '') {
        delete payload.uids;
      }

      payload.pfilter = { ...params };
      delete payload.pfilter.placement;
      if (params.bcat !== undefined) { delete payload.pfilter.bcat; }
      if (params.dvt !== undefined) { delete payload.pfilter.dvt; }
      if (params.devMode !== undefined) { delete payload.pfilter.devMode; }

      if (payload.pfilter === undefined || !payload.pfilter.floorprice) {
        let bidFloor = getBidFloor(bidRequest);
        if (bidFloor > 0) {
          if (payload.pfilter !== undefined) {
            payload.pfilter.floorprice = bidFloor;
          } else {
            payload.pfilter = { 'floorprice': bidFloor };
          }
          // payload.bidFloor = bidFloor;
        }
      }

      if (mediaTypesInfo[VIDEO] !== undefined) {
        let videoParams = deepAccess(bidRequest, 'mediaTypes.video');
        Object.keys(videoParams)
          .filter(key => includes(Object.keys(VIDEO_ORTB_PARAMS), key) && params[VIDEO_ORTB_PARAMS[key]] === undefined)
          .forEach(key => payload.pfilter[VIDEO_ORTB_PARAMS[key]] = videoParams[key]);
      }
      if (Object.keys(payload.pfilter).length == 0) { delete payload.pfilter }

      if (bidderRequest && bidderRequest.gdprConsent) {
        payload.gdpr_consent = bidderRequest.gdprConsent.consentString;
        payload.gdpr = bidderRequest.gdprConsent.gdprApplies;
      }

      if (params.bcat !== undefined) {
        payload.bcat = deepAccess(bidderRequest.ortb2Imp, 'bcat') || params.bcat;
      }
      if (params.dvt !== undefined) {
        payload.dvt = params.dvt;
      }
      if (isDev) {
        payload.prebidDevMode = 1;
      }

      if (pbcode) {
        payload.pbcode = pbcode;
      }

      payload.media_types = convertMediaInfoForRequest(mediaTypesInfo);

      return {
        method: 'GET',
        url: endpoint,
        data: stvObjectToQueryString(payload),
      };
    });
  },
  interpretResponse: function(serverResponse, bidRequest) {
    logMessage('STV: serverResponse', serverResponse);
    logMessage('STV: bidRequest', bidRequest);
    return interpretResponse(serverResponse, bidRequest, (bidRequest, response) => null); // we don't use any renderer
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    return handleSyncUrls(syncOptions, serverResponses, gdprConsent);
  }
}

function stvObjectToQueryString(obj, prefix) {
  let str = [];
  let p;
  for (p in obj) {
    if (obj.hasOwnProperty(p)) {
      let k = prefix ? prefix + '[' + p + ']' : p;
      let v = obj[p];
      str.push((v !== null && typeof v === 'object')
        ? stvObjectToQueryString(v, k)
        : (k == 'schain' || k == 'uids' ? k + '=' + v : encodeURIComponent(k) + '=' + encodeURIComponent(v)));
    }
  }
  return str.join('&');
}

function serializeSChain(schain) {
  let ret = '';

  ret += encodeURIComponent(schain.ver);
  ret += ',';
  ret += encodeURIComponent(schain.complete);

  for (let node of schain.nodes) {
    ret += '!';
    ret += encodeURIComponent(node.asi);
    ret += ',';
    ret += encodeURIComponent(node.sid);
    ret += ',';
    ret += encodeURIComponent(node.hp);
    ret += ',';
    ret += encodeURIComponent(node.rid ?? '');
    ret += ',';
    ret += encodeURIComponent(node.name ?? '');
    ret += ',';
    ret += encodeURIComponent(node.domain ?? '');
    if (node.ext) {
      ret += ',';
      ret += encodeURIComponent(node.ext ?? '');
    }
  }

  return ret;
}

function serializeUids(bidRequest) {
  let uids = [];

  let id5 = deepAccess(bidRequest, 'userId.id5id.uid');
  if (id5) {
    uids.push(encodeURIComponent('id5:' + id5));
    let id5Linktype = deepAccess(bidRequest, 'userId.id5id.ext.linkType');
    if (id5Linktype) {
      uids.push(encodeURIComponent('id5_linktype:' + id5Linktype));
    }
  }
  let netId = deepAccess(bidRequest, 'userId.netId');
  if (netId) {
    uids.push(encodeURIComponent('netid:' + netId));
  }
  let uId2 = deepAccess(bidRequest, 'userId.uid2.id');
  if (uId2) {
    uids.push(encodeURIComponent('uid2:' + uId2));
  }
  let sharedId = deepAccess(bidRequest, 'userId.sharedid.id');
  if (sharedId) {
    uids.push(encodeURIComponent('sharedid:' + sharedId));
  }
  let liverampId = deepAccess(bidRequest, 'userId.idl_env');
  if (liverampId) {
    uids.push(encodeURIComponent('liverampid:' + liverampId));
  }
  let criteoId = deepAccess(bidRequest, 'userId.criteoId');
  if (criteoId) {
    uids.push(encodeURIComponent('criteoid:' + criteoId));
  }
  // documentation missing...
  let utiqId = deepAccess(bidRequest, 'userId.utiq.id');
  if (utiqId) {
    uids.push(encodeURIComponent('utiq:' + utiqId));
  } else {
    utiqId = deepAccess(bidRequest, 'userId.utiq');
    if (utiqId) {
      uids.push(encodeURIComponent('utiq:' + utiqId));
    }
  }

  return uids.join(',');
}

registerBidder(spec);
