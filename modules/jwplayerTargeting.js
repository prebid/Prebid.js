import config from '../src/config.js';
import ajaxBuilder from '../src/ajax.js';
import logError from '../src/utils.js';

const segCache = {};

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
  return null;
}

function setup () {
  config.getConfig('jwpTargeting', (config) => {
    // fetch media ids
    const targeting = config.jwpTargeting;
    if (!targeting) {
      return;
    }
    const mediaIDs = targeting.mediaIDs;
    mediaIDs.forEach(mediaID => {
      console.log(mediaID);
      fetchTargetingForMediaId(mediaID);
    })
  });
}

function fetchTargetingForMediaId(mediaId) {
  let ajax = ajaxBuilder(1500);
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
      },
      error: function () {
        logError('failed to retrieve targeting information');
      }
    }
  );
}

setup();
