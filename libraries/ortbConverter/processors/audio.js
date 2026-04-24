import { AUDIO } from '../../../src/mediaTypes.js';
import { isEmpty, mergeDeep } from '../../../src/utils.js';

import { ORTB_AUDIO_PARAMS } from '../../../src/audio.js';

export function fillAudioImp(imp, bidRequest, context) {
  if (context.mediaType && context.mediaType !== AUDIO) return;

  const audioParams = bidRequest?.mediaTypes?.audio;
  if (!isEmpty(audioParams)) {
    const audio = Object.fromEntries(
      // Parameters that share the same name & semantics between pbjs adUnits and imp.audio
      Object.entries(audioParams)
        .filter(([name]) => ORTB_AUDIO_PARAMS.has(name))
    );

    imp.audio = mergeDeep(audio, imp.audio);
  }
}

export function fillAudioResponse(bidResponse, seatbid) {
  if (bidResponse.mediaType === AUDIO) {
    if (seatbid.adm) { bidResponse.vastXml = seatbid.adm; }
    if (seatbid.nurl) { bidResponse.vastUrl = seatbid.nurl; }
  }
}
