import { submodule } from '../src/hook.js';
import { config } from '../src/config.js';
import { ajaxBuilder } from '../src/ajax.js';
import { logError } from '../src/utils.js';
import find from 'core-js-pure/features/array/find.js';

const SUBMODULE_NAME = 'jwplayer';
let requestCount = 0;
let requestTimeout = 150;
const segCache = {};
let resumeBidRequest;

export function fetchTargetingInformation(jwTargeting) {
  const mediaIDs = jwTargeting.mediaIDs;
  requestCount = mediaIDs.length;
  mediaIDs.forEach(mediaID => {
    fetchTargetingForMediaId(mediaID);
  });
}

export function fetchTargetingForMediaId(mediaId) {
  const ajax = ajaxBuilder(requestTimeout);
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

  if (resumeBidRequest) {
    resumeBidRequest();
    resumeBidRequest = null;
  }
}

function getSegments(adUnits, onDone) {
  executeAfterPrefetch(() => {
    const dataToReturn = adUnits.reduce((acc, adUnit) => {
      const code = adUnit.code;
      if (!code) {
        return acc;
      }
      const targetingInfo = getTargetingForBid(adUnit);
      if (targetingInfo.length) {
        acc[code] = {
          jwTargeting: {
            segments: targetingInfo
          }
        };
      }
      return acc;
    }, {});
    onDone(dataToReturn);
  });
}

function executeAfterPrefetch(callback) {
  if (requestCount > 0) {
    resumeBidRequest = callback;
  } else {
    callback();
  }
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

  const item = mediaID ? find(player.getPlaylist(), item => item.mediaid === mediaID) : player.getPlaylistItem();
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

/** @type {RtdSubmodule} */
export const jwplayerSubmodule = {
  /**
   * used to link submodule with realTimeData
   * @type {string}
   */
  name: SUBMODULE_NAME,
  /**
   * get data and send back to realTimeData module
   * @function
   * @param {adUnit[]} adUnits
   * @param {function} onDone
   */
  getData: getSegments,
  init
};

export function beforeInit(config) {
  config.getConfig('realTimeData', ({realTimeData}) => {
    const providers = realTimeData.dataProviders;
    const jwplayerProvider = providers && find(providers, pr => pr.name && pr.name.toLowerCase() === SUBMODULE_NAME);
    const params = jwplayerProvider && jwplayerProvider.params;
    if (!params) {
      return;
    }
    requestTimeout = params.auctionDelay || params.timeout || requestTimeout;
    fetchTargetingInformation(params);
  });
}

function init(config, gdpr, usp) {
  return true;
}

submodule('realTimeData', jwplayerSubmodule);
beforeInit(config);
