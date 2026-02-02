import {getBoundingClientRect} from '../boundingClientRect/boundingClientRect.js';
import {canAccessWindowTop, cleanObj, getWindowSelf, getWindowTop} from '../../src/utils.js';
import {getViewability} from '../percentInView/percentInView.js';

export function getPlacementPositionUtils() {
  const topWin = canAccessWindowTop() ? getWindowTop() : getWindowSelf();
  const selfWin = getWindowSelf();

  const findElementWithContext = (adUnitCode) => {
    let element = selfWin.document.getElementById(adUnitCode);
    if (element) {
      return {element, frameOffset: getFrameOffsetForCurrentWindow()};
    }

    const searchInIframes = (doc, accumulatedOffset = {top: 0}, iframeWindow = null) => {
      try {
        const element = doc.getElementById(adUnitCode);
        if (element) {
          return {element, frameOffset: accumulatedOffset, iframeWindow};
        }

        const frames = doc.getElementsByTagName('iframe');
        for (const frame of frames) {
          try {
            const iframeDoc = frame.contentDocument || frame.contentWindow?.document;
            if (iframeDoc) {
              const frameRect = getBoundingClientRect(frame);
              const newOffset = {
                top: accumulatedOffset.top + frameRect.top
              };
              const result = searchInIframes(iframeDoc, newOffset, frame.contentWindow);
              if (result) {
                return result;
              }
            }
          } catch (_e) {
          }
        }
      } catch (_e) {
      }
      return null;
    };

    const result = searchInIframes(selfWin.document);
    return result || {element: null, frameOffset: {top: 0}};
  };

  const getFrameOffsetForCurrentWindow = () => {
    if (topWin === selfWin) {
      return {top: 0};
    }
    try {
      const frames = topWin.document.getElementsByTagName('iframe');
      for (const frame of frames) {
        if (frame.contentWindow === selfWin) {
          return {top: getBoundingClientRect(frame).top};
        }
      }
    } catch (_e) {
      return {top: 0};
    }
    return {top: 0};
  };

  const getViewportHeight = () => {
    return topWin.innerHeight || topWin.document.documentElement.clientHeight || topWin.document.body.clientHeight || 0;
  };

  const getPageHeight = () => {
    const body = topWin.document.body;
    const html = topWin.document.documentElement;
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

    const elementTop = elementRect.top + frameOffset.top;
    const elementBottom = elementRect.bottom + frameOffset.top;
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
    const {element, frameOffset, iframeWindow} = findElementWithContext(bidReq.adUnitCode);
    const {distanceToView, elementHeight} = getViewableDistance(element, frameOffset);

    const sizes = (bidReq.sizes || []).map(size => ({
      w: Number.parseInt(size[0], 10),
      h: Number.parseInt(size[1], 10)
    }));
    const size = sizes.length > 0
      ? sizes.reduce((min, size) => size.h * size.w < min.h * min.w ? size : min, sizes[0])
      : {};

    const winForViewability = iframeWindow || topWin;
    const placementPercentView = element ? getViewability(element, winForViewability, size) : 0;

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
