import { config } from '../src/config.js';
import { ajaxBuilder } from '../src/ajax.js';
import { logError, isPlainObject } from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { module } from '../src/hook.js';

const segCache = {};
let requestCount = 0;
let requestTimeout;
let resumeBidRequest;

function setup () {
  config.getConfig('jwpTargeting', (config) => {
    // fetch media ids
    fetchTargetingInformation(config.jwpTargeting)
  });

  getGlobal().requestBids.before(onFetchCompetion);
}

export function fetchTargetingInformation(jwTargeting) {
  const mediaIDs = jwTargeting.mediaIDs;
  requestCount = mediaIDs.length;
  mediaIDs.forEach(mediaID => {
    fetchTargetingForMediaId(mediaID);
  });
}

export function onFetchCompetion(nextFn, reqBidsConfigObj) {
  if (requestCount <= 0) {
    nextFn.apply(this, [reqBidsConfigObj]);
    return;
  }
  resumeBidRequest = nextFn.bind(this, reqBidsConfigObj);
  requestTimeout = setTimeout(function() {
    resumeBidRequest();
    resumeBidRequest = null;
    requestTimeout = null;
  }, 1500);
}

/**
 * @param bidRequest {object} - the bid which is passed to a prebid adapter for use in `buildRequests`
 * @returns {Array<string>} - an array of jwpseg targeting segments found for the given bidRequest information
 */
export function getTargetingForBid(bidRequest) {
  const jwpTargeting = bidRequest.jwpTargeting;
  if (!jwpTargeting) {
    return [];
  }

  const playerID = jwpTargeting.playerID;
  let mediaID = jwpTargeting.mediaID;
  let segments = segCache[mediaID];
  if (segments) {
    return segments;
  }

  const player = getPlayer(playerID);
  if (!player) {
    return [];
  }

  let item = mediaID ? player.getPlaylist().find(item => item.mediaid === mediaID) : player.getPlaylistItem();
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
  var jwplayer = window.jwplayer;
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
            return;
          }

          const playlist = data.playlist;
          if (!playlist || !playlist.length) {
            return;
          }

          const jwpseg = playlist[0].jwpseg;
          if (jwpseg) {
            segCache[mediaId] = jwpseg;
          }
        } catch (err) {
          logError('failed to parse response');
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

setup();

const jwplayerUtilities = {
  'getTargetingForBid': getTargetingForBid
};

module('jwplayer', function shareJWPlayerUtilities() {
  const host = arguments[0];
  if (!isPlainObject(host)) {
    logError('JW Player module requires plain object to share methods with submodule');
    return;
  }

  for (let method in jwplayerUtilities) {
    host[method] = jwplayerUtilities[method];
  }
});
