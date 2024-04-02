import {VIDEO} from '../../../src/mediaTypes.js';
import {deepAccess} from '../../../src/utils.js';

export function setBidResponseVideoCache(bidResponse, bid) {
  if (bidResponse.mediaType === VIDEO) {
    // try to get cache values from 'response.ext.prebid.cache'
    // else try 'bid.ext.prebid.targeting' as fallback
    let {cacheId: videoCacheKey, url: vastUrl} = deepAccess(bid, 'ext.prebid.cache.vastXml') || {};
    if (!videoCacheKey || !vastUrl) {
      const {hb_uuid: uuid, hb_cache_host: cacheHost, hb_cache_path: cachePath} = deepAccess(bid, 'ext.prebid.targeting') || {};
      if (uuid && cacheHost && cachePath) {
        videoCacheKey = uuid;
        vastUrl = `https://${cacheHost}${cachePath}?uuid=${uuid}`;
      }
    }
    if (videoCacheKey && vastUrl) {
      Object.assign(bidResponse, {
        videoCacheKey,
        vastUrl
      })
    }
  }
}
