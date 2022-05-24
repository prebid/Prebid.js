import { isEmpty, getWindowSelf, parseSizesInput } from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'eplanning';
export const storage = getStorageManager({bidderCode: BIDDER_CODE});
const rnd = Math.random();
const DEFAULT_SV = 'pbjs.e-planning.net';
const DEFAULT_ISV = 'i.e-planning.net';
const PARAMS = ['ci', 'sv', 't', 'ml', 'sn'];
const DOLLAR_CODE = 'USD';
const NET_REVENUE = true;
const TTL = 120;
const NULL_SIZE = '1x1';
const FILE = 'file';
const STORAGE_RENDER_PREFIX = 'pbsr_';
const STORAGE_VIEW_PREFIX = 'pbvi_';
const mobileUserAgent = isMobileUserAgent();
const PRIORITY_ORDER_FOR_MOBILE_SIZES_ASC = ['1x1', '300x50', '320x50', '300x250'];
const PRIORITY_ORDER_FOR_DESKTOP_SIZES_ASC = ['1x1', '970x90', '970x250', '160x600', '300x600', '728x90', '300x250'];

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function(bid) {
    return Boolean(bid.params.ci) || Boolean(bid.params.t);
  },

  buildRequests: function(bidRequests, bidderRequest) {
    const method = 'GET';
    const dfpClientId = '1';
    const sec = 'ROS';
    let url;
    let params;
    const urlConfig = getUrlConfig(bidRequests);
    const pcrs = getCharset();
    const spaces = getSpaces(bidRequests, urlConfig.ml);
    const pageUrl = bidderRequest.refererInfo.referer;
    const getDomain = (url) => {
      let anchor = document.createElement('a');
      anchor.href = url;
      return anchor.hostname;
    }
    if (urlConfig.t) {
      url = 'https://' + urlConfig.isv + '/layers/t_pbjs_2.json';
      params = {};
    } else {
      url = 'https://' + (urlConfig.sv || DEFAULT_SV) + '/pbjs/1/' + urlConfig.ci + '/' + dfpClientId + '/' + getDomain(pageUrl) + '/' + sec;
      const referrerUrl = bidderRequest.refererInfo.referer.reachedTop ? window.top.document.referrer : bidderRequest.refererInfo.referer;

      if (storage.hasLocalStorage()) {
        registerViewabilityAllBids(bidRequests);
      }

      params = {
        rnd: rnd,
        e: spaces.str,
        ur: pageUrl || FILE,
        pbv: '$prebid.version$',
        ncb: '1',
        vs: spaces.vs
      };
      if (pcrs) {
        params.crs = pcrs;
      }

      if (referrerUrl) {
        params.fr = referrerUrl;
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        if (typeof bidderRequest.gdprConsent.gdprApplies !== 'undefined') {
          params.gdpr = bidderRequest.gdprConsent.gdprApplies ? '1' : '0';
          if (typeof bidderRequest.gdprConsent.consentString !== 'undefined') {
            params.gdprcs = bidderRequest.gdprConsent.consentString;
          }
        }
      }

      if (bidderRequest && bidderRequest.uspConsent) {
        params.ccpa = bidderRequest.uspConsent;
      }

      if ((getGlobal()).getUserIds && typeof (getGlobal()).getUserIds === 'function') {
        const userIds = (getGlobal()).getUserIds();
        for (var id in userIds) {
          params['e_' + id] = (typeof userIds[id] === 'object') ? encodeURIComponent(JSON.stringify(userIds[id])) : encodeURIComponent(userIds[id]);
        }
      }
    }

    return {
      method: method,
      url: url,
      data: params,
      adUnitToBidId: spaces.map,
    };
  },
  interpretResponse: function(serverResponse, request) {
    const response = serverResponse.body;
    let bidResponses = [];

    if (response && !isEmpty(response.sp)) {
      response.sp.forEach(space => {
        if (!isEmpty(space.a)) {
          space.a.forEach(ad => {
            const bidResponse = {
              requestId: request.adUnitToBidId[space.k],
              cpm: ad.pr,
              width: ad.w,
              height: ad.h,
              ad: ad.adm,
              ttl: TTL,
              creativeId: ad.crid,
              netRevenue: NET_REVENUE,
              currency: DOLLAR_CODE,
            };
            if (ad.adom) {
              bidResponse.meta = {
                advertiserDomains: ad.adom
              };
            }
            bidResponses.push(bidResponse);
          });
        }
      });
    }

    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];
    const response = !isEmpty(serverResponses) && serverResponses[0].body;

    if (response && !isEmpty(response.cs)) {
      const responseSyncs = response.cs;
      responseSyncs.forEach(sync => {
        if (typeof sync === 'string' && syncOptions.pixelEnabled) {
          syncs.push({
            type: 'image',
            url: sync,
          });
        } else if (typeof sync === 'object' && sync.ifr && syncOptions.iframeEnabled) {
          syncs.push({
            type: 'iframe',
            url: sync.u,
          })
        }
      });
    }

    return syncs;
  },
}

function getUserAgent() {
  return window.navigator.userAgent;
}
function getInnerWidth() {
  return getWindowSelf().innerWidth;
}
function isMobileUserAgent() {
  return getUserAgent().match(/(mobile)|(ip(hone|ad))|(android)|(blackberry)|(nokia)|(phone)|(opera\smini)/i);
}
function isMobileDevice() {
  return (getInnerWidth() <= 1024) || window.orientation || mobileUserAgent;
}
function getUrlConfig(bidRequests) {
  if (isTestRequest(bidRequests)) {
    return getTestConfig(bidRequests.filter(br => br.params.t));
  }

  let config = {};
  bidRequests.forEach(bid => {
    PARAMS.forEach(param => {
      if (bid.params[param] && !config[param]) {
        config[param] = bid.params[param];
      }
    });
  });

  return config;
}
function isTestRequest(bidRequests) {
  for (let i = 0; i < bidRequests.length; i++) {
    if (bidRequests[i].params.t) {
      return true;
    }
  }
  return false;
}
function getTestConfig(bidRequests) {
  let isv;
  bidRequests.forEach(br => isv = isv || br.params.isv);
  return {
    t: true,
    isv: (isv || DEFAULT_ISV)
  };
}

function compareSizesByPriority(size1, size2) {
  var priorityOrderForSizesAsc = isMobileDevice() ? PRIORITY_ORDER_FOR_MOBILE_SIZES_ASC : PRIORITY_ORDER_FOR_DESKTOP_SIZES_ASC;
  var index1 = priorityOrderForSizesAsc.indexOf(size1);
  var index2 = priorityOrderForSizesAsc.indexOf(size2);
  if (index1 > -1) {
    if (index2 > -1) {
      return (index1 < index2) ? 1 : -1;
    } else {
      return -1;
    }
  } else {
    return (index2 > -1) ? 1 : 0;
  }
}

function getSizesSortedByPriority(sizes) {
  return parseSizesInput(sizes).sort(compareSizesByPriority);
}

function getSize(bid, first) {
  var arraySizes = bid.sizes && bid.sizes.length ? getSizesSortedByPriority(bid.sizes) : [];
  if (arraySizes.length) {
    return first ? arraySizes[0] : arraySizes.join(',');
  } else {
    return NULL_SIZE;
  }
}

function getSpacesStruct(bids) {
  let e = {};
  bids.forEach(bid => {
    let size = getSize(bid, true);
    e[size] = e[size] ? e[size] : [];
    e[size].push(bid);
  });

  return e;
}

function cleanName(name) {
  return name.replace(/_|\.|-|\//g, '').replace(/\)\(|\(|\)|:/g, '_').replace(/^_+|_+$/g, '');
}

function getSpaces(bidRequests, ml) {
  let spacesStruct = getSpacesStruct(bidRequests);
  let es = {str: '', vs: '', map: {}};
  es.str = Object.keys(spacesStruct).map(size => spacesStruct[size].map((bid, i) => {
    es.vs += getVs(bid);

    let name;
    if (ml) {
      name = cleanName(bid.adUnitCode);
    } else {
      name = (bid.params && bid.params.sn) || (getSize(bid, true) + '_' + i);
    }

    es.map[name] = bid.bidId;
    return name + ':' + getSize(bid);
  }).join('+')).join('+');
  return es;
}

function getVs(bid) {
  let s;
  let vs = '';
  if (storage.hasLocalStorage()) {
    s = getViewabilityData(bid);
    vs += s.render >= 4 ? s.ratio.toString(16) : 'F';
  } else {
    vs += 'F';
  }
  return vs;
}

function getViewabilityData(bid) {
  let r = storage.getDataFromLocalStorage(STORAGE_RENDER_PREFIX + bid.adUnitCode) || 0;
  let v = storage.getDataFromLocalStorage(STORAGE_VIEW_PREFIX + bid.adUnitCode) || 0;
  let ratio = r > 0 ? (v / r) : 0;
  return {
    render: r,
    ratio: window.parseInt(ratio * 10, 10)
  };
}

function getCharset() {
  try {
    return window.top.document.charset || window.top.document.characterSet;
  } catch (e) {
    return document.charset || document.characterSet;
  }
}

function waitForElementsPresent(elements) {
  const observer = new MutationObserver(function (mutationList, observer) {
    if (mutationList && Array.isArray(mutationList)) {
      mutationList.forEach(mr => {
        if (mr && mr.addedNodes && Array.isArray(mr.addedNodes)) {
          mr.addedNodes.forEach(ad => {
            let index = elements.indexOf(ad.id);
            if (index >= 0) {
              registerViewability(ad);
              elements.splice(index, 1);
              if (!elements.length) {
                observer.disconnect();
              }
            }
          });
        }
      });
    }
  });
  document.addEventListener('DOMContentLoaded', function (event) {
    var config = {
      childList: true,
      subtree: true,
      characterData: true
    };
    observer.observe(document.body, config);
  });
}

function registerViewability(div) {
  visibilityHandler({
    name: div.id,
    div: div
  });
}

function registerViewabilityAllBids(bids) {
  let elementsNotPresent = [];
  bids.forEach(bid => {
    let div = document.getElementById(bid.adUnitCode);
    if (div) {
      registerViewability(div);
    } else {
      elementsNotPresent.push(bid.adUnitCode);
    }
  });
  if (elementsNotPresent.length) {
    waitForElementsPresent(elementsNotPresent);
  }
}

function getViewabilityTracker() {
  let TIME_PARTITIONS = 5;
  let VIEWABILITY_TIME = 1000;
  let VIEWABILITY_MIN_RATIO = 0.5;
  let publicApi;
  let context;

  function segmentIsOutsideTheVisibleRange(visibleRangeEnd, p1, p2) {
    return p1 > visibleRangeEnd || p2 < 0;
  }

  function segmentBeginsBeforeTheVisibleRange(p1) {
    return p1 < 0;
  }

  function segmentEndsAfterTheVisibleRange(visibleRangeEnd, p2) {
    return p2 < visibleRangeEnd;
  }

  function axialVisibilityRatio(visibleRangeEnd, p1, p2) {
    let visibilityRatio = 0;
    if (!segmentIsOutsideTheVisibleRange(visibleRangeEnd, p1, p2)) {
      if (segmentBeginsBeforeTheVisibleRange(p1)) {
        visibilityRatio = p2 / (p2 - p1);
      } else {
        visibilityRatio = segmentEndsAfterTheVisibleRange(visibleRangeEnd, p2) ? 1 : (visibleRangeEnd - p1) / (p2 - p1);
      }
    }
    return visibilityRatio;
  }

  function isNotHiddenByNonFriendlyIframe() {
    try { return (window === window.top) || window.frameElement; } catch (e) {}
  }

  function defineContext(e) {
    try {
      context = e && window.document.body.contains(e) ? window : (window.top.document.body.contains(e) ? top : undefined);
    } catch (err) {}
    return context;
  }

  function getContext(e) {
    return context;
  }

  function verticalVisibilityRatio(position) {
    return axialVisibilityRatio(getContext().innerHeight, position.top, position.bottom);
  }

  function horizontalVisibilityRatio(position) {
    return axialVisibilityRatio(getContext().innerWidth, position.left, position.right);
  }

  function itIsNotHiddenByBannerAreaPosition(e) {
    let position = e.getBoundingClientRect();
    return (verticalVisibilityRatio(position) * horizontalVisibilityRatio(position)) > VIEWABILITY_MIN_RATIO;
  }

  function itIsNotHiddenByDisplayStyleCascade(e) {
    return e.offsetHeight > 0 && e.offsetWidth > 0;
  }

  function itIsNotHiddenByOpacityStyleCascade(e) {
    let s = e.style;
    let p = e.parentNode;
    return !(s && parseFloat(s.opacity) === 0) && (!p || itIsNotHiddenByOpacityStyleCascade(p));
  }

  function itIsNotHiddenByVisibilityStyleCascade(e) {
    return getContext().getComputedStyle(e).visibility !== 'hidden';
  }

  function itIsNotHiddenByTabFocus() {
    try { return getContext().top.document.hasFocus(); } catch (e) {}
  }

  function isDefined(e) {
    return (e !== null) && (typeof e !== 'undefined');
  }

  function itIsNotHiddenByOrphanBranch() {
    return isDefined(getContext());
  }

  function isContextInAnIframe() {
    return isDefined(getContext().frameElement);
  }

  function processIntervalVisibilityStatus(elapsedVisibleIntervals, element, callback) {
    let visibleIntervals = isVisible(element) ? (elapsedVisibleIntervals + 1) : 0;
    if (visibleIntervals === TIME_PARTITIONS) {
      callback();
    } else {
      setTimeout(processIntervalVisibilityStatus.bind(this, visibleIntervals, element, callback), VIEWABILITY_TIME / TIME_PARTITIONS);
    }
  }

  function isVisible(element) {
    defineContext(element);
    return isNotHiddenByNonFriendlyIframe() &&
      itIsNotHiddenByOrphanBranch() &&
      itIsNotHiddenByTabFocus() &&
      itIsNotHiddenByDisplayStyleCascade(element) &&
      itIsNotHiddenByVisibilityStyleCascade(element) &&
      itIsNotHiddenByOpacityStyleCascade(element) &&
      itIsNotHiddenByBannerAreaPosition(element) &&
      (!isContextInAnIframe() || isVisible(getContext().frameElement));
  }

  publicApi = {
    isVisible: isVisible,
    onView: processIntervalVisibilityStatus.bind(this, 0)
  };

  return publicApi;
};

function visibilityHandler(obj) {
  if (obj.div) {
    registerAuction(STORAGE_RENDER_PREFIX + obj.name);
    getViewabilityTracker().onView(obj.div, registerAuction.bind(undefined, STORAGE_VIEW_PREFIX + obj.name));
  }
}

function registerAuction(storageID) {
  let value;
  try {
    value = storage.getDataFromLocalStorage(storageID);
    value = value ? window.parseInt(value, 10) + 1 : 1;
    storage.setDataInLocalStorage(storageID, value);
  } catch (exc) {
    return false;
  }

  return true;
}
registerBidder(spec);
