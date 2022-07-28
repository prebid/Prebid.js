import {deepAccess, isEmpty, logWarn, mergeDeep} from '../../../src/utils.js';
import {VIDEO} from '../../../src/mediaTypes.js';
import {sizesToFormat} from '../lib/sizes.js';

// parameters that share the same name & semantics between pbjs adUnits and imp.video
const ORTB_VIDEO_PARAMS = new Set([
  'pos',
  'placement',
  'api',
  'mimes',
  'protocols',
  'playbackmethod',
  'minduration',
  'maxduration',
  'w',
  'h',
  'startdelay',
  'placement',
  'linearity',
  'skip',
  'skipmin',
  'skipafter',
  'minbitrate',
  'maxbitrate',
  'delivery',
  'playbackend'
]);

const PLACEMENT = {
  'instream': 1,
}

export const VALIDATIONS = {
  skip(video, value) {
    if (value !== 0 && value !== 1) {
      logWarn(`mediaTypes.video.skip must be 0 or 1, got ${value} instead - ignoring skip parameters`);
      delete video.skip;
    }
    if (value !== 1) {
      delete video.skipmin;
      delete video.skipafter;
    }
  }
}

export function fillVideoImp(imp, bidRequest, context) {
  if (context.mediaType && context.mediaType !== VIDEO) return;

  const videoParams = deepAccess(bidRequest, 'mediaTypes.video');
  if (!isEmpty(videoParams)) {
    const video = Object.fromEntries(
      Object.entries(videoParams)
        .filter(([name]) => ORTB_VIDEO_PARAMS.has(name))
    );
    if (videoParams.playerSize) {
      const format = sizesToFormat(videoParams.playerSize);
      if (format.length > 1) {
        logWarn('video request specifies more than one playerSize; all but the first will be ignored')
      }
      Object.assign(video, format[0]);
    }
    const placement = PLACEMENT[videoParams.context];
    if (placement != null) {
      video.placement = placement;
    }
    mergeDeep(video, imp.video);
    Object.entries(VALIDATIONS)
      .filter(([key]) => video.hasOwnProperty(key))
      .forEach(([key, fn]) => fn(video, video[key]));
    imp.video = video;
  }
}

export function fillVideoResponse(bidResponse, seatbid, context) {
  if (bidResponse.mediaType === VIDEO) {
    if (deepAccess(context.imp, 'video.w') && deepAccess(context.imp, 'video.h')) {
      [bidResponse.playerWidth, bidResponse.playerHeight] = [context.imp.video.w, context.imp.video.h];
    }

    if (seatbid.adm) { bidResponse.vastXml = seatbid.adm; }
    if (seatbid.nurl) { bidResponse.vastUrl = seatbid.nurl; }
  }
}
