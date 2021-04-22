import { registerBidder } from '../src/adapters/bidderFactory.js';
import * as mediaTypes from '../src/mediaTypes.js';

export function get(path, obj, notFound) {
  path = typeof path === 'string' ? path.split('.') : path;

  while (path.length) {
    const [key] = path;
    if (!(obj instanceof Object) || !(key in obj)) return notFound;
    obj = obj[key];
    path = path.slice(1);
  }

  return obj;
}

export function merge(a, b, fn = a => a) {
  const res = {};

  for (const key in a) {
    if (key in b) {
      res[key] = fn(a[key], b[key]);
    } else {
      res[key] = a[key];
    }
  }

  for (const key in b) {
    if (!(key in a)) res[key] = b[key];
  }

  return res;
}

export function ratioToPercentageCeil(x) {
  return Math.ceil(x * 100);
}

export function getDocumentHeight(curDocument = document) {
  return Math.max(
    get('body.clientHeight', curDocument, 0),
    get('body.scrollHeight', curDocument, 0),
    get('body.offsetHeight', curDocument, 0),
    get('documentElement.clientHeight', curDocument, 0),
    get('documentElement.scrollHeight', curDocument, 0),
    get('documentElement.offsetHeight', curDocument, 0)
  );
}

export function getOffset(element) {
  const rect = element.getBoundingClientRect();
  const elementWindow = getElementWindow(element);
  if (!elementWindow) throw new Error('cannot get element window');
  const scrollLeft =
    elementWindow.pageXOffset || get('documentElement.scrollLeft', document, 0);
  const scrollTop =
    elementWindow.pageYOffset || get('documentElement.scrollTop', document, 0);
  return {
    top: rect.top + scrollTop,
    right: rect.right + scrollLeft,
    bottom: rect.bottom + scrollTop,
    left: rect.left + scrollLeft
  };
}

var IframeType;

(function(IframeType) {
  IframeType['safeframe'] = 'safeframe';
  IframeType['friendly'] = 'friendly';
  IframeType['nonfriendly'] = 'nonfriendly';
})(IframeType || (IframeType = {}));

export function getWindowParents(curWindow = window) {
  const parents = [];

  while (curWindow && curWindow.parent && curWindow !== curWindow.parent) {
    parents.push(curWindow.parent);
    curWindow = curWindow.parent;
  }

  return parents;
}

export function getTopmostReachableWindow(curWindow = window) {
  const parents = getWindowParents(curWindow);
  return parents.length ? parents[parents.length - 1] : curWindow;
}

export function topDocumentIsReachable(curWindow = window) {
  if (!isInsideIframe(curWindow)) return true;
  const windowParents = getWindowParents(curWindow);

  try {
    const topWindow = windowParents[windowParents.length - 1];

    return topWindow === curWindow.top && !!curWindow.top.document;
  } catch (e) {
    return false;
  }
}

export function isInsideIframe(curWindow = window) {
  return curWindow !== curWindow.top;
}

export function isInsideSafeframe(curWindow = window) {
  return !topDocumentIsReachable(curWindow) && !!curWindow.$sf;
}

export function isInsideFriendlyIframe(curWindow = window) {
  return isInsideIframe(curWindow) && topDocumentIsReachable(curWindow);
}

export function getIframeType(curWindow = window) {
  if (!isInsideIframe(curWindow)) return;
  if (isInsideSafeframe(curWindow)) return IframeType.safeframe;
  if (isInsideFriendlyIframe(curWindow)) return IframeType.friendly;
  return IframeType.nonfriendly;
}

function getElementWindow(element) {
  return element.ownerDocument
    ? element.ownerDocument.defaultView
    : element.defaultView;
}

const NO_CUTS = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
};

export function getRectCuts(rect, vh, vw, vCuts = NO_CUTS) {
  let { top, left } = rect;
  const { bottom, right } = rect;
  top = top + vCuts.top;
  left = left + vCuts.left;
  vh = vh + vCuts.bottom;
  vw = vw + vCuts.right;
  return {
    bottom: Math.min(0, vh - bottom),
    left: Math.min(0, left),
    right: Math.min(0, vw - right),
    top: Math.min(0, top)
  };
}

export function getFrameElements(curWindow = window) {
  const frameElements = [];

  while (curWindow && curWindow.frameElement) {
    frameElements.unshift(curWindow.frameElement);
    curWindow =
      curWindow.frameElement.ownerDocument &&
      curWindow.frameElement.ownerDocument.defaultView;
  }

  return frameElements;
}

export function getElementCuts(element, vCuts) {
  const window = getElementWindow(element);
  return getRectCuts(
    element.getBoundingClientRect(),
    window ? window.innerHeight : 0,
    window ? window.innerWidth : 0,
    vCuts
  );
}

export function area(width, height, areaCuts = NO_CUTS) {
  const { top, right, bottom, left } = areaCuts;
  return Math.max(0, (width + left + right) * (height + top + bottom));
}

export function getInViewRatio(element) {
  const elements = [...getFrameElements(getElementWindow(element)), element];
  const vCuts = elements.reduce(
    (vCuts, element) => getElementCuts(element, vCuts),
    NO_CUTS
  );
  return (
    area(element.offsetWidth || 1, element.offsetHeight || 1, vCuts) /
    area(element.offsetWidth || 1, element.offsetHeight || 1)
  );
}

export function getInViewRatioInsideTopFrame(element) {
  const elements = [...getFrameElements().slice(1), element];
  const vCuts = elements.reduce(
    (vCuts, element) => getElementCuts(element, vCuts),
    NO_CUTS
  );
  return (
    area(element.offsetWidth, element.offsetHeight, vCuts) /
    area(element.offsetWidth, element.offsetHeight)
  );
}

export function getMayBecomeVisible(element) {
  return !isInsideIframe() || !!getInViewRatioInsideTopFrame(element);
}

export function getInViewPercentage(element) {
  return ratioToPercentageCeil(getInViewRatio(element));
}

export function getOffsetTopDocument(element) {
  return [...getFrameElements(getElementWindow(element)), element].reduce(
    (acc, elem) => merge(acc, getOffset(elem), (a, b) => a + b),
    {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  );
}

export function getOffsetTopDocumentPercentage(element) {
  const elementWindow = getElementWindow(element);
  if (!elementWindow) throw new Error('cannot get element window');
  if (!topDocumentIsReachable(elementWindow)) {
    throw new Error("top window isn't reachable");
  }
  const topWindow = getTopmostReachableWindow(elementWindow);
  const documentHeight = getDocumentHeight(topWindow.document);
  return ratioToPercentageCeil(
    getOffsetTopDocument(element).top / documentHeight
  );
}

export function getOffsetToView(element) {
  const elemWindow = getElementWindow(element);
  if (!elemWindow) throw new Error('cannot get element window');
  const topWindow = getTopmostReachableWindow(elemWindow);
  const { top, bottom } = getOffsetTopDocument(element);
  const topWindowHeight = topWindow.innerHeight;

  if (bottom < topWindow.scrollY) return bottom - topWindow.scrollY;

  if (top > topWindow.scrollY + topWindowHeight) {
    return top - topWindow.scrollY - topWindowHeight;
  }

  return 0;
}

export function getOffsetToViewPercentage(element) {
  return ratioToPercentageCeil(
    getOffsetToView(element) /
      getDocumentHeight(
        getTopmostReachableWindow(getElementWindow(element)).document
      )
  );
}

export function getViewabilityDescription(element) {
  let iframeType;
  try {
    if (!element) {
      return {
        error: 'no element'
      };
    }
    iframeType = getIframeType(getElementWindow(element));
    if (!iframeType || iframeType === IframeType.friendly) {
      const inViewPercentage = getInViewPercentage(element);
      return {
        inView: inViewPercentage,
        hidden: !inViewPercentage && !getMayBecomeVisible(element),
        offsetTop: getOffsetTopDocumentPercentage(element),
        offsetView: getOffsetToViewPercentage(element),
        iframeType
      };
    }
    return {
      iframeType
    };
  } catch (error) {
    return {
      iframeType,
      error: error.message
    };
  }
}

export function mergeArrays(hashFn, ...args) {
  const seen = {};
  const merged = [];
  args.forEach(sizes => {
    sizes.forEach(size => {
      const key = hashFn(size);
      if (!(key in seen)) {
        seen[key] = true;
        merged.push(size);
      }
    });
  });
  return merged;
}

export function documentFocus(doc) {
  return typeof doc.hasFocus === 'function' ? +doc.hasFocus() : undefined;
}

const spec = {
  code: 'vi',
  supportedMediaTypes: [mediaTypes.VIDEO, mediaTypes.BANNER],

  isBidRequestValid({ adUnitCode, params: { pubId, lang, cat } = {} }) {
    return [pubId, lang, cat].every(x => typeof x === 'string');
  },

  /**
   *
   * @param bidRequests
   * @param bidderRequest
   * @return {
   * {method: string,
   * data: {
      imps: {
        bidId: string,
        adUnitCode: string,
        sizes: [[number, number]],
        pubId: string,
        lang: string,
        cat: string,
        iframeType: string | undefined,
        error: string | null,
        inView: number,
        offsetTop: number,
        offsetView: number,
        hidden: boolean,
        bidFloor: number
      }[],
      refererInfo: {
      referer: string
      reachedTop: boolean,
      numIframes: number,
      stack: string[]
      canonicalUrl: string
      }
    },
   * options: {withCredentials: boolean, contentType: string}, url: string}}
   */
  buildRequests(bidRequests, bidderRequest) {
    return {
      method: 'POST',
      url: 'https://pb.vi-serve.com/prebid/bid',
      data: {
        refererInfo: bidderRequest.refererInfo,
        imps: bidRequests.map(
          ({ bidId, adUnitCode, sizes, params, mediaTypes }) => {
            const slot = document.getElementById(adUnitCode);
            const bannerSizes = get('banner.sizes', mediaTypes);
            const playerSize = get('video.playerSize', mediaTypes);

            const sizesToMerge = [];
            if (!params.useSizes) {
              if (sizes) sizesToMerge.push(sizes);
              if (bannerSizes) sizesToMerge.push(bannerSizes);
              if (playerSize) sizesToMerge.push(playerSize);
            } else if (params.useSizes === 'banner' && bannerSizes) {
              sizesToMerge.push(bannerSizes);
            } else if (params.useSizes === 'video' && playerSize) {
              sizesToMerge.push(playerSize);
            }
            return {
              bidId,
              adUnitCode,
              sizes: mergeArrays(x => x.join(','), ...sizesToMerge),
              ...getViewabilityDescription(slot),
              ...params
            };
          }
        ),
        focus: documentFocus(document)
      },
      options: {
        contentType: 'application/json',
        withCredentials: true
      }
    };
  },

  interpretResponse({ body }) {
    return body;
  }
};
registerBidder(spec);
