import { getBoundingClientRect } from '../boundingClientRect/boundingClientRect.js';
import {canAccessWindowTop, cleanObj, getWindowSelf, getWindowTop} from '../../src/utils.js';
import {getViewability} from '../percentInView/percentInView.js';

export function getPlacementPositionUtils() {
  const win = (canAccessWindowTop()) ? getWindowTop() : getWindowSelf();

  const getViewportHeight = () => {
    const doc = document;
    return win.innerHeight || doc.documentElement.clientHeight || doc.body.clientHeight || 0;
  };

  const getPageHeight = () => {
    const body = document.body;
    const html = document.documentElement;
    if (!body || !html) return 0;

    return Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    );
  };

  const getViewableDistance = (element) => {
    if (!element) return { distanceToView: 0, elementHeight: 0 };

    const elementRect = getBoundingClientRect(element);
    if (!elementRect) return { distanceToView: 0, elementHeight: 0 };

    const viewportHeight = getViewportHeight();

    let distanceToView;
    if (elementRect.top - viewportHeight <= 0 && elementRect.bottom >= 0) {
      distanceToView = 0;
    } else if (elementRect.top - viewportHeight > 0) {
      distanceToView = Math.round(elementRect.top - viewportHeight);
    } else {
      distanceToView = Math.round(elementRect.bottom);
    }

    return { distanceToView, elementHeight: elementRect.height };
  };

  function getPlacementInfo (bidReq) {
    const element = document.getElementById(bidReq.adUnitCode);
    const { distanceToView, elementHeight } = getViewableDistance(element);

    const sizes = (bidReq.sizes || []).map(size => ({
      w: parseInt(size[0], 10),
      h: parseInt(size[1], 10)
    }));
    const size = sizes.length > 0
      ? sizes.reduce((min, size) => size.h * size.w < min.h * min.w ? size : min, sizes[0])
      : {};

    const placementPercentView = element ? getViewability(element, win, size) : 0;

    return cleanObj({
      AuctionsCount: bidReq.auctionsCount,
      DistanceToView: distanceToView,
      PlacementPercentView: Math.round(placementPercentView),
      ElementHeight: elementHeight || 1
    });
  }

  function getPlacementEnv () {
    return cleanObj({
      TimeFromNavigation: Math.floor(performance.now()),
      TabActive: document.visibilityState === 'visible',
      PageHeight: getPageHeight(),
      ViewportHeight: getViewportHeight()
    });
  }

  return {
    getPlacementInfo,
    getPlacementEnv
  };
}
