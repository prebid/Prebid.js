import {getBoundingClientRect} from '../boundingClientRect/boundingClientRect.js';
import {canAccessWindowTop, cleanObj, getWinDimensions, getWindowSelf, getWindowTop} from '../../src/utils.js';
import {getViewability, getViewportOffset} from '../percentInView/percentInView.js';

export function getPlacementPositionUtils() {
  const topWin = canAccessWindowTop() ? getWindowTop() : getWindowSelf();
  const selfWin = getWindowSelf();

  const getViewportHeight = () => {
    const dim = getWinDimensions();
    return dim.innerHeight || dim.document.documentElement.clientHeight || dim.document.body.clientHeight || 0;
  };

  const getPageHeight = () => {
    const dim = getWinDimensions();
    const body = dim.document.body;
    const html = dim.document.documentElement;
    if (!body || !html) return 0;

    return Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    );
  };

  const getViewableDistance = (element, frameOffset) => {
    if (!element) return {distanceToView: 0, elementHeight: 0};

    const elementRect = getBoundingClientRect(element);
    if (!elementRect) return {distanceToView: 0, elementHeight: 0};

    const elementTop = elementRect.top + frameOffset.y;
    const elementBottom = elementRect.bottom + frameOffset.y;
    const viewportHeight = getViewportHeight();

    let distanceToView;
    if (elementTop - viewportHeight <= 0 && elementBottom >= 0) {
      distanceToView = 0;
    } else if (elementTop - viewportHeight > 0) {
      distanceToView = Math.round(elementTop - viewportHeight);
    } else {
      distanceToView = Math.round(elementBottom);
    }

    return {distanceToView, elementHeight: elementRect.height};
  };

  function getPlacementInfo(bidReq) {
    const element = selfWin.document.getElementById(bidReq.adUnitCode);
    const frameOffset = getViewportOffset();
    const {distanceToView, elementHeight} = getViewableDistance(element, frameOffset);

    const sizes = (bidReq.sizes || []).map(size => ({
      w: Number.parseInt(size[0], 10),
      h: Number.parseInt(size[1], 10)
    }));
    const size = sizes.length > 0
      ? sizes.reduce((min, size) => size.h * size.w < min.h * min.w ? size : min, sizes[0])
      : {};

    const placementPercentView = element ? getViewability(element, topWin, size) : 0;

    return cleanObj({
      AuctionsCount: bidReq.auctionsCount,
      DistanceToView: distanceToView,
      PlacementPercentView: Math.round(placementPercentView),
      ElementHeight: Math.round(elementHeight) || 1
    });
  }

  function getPlacementEnv() {
    return cleanObj({
      TimeFromNavigation: Math.floor(performance.now()),
      TabActive: topWin.document.visibilityState === 'visible',
      PageHeight: getPageHeight(),
      ViewportHeight: getViewportHeight()
    });
  }

  return {
    getPlacementInfo,
    getPlacementEnv
  };
}
