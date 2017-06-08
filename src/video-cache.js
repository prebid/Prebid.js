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

import { ajax } from './ajax';
import { tryAppendQueryString } from './utils';

const PUT_URL = 'https://prebid.adnxs.com/pbc/v1/put'
const GET_URL = 'https://prebid.adnxs.com/pbc/v1/get?';
const EMPTY_VAST_RESPONSE = '<VAST version="3.0"></VAST>'

/**
 * These are the properties required on a Bid in order to cache and retrieve it.
 *
 * @typedef {object} CacheableBid
 * @property {string} vastUrl A URL which loads some valid VAST XML.
 */

/**
 * Function which wraps a URI that serves VAST XML, so that it can be loaded.
 *
 * @param {string} uri The URI where the VAST content can be found.
 * @return A VAST URL which loads XML from the given URI.
 */
function wrapURI(uri) {
  // Technically, this is vulnerable to cross-script injection by sketchy vastUrl bids.
  // We could make sure it's a valid URI... but since we're loading VAST XML from the
  // URL they provide anyway, that's probably not a big deal.
  return '<VAST version="2.0"><Ad id=""><Wrapper><AdSystem>prebid.org wrapper</AdSystem><VASTAdTagURI><![CDATA[' +
    uri +
    ']]></VASTAdTagURI><Impression></Impression><Creatives></Creatives></Wrapper></Ad></VAST>'
}

/**
 * Wraps a bid in the format expected by the prebid-server endpoints, or returns null if
 * the bid can't be converted cleanly.
 *
 * @param {CacheableBid} bid
 */
function toStorageRequest(bid) {
  return {
    'value': wrapURI(bid.vastUrl)
  };
}

/**
 * If the server responded successfully, then it gave us a bunch of objects with uuid properties.
 * Abstract our background dependency away by renaming them to cacheId.
 */
function fromStorageResponse(response) {
  return {
    cacheId: response.uuid
  };
}

/**
 * A function which should be called with the results of the storage operation.
 *
 * @callback videoCacheStoreCallback
 *
 * @param {Error} [error] The error, if one occurred.
 * @param {?string[]} uuids An array of unique IDs. The array will have one element for each bid we were asked
 *   to store. It may include null elements if some of the bids were malformed, or an error occurred.
 *   Each non-null element in this array is a valid input into the retrieve function, which will fetch
 *   some VAST XML which can be used to render this bid's ad.
 */

/**
 * A function which bridges the APIs between the videoCacheStoreCallback and our ajax function's API.
 *
 * @param {videoCacheStoreCallback} callback A callback to the "store" function.
 * @return {Function} A callback which interprets the cache server's responses, and makes up the right
 *   arguments for our callback.
 */
function shimStorageCallback(callback) {
  return {
    success: function(responseBody) {
      let ids;
      try {
        ids = JSON.parse(responseBody).responses.map(fromStorageResponse)
      }
      catch (e) {
        callback(e, []);
        return;
      }

      callback(null, ids);
    },
    error: function(statusText, responseBody) {
      callback(new Error('Error storing video ad in the cache: ' + statusText + ': ' + JSON.stringify(responseBody)), []);
    }
  }
}

/**
 * If the given bid is for a Video ad, generate a unique ID and cache it somewhere server-side.
 *
 * @param {CacheableBid[]} bids A list of bid objects which should be cached.
 * @param {videoCacheStoreCallback} [callback] An optional callback which should be executed after
 *   the data has been stored in the cache.
 */
export function store(bids, callback) {
  const requestData = {
    puts: bids.map(toStorageRequest)
  };

  ajax(PUT_URL, shimStorageCallback(callback), JSON.stringify(requestData), {
    contentType: 'text/plain',
    withCredentials: true
  });
}

/**
 * @callback videoCacheRetrieveCallback
 *
 * @param {Error} [error] The error, if one occurred.
 * @param {string} A VAST XML string. If error is defined, this can still expect an "empty"
 *   VAST URL response.
 */

/**
 * Takes the user-defined callback, and wraps it into our ajax function's API.
 *
 * This also needs to work around the fact that the cache server returns a 200 on "data not found"...
 * which this module's API signals as an error.
 *
 * @param {videoCacheRetrieveCallback} callback
 */
function shimRetrievalCallback(callback) {
  return {
    success: function(responseBody) {
      // If the cache didn't have our data, it returns JSON with an error property.
      let errorMsg;
      try {
        errorMsg = JSON.parse(responseBody).error;
      }
      // But if it's not of this form, then we got a cache hit.
      catch (e) {
        callback(null, responseBody);
        return;
      }

      callback(new Error(errorMsg), EMPTY_VAST_RESPONSE);
    },

    error: function(statusText, responseBody) {
      const err = new Error('Error retrieving ad from the cache. ' + statusText + ': ' + responseBody);
      callback(err, EMPTY_VAST_RESPONSE);
    }
  }
}

/**
 * Make a server call for the given cacheId, and execute the callback function when they get back to us.
 *
 * @param {string} cacheId The ID of the video whose content should be retrieved.
 * @param {videoCacheRetrieveCallback} callback A callback function which should be run once the
 *   VAST content has been fetched from the cache.
 */
function retrieveFromServer(cacheId, callback) {
  if (typeof cacheId !== 'string') {
    callback(new Error('The cacheId must be a string.'), EMPTY_VAST_RESPONSE);
    return;
  }
  ajax(tryAppendQueryString(GET_URL, 'uuid', cacheId).slice(0, -1), shimRetrievalCallback(callback));
}

/**
 * Memoization function which prevents excessive server calls. This stores all the
 * [cacheId, cacheValue] pairs locally so that we don't go to the network again if
 * the publisher requests the same VAST content more than once.
 */
function memoize(retrievalFunction) {
  const cache = {};
  // Function which wraps a videoCacheRetrieveCallback so that we write to the cache first.
  //
  // This doesn't cache errors because there might have been a connectivity issue, or perhaps
  // someone used our async functions badly and read from the cache before the value was written
  // the first time. In either case, it's worth trying again.
  function cachedCallback(cacheId, callback) {
    return function(error, response) {
      if (!error) {
        cache[cacheId] = response;
      }
      callback(error, response);
    }
  }

  return function memoizedRetrieveFromServer(cacheId, callback) {
    if (cache[cacheId]) {
      callback(null, cache[cacheId]);
    }
    else {
      retrievalFunction(cacheId, cachedCallback(cacheId, callback));
    }
  }
}

/**
 * Fetch the VAST XML associated with cacheId, and execute the callback function with it.
 *
 * @param {string} cacheId The ID of the video whose content should be retrieved.
 * @param {videoCacheRetrieveCallback} callback A callback function which should be run once the
 *   VAST content has been fetched from the cache.
 */
export const retrieve = memoize(retrieveFromServer);
