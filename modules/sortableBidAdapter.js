import { _each, logError, isFn, isPlainObject, isNumber, isStr, deepAccess, parseUrl, _map, getUniqueIdentifierStr, createTrackPixelHtml } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { createEidsArray } from './userId/eids.js';

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

  _each(assets, (asset, id) => asset.id = id);
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
    logError('Sortable bid adapter unable to parse native bid response:\n\n' + e);
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
  _each(response.assets, asset => {
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
  _each(responses, res => {
    if (res.body && res.body.ext && res.body.ext.sync_dsps && res.body.ext.sync_dsps.length) {
      _each(res.body.ext.sync_dsps, sync => {
        if (sync[0] === type && sync[1]) {
          syncs.push({type, url: sync[1]});
        }
      });
    }
  });
}

function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return bid.params.floor ? bid.params.floor : null;
  }

  // MediaType and Size will automatically get set for us if the bid only has
  // one media type or one size.
  let floor = bid.getFloor({
    currency: 'USD',
    mediaType: '*',
    size: '*'
  });
  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return null;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],

  isBidRequestValid: function(bid) {
    const sortableConfig = config.getConfig('sortable');
    const haveSiteId = (sortableConfig && !!sortableConfig.siteId) || bid.params.siteId;
    const floor = getBidFloor(bid);
    const validFloor = !floor || isNumber(floor);
    const validKeywords = !bid.params.keywords ||
      (isPlainObject(bid.params.keywords) &&
        Object.keys(bid.params.keywords).every(key =>
          isStr(key) && isStr(bid.params.keywords[key])
        ))
    const isBanner = !bid.mediaTypes || bid.mediaTypes[BANNER] || !(bid.mediaTypes[NATIVE] || bid.mediaTypes[VIDEO]);
    const bannerSizes = isBanner ? deepAccess(bid, `mediaType.${BANNER}.sizes`) || bid.sizes : null;
    return !!(bid.params.tagId && haveSiteId && validFloor && validKeywords && (!isBanner ||
      (bannerSizes && bannerSizes.length > 0 && bannerSizes.every(sizeArr => sizeArr.length == 2 && sizeArr.every(num => isNumber(num))))));
  },

  buildRequests: function(validBidReqs, bidderRequest) {
    const sortableConfig = config.getConfig('sortable') || {};
    const globalSiteId = sortableConfig.siteId;
    let loc = parseUrl(bidderRequest.refererInfo.referer);

    const sortableImps = _map(validBidReqs, bid => {
      const rv = {
        id: bid.bidId,
        tagid: bid.params.tagId,
        ext: {}
      };
      const bannerMediaType = deepAccess(bid, `mediaTypes.${BANNER}`);
      const nativeMediaType = deepAccess(bid, `mediaTypes.${NATIVE}`);
      const videoMediaType = deepAccess(bid, `mediaTypes.${VIDEO}`);
      if (bannerMediaType || !(nativeMediaType || videoMediaType)) {
        const bannerSizes = (bannerMediaType && bannerMediaType.sizes) || bid.sizes;
        rv.banner = {
          format: _map(bannerSizes, ([width, height]) => ({w: width, h: height}))
        };
      }
      if (nativeMediaType) {
        rv.native = buildNativeRequest(nativeMediaType);
      }
      if (videoMediaType && videoMediaType.context === 'instream') {
        const video = {placement: 1};
        video.mimes = videoMediaType.mimes || [];
        video.minduration = deepAccess(bid, 'params.video.minduration') || 10;
        video.maxduration = deepAccess(bid, 'params.video.maxduration') || 60;
        const startDelay = deepAccess(bid, 'params.video.startdelay');
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
      const floor = getBidFloor(bid);
      if (floor) {
        rv.floor = floor;
      }
      if (bid.params.keywords) {
        rv.ext.keywords = bid.params.keywords;
      }
      if (bid.params.bidderParams) {
        _each(bid.params.bidderParams, (params, partner) => {
          rv.ext[partner] = params;
        });
      }
      rv.ext.gpid = deepAccess(bid, 'ortb2Imp.ext.data.pbadslot');
      return rv;
    });
    const gdprConsent = bidderRequest && bidderRequest.gdprConsent;
    const bidUserId = validBidReqs[0].userId;
    const eids = createEidsArray(bidUserId);
    const sortableBidReq = {
      id: getUniqueIdentifierStr(),
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
      user: {
        ext: {}
      }
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
    if (eids.length) {
      sortableBidReq.user.ext.eids = eids;
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
      _each(seatbid, seatbid => {
        _each(seatbid.bid, bid => {
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
            ttl: 60,
            meta: {
              advertiserDomains: bid.adomain || []
            }
          };
          if (bid.adm) {
            const adFormat = deepAccess(bid, 'ext.ad_format')
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
                bidObj.ad += createTrackPixelHtml(decodeURIComponent(bid.nurl));
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
