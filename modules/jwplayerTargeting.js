import config from '../src/config.js';
import ajaxBuilder from '../src/ajax.js';
import logError from '../src/utils.js';
import getGlobal from '../src/prebidGlobal.js';

const segCache = {};
let pendingRequests = 0;
let requestTimeout;
let resumeBidRequest;

function setup () {
  config.getConfig('jwpTargeting', (config) => {
    // fetch media ids
    const targeting = config.jwpTargeting;
    if (!targeting) {
      return;
    }
    const mediaIDs = targeting.mediaIDs;
    pendingRequests = mediaIDs.length;
    mediaIDs.forEach(mediaID => {
      console.log(mediaID);
      fetchTargetingForMediaId(mediaID);
    })
  });

  getGlobal().requestBids.before(function(nextFn, reqBidsConfigObj) {
    console.log('before requestBids');
    if (pendingRequests <= 0) {
      nextFn.apply(this, [reqBidsConfigObj]);
      return;
    }
    requestTimeout = setTimeout(() => {
      console.log('Request for targeting info timed out')
      nextFn.apply(this, [reqBidsConfigObj]);
    }, 1500);

    resumeBidRequest = nextFn.bind(this, reqBidsConfigObj);
  });
}

/**
 * @param bidRequest {object} - the bid which is passed to a prebid adapter for use in `buildRequests`
 * @returns {Array<string>} - an array of jwpseg targeting segments found for the given bidRequest information
 */
export function getTargetingForBid(bidRequest) {
  console.log('karim getTargetingForBid');
  const jwpTargeting = bidRequest.jwpTargeting;
  if (!jwpTargeting) {
    return [];
  }
  const { mediaID, playerID } = jwpTargeting;
  let segments = segCache[mediaID];
  if (segments) {
    return segments;
  }

  const player = getPlayer(playerID);
  if (!player) {
    return [];
  }

  let item = player.getPlaylist().filter(item => item.mediaid === mediaID);
  if (item) {
    segments = item.jwpseg;
    segCache[mediaID] = segments;
    return segments;
  }
  return player.getPlaylistItem().jwpseg;
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

function fetchTargetingForMediaId(mediaId) {
  const ajax = ajaxBuilder(1500);
  ajax(`https://cdn.jwplayer.com/v2/media/${mediaId}`,
    {
      success: function (response) {
        try {
          const data = JSON.parse(response);
          if (!data) {
            return;
          }
          const jwpseg = data.playlist[0].jwpseg;
          if (jwpseg) {
            segCache[mediaId] = jwpseg;
            console.log('writing to cache: ', segCache);
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
  pendingRequests--;
  if (pendingRequests > 0) {
    return;
  }

  if (requestTimeout) {
    clearTimeout(requestTimeout);
  }

  if (resumeBidRequest) {
    resumeBidRequest();
  }
}

setup();
