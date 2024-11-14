import {deepAccess, isEmpty, logWarn, mergeDeep, sizesToSizeTuples, sizeTupleToRtbSize} from '../../../src/utils.js';
import {VIDEO} from '../../../src/mediaTypes.js';

import {ORTB_VIDEO_PARAMS} from '../../../src/video.js';

export function fillVideoImp(imp, bidRequest, context) {
  if (context.mediaType && context.mediaType !== VIDEO) return;

  const videoParams = deepAccess(bidRequest, 'mediaTypes.video');
  if (!isEmpty(videoParams)) {
    const video = Object.fromEntries(
      // Parameters that share the same name & semantics between pbjs adUnits and imp.video
      Object.entries(videoParams)
        .filter(([name]) => ORTB_VIDEO_PARAMS.has(name))
    );
    if (videoParams.playerSize) {
      const format = sizesToSizeTuples(videoParams.playerSize).map(sizeTupleToRtbSize);
      if (format.length > 1) {
        logWarn('video request specifies more than one playerSize; all but the first will be ignored')
      }
      Object.assign(video, format[0]);
    }

    imp.video = mergeDeep(video, imp.video);
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
