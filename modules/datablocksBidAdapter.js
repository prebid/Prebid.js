import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER, NATIVE } from '../src/mediaTypes';
import { parse as parseUrl } from '../src/url';
const NATIVE_MAP = {
  'body': 2,
  'body2': 10,
  'price': 6,
  'displayUrl': 11,
  'cta': 12
};
const NATIVE_IMAGE = [{
  id: 'title_1',
  required: 1,
  title: {
    len: 140
  }
}, {
  id: 'image_1',
  required: 1,
  img: { type: 3 }
}, {
  id: 'sponsoredBy_1',
  required: 1,
  data: {
    type: 11
  }
}, {
  id: 'body_1',
  required: 0,
  data: {
    type: 2
  }
}, {
  id: 'icon_1',
  required: 0,
  img: { type: 1 }
}, {
  id: 'cta_1',
  required: 0,
  data: {
    type: 12
  }
}];

export const spec = {
  supportedMediaTypes: [BANNER, NATIVE],
  code: 'datablocks',
  isBidRequestValid: function(bid) {
    return !!(bid.params.host && bid.params.sourceId &&
      bid.mediaTypes && (bid.mediaTypes.banner || bid.mediaTypes.native));
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
            switch (nativeKey) {
              case 'title':
                nativeAssets.push({
                  id: 'title_' + index,
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
                  id: nativeKey + '_' + index,
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
                    id: 'image_' + index,
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
          imp.native = JSON.stringify({ assets: nativeAssets });
        }
      }
      let host = bidRequest.params.host;
      let sourceId = bidRequest.params.sourceId;
      let preLoadParam = window.DATABLOCKS && window.DATABLOCKS.getFetchId && typeof window.DATABLOCKS.getFetchId == 'function' && window.DATABLOCKS.getFetchId();
      imps[host] = imps[host] || {};
      let hostImp = imps[host][preLoadParam || sourceId] = imps[host][preLoadParam || sourceId] || { imps: [] };
      hostImp.imps.push(imp);
      hostImp.subid = hostImp.imps.subid || bidRequest.params.subid || 'blank';
      hostImp.path = preLoadParam ? 'prebid' : 'search';
      hostImp.preLoadParam = preLoadParam ? 'preid' : 'sid';
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
            url: `${impObj.protocol}${host}/${impObj.path}/?${impObj.preLoadParam}=${sourceId}`,
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
      let imp = reqImps.find(imp => imp.id == rtbBid.impid);
      let br = {
        requestId: rtbBid.impid,
        cpm: rtbBid.price,
        creativeId: rtbBid.crid,
        currency: rtbBid.currency || 'USD',
        netRevenue: true,
        ttl: 360
      };
      if (imp.banner) {
        br.mediaType = BANNER;
        br.width = rtbBid.w;
        br.height = rtbBid.h;
        br.ad = rtbBid.adm;
      } else if (imp.native) {
        br.mediaType = NATIVE;
        const nativeResponse = JSON.parse(rtbBid.adm);
        const { assets, link, imptrackers, jstrackers } = nativeResponse.native;
        const result = {
          clickUrl: link.url,
          clickTrackers: link.clicktrackers || undefined,
          impressionTrackers: imptrackers || undefined,
          javascriptTrackers: jstrackers ? [jstrackers] : undefined
        };
        assets.forEach(asset => {
          let assetType = asset.id.split('_')[0];
          switch (assetType) {
            case 'title':
              result.title = asset.title.text;
              break;
            case 'image':
              result.image = asset.img.url;
              break;
            default:
              result[assetType] = asset.data.value;
              break;
          }
        })
        br.native = result;
      }
      return br;
    });
  }

};
registerBidder(spec);
