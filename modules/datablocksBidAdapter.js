import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes';
import { parse as parseUrl } from '../src/url';
const NATIVE_MAP = {
  'body': 2,
  'body2': 10,
  'price': 6,
  'displayUrl': 11,
  'cta': 12
};
const NATIVE_IMAGE = [{
  id: 1,
  required: 1,
  title: {
    len: 140
  }
}, {
  id: 2,
  required: 1,
  img: { type: 3 }
}, {
  id: 3,
  required: 1,
  data: {
    type: 11
  }
}, {
  id: 4,
  required: 0,
  data: {
    type: 2
  }
}, {
  id: 5,
  required: 0,
  img: { type: 1 }
}, {
  id: 6,
  required: 0,
  data: {
    type: 12
  }
}];

const VIDEO_PARAMS = ['mimes', 'minduration', 'maxduration', 'protocols', 'w', 'h', 'startdelay',
  'placement', 'linearity', 'skip', 'skipmin', 'skipafter', 'sequence', 'battr', 'maxextended',
  'minbitrate', 'maxbitrate', 'boxingallowed', 'playbackmethod', 'playbackend', 'delivery',
  'pos', 'companionad', 'api', 'companiontype', 'ext'];

export const spec = {
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],
  code: 'datablocks',
  isBidRequestValid: function(bid) {
    return !!(bid.params.host && bid.params.sourceId &&
      bid.mediaTypes && (bid.mediaTypes.banner || bid.mediaTypes.native || bid.mediaTypes.video));
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    if (!validBidRequests.length) { return []; }

    let imps = {};
    let site = {};
    let device = {};
    let refurl = parseUrl(bidderRequest.referrer);
    let requests = [];

    validBidRequests.forEach(bidRequest => {
      let imp = {
        id: bidRequest.bidId,
        tagid: bidRequest.adUnitCode,
        secure: window.location.protocol == 'https:'
      }

      if (utils.deepAccess(bidRequest, `mediaTypes.banner`)) {
        let sizes = bidRequest.mediaTypes.banner.sizes;
        if (sizes.length == 1) {
          imp.banner = {
            w: sizes[0][0],
            h: sizes[0][1]
          }
        } else if (sizes.length > 1) {
          imp.banner = {
            format: sizes.map(size => ({ w: size[0], h: size[1] }))
          };
        } else {
          return;
        }
      } else if (utils.deepAccess(bidRequest, 'mediaTypes.native')) {
        let nativeImp = bidRequest.mediaTypes.native;

        if (nativeImp.type) {
          let nativeAssets = [];
          switch (nativeImp.type) {
            case 'image':
              nativeAssets = NATIVE_IMAGE;
              break;
            default:
              return;
          }
          imp.native = JSON.stringify({ assets: nativeAssets });
        } else {
          let nativeAssets = [];
          let nativeKeys = Object.keys(nativeImp);
          nativeKeys.forEach((nativeKey, index) => {
            let required = !!nativeImp[nativeKey].required;
            let assetId = index + 1;
            switch (nativeKey) {
              case 'title':
                nativeAssets.push({
                  id: assetId,
                  required: required,
                  title: {
                    len: nativeImp[nativeKey].len || 140
                  }
                });
                break;
              case 'body': // desc
              case 'body2': // desc2
              case 'price':
              case 'display_url':
                let data = {
                  id: assetId,
                  required: required,
                  data: {
                    type: NATIVE_MAP[nativeKey]
                  }
                }
                if (nativeImp[nativeKey].data && nativeImp[nativeKey].data.len) { data.data.len = nativeImp[nativeKey].data.len; }

                nativeAssets.push(data);
                break;
              case 'image':
                if (nativeImp[nativeKey].sizes && nativeImp[nativeKey].sizes.length) {
                  nativeAssets.push({
                    id: assetId,
                    required: required,
                    image: {
                      type: 3,
                      w: nativeImp[nativeKey].sizes[0],
                      h: nativeImp[nativeKey].sizes[1]
                    }
                  })
                }
            }
          });
          imp.native = {
            request: JSON.stringify({native: {assets: nativeAssets}})
          };
        }
      } else if (utils.deepAccess(bidRequest, 'mediaTypes.video')) {
        let video = bidRequest.mediaTypes.video;
        let sizes = video.playerSize || bidRequest.sizes || [];
        if (sizes.length && Array.isArray(sizes[0])) {
          imp.video = {
            w: sizes[0][0],
            h: sizes[0][1]
          };
        } else if (sizes.length == 2 && !Array.isArray(sizes[0])) {
          imp.video = {
            w: sizes[0],
            h: sizes[1]
          };
        } else {
          return;
        }

        if (video.durationRangeSec) {
          if (Array.isArray(video.durationRangeSec)) {
            if (video.durationRangeSec.length == 1) {
              imp.video.maxduration = video.durationRangeSec[0];
            } else if (video.durationRangeSec.length == 2) {
              imp.video.minduration = video.durationRangeSec[0];
              imp.video.maxduration = video.durationRangeSec[1];
            }
          } else {
            imp.video.maxduration = video.durationRangeSec;
          }
        }

        if (bidRequest.params.video) {
          Object.keys(bidRequest.params.video).forEach(k => {
            if (VIDEO_PARAMS.indexOf(k) > -1) {
              imp.video[k] = bidRequest.params.video[k];
            }
          })
        }
      }
      let host = bidRequest.params.host;
      let sourceId = bidRequest.params.sourceId;
      imps[host] = imps[host] || {};
      let hostImp = imps[host][sourceId] = imps[host][sourceId] || { imps: [] };
      hostImp.imps.push(imp);
      hostImp.subid = hostImp.imps.subid || bidRequest.params.subid || 'blank';
      hostImp.path = 'search';
      hostImp.idParam = 'sid';
      hostImp.protocol = '//';
    });

    // Generate Site obj
    site.domain = refurl.hostname;
    site.page = refurl.protocol + '://' + refurl.hostname + refurl.pathname;
    if (self === top && document.referrer) {
      site.ref = document.referrer;
    }
    let keywords = document.getElementsByTagName('meta')['keywords'];
    if (keywords && keywords.content) {
      site.keywords = keywords.content;
    }

    // Generate Device obj.
    device.ip = 'peer';
    device.ua = window.navigator.userAgent;
    device.js = 1;
    device.language = ((navigator.language || navigator.userLanguage || '').split('-'))[0] || 'en';

    RtbRequest(device, site, imps).forEach(formatted => {
      requests.push({
        method: 'POST',
        url: formatted.url,
        data: formatted.body,
        options: {
          withCredentials: false
        }
      })
    });
    return requests;

    function RtbRequest(device, site, imps) {
      let collection = [];
      Object.keys(imps).forEach(host => {
        let sourceIds = imps[host];
        Object.keys(sourceIds).forEach(sourceId => {
          let impObj = sourceIds[sourceId];
          collection.push({
            url: `https://${host}/${impObj.path}/?${impObj.idParam}=${sourceId}`,
            body: {
              id: bidderRequest.auctionId,
              imp: impObj.imps,
              site: Object.assign({ id: impObj.subid || 'blank' }, site),
              device: Object.assign({}, device)
            }
          })
        })
      })

      return collection;
    }
  },
  interpretResponse: function(serverResponse, bidRequest) {
    if (!serverResponse || !serverResponse.body || !serverResponse.body.seatbid) {
      return [];
    }
    let body = serverResponse.body;

    let bids = body.seatbid
      .map(seatbid => seatbid.bid)
      .reduce((memo, bid) => memo.concat(bid), []);
    let req = bidRequest.data;
    let reqImps = req.imp;

    return bids.map(rtbBid => {
      let imp;
      for (let i in reqImps) {
        let testImp = reqImps[i]
        if (testImp.id == rtbBid.impid) {
          imp = testImp;
          break;
        }
      }
      let br = {
        requestId: rtbBid.impid,
        cpm: rtbBid.price,
        creativeId: rtbBid.crid,
        currency: rtbBid.currency || 'USD',
        netRevenue: true,
        ttl: 360
      };
      if (!imp) {
        return br;
      } else if (imp.banner) {
        br.mediaType = BANNER;
        br.width = rtbBid.w;
        br.height = rtbBid.h;
        br.ad = rtbBid.adm;
      } else if (imp.native) {
        br.mediaType = NATIVE;

        let reverseNativeMap = {};
        let nativeKeys = Object.keys(NATIVE_MAP);
        nativeKeys.forEach(k => {
          reverseNativeMap[NATIVE_MAP[k]] = k;
        });

        let idMap = {};
        let nativeReq = JSON.parse(imp.native.request);
        if (nativeReq.native && nativeReq.native.assets) {
          nativeReq.native.assets.forEach(asset => {
            if (asset.data) { idMap[asset.id] = reverseNativeMap[asset.data.type]; }
          })
        }

        const nativeResponse = JSON.parse(rtbBid.adm);
        const { assets, link, imptrackers, jstrackers } = nativeResponse.native;
        const result = {
          clickUrl: link.url,
          clickTrackers: link.clicktrackers || undefined,
          impressionTrackers: imptrackers || undefined,
          javascriptTrackers: jstrackers ? [jstrackers] : undefined
        };
        assets.forEach(asset => {
          if (asset.title) {
            result.title = asset.title.text;
          } else if (asset.img) {
            result.image = asset.img.url;
          } else if (idMap[asset.id]) {
            result[idMap[asset.id]] = asset.data.value;
          }
        })
        br.native = result;
      } else if (imp.video) {
        br.mediaType = VIDEO;
        br.width = rtbBid.w;
        br.height = rtbBid.h;
        if (rtbBid.adm) { br.vastXml = rtbBid.adm; } else if (rtbBid.nurl) { br.vastUrl = rtbBid.nurl; }
      }
      return br;
    });
  }

};
registerBidder(spec);
