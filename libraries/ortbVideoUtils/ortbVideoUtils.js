import { deepAccess } from '../../src/utils.js';

/**
 * Merges the video parameters of a bid request into one object.
 *
 * Precedence, lowest to highest: `w` and `h` derived from `mediaTypes.video.playerSize`
 * (the first size when several are given), then every property of `mediaTypes.video`,
 * then every property of `params.video`.
 *
 * @param {Object} bid Prebid bid request
 * @returns {Object} merged video parameters
 */
export function getMergedVideoParams(bid) {
  const videoAdUnitParams = deepAccess(bid, 'mediaTypes.video', {});
  const videoBidderParams = deepAccess(bid, 'params.video', {});
  const computedParams = {};

  if (Array.isArray(videoAdUnitParams.playerSize)) {
    const size = Array.isArray(videoAdUnitParams.playerSize[0]) ? videoAdUnitParams.playerSize[0] : videoAdUnitParams.playerSize;
    computedParams.w = size[0];
    computedParams.h = size[1];
  }

  return {
    ...computedParams,
    ...videoAdUnitParams,
    ...videoBidderParams
  };
}

/**
 * Builds an OpenRTB 2.5 video object from a bid request.
 *
 * Only the parameters named in `validators` are copied, and only when their value passes
 * the corresponding validator; `onInvalid` is called with the name of every parameter that
 * is present but rejected, so callers can log it their own way.
 *
 * @param {Object} bid Prebid bid request
 * @param {Object<string, function(*): boolean>} validators OpenRTB video parameter name to validator
 * @param {function(string): void} [onInvalid] called for each rejected parameter
 * @returns {Object} OpenRTB video object
 */
export function buildOrtbVideo(bid, validators, onInvalid = () => {}) {
  const videoParams = getMergedVideoParams(bid);
  const video = {};
  const names = Object.keys(validators);

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (Object.prototype.hasOwnProperty.call(videoParams, name)) {
      if (validators[name](videoParams[name])) {
        video[name] = videoParams[name];
      } else {
        onInvalid(name);
      }
    }
  }

  return video;
}
