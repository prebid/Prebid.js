import {getWindowSelf, isEmpty, parseSizesInput, isGptPubadsDefined, isSlotMatchingAdUnitCode} from '../src/utils.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getStorageManager} from '../src/storageManager.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

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
const VAST_INSTREAM = 1;
const VAST_OUTSTREAM = 2;
const VAST_VERSION_DEFAULT = 3;
const DEFAULT_SIZE_VAST = '640x480';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

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
    // TODO: do the fallbacks make sense here?
    const pageUrl = bidderRequest.refererInfo.page || bidderRequest.refererInfo.topmostLocation;
    const domain = bidderRequest.refererInfo.domain || window.location.host;
    if (urlConfig.t) {
      url = 'https://' + urlConfig.isv + '/layers/t_pbjs_2.json';
      params = {};
    } else {
      url = 'https://' + (urlConfig.sv || DEFAULT_SV) + '/pbjs/1/' + urlConfig.ci + '/' + dfpClientId + '/' + domain + '/' + sec;
      // TODO: does the fallback make sense here?
      const referrerUrl = bidderRequest.refererInfo.ref || bidderRequest.refererInfo.topmostLocation;

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
      if (spaces.impType) {
        params.vctx = spaces.impType & VAST_INSTREAM ? VAST_INSTREAM : VAST_OUTSTREAM;
        params.vv = VAST_VERSION_DEFAULT;
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
            if (isVastResponse(ad)) {
              bidResponse.vastXml = ad.adm;
              bidResponse.mediaTypes = VIDEO;
            } else {
              bidResponse.ad = ad.adm;
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
};

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

function getFirstSizeVast(sizes) {
  if (sizes == undefined || !Array.isArray(sizes)) {
    return undefined;
  }

  let size = Array.isArray(sizes[0]) ? sizes[0] : sizes;

  return (Array.isArray(size) && size.length == 2) ? size : undefined;
}

function cleanName(name) {
  return name.replace(/_|\.|-|\//g, '').replace(/\)\(|\(|\)|:/g, '_').replace(/^_+|_+$/g, '');
}

function getSpaces(bidRequests, ml) {
  let impType = bidRequests.reduce((previousBits, bid) => (bid.mediaTypes && bid.mediaTypes[VIDEO]) ? (bid.mediaTypes[VIDEO].context == 'outstream' ? (previousBits | 2) : (previousBits | 1)) : previousBits, 0);
  // Only one type of auction is supported at a time
  if (impType) {
    bidRequests = bidRequests.filter((bid) => bid.mediaTypes && bid.mediaTypes[VIDEO] && (impType & VAST_INSTREAM ? (!bid.mediaTypes[VIDEO].context || bid.mediaTypes[VIDEO].context == 'instream') : (bid.mediaTypes[VIDEO].context == 'outstream')));
  }

  let spacesStruct = getSpacesStruct(bidRequests);
  let es = {str: '', vs: '', map: {}, impType: impType};
  es.str = Object.keys(spacesStruct).map(size => spacesStruct[size].map((bid, i) => {
    es.vs += getVs(bid);

    let name;

    if (impType) {
      let firstSize = getFirstSizeVast(bid.mediaTypes[VIDEO].playerSize);
      let sizeVast = firstSize ? firstSize.join('x') : DEFAULT_SIZE_VAST;
      name = 'video_' + sizeVast + '_' + i;
      es.map[name] = bid.bidId;
      return name + ':' + sizeVast + ';1';
    }

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
    let index;
    let adView;
    if (mutationList && Array.isArray(mutationList)) {
      mutationList.forEach(mr => {
        if (mr && mr.addedNodes && Array.isArray(mr.addedNodes)) {
          mr.addedNodes.forEach(ad => {
            index = elements.indexOf(ad.id);
            adView = ad;
            if (index < 0) {
              elements.forEach(code => {
                let div = _getAdSlotHTMLElement(code);
                if (div && div.contains(ad) && div.getBoundingClientRect().width > 0) {
                  index = elements.indexOf(div.id);
                  adView = div;
                }
              });
            }
            if (index >= 0) {
              registerViewability(adView, elements[index]);
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

function registerViewability(div, name) {
  visibilityHandler({
    name: name,
    div: div
  });
}

function _mapAdUnitPathToElementId(adUnitCode) {
  if (isGptPubadsDefined()) {
    // eslint-disable-next-line no-undef
    const adSlots = googletag.pubads().getSlots();
    const isMatchingAdSlot = isSlotMatchingAdUnitCode(adUnitCode);

    for (let i = 0; i < adSlots.length; i++) {
      if (isMatchingAdSlot(adSlots[i])) {
        const id = adSlots[i].getSlotElementId();
        return id;
      }
    }
  }

  return null;
}

function _getAdSlotHTMLElement(adUnitCode) {
  return document.getElementById(adUnitCode) ||
    document.getElementById(_mapAdUnitPathToElementId(adUnitCode));
}

function registerViewabilityAllBids(bids) {
  let elementsNotPresent = [];
  bids.forEach(bid => {
    let div = _getAdSlotHTMLElement(bid.adUnitCode);
    if (div) {
      registerViewability(div, bid.adUnitCode);
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
  let observer;
  let visibilityAds = {};

  function intersectionCallback(entries) {
    entries.forEach(function(entry) {
      var adBox = entry.target;
      if (entry.isIntersecting) {
        if (entry.intersectionRatio >= VIEWABILITY_MIN_RATIO && entry.boundingClientRect && entry.boundingClientRect.height > 0 && entry.boundingClientRect.width > 0) {
          visibilityAds[adBox.id] = true;
        }
      } else {
        visibilityAds[adBox.id] = false;
      }
    });
  }

  function observedElementIsVisible(element) {
    return visibilityAds[element.id] && document.visibilityState && document.visibilityState === 'visible';
  }

  function defineObserver() {
    if (!observer) {
      var observerConfig = {
        root: null,
        rootMargin: '0px',
        threshold: [VIEWABILITY_MIN_RATIO]
      };
      observer = new IntersectionObserver(intersectionCallback.bind(this), observerConfig);
    }
  }
  function processIntervalVisibilityStatus(elapsedVisibleIntervals, element, callback) {
    let visibleIntervals = observedElementIsVisible(element) ? (elapsedVisibleIntervals + 1) : 0;
    if (visibleIntervals === TIME_PARTITIONS) {
      stopObserveViewability(element)
      callback();
    } else {
      setTimeout(processIntervalVisibilityStatus.bind(this, visibleIntervals, element, callback), VIEWABILITY_TIME / TIME_PARTITIONS);
    }
  }

  function stopObserveViewability(element) {
    delete visibilityAds[element.id];
    observer.unobserve(element);
  }

  function observeAds(element) {
    observer.observe(element);
  }

  function initAndVerifyVisibility(element, callback) {
    if (element) {
      defineObserver();
      observeAds(element);
      processIntervalVisibilityStatus(0, element, callback);
    }
  }

  publicApi = {
    onView: initAndVerifyVisibility.bind(this)
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

function isVastResponse(bid) {
  return bid.adm.match(/^(<VAST)|(<VideoAdServingTemplate)/gmi);
}

registerBidder(spec);
