import { registerBidder } from "../src/adapters/bidderFactory";

export function get(path, obj, notFound) {
  path = typeof path === "string" ? path.split(".") : path;

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
    get("body.clientHeight", curDocument, 0),
    get("body.scrollHeight", curDocument, 0),
    get("body.offsetHeight", curDocument, 0),
    get("documentElement.clientHeight", curDocument, 0),
    get("documentElement.scrollHeight", curDocument, 0),
    get("documentElement.offsetHeight", curDocument, 0)
  );
}

function getOffset(element) {
  const rect = element.getBoundingClientRect();
  const elementWindow = getElementWindow(element);
  if (!elementWindow) throw new Error("cannot get element window");
  const scrollLeft =
    elementWindow.pageXOffset || get("documentElement.scrollLeft", document, 0);
  const scrollTop =
    elementWindow.pageYOffset || get("documentElement.scrollTop", document, 0);
  return {
    top: rect.top + scrollTop,
    right: rect.right + scrollLeft,
    bottom: rect.bottom + scrollTop,
    left: rect.left + scrollLeft
  };
}

var IframeType;

(function(IframeType) {
  IframeType["safeframe"] = "safeframe";
  IframeType["friendly"] = "friendly";
  IframeType["hostile"] = "hostile";
})(IframeType || (IframeType = {}));

function getWindowParents(curWindow = window) {
  const parents = [];

  while (curWindow && curWindow.parent && curWindow !== curWindow.parent) {
    parents.push(curWindow.parent);
    curWindow = curWindow.parent;
  }

  return parents;
}

function getTopmostReachableWindow(curWindow = window) {
  const parents = getWindowParents(curWindow);
  return parents.length ? parents[parents.length - 1] : curWindow;
}

function topDocumentIsReachable() {
  if (!isInsideIframe()) return true;
  const windowParents = getWindowParents();

  try {
    const topWindow = windowParents[windowParents.length - 1];

    return topWindow === window.top && !!window.top.document;
  } catch (e) {
    return false;
  }
}

function isInsideIframe() {
  return window !== window.top;
}

function isInsideSafeframe() {
  return !topDocumentIsReachable() && !!window.$sf;
}

function isInsideFriendlyIframe() {
  return isInsideIframe() && topDocumentIsReachable();
}

function getIframeType() {
  if (!isInsideIframe()) return;
  if (isInsideSafeframe()) return IframeType.safeframe;
  if (isInsideFriendlyIframe()) return IframeType.friendly;
  return IframeType.hostile;
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

function getFrameElements(curWindow = window) {
  const frameElements = [];

  while (curWindow && curWindow.frameElement) {
    frameElements.unshift(curWindow.frameElement);
    curWindow =
      curWindow.frameElement.ownerDocument &&
      curWindow.frameElement.ownerDocument.defaultView;
  }

  return frameElements;
}

function getElementCuts(element, vCuts) {
  const window = getElementWindow(element);
  return getRectCuts(
    element.getBoundingClientRect(),
    window ? window.innerHeight : 0,
    window ? window.innerWidth : 0,
    vCuts
  );
}

function area(width, height, areaCuts = NO_CUTS) {
  const { top, right, bottom, left } = areaCuts;
  return Math.max(0, (width + left + right) * (height + top + bottom));
}

export function getInViewRatio(element) {
  const elements = [...getFrameElements(), element];
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

function getOffsetTopDocument(element) {
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

function getOffsetTopDocumentPercentage(element) {
  const elementWindow = getElementWindow(element);
  if (!elementWindow) throw new Error("cannot get element window");
  if (!topDocumentIsReachable()) throw new Error("top window isn't reachable");
  const topWindow = getTopmostReachableWindow(elementWindow);
  const documentHeight = getDocumentHeight(topWindow.document);
  return ratioToPercentageCeil(
    getOffsetTopDocument(element).top / documentHeight
  );
}

function getOffsetToView(element) {
  const elemWindow = getElementWindow(element);
  if (!elemWindow) throw new Error("cannot get element window");
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
      getDocumentHeight(getTopmostReachableWindow().document)
  );
}

function getViewabilityDescription(element) {
  const iframeType = getIframeType();

  try {
    const inViewPercentage = getInViewPercentage(element);

    switch (iframeType) {
      case undefined:
      case IframeType.friendly:
        return {
          inView: inViewPercentage,
          hidden: !inViewPercentage && !getMayBecomeVisible(element),
          offsetTop: getOffsetTopDocumentPercentage(element),
          offsetView: getOffsetToViewPercentage(element),
          iframeType
        };

      case IframeType.safeframe:
      case IframeType.hostile:
        return {
          iframeType
        };

      default:
        return {
          iframeType
        };
    }
  } catch (error) {
    return {
      iframeType,
      error
    };
  }
}

const spec = {
  code: "vi",
  supportedMediaTypes: ["banner"],

  isBidRequestValid({ adUnitCode }) {
    return !!document.getElementById(adUnitCode);
  },

  buildRequests(bidRequests) {
    return {
      method: "POST",
      url: "//localhost:3000/bid",
      data: {
        bidRequests: bidRequests
          .map(({ bidId, adUnitCode, sizes }) => {
            const slot = document.getElementById(adUnitCode);
            return (
              slot && {
                bidId,
                sizes,
                ...getViewabilityDescription(slot)
              }
            );
          })
          .filter(Boolean)
      },
      options: {
        contentType: "application/json",
        withCredentials: false
      }
    };
  },

  interpretResponse({ body }) {
    return body;
  }
};
registerBidder(spec);
