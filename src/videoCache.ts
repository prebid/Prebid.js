/**
 * This module interacts with the server used to cache video ad content to be restored later.
 * At a high level, the expected workflow goes like this:
 *
 *   - Request video ads from Bidders
 *   - Generate IDs for each valid bid, and cache the key/value pair on the server.
 *   - Return these IDs so that publishers can use them to fetch the bids later.
 *
 * This trickery helps integrate with ad servers, which set character limits on request params.
 */

import {ajaxBuilder} from './ajax.js';
import {config} from './config.js';
import {auctionManager} from './auctionManager.js';
import {generateUUID, logError, logWarn} from './utils.js';
import {addBidToAuction} from './auction.js';
import type {VideoBid} from "./bidfactory.ts";

/**
 * Might be useful to be configurable in the future
 * Depending on publisher needs
 */
// TODO: we have a `ttlBuffer` setting
const ttlBufferInSeconds = 15;

export const vastLocalCache = new Map();

/**
 * Function which wraps a URI that serves VAST XML, so that it can be loaded.
 *
 * @param uri The URI where the VAST content can be found.
 * @param impTrackerURLs An impression tracker URL for the delivery of the video ad
 * @return A VAST URL which loads XML from the given URI.
 */
function wrapURI(uri: string, impTrackerURLs: string | string[]) {
  impTrackerURLs = impTrackerURLs && (Array.isArray(impTrackerURLs) ? impTrackerURLs : [impTrackerURLs]);
  // Technically, this is vulnerable to cross-script injection by sketchy vastUrl bids.
  // We could make sure it's a valid URI... but since we're loading VAST XML from the
  // URL they provide anyway, that's probably not a big deal.
  let impressions = impTrackerURLs ? impTrackerURLs.map(trk => `<Impression><![CDATA[${trk}]]></Impression>`).join('') : '';
  return `<VAST version="3.0">
    <Ad>
      <Wrapper>
        <AdSystem>prebid.org wrapper</AdSystem>
        <VASTAdTagURI><![CDATA[${uri}]]></VASTAdTagURI>
        ${impressions}
        <Creatives></Creatives>
      </Wrapper>
    </Ad>
  </VAST>`;
}

declare module './bidfactory' {
    interface VideoBidResponseProperties {
        /**
         *  VAST impression trackers to attach to this bid.
         */
        vastImpUrl?: string | string []
        /**
         * Cache key to use for caching this bid's VAST.
         */
        customCacheKey?: string
    }
    interface VideoBidProperties {
        /**
         * The cache key that was used for this bid.
         */
        videoCacheKey?: string;
    }
}

export interface CacheConfig {
    /**
     * The URL of the Prebid Cache server endpoint where VAST creatives will be sent.
     */
    url: string;
    /**
     * Flag determining whether to locally save VAST XML as a blob
     */
    useLocal?: boolean;
    /**
     * Timeout (in milliseconds) for network requests to the cache
     */
    timeout?: number;
    /**
     * Passes additional data to the url, used for additional event tracking data. Defaults to false.
     */
    vasttrack?: boolean;
    /**
     * If the bidder supplied their own cache key, setting this value to true adds a VAST wrapper around that URL,
     * stores it in the cache defined by the url parameter, and replaces the original video cache key with the new one.
     * This can dramatically simplify ad server setup because it means all VAST creatives reside behind a single URL.
     * The tradeoff: this approach requires the video player to unwrap one extra level of VAST. Defaults to false.
     */
    ignoreBidderCacheKey?: boolean;
    /**
     * Enables video cache requests to be batched by a specified amount (defaults to 1) instead of making a single request per each video.
     */
    batchSize?: number;
    /**
     * Used in conjunction with batchSize, batchTimeout specifies how long to wait in milliseconds before sending
     * a batch video cache request based on the value for batchSize (if present). A batch request will be made whether
     * the batchSize amount was reached or the batchTimeout timer runs out. batchTimeout defaults to 0.
     */
    batchTimeout?: number;
}

declare module './config' {
    interface Config {
        cache?: CacheConfig;
    }
}
/**
 * Wraps a bid in the format expected by the prebid-server endpoints, or returns null if
 * the bid can't be converted cleanly.
 *
 * @return {Object|null} - The payload to be sent to the prebid-server endpoints, or null if the bid can't be converted cleanly.
 */
function toStorageRequest(bid, {index = auctionManager.index} = {}) {
const vastValue = getVastXml(bid);
  const auction = index.getAuction(bid);
  const ttlWithBuffer = Number(bid.ttl) + ttlBufferInSeconds;
  let payload: any = {
    type: 'xml',
    value: vastValue,
    ttlseconds: ttlWithBuffer
  };

  if (config.getConfig('cache.vasttrack')) {
    payload.bidder = bid.bidder;
    payload.bidid = bid.requestId;
    payload.aid = bid.auctionId;
  }

  if (auction != null) {
    payload.timestamp = auction.getAuctionStart();
  }

  if (typeof bid.customCacheKey === 'string' && bid.customCacheKey !== '') {
    payload.key = bid.customCacheKey;
  }

  return payload;
}

interface VideoCacheStoreCallback {
    /**
     * A function which should be called with the results of the storage operation.
     *
     * @param error The error, if one occurred.
     * @param uuids An array of unique IDs. The array will have one element for each bid we were asked
     *   to store. It may include null elements if some of the bids were malformed, or an error occurred.
     *   Each non-null element in this array is a valid input into the retrieve function, which will fetch
     *   some VAST XML which can be used to render this bid's ad.
     */
    (error: Error | null, uuids: { uuid: string }[])
}

/**
 * A function which bridges the APIs between the videoCacheStoreCallback and our ajax function's API.
 *
 * @param done A callback to the "store" function.
 */
function shimStorageCallback(done: VideoCacheStoreCallback) {
  return {
    success: function (responseBody) {
      let ids;
      try {
        ids = JSON.parse(responseBody).responses
      } catch (e) {
        done(e, []);
        return;
      }

      if (ids) {
        done(null, ids);
      } else {
        done(new Error("The cache server didn't respond with a responses property."), []);
      }
    },
    error: function (statusText, responseBody) {
      done(new Error(`Error storing video ad in the cache: ${statusText}: ${JSON.stringify(responseBody)}`), []);
    }
  }
}

function getVastXml(bid) {
  return bid.vastXml ? bid.vastXml : wrapURI(bid.vastUrl, bid.vastImpUrl);
};

/**
 * If the given bid is for a Video ad, generate a unique ID and cache it somewhere server-side.
 *
 * @param bids A list of bid objects which should be cached.
 * @param done An optional callback which should be executed after
 * @param getAjax
 * the data has been stored in the cache.
 */
export function store(bids: VideoBid[], done?: VideoCacheStoreCallback, getAjax = ajaxBuilder) {
  const requestData = {
    puts: bids.map(bid => toStorageRequest(bid))
  };
  const ajax = getAjax(config.getConfig('cache.timeout'));
  ajax(config.getConfig('cache.url'), shimStorageCallback(done), JSON.stringify(requestData), {
    contentType: 'text/plain',
    withCredentials: true
  });
}

export function getCacheUrl(id) {
  return `${config.getConfig('cache.url')}?uuid=${id}`;
}

export const storeLocally = (bid) => {
  const vastXml = getVastXml(bid);
  const bidVastUrl = URL.createObjectURL(new Blob([vastXml], { type: 'text/xml' }));

  assignVastUrlAndCacheId(bid, bidVastUrl);

  vastLocalCache.set(bid.videoCacheKey, bidVastUrl);
};

const assignVastUrlAndCacheId = (bid, vastUrl, videoCacheKey?) => {
  bid.videoCacheKey = videoCacheKey || generateUUID();
  if (!bid.vastUrl) {
    bid.vastUrl = vastUrl;
  }
}

export const _internal = {
  store
}

export function storeBatch(batch) {
  const bids = batch.map(entry => entry.bidResponse)
  function err(msg) {
    logError(`Failed to save to the video cache: ${msg}. Video bids will be discarded:`, bids)
  }
  _internal.store(bids, function (error, cacheIds) {
    if (error) {
      err(error)
    } else if (batch.length !== cacheIds.length) {
      logError(`expected ${batch.length} cache IDs, got ${cacheIds.length} instead`)
    } else {
      cacheIds.forEach((cacheId, i) => {
        const {auctionInstance, bidResponse, afterBidAdded} = batch[i];
        if (cacheId.uuid === '') {
          logWarn(`Supplied video cache key was already in use by Prebid Cache; caching attempt was rejected. Video bid must be discarded.`);
        } else {
          assignVastUrlAndCacheId(bidResponse, getCacheUrl(cacheId.uuid), cacheId.uuid);
          addBidToAuction(auctionInstance, bidResponse);
          afterBidAdded();
        }
      });
    }
  });
};

let batchSize, batchTimeout, cleanupHandler;
if (FEATURES.VIDEO) {
  config.getConfig('cache', ({cache}) => {
    batchSize = typeof cache.batchSize === 'number' && cache.batchSize > 0
      ? cache.batchSize
      : 1;
    batchTimeout = typeof cache.batchTimeout === 'number' && cache.batchTimeout > 0
      ? cache.batchTimeout
      : 0;

    // removing blobs that are not going to be used
    if (cache.useLocal && !cleanupHandler) {
      cleanupHandler = auctionManager.onExpiry((auction) => {
        auction.getBidsReceived()
          .forEach((bid) => {
            const vastUrl = vastLocalCache.get(bid.videoCacheKey)
            if (vastUrl && vastUrl.startsWith('blob')) {
              URL.revokeObjectURL(vastUrl);
            }
            vastLocalCache.delete(bid.videoCacheKey);
          })
      });
    }
  });
}

export const batchingCache = (timeout = setTimeout, cache = storeBatch) => {
  let batches = [[]];
  let debouncing = false;
  const noTimeout = cb => cb();

  return function (auctionInstance, bidResponse, afterBidAdded) {
    const batchFunc = batchTimeout > 0 ? timeout : noTimeout;
    if (batches[batches.length - 1].length >= batchSize) {
      batches.push([]);
    }

    batches[batches.length - 1].push({auctionInstance, bidResponse, afterBidAdded});

    if (!debouncing) {
      debouncing = true;
      batchFunc(() => {
        batches.forEach(cache);
        batches = [[]];
        debouncing = false;
      }, batchTimeout);
    }
  };
};

export const batchAndStore = batchingCache();
