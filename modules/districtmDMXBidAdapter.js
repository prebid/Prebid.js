import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'districtmDMX';

const DMXURI = 'https://dmx.districtm.io/b/v1';

const VIDEO_MAPPING = {
  playback_method: {
    'auto_play_sound_on': 1,
    'auto_play_sound_off': 2,
    'click_to_play': 3,
    'mouse_over': 4,
    'viewport_sound_on': 5,
    'viewport_sound_off': 6
  }
};
export const spec = {
  code: BIDDER_CODE,
  supportedFormat: [BANNER, VIDEO],
  supportedMediaTypes: [VIDEO, BANNER],
  isBidRequestValid(bid) {
    return !!(bid.params.dmxid && bid.params.memberid);
  },
  interpretResponse(response, bidRequest) {
    response = response.body || {};
    if (response.seatbid) {
      if (utils.isArray(response.seatbid)) {
        const {seatbid} = response;
        let winners = seatbid.reduce((bid, ads) => {
          let ad = ads.bid.reduce(function(oBid, nBid) {
            if (oBid.price < nBid.price) {
              const bid = matchRequest(nBid.impid, bidRequest);
              const {width, height} = defaultSize(bid);
              nBid.cpm = parseFloat(nBid.price).toFixed(2);
              nBid.bidId = nBid.impid;
              nBid.requestId = nBid.impid;
              nBid.width = nBid.w || width;
              nBid.height = nBid.h || height;
              nBid.mediaType = bid.mediaTypes && bid.mediaTypes.video ? 'video' : null;
              if (nBid.mediaType) {
                nBid.vastXml = cleanVast(nBid.adm);
              }
              if (nBid.dealid) {
                nBid.dealId = nBid.dealid;
              }
              nBid.uuid = nBid.bidId;
              nBid.ad = nBid.adm;
              nBid.netRevenue = true;
              nBid.creativeId = nBid.crid;
              nBid.currency = 'USD';
              nBid.ttl = 60;
              nBid.meta = nBid.meta || {};
              if (nBid.adomain && nBid.adomain.length > 0) {
                nBid.meta.advertiserDomains = nBid.adomain;
              }
              return nBid;
            } else {
              oBid.cpm = oBid.price;
              return oBid;
            }
          }, {price: 0});
          if (ad.adm) {
            bid.push(ad)
          }
          return bid;
        }, [])
        let winnersClean = winners.filter(w => {
          if (w.bidId) {
            return true;
          }
          return false;
        });
        return winnersClean;
      } else {
        return [];
      }
    } else {
      return [];
    }
  },
  buildRequests(bidRequest, bidderRequest) {
    let timeout = config.getConfig('bidderTimeout');
    let schain = null;
    let dmxRequest = {
      id: utils.generateUUID(),
      cur: ['USD'],
      tmax: (timeout - 300),
      test: this.test() || 0,
      site: {
        publisher: { id: String(bidRequest[0].params.memberid) || null }
      }
    }

    try {
      let params = config.getConfig('dmx');
      dmxRequest.user = params.user || {};
      let site = params.site || {};
      dmxRequest.site = {...dmxRequest.site, ...site}
    } catch (e) {

    }

    let eids = [];
    if (bidRequest[0] && bidRequest[0].userId) {
      bindUserId(eids, utils.deepAccess(bidRequest[0], `userId.idl_env`), 'liveramp.com', 1);
      bindUserId(eids, utils.deepAccess(bidRequest[0], `userId.id5id`), 'id5-sync.com', 1);
      bindUserId(eids, utils.deepAccess(bidRequest[0], `userId.pubcid`), 'pubcid.org', 1);
      bindUserId(eids, utils.deepAccess(bidRequest[0], `userId.tdid`), 'adserver.org', 1);
      bindUserId(eids, utils.deepAccess(bidRequest[0], `userId.criteoId`), 'criteo.com', 1);
      bindUserId(eids, utils.deepAccess(bidRequest[0], `userId.britepoolid`), 'britepool.com', 1);
      bindUserId(eids, utils.deepAccess(bidRequest[0], `userId.lipb.lipbid`), 'liveintent.com', 1);
      bindUserId(eids, utils.deepAccess(bidRequest[0], `userId.intentiqid`), 'intentiq.com', 1);
      bindUserId(eids, utils.deepAccess(bidRequest[0], `userId.lotamePanoramaId`), 'lotame.com', 1);
      bindUserId(eids, utils.deepAccess(bidRequest[0], `userId.parrableId`), 'parrable.com', 1);
      bindUserId(eids, utils.deepAccess(bidRequest[0], `userId.netId`), 'netid.de', 1);
      bindUserId(eids, utils.deepAccess(bidRequest[0], `userId.sharedid`), 'sharedid.org', 1);
      dmxRequest.user = dmxRequest.user || {};
      dmxRequest.user.ext = dmxRequest.user.ext || {};
      dmxRequest.user.ext.eids = eids;
    }
    if (!dmxRequest.test) {
      delete dmxRequest.test;
    }
    if (bidderRequest.gdprConsent) {
      dmxRequest.regs = {};
      dmxRequest.regs.ext = {};
      dmxRequest.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies === true ? 1 : 0;
      dmxRequest.user = {};
      dmxRequest.user.ext = {};
      dmxRequest.user.ext.consent = bidderRequest.gdprConsent.consentString;
    }
    dmxRequest.regs = dmxRequest.regs || {};
    dmxRequest.regs.coppa = config.getConfig('coppa') === true ? 1 : 0;
    if (bidderRequest && bidderRequest.uspConsent) {
      dmxRequest.regs = dmxRequest.regs || {};
      dmxRequest.regs.ext = dmxRequest.regs.ext || {};
      dmxRequest.regs.ext.us_privacy = bidderRequest.uspConsent;
    }
    try {
      schain = bidRequest[0].schain;
      dmxRequest.source = {};
      dmxRequest.source.ext = {};
      dmxRequest.source.ext.schain = schain || {}
    } catch (e) {}
    let tosendtags = bidRequest.map(dmx => {
      var obj = {};
      obj.id = dmx.bidId;
      obj.tagid = String(dmx.params.dmxid);
      obj.secure = 1;
      obj.bidfloor = getFloor(dmx);
      if (dmx.mediaTypes && dmx.mediaTypes.video) {
        obj.video = {
          topframe: 1,
          skip: dmx.mediaTypes.video.skippable || 0,
          linearity: dmx.mediaTypes.video.linearity || 1,
          minduration: dmx.mediaTypes.video.minduration || 5,
          maxduration: dmx.mediaTypes.video.maxduration || 60,
          playbackmethod: getPlaybackmethod(dmx.mediaTypes.video.playback_method),
          api: getApi(dmx.mediaTypes.video),
          mimes: dmx.mediaTypes.video.mimes || ['video/mp4'],
          protocols: getProtocols(dmx.mediaTypes.video),
          w: dmx.mediaTypes.video.playerSize[0][0],
          h: dmx.mediaTypes.video.playerSize[0][1],
          format: dmx.mediaTypes.video.playerSize.map(s => {
            return {w: s[0], h: s[1]};
          }).filter(obj => typeof obj.w === 'number' && typeof obj.h === 'number')
        };
      } else {
        obj.banner = {
          topframe: 1,
          w: cleanSizes(dmx.sizes, 'w'),
          h: cleanSizes(dmx.sizes, 'h'),
          format: cleanSizes(dmx.sizes).map(s => {
            return {w: s[0], h: s[1]};
          }).filter(obj => typeof obj.w === 'number' && typeof obj.h === 'number')
        };
      }
      return obj;
    });

    if (tosendtags.length <= 5) {
      dmxRequest.imp = tosendtags;
      return {
        method: 'POST',
        url: DMXURI,
        data: JSON.stringify(dmxRequest),
        bidderRequest
      }
    } else {
      return upto5(tosendtags, dmxRequest, bidderRequest, DMXURI);
    }
  },
  test() {
    return window.location.href.indexOf('dmTest=true') !== -1 ? 1 : 0;
  },
  getUserSyncs(optionsType, serverResponses, gdprConsent, uspConsent) {
    let query = [];
    let url = 'https://cdn.districtm.io/ids/index.html'
    if (gdprConsent && gdprConsent.gdprApplies && typeof gdprConsent.consentString === 'string') {
      query.push(['gdpr', gdprConsent.consentString])
    }
    if (uspConsent) {
      query.push(['ccpa', uspConsent])
    }
    if (query.length > 0) {
      url += '?' + query.map(q => q.join('=')).join('&')
    }
    if (optionsType.iframeEnabled) {
      return [{
        type: 'iframe',
        url: url
      }];
    }
  }
}

export function getFloor (bid) {
  let floor = null;
  if (typeof bid.getFloor === 'function') {
    const floorInfo = bid.getFloor({
      currency: 'USD',
      mediaType: bid.mediaTypes.video ? 'video' : 'banner',
      size: bid.sizes.map(size => {
        return {
          w: size[0],
          h: size[1]
        }
      })
    });
    if (typeof floorInfo === 'object' &&
      floorInfo.currency === 'USD' && !isNaN(parseFloat(floorInfo.floor))) {
      floor = parseFloat(floorInfo.floor);
    }
  }
  return floor !== null ? floor : bid.params.floor;
}

export function cleanSizes(sizes, value) {
  const supportedSize = [
    {
      size: [300, 250],
      s: 100
    },
    {
      size: [728, 90],
      s: 95
    },
    {
      size: [320, 50],
      s: 90
    },
    {
      size: [160, 600],
      s: 88
    },
    {
      size: [300, 600],
      s: 85
    },
    {
      size: [300, 50],
      s: 80
    },
    {
      size: [970, 250],
      s: 75
    },
    {
      size: [970, 90],
      s: 60
    },
  ];
  let newArray = shuffle(sizes, supportedSize);
  switch (value) {
    case 'w':
      return newArray[0][0] || 0;
    case 'h':
      return newArray[0][1] || 0;
    case 'size':
      return newArray;
    default:
      return newArray;
  }
}

export function shuffle(sizes, list) {
  let removeSizes = sizes.filter(size => {
    return list.map(l => `${l.size[0]}x${l.size[1]}`).indexOf(`${size[0]}x${size[1]}`) === -1
  })
  let reOrder = sizes.reduce((results, current) => {
    if (results.length === 0) {
      results.push(current);
      return results;
    }
    results.push(current);
    results = list.filter(l => results.map(r => `${r[0]}x${r[1]}`).indexOf(`${l.size[0]}x${l.size[1]}`) !== -1);
    results = results.sort(function(a, b) {
      return b.s - a.s;
    })
    return results.map(r => r.size);
  }, [])
  return removeDuplicate([...reOrder, ...removeSizes]);
}

export function removeDuplicate(arrayValue) {
  return arrayValue.filter((elem, index) => {
    return arrayValue.map(e => `${e[0]}x${e[1]}`).indexOf(`${elem[0]}x${elem[1]}`) === index
  })
}

export function upto5(allimps, dmxRequest, bidderRequest, DMXURI) {
  let start = 0;
  let step = 5;
  let req = [];
  while (allimps.length !== 0) {
    if (allimps.length >= 5) {
      req.push(allimps.splice(start, step))
    } else {
      req.push(allimps.splice(start, allimps.length))
    }
  }
  return req.map(r => {
    dmxRequest.imp = r;
    return {
      method: 'POST',
      url: DMXURI,
      data: JSON.stringify(dmxRequest),
      bidderRequest
    }
  })
}

/**
 * Function matchRequest(id: string, BidRequest: object)
 * @param id
 * @type string
 * @param bidRequest
 * @type Object
 * @returns Object
 *
 */
export function matchRequest(id, bidRequest) {
  const {bids} = bidRequest.bidderRequest;
  const [returnValue] = bids.filter(bid => bid.bidId === id);
  return returnValue;
}
export function checkDeepArray(Arr) {
  if (Array.isArray(Arr)) {
    if (Array.isArray(Arr[0])) {
      return Arr[0];
    } else {
      return Arr;
    }
  } else {
    return Arr;
  }
}
export function defaultSize(thebidObj) {
  const {sizes} = thebidObj;
  const returnObject = {};
  returnObject.width = checkDeepArray(sizes)[0];
  returnObject.height = checkDeepArray(sizes)[1];
  return returnObject;
}

export function bindUserId(eids, value, source, atype) {
  if (utils.isStr(value) && Array.isArray(eids)) {
    eids.push({
      source,
      uids: [
        {
          id: value,
          atype
        }
      ]
    })
  }
}

export function getApi({protocols}) {
  let defaultValue = [2];
  let listProtocols = [
    {key: 'VPAID_1_0', value: 1},
    {key: 'VPAID_2_0', value: 2},
    {key: 'MRAID_1', value: 3},
    {key: 'ORMMA', value: 4},
    {key: 'MRAID_2', value: 5},
    {key: 'MRAID_3', value: 6},
  ];
  if (protocols) {
    return listProtocols.filter(p => {
      return protocols.indexOf(p.key) !== -1;
    }).map(p => p.value)
  } else {
    return defaultValue;
  }
}
export function getPlaybackmethod(playback) {
  if (Array.isArray(playback) && playback.length > 0) {
    return playback.map(label => {
      return VIDEO_MAPPING.playback_method[label]
    })
  }
  return [2]
}

export function getProtocols({protocols}) {
  let defaultValue = [2, 3, 5, 6, 7, 8];
  let listProtocols = [
    {key: 'VAST_1_0', value: 1},
    {key: 'VAST_2_0', value: 2},
    {key: 'VAST_3_0', value: 3},
    {key: 'VAST_1_0_WRAPPER', value: 4},
    {key: 'VAST_2_0_WRAPPER', value: 5},
    {key: 'VAST_3_0_WRAPPER', value: 6},
    {key: 'VAST_4_0', value: 7},
    {key: 'VAST_4_0_WRAPPER', value: 8}
  ];
  if (protocols) {
    return listProtocols.filter(p => {
      return protocols.indexOf(p.key) !== -1
    }).map(p => p.value);
  } else {
    return defaultValue;
  }
}

export function cleanVast(str) {
  const toberemove = /<img\s[^>]*?src\s*=\s*['\"]([^'\"]*?)['\"][^>]*?>/
  const [img, url] = str.match(toberemove)
  str = str.replace(toberemove, '')
  if (img) {
    if (url) {
      const insrt = `<Impression><![CDATA[${url}]]></Impression>`
      str = str.replace('</Impression>', `</Impression>${insrt}`)
    }
  }
  return str;
}
registerBidder(spec);
