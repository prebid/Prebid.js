import {deepAccess, inIframe, isEmpty, logWarn, mergeDeep} from '../../../src/utils.js';
import {VIDEO} from '../../../src/mediaTypes.js';
import {sizesToFormat} from '../lib/sizes.js';

const PBJS_SPECIFIC_VIDEO_PARAMS = new Set(['context', 'playerSize'])

const PLACEMENT = {
  'instream': 1,
  'outstream': 4
}

export function fillVideoImp(imp, bidRequest, context) {
  if (context.mediaType && context.mediaType !== VIDEO) return;

  const videoParams = deepAccess(bidRequest, 'mediaTypes.video');
  if (!isEmpty(videoParams)) {
    const video = Object.fromEntries(
      Object.entries(videoParams)
        .filter(([name]) => !PBJS_SPECIFIC_VIDEO_PARAMS.has(name))
        .concat([['topframe', inIframe() ? 0 : 1]])
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
