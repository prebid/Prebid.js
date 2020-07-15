/**
 * The JW Player Targeting module provides functions which allow Ad Bidders to obtain JW Player's
 * Video Ad Targeting information.
 * The module can be used as a submodule for prebid adapters, allowing them to use the getTargetingForBid() function.
 * The module will fetch segments for the media ids present in the prebid config when the module loads. If any bid
 * requests are made while the segments are being fetched, they will be blocked until all requests complete, or the
 * 150ms timeout expires.
 */

import { config } from '../src/config.js';
import { ajaxBuilder } from '../src/ajax.js';
import { logError, isPlainObject } from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { module } from '../src/hook.js';

const segCache = {};
let requestCount = 0;
let requestTimeout;
let resumeBidRequest;

/*
Prebid auctions timeout at 200ms.
 */
let bidPauseTimeout = 150;

config.getConfig('jwTargeting', config => {
  const targeting = config.jwTargeting;
  // fetch media ids
  fetchTargetingInformation(targeting);

  const prefetchTimeout = targeting.prefetchTimeout;
  if (prefetchTimeout) {
    // prefetch timeout supersedes our default and our adjustment for bidderTimeout.
    bidPauseTimeout = prefetchTimeout;
    return;
  }

  const timeout = config.bidderTimeout;
  if (timeout < 200) {
    // 3/4 is the ratio between 150 and 200, where 150 is our default and 200 is prebid's default auction timeout.
    // Note auction will close at 200ms even if bidderTimeout is greater.
    bidPauseTimeout = timeout * 3 / 4;
  }
});

getGlobal().requestBids.before(ensureFeedRequestCompletion);

export function fetchTargetingInformation(jwTargeting) {
  const mediaIDs = jwTargeting.mediaIDs;
  requestCount = mediaIDs.length;
  mediaIDs.forEach(mediaID => {
    fetchTargetingForMediaId(mediaID);
  });
}

export function ensureFeedRequestCompletion(requestBids, bidRequestConfig) {
  if (requestCount <= 0) {
    requestBids.apply(this, [bidRequestConfig]);
    return;
  }
  resumeBidRequest = requestBids.bind(this, bidRequestConfig);
  requestTimeout = setTimeout(function() {
    resumeBidRequest();
    resumeBidRequest = null;
    requestTimeout = null;
  }, bidPauseTimeout);
}

/**
 * Retrieves the targeting information pertaining to a bid request.
 * @param bidRequest {object} - the bid which is passed to a prebid adapter for use in `buildRequests`. It must contain
 * a jwTargeting property.
 * @returns {Array<string>} - an array of jwpseg targeting segments found for the given bidRequest information
 */
export function getTargetingForBid(bidRequest) {
  const jwTargeting = bidRequest.jwTargeting;
  if (!jwTargeting) {
    return [];
  }

  const playerID = jwTargeting.playerID;
  let mediaID = jwTargeting.mediaID;
  let segments = segCache[mediaID];
  if (segments) {
    return segments;
  }

  const player = getPlayer(playerID);
  if (!player) {
    return [];
  }

  const item = mediaID ? player.getPlaylist().find(item => item.mediaid === mediaID) : player.getPlaylistItem();
  if (!item) {
    return [];
  }

  mediaID = mediaID || item.mediaid;
  segments = item.jwpseg;
  if (segments && mediaID) {
    segCache[mediaID] = segments;
  }

  return segments || [];
}

function getPlayer(playerID) {
  const jwplayer = window.jwplayer;
  if (!jwplayer) {
    logError('jwplayer.js was not found on page');
    return;
  }

  const player = jwplayer(playerID);
  if (!player || !player.getPlaylist) {
    logError('player ID did not match any players');
    return;
  }
  return player;
}

export function fetchTargetingForMediaId(mediaId) {
  const ajax = ajaxBuilder(1500);
  ajax(`https://cdn.jwplayer.com/v2/media/${mediaId}`,
    {
      success: function (response) {
        try {
          const data = JSON.parse(response);
          if (!data) {
            throw ('Empty response');
          }

          const playlist = data.playlist;
          if (!playlist || !playlist.length) {
            throw ('Empty playlist');
          }

          const jwpseg = playlist[0].jwpseg;
          if (jwpseg) {
            segCache[mediaId] = jwpseg;
          }
        } catch (err) {
          logError(err);
        }
        onRequestCompleted();
      },
      error: function () {
        logError('failed to retrieve targeting information');
        onRequestCompleted();
      }
    }
  );
}

function onRequestCompleted() {
  requestCount--;
  if (requestCount > 0) {
    return;
  }
  if (requestTimeout) {
    clearTimeout(requestTimeout);
    requestTimeout = null;
  }

  if (resumeBidRequest) {
    resumeBidRequest();
    resumeBidRequest = null;
  }
}

module('jwplayerTargeting', function shareJWPlayerUtilities() {
  const host = arguments[0];
  if (!isPlainObject(host)) {
    logError('JW Player module requires plain object to share methods with submodule');
    return;
  }
  host.getTargetingForBid = getTargetingForBid;
});
