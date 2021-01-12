import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'sortable';
const SERVER_URL = 'https://c.deployads.com';

function setAssetRequired(native, asset) {
  if (native.required) {
    asset.required = 1;
  }
  return asset;
}

function buildNativeRequest(nativeMediaType) {
  const assets = [];
  const title = nativeMediaType.title;
  if (title) {
    assets.push(setAssetRequired(title, {
      title: {len: title.len}
    }));
  }
  const img = nativeMediaType.image;
  if (img) {
    assets.push(setAssetRequired(img, {
      img: {
        type: 3, // Main
        wmin: 1,
        hmin: 1
      }
    }));
  }
  const icon = nativeMediaType.icon;
  if (icon) {
    assets.push(setAssetRequired(icon, {
      img: {
        type: 1, // Icon
        wmin: 1,
        hmin: 1
      }
    }));
  }
  const body = nativeMediaType.body;
  if (body) {
    assets.push(setAssetRequired(body, {data: {type: 2}}));
  }
  const cta = nativeMediaType.cta;
  if (cta) {
    assets.push(setAssetRequired(cta, {data: {type: 12}}));
  }
  const sponsoredBy = nativeMediaType.sponsoredBy;
  if (sponsoredBy) {
    assets.push(setAssetRequired(sponsoredBy, {data: {type: 1}}));
  }

  utils._each(assets, (asset, id) => asset.id = id);
  return {
    ver: '1',
    request: JSON.stringify({
      ver: '1',
      assets
    })
  };
}

function tryParseNativeResponse(adm) {
  let native = null;
  try {
    native = JSON.parse(adm);
  } catch (e) {
    utils.logError('Sortable bid adapter unable to parse native bid response:\n\n' + e);
  }
  return native && native.native;
}

function createImgObject(img) {
  if (img.w || img.h) {
    return {
      url: img.url,
      width: img.w,
      height: img.h
    };
  } else {
    return img.url;
  }
}

function interpretNativeResponse(response) {
  const native = {};
  if (response.link) {
    native.clickUrl = response.link.url;
  }
  utils._each(response.assets, asset => {
    switch (asset.id) {
      case 1:
        native.title = asset.title.text;
        break;
      case 2:
        native.image = createImgObject(asset.img);
        break;
      case 3:
        native.icon = createImgObject(asset.img);
        break;
      case 4:
        native.body = asset.data.value;
        break;
      case 5:
        native.cta = asset.data.value;
        break;
      case 6:
        native.sponsoredBy = asset.data.value;
        break;
    }
  });
  return native;
}

function transformSyncs(responses, type, syncs) {
  utils._each(responses, res => {
    if (res.body && res.body.ext && res.body.ext.sync_dsps && res.body.ext.sync_dsps.length) {
      utils._each(res.body.ext.sync_dsps, sync => {
        if (sync[0] === type && sync[1]) {
          syncs.push({type, url: sync[1]});
        }
      });
    }
  });
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],

  isBidRequestValid: function(bid) {
    const sortableConfig = config.getConfig('sortable');
    const haveSiteId = (sortableConfig && !!sortableConfig.siteId) || bid.params.siteId;
    const validFloor = !bid.params.floor || utils.isNumber(bid.params.floor);
    const validSize = /\d+x\d+/;
    const validFloorSizeMap = !bid.params.floorSizeMap ||
      (utils.isPlainObject(bid.params.floorSizeMap) &&
        Object.keys(bid.params.floorSizeMap).every(size =>
          size.match(validSize) && utils.isNumber(bid.params.floorSizeMap[size])
        ))
    const validKeywords = !bid.params.keywords ||
      (utils.isPlainObject(bid.params.keywords) &&
        Object.keys(bid.params.keywords).every(key =>
          utils.isStr(key) && utils.isStr(bid.params.keywords[key])
        ))
    const isBanner = !bid.mediaTypes || bid.mediaTypes[BANNER] || !(bid.mediaTypes[NATIVE] || bid.mediaTypes[VIDEO]);
    const bannerSizes = isBanner ? utils.deepAccess(bid, `mediaType.${BANNER}.sizes`) || bid.sizes : null;
    return !!(bid.params.tagId && haveSiteId && validFloor && validFloorSizeMap && validKeywords && (!isBanner ||
      (bannerSizes && bannerSizes.length > 0 && bannerSizes.every(sizeArr => sizeArr.length == 2 && sizeArr.every(num => utils.isNumber(num))))));
  },

  buildRequests: function(validBidReqs, bidderRequest) {
    const sortableConfig = config.getConfig('sortable') || {};
    const globalSiteId = sortableConfig.siteId;
    let loc = utils.parseUrl(bidderRequest.refererInfo.referer);

    const sortableImps = utils._map(validBidReqs, bid => {
      const rv = {
        id: bid.bidId,
        tagid: bid.params.tagId,
        ext: {}
      };
      const bannerMediaType = utils.deepAccess(bid, `mediaTypes.${BANNER}`);
      const nativeMediaType = utils.deepAccess(bid, `mediaTypes.${NATIVE}`);
      const videoMediaType = utils.deepAccess(bid, `mediaTypes.${VIDEO}`);
      if (bannerMediaType || !(nativeMediaType || videoMediaType)) {
        const bannerSizes = (bannerMediaType && bannerMediaType.sizes) || bid.sizes;
        rv.banner = {
          format: utils._map(bannerSizes, ([width, height]) => ({w: width, h: height}))
        };
      }
      if (nativeMediaType) {
        rv.native = buildNativeRequest(nativeMediaType);
      }
      if (videoMediaType && videoMediaType.context === 'instream') {
        const video = {placement: 1};
        video.mimes = videoMediaType.mimes || [];
        video.minduration = utils.deepAccess(bid, 'params.video.minduration') || 10;
        video.maxduration = utils.deepAccess(bid, 'params.video.maxduration') || 60;
        const startDelay = utils.deepAccess(bid, 'params.video.startdelay');
        if (startDelay != null) {
          video.startdelay = startDelay;
        }
        if (videoMediaType.playerSize && videoMediaType.playerSize.length) {
          const size = videoMediaType.playerSize[0];
          video.w = size[0];
          video.h = size[1];
        }
        if (videoMediaType.api) {
          video.api = videoMediaType.api;
        }
        if (videoMediaType.protocols) {
          video.protocols = videoMediaType.protocols;
        }
        if (videoMediaType.playbackmethod) {
          video.playbackmethod = videoMediaType.playbackmethod;
        }
        rv.video = video;
      }
      if (bid.params.floor) {
        rv.bidfloor = bid.params.floor;
      }
      if (bid.params.keywords) {
        rv.ext.keywords = bid.params.keywords;
      }
      if (bid.params.bidderParams) {
        utils._each(bid.params.bidderParams, (params, partner) => {
          rv.ext[partner] = params;
        });
      }
      if (bid.params.floorSizeMap) {
        rv.ext.floorSizeMap = bid.params.floorSizeMap;
      }
      return rv;
    });
    const gdprConsent = bidderRequest && bidderRequest.gdprConsent;
    const sortableBidReq = {
      id: utils.getUniqueIdentifierStr(),
      imp: sortableImps,
      source: {
        ext: {
          schain: validBidReqs[0].schain
        }
      },
      regs: {
        ext: {}
      },
      site: {
        domain: loc.hostname,
        page: loc.href,
        ref: loc.href,
        publisher: {
          id: globalSiteId || validBidReqs[0].params.siteId,
        },
        device: {
          w: screen.width,
          h: screen.height
        },
      },
    };
    if (bidderRequest && bidderRequest.timeout > 0) {
      sortableBidReq.tmax = bidderRequest.timeout;
    }
    if (gdprConsent) {
      sortableBidReq.user = {
        ext: {
          consent: gdprConsent.consentString
        }
      };
      if (typeof gdprConsent.gdprApplies == 'boolean') {
        sortableBidReq.regs.ext.gdpr = gdprConsent.gdprApplies ? 1 : 0
      }
    }
    if (bidderRequest.uspConsent) {
      sortableBidReq.regs.ext.us_privacy = bidderRequest.uspConsent;
    }
    return {
      method: 'POST',
      url: `${SERVER_URL}/openrtb2/auction?src=$$REPO_AND_VERSION$$&host=${loc.hostname}`,
      data: JSON.stringify(sortableBidReq),
      options: {contentType: 'text/plain'}
    };
  },

  interpretResponse: function(serverResponse) {
    const { body: {id, seatbid} } = serverResponse;
    const sortableBids = [];
    if (id && seatbid) {
      utils._each(seatbid, seatbid => {
        utils._each(seatbid.bid, bid => {
          const bidObj = {
            requestId: bid.impid,
            cpm: parseFloat(bid.price),
            width: parseInt(bid.w),
            height: parseInt(bid.h),
            creativeId: bid.crid || bid.id,
            dealId: bid.dealid || null,
            currency: 'USD',
            netRevenue: true,
            mediaType: BANNER,
            ttl: 60
          };
          if (bid.adm) {
            const adFormat = utils.deepAccess(bid, 'ext.ad_format')
            if (adFormat === 'native') {
              let native = tryParseNativeResponse(bid.adm);
              if (!native) {
                return;
              }
              bidObj.mediaType = NATIVE;
              bidObj.native = interpretNativeResponse(native);
            } else if (adFormat === 'instream') {
              bidObj.mediaType = VIDEO;
              bidObj.vastXml = bid.adm;
            } else {
              bidObj.mediaType = BANNER;
              bidObj.ad = bid.adm;
              if (bid.nurl) {
                bidObj.ad += utils.createTrackPixelHtml(decodeURIComponent(bid.nurl));
              }
            }
          } else if (bid.nurl) {
            bidObj.adUrl = bid.nurl;
          }
          if (bid.ext) {
            bidObj[BIDDER_CODE] = bid.ext;
          }
          sortableBids.push(bidObj);
        });
      });
    }
    return sortableBids;
  },

  getUserSyncs: (syncOptions, responses) => {
    const syncs = [];
    if (syncOptions.iframeEnabled) {
      transformSyncs(responses, 'iframe', syncs);
    }
    if (syncOptions.pixelEnabled) {
      transformSyncs(responses, 'image', syncs);
    }
    return syncs;
  },

  onTimeout(details) {
    fetch(`${SERVER_URL}/prebid/timeout`, {
      method: 'POST',
      body: JSON.stringify(details),
      mode: 'no-cors',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
};

registerBidder(spec);
