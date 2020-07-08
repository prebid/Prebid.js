import { config } from '../src/config.js';
import { ajaxBuilder } from '../src/ajax.js';
import { logError } from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';

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
    console.error('karim before requestBids', reqBidsConfigObj);
    if (pendingRequests <= 0) {
      console.log('karim no pending reqs');
      nextFn.apply(this, [reqBidsConfigObj]);
      return;
    }
    requestTimeout = setTimeout(() => {
      console.log('karim Request for targeting info timed out')
      nextFn.apply(this, [reqBidsConfigObj]);
    }, 1500);

    console.log('karim storing req');
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
    console.log('karim no targeting');
    return [];
  }
  const { mediaID, playerID } = jwpTargeting;
  let segments = segCache[mediaID];
  if (segments) {
    console.log('karim got segs from cache');
    return segments;
  }

  const player = getPlayer(playerID);
  if (!player) {
    console.log('karim no player');
    return [];
  }
  console.log('karim playlist ? ', player.getPlaylist());

  const playlist = player.getPlaylist();
  let item = playlist.find(item => item.mediaid === mediaID);
  if (item) {
    segments = item.jwpseg;
    segCache[mediaID] = segments;
    console.log('karim mediaId: ', item);
    console.log('karim got seg from playlist');
    return segments || [];
  }

  item = player.getPlaylistItem();
  if (item) {
    console.log('karim got seg from current item');
    console.log('karim getPlaylistItem ? ', player.getPlaylistItem());
    return item.jwpseg || [];
  }
  return [];
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
    console.log('karim clear Timeout bid req');
    clearTimeout(requestTimeout);
  }

  if (resumeBidRequest) {
    console.log('karim resume bid req');
    resumeBidRequest();
  }
}

setup();
