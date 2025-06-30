// Utility functions extracted by codex bot
import {Renderer} from '../../src/Renderer.js';
import {logWarn, deepAccess, isArray} from '../../src/utils.js';

export const outstreamRender = bid => {
  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      sizes: [bid.width, bid.height],
      targetId: bid.adUnitCode,
      rendererOptions: {
        showBigPlayButton: false,
        showProgressBar: 'bar',
        showVolume: false,
        allowFullscreen: true,
        skippable: false,
        content: bid.vastXml
      }
    });
  });
};

export function createRenderer(bid, url) {
  const renderer = Renderer.install({
    targetId: bid.adUnitCode,
    url,
    loaded: false
  });
  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}

export function getMediaTypeFromBid(bid) {
  return bid.mediaTypes && Object.keys(bid.mediaTypes)[0];
}

export function hasVideoMandatoryParams(mediaTypes) {
  const isHasVideoContext = !!mediaTypes.video &&
    (mediaTypes.video.context === 'instream' || mediaTypes.video.context === 'outstream');
  const isPlayerSize = !!deepAccess(mediaTypes, 'video.playerSize') &&
    isArray(deepAccess(mediaTypes, 'video.playerSize'));
  return isHasVideoContext && isPlayerSize;
}
