import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { gdprDataHandler } from 'src/adaptermanager';
import { BANNER } from 'src/mediaTypes';
import { config } from 'src/config';

const BIDDER_CODE = 'zid';
const SUPPORTED_MEDIA_TYPES = [BANNER];
const GDPR_CONSENT_TIMEOUT_MS = 10000; // 10 seconds
const STORE_UID_TIMEOUT_MS = 500;


var domainIsOnWhiteListVar = false;
var domainIsOnBlackListVar = false;
var domainIsOnLabListVar = false;
var countryOnWhiteListVar = false;
var isPersona = false;

let consent_string = '';
let gdpr_applies = false;
let uids = {};
let storeUIDTimeoutHandler = null;

var urlParams;

var personaGroup = "";
var mgVal;
var cogs = 0.5;

var samplingVal = Math.floor(Math.random() * 10000) + 1;
var blackListSamplingVal = Math.floor(Math.random() * 100000) + 1;
var labVal = Math.floor(Math.random() * 90) + 1;
var mgValRnd = Math.floor(Math.random() * 4) + 1;
var psampleRate = 100000;
var pSampleAmount = 2.00;
var beaconMeter = 1.0;

if (mgValRnd == 1) {
  mgVal = true;
}
else {
  mgVal = false;
}

if (navigator.language == "sv-SE" ||
  navigator.language == "es-ES" ||
  navigator.language == "sl-SI" ||
  navigator.language == "sk-SK" ||
  navigator.language == "ro-RO" ||
  navigator.language == "en-NL" ||
  navigator.language == "nl-NL" ||
  navigator.language == "pt-PT" ||
  navigator.language == "pl-PL" ||
  navigator.language == "mt-MT" ||
  navigator.language == "en-MA" ||
  navigator.language == "de-LU" ||
  navigator.language == "lu-FR" ||
  navigator.language == "lt-LT" ||
  navigator.language == "lv-LV" ||
  navigator.language == "en-LV" ||
  navigator.language == "it-IT" ||
  navigator.language == "en-IE" ||
  navigator.language == "hu-HU" ||
  navigator.language == "el-GR" ||
  navigator.language == "de-DE" ||
  navigator.language == "fr-FR" ||
  navigator.language == "sv-FI" ||
  navigator.language == "fi-FI" ||
  navigator.language == "et-EE" ||
  navigator.language == "da-DK" ||
  navigator.language == "cs-CZ" ||
  navigator.language == "el-CY" ||
  navigator.language == "hr-HR" ||
  navigator.language == "bg-BG" ||
  navigator.language == "fr-BE" ||
  navigator.language == "nl-BE" ||
  navigator.language == "at-AT" ||
  navigator.language == "hu-AT" ||
  navigator.language == "de-AT" ||
  navigator.language == "ga-IE") {
  isPersona = true;
}


(window.onpopstate = function () {
  var match,
    pl = /\+/g,  // Regex for replacing addition symbol with a space
    search = /([^&=]+)=?([^&]*)/g,
    decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
    query = window.location.search.substring(1);

  urlParams = {};
  while (match = search.exec(query))
    urlParams[decode(match[1])] = decode(match[2]);
})();




var createCookie = function (name, value, days) {
  var date, expires;
  if (days) {
    date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toGMTString();
  } else {
    expires = "";
  }
  document.cookie = name + "=" + value + expires + "; path=/";
};

var getCookie = function (key) {
  var match = document.cookie.match(new RegExp(key + '=([^;]+)'));
  if (match) return match[1];
};

//domReady
var domReady = function (callback) {
  var ready = false;

  var detach = function () {
    if (document.addEventListener) {
      document.removeEventListener("DOMContentLoaded", completed);
      window.removeEventListener("load", completed);
    } else {
      document.detachEvent("onreadystatechange", completed);
      window.detachEvent("onload", completed);
    }
  };

  var completed = function () {
    if (!ready && (document.addEventListener || event.type === "load" || document.readyState === "complete")) {
      ready = true;
      detach();
      callback();
    }
  };

  if (document.readyState === "complete") {
    callback();
  } else if (document.addEventListener) {
    document.addEventListener("DOMContentLoaded", completed);
    window.addEventListener("load", completed);
  } else {
    document.attachEvent("onreadystatechange", completed);
    window.attachEvent("onload", completed);

    var top = false;

    try {
      top = window.frameElement === null && document.documentElement;
    } catch (e) {
    }

    if (top && top.doScroll) {
      (function scrollCheck() {
        if (ready) return;

        try {
          top.doScroll("left");
        } catch (e) {
          return setTimeout(scrollCheck, 50);
        }

        ready = true;
        detach();
        callback();
      })();
    }
  }
};

var isABot = function () {

  var isABot = true;

  var bdy = document.getElementsByTagName("body")[0]; // body element
  var newDiv = document.createElement("div");

  newDiv.id = "te";
  bdy.appendChild(newDiv);

  var isElementInDOM = document.getElementById("te");

  if (isElementInDOM) {
    isABot = false;
  }

  return isABot;

};

var setCogs = function (cogsVal) {
  cogs = cogsVal;
  createCookie("__cogs", 1, 1);

}

var setDomainIsOnWhiteListVar = function (whtList) {

  var domainIsOnWhiteList = false;


  var locatshun = window.location.hostname;

  var hasWWW = locatshun.indexOf("www.");

  if (hasWWW != -1) {
    var indexPOS = hasWWW + 4;
    locatshun = locatshun.slice(indexPOS);
  }

  var domainCheck = whtList.indexOf(locatshun);

  if (domainCheck == -1) {
    domainIsOnWhiteList = false;
  }
  else {
    domainIsOnWhiteList = true;
  }


  if (domainIsOnWhiteList) {
    createCookie("__wl", 1, 1);
  }
  else {
    createCookie("__wl", 0, 1);
  }

  domainIsOnWhiteListVar = domainIsOnWhiteList;

};

var setDomainIsOnBlackListVar = function (blkList) {
  var domainIsOnBlackList = false;


  var locatshun = window.location.hostname;

  var hasWWW = locatshun.indexOf("www.");

  if (hasWWW != -1) {
    var indexPOS = hasWWW + 4;
    locatshun = locatshun.slice(indexPOS);
  }

  var domainCheck = blkList.indexOf(locatshun);

  if (domainCheck == -1) {
    domainIsOnBlackList = false;
  }
  else {
    domainIsOnBlackList = true;
  }


  if (domainIsOnBlackList) {
    createCookie("__bl", 1, 1);
  }
  else {
    createCookie("__bl", 0, 1);
  }

  domainIsOnBlackListVar = domainIsOnBlackList;
};

var setDomainIsOnLabListVar = function (labList) {

  var domainIsOnLabList = false;

  var locatshun = window.location.hostname;

  var hasWWW = locatshun.indexOf("www.");

  if (hasWWW != -1) {
    var indexPOS = hasWWW + 4;
    locatshun = locatshun.slice(indexPOS);
  }

  var domainCheck = labList.indexOf(locatshun);

  if (domainCheck == -1) {
    domainIsOnLabList = false;
  }
  else {
    domainIsOnLabList = true;
  }


  if (domainIsOnLabList) {
    createCookie("__lb", 1, 1);
  }
  else {
    createCookie("__lb", 0, 1);
  }

  domainIsOnLabListVar = domainIsOnLabList;

};



var setCountryOnWhiteListVar = function (countryWhiteList) {


  var locale = window.navigator.userLanguage || window.navigator.language;

  if (urlParams.zid_testLocale) {
    locale = urlParams.zid_testLocale;
  }

  if (locale) {
    //en-gb ----> en-GB
    locale = locale.split("-");

    locale = locale[1].toUpperCase();

  }

  var countryIsOnWhiteList = false;

  var countryCheck = countryWhiteList.indexOf(locale);

  if (countryCheck == -1) {
    countryIsOnWhiteList = false;
  }
  else {
    countryIsOnWhiteList = true;
  }

  if (countryIsOnWhiteList) {
    createCookie("__cwl", 1, 1);
  }
  else {
    createCookie("__cwl", 0, 1);
  }

  countryOnWhiteListVar = countryIsOnWhiteList;

};


var getDataProtectionModuleData = function () {
  var moduleHasData = getCookie("__ds");

  if (typeof moduleHasData != "undefined" && moduleHasData == "1") {

    var isOnWhiteListCookie = getCookie("__wl");
    var isOnLabListCookie = getCookie("__lb");
    var isOnCountryWhiteListCookie = getCookie("__cwl");
    var cOGSCookieVal = getCookie("__cogs");
    var cPSampleRateVal = getCookie("__zpcr");
    var cPSampleAmountVal = getCookie("__zcpa");
    var isOnBlackListCookie = getCookie("__bl");
    var beaconMeterCookie = getCookie("__bma");


    if (typeof isOnWhiteListCookie != "undefined" && isOnWhiteListCookie == "1") {
      domainIsOnWhiteListVar = true;
    }
    if (typeof isOnLabListCookie != "undefined" && isOnLabListCookie == "1") {
      domainIsOnLabListVar = true;
    }
    if (typeof isOnCountryWhiteListCookie != "undefined" && isOnCountryWhiteListCookie == "1") {
      countryOnWhiteListVar = true;
    }
    if (typeof cOGSCookieVal != "undefined") {
      cogs =  parseFloat(cOGSCookieVal);
    }
    if (typeof cPSampleRateVal != "undefined") {
      psampleRate = parseInt(cPSampleRateVal);
    }
    if (typeof cPSampleAmountVal != "undefined") {
      pSampleAmount =  parseFloat(cPSampleAmountVal);
    }
    if(typeof isOnBlackListCookie != "undefined" && isOnBlackListCookie == "1"){
      domainIsOnBlackListVar = true;
    }
    if(typeof beaconMeterCookie != "undefined"){
      beaconMeter = parseFloat(beaconMeterCookie);
    }

  }
  else if (typeof moduleHasData == "undefined") {

    var jaxReq = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');

    jaxReq.open('GET', "https://cdn.zidedge.com/dt.json");
    jaxReq.setRequestHeader('Content-Type', 'application/json');
    jaxReq.setRequestHeader('Accept', '*');
    jaxReq.setRequestHeader('Access-Control-Allow-Origin', '*');


    jaxReq.onload = function () {
      if (jaxReq.status === 200) {
        createCookie("__ds", 1, 1);

        var response = JSON.parse(jaxReq.responseText);

        if (response.cogs) {
          setCogs(response.cogs);
        }

        if (response.wl) {
          setDomainIsOnWhiteListVar(response.wl);
        }

        if (response.bl) {
          setDomainIsOnBlackListVar(response.bl);
        }

        if (response.lbl) {
          setDomainIsOnLabListVar(response.lbl);
        }
        if (response.cwl) {
          setCountryOnWhiteListVar(response.cwl);
        }
        if(response.pcr){
          createCookie("__zpcr", response.pcr, 1);
          psampleRate = response.pcr;
        }
        if(response.pca){
          createCookie("__zcpa", response.pca, 1);
          pSampleAmount = response.pca;
        }
        if(response.bma){
          createCookie("__bma", response.bma, 1);
          beaconMeter = response.bma;
        }
      }
      else if (jaxReq.status !== 200) {
      }
    };

    jaxReq.send();

  };


};

/**
 * Read a cookie from the first party domain
 * @param {string} name
 * @param {DOMDocument} doc (optional, defaults to window.document)
 * @returns {*}
 */
const readCookie = function (name, doc) {
  doc = typeof doc === 'undefined' ? window.document : doc;

  const cookies = doc.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];

    // essentially trim()
    while (cookie.charAt(0) == ' ') {
      cookie = cookie.substring(1);
    }

    if (cookie.indexOf(name + "=") === 0) {
      return cookie.substring(name.length + 1, cookie.length);
    }
  }

  return null;
};

/**
 * Write cookie to first party domain
 * @param {string} name
 * @param {string} value
 * @param {int} lifetimeSeconds
 * @param {DOMDocument} doc (optional, defaults to window.document)
 */
const writeCookie = function (name, value, lifetimeSeconds, doc) {
  doc = typeof doc === 'undefined' ? window.document : doc;
  const d = new Date();
  d.setTime(d.getTime() + (lifetimeSeconds * 1000));
  const expires = "expires=" + d.toUTCString();
  doc.cookie = name + "=" + value + "; " + expires + "; path=/";
};

/**
 * Reads and parses the UID cookie
 * @returns {object}
 */
const readUIDCookie = function () {
  try {
    return JSON.parse(window.atob(readCookie('__SWU')));
  } catch (e) {
    return {};
  }
};

/**
 * Write UIDs to __SWU cookie as a Base64 encoded JSON
 */
const writeUIDCookie = function () {
  writeCookie(
    '__SWU',
    window.btoa(JSON.stringify(uids)),
    60 * 60 * 24 * 365 // 1 year
  );
};

/**
 * Writes collection of UIDs to cookie after specified timeout
 * @param {string} uid     A `:` sperated key value UID pair
 */
const storeUID = function (uid) {
  clearTimeout(storeUIDTimeoutHandler);

  const cookie = readUIDCookie();
  uid = uid.split(':');

  Object.assign(
    uids,
    cookie
  );

  uids[uid[0]] = uid[1];

  storeUIDTimeoutHandler = setTimeout(function () {
    writeUIDCookie();
  }, STORE_UID_TIMEOUT_MS);
};

/**
 * Set the GDPR consent data - always at request time
 * @param {string} consent     The encoded consent string
 */
const setConsentData = function (consent) {
  consent_string = consent.consentData || '';
  gdpr_applies = consent.gdprApplies;

};

/**
 * Check for GDPR consent - delay if there is no consent
 * @param {function} cb     Success callback to be invoked on fetch completion
 */
const checkConsent = function (cb) {
  let paused = false;

  (function check() {
    fetchGDPRConsent(function (consent) {
      if (consent || paused) {
        // consent exists or already paused - continue
        cb();
      }
      else {
        // no pre-existing consent - pause for consent
        paused = true;

        setTimeout(function () {
          check();
        }, GDPR_CONSENT_TIMEOUT_MS);
      }
    });
  })();
};

/**
 * Check for existence of CMP
 * @returns {boolean}   Existence status of IAB friendly CMP
 */
const cmpExists = function () {
  return (window.__cmp && typeof window.__cmp === 'function') || !!findCMPFrame();
}

/**
 * Find the CMP frame by traversing up the frame stack
 * @returns {Object|null} cmpFrame     The frame object containing __cmp if it exists
 */
const findCMPFrame = function () {
  let f = window;
  let cmpFrame;

  while (!cmpFrame) {
    try {
      if (f.frames.__cmpLocator) cmpFrame = f;
    } catch (e) {
    }
    if (f === window.top) break;
    f = f.parent;
  }

  return cmpFrame;
};

const recordPersona = function (cpm) {

  //load from config
  var pSamplingVal = Math.floor(Math.random() * psampleRate) + 1;

  if (cpm > pSampleAmount && pSamplingVal === 1) {
    let swid = readCookie('__SW');

    if (swid === null) return true;


    var jaxReq = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');

    jaxReq.open('POST', "https://delivery.zeroidtech.com/zi");
    jaxReq.onload = function () {};

    var jaxObj = {
      "i": swid,
      "c": cpm.toString()
    }

    jaxObj = JSON.stringify(jaxObj);

    jaxReq.setRequestHeader('Content-Type', 'application/json');
    jaxReq.setRequestHeader('Accept', 'application/json');
    jaxReq.send(jaxObj); //fire and forget
  }
}

/**
 * Fetch GDPR consent from CMP and invoke callback
 * @param {function(string)} cb     Success callback to be invoked on fetch completion
 */
const fetchGDPRConsent = function (cb) {
  const getConsentDataReq = {
    __cmpCall: {
      command: 'getConsentData',
      parameter: null,
      callId: 'iframe:' + generateID()
    }
  };

  function receiveMessage(event) {
    let json = (typeof event.data === 'string' && event.data.includes('cmpReturn'))
      ? JSON.parse(event.data)
      : event.data;

    if (json.__cmpReturn) {
      let consent = json.__cmpReturn.returnValue;
      setConsentData(consent);
      cb(consent);
    }
  }

  if (window.__cmp && typeof window.__cmp === 'function') {
    // found CMP lets use it
    window.__cmp('getConsentData', null, function (consent) {
      setConsentData(consent);
      cb(consent);
    });
  }
  else {
    // we might be in a frame - try to call CMP with postMessage
    const frame = findCMPFrame();

    if (!frame) {
      return;
    }

    if (window.addEventListener) {
      window.addEventListener('message', receiveMessage, false);
    }
    else if (window.attachEvent) {
      window.attachEvent('onmessage', receiveMessage);
    }

    frame.postMessage(getConsentDataReq, '*');
  }
};

const setChainIDTargeting = function (adUnitCode, chainID) {
  try {
    window.googletag.cmd.push(function () {
      window.googletag.pubads().getSlots().forEach(function (gptSlot) {
        if (gptSlot.getSlotElementId() == adUnitCode && gptSlot.getTargeting("_swcid").length === 0) {
          gptSlot.setTargeting("_swcid", chainID);
        }
      });
    });
  } catch (e) {
  }
}

const isBidRequestValid = function (bid) {
  return bid && bid.params && bid.params.adUnitID && typeof bid.params.adUnitID === 'number';
}

const generateID = function () {
  if (crypto && crypto.getRandomValues) {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
  }
  let d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now(); // use high-precision timer if available
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    let r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const isFacebookApp = function () {
  var ua = navigator.userAgent || navigator.vendor || window.opera;
  return (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1);
}

const buildRequests = function (validBidRequests, bidderRequest) {

  let domain = "delivery.zidtech.com";
  let loadID = generateID();


  window.googletag = window.googletag || {};
  window.googletag.cmd = window.googletag.cmd || [];
  window.googletag.cmd.push(function () {
    window.googletag.pubads().setTargeting("_swlid", loadID);
  });

  let cur = config.getConfig('currency');

  let swid = readCookie('__SW');

  if (swid === null) {
    swid = '';
  }

  let uids = readCookie('__SWU');

  if (uids === null) {
    uids = '';
  }

  let request = {
    loadID: loadID,
    switch_user_id: swid,
    uids: uids,
    url: utils.getTopWindowUrl(),
    referrer: document.referrer,
    bidRequests: [],
    requestTime: (new Date()).getTime(),
    currency: cur,
    gdpr: {
      consent_string: bidderRequest.gdprConsent.consentString ? bidderRequest.gdprConsent.consentString : '',
      gdpr_applies: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : false
    }
  };

  var isFB = false;
  var dat = null;

  if (typeof __cmp != "undefined") {
    dat = __cmp('getConsentData', 1);
  }

  var beaconCookie = readCookie("_bm");

  var canBeacon = false;
  if(typeof beaconCookie != "undefined" && beaconCookie === "1"){
    canBeacon = true;
  }

  if (isPersona && personaGroup != "" && mgVal && canBeacon && domainIsOnLabListVar) {
    var personaVal = personaGroup;
    request.switch_user_id = personaVal;
    request.gdprConsent.consentString = "BOORUryOORUryAAAAAENAa-AAAARh______________________________________________4";
  }

  if (isFacebookApp()) {
    isFB = true;
  }

  var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);


  if (isFB) {
    var personaVal = personaGroup;
    request.switch_user_id = personaVal;
  }

  if ('__sw_start_time' in window) {
    request.loadTime = window.__sw_start_time;
  }

  utils._each(validBidRequests, function (bid) {

    let chainID = generateID();

    setChainIDTargeting(bid.adUnitCode, chainID);

    let bidRequest = {
      bidID: bid.bidId,
      chainID: chainID,
      adUnitID: bid.params.adUnitID,
      adUnitCode: bid.adUnitCode,
      sizes: bid.sizes,
      transactionID: bid.transactionId,
    };
    request.bidRequests.push(bidRequest);
    if (bid.params.domain) {
      domain = bid.params.domain;
    }
  });

  var canRunPersona = personaGroup && personaGroup != "" && isPersona &&
    !domainIsOnBlackListVar && domainIsOnLabListVar && countryOnWhiteListVar;

  if ((swid != "" && domainIsOnWhiteListVar && countryOnWhiteListVar) || canRunPersona) {

    var isBot = isABot();

    if (!isBot) {
      return {
        method: 'POST',
        url: "//" + domain + "/prebid",
        data: JSON.stringify(request),
        bidderRequest,
        options: {
          contentType: 'text/plain',
          withCredentials: true
        }
      };
    }

  }

  else if (domainIsOnBlackListVar && !domainIsOnWhiteListVar && blackListSamplingVal == 1) {
    return {
      method: 'POST',
      url: "//" + domain + "/prebid",
      data: JSON.stringify(request),
      bidderRequest,
      options: {
        contentType: 'text/plain',
        withCredentials: true
      }
    };
  }


  else if (!domainIsOnLabListVar && !domainIsOnBlackListVar && !domainIsOnWhiteListVar && samplingVal == 1) {
    return {
      method: 'POST',
      url: "//" + domain + "/prebid",
      data: JSON.stringify(request),
      bidderRequest,
      options: {
        contentType: 'text/plain',
        withCredentials: true
      }
    };
  }


}

//load persona cookie on prebid load hook
const loadPersonaGroupHook = function (config, nextFn) {
  const context = this;
  const args = arguments;

  let swid = readCookie('__SW');

  if (swid === null) {
    swid = '';
  }

  var dat = null;

  if (typeof __cmp != "undefined") {
    dat = __cmp('getConsentData', 1);
  }

  if (((isFacebookApp() || isPersona) && !getCookie('personaGroup')) || (dat && dat.gdprApplies && !getCookie('personaGroup'))) { // check group id cookie

    var personpersonaFile = Math.floor(Math.random() * 40) + 1;

    var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
    xhr.open('GET', 'https://cdn.zidedge.com/zi/' + personpersonaFile + '.z', false);
    xhr.setRequestHeader('Content-Type', 'text/plain');
    xhr.setRequestHeader('Accept', '*');
    xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
    xhr.send();
    if (xhr.status === 200) {

      var response = xhr.responseText;
      var responseArray = response.split(",");
      var randomIndex = Math.floor(Math.random() * responseArray.length) + 1;
      var groupid = responseArray[randomIndex];

      //sC(cN,'anonymousPersonaID', groupid);
      createCookie('personaGroup', groupid, 30);

      personaGroup = groupid;
      //notify hook to continue
      return nextFn.apply(context, args);

    }
    else if (xhr.status !== 200) {
      return nextFn.apply(context, args);
    }
  }
  else if ((isFacebookApp() || isPersona) || (dat && dat.gdprApplies)) {
    personaGroup = getCookie('personaGroup');
    return nextFn.apply(context, args);
  }
  else {
    //notify hook to continue always continue
    return nextFn.apply(context, args);
  }
}


const interpretResponse = function (serverResponse, originalBidRequest) {
  window.googletag.cmd.push(function () {
    window.googletag.pubads().setTargeting("hb_time", (new Date()).getTime());
  });

  let responses = [];

  if (!serverResponse || !serverResponse.body || !serverResponse.body.bids) {
    return responses;
  }

  utils._each(serverResponse.body.bids, function (bid) {

    setChainIDTargeting(bid.adUnitCode, bid.chainID);

    createCookie("_bm", bid.cpm > beaconMeter ? 1 : 0, 1);

    if (bid.cpm > 0) {

      recordPersona(bid.cpm);

      responses.push({
        bidderCode: BIDDER_CODE,
        requestId: bid.bidID,
        cpm: (bid.cpm * cogs),
        width: bid.size.width,
        height: bid.size.height,
        creativeId: bid.creativeID,
        dealId: bid.dealID || null,
        currency: bid.currency,
        netRevenue: true,
        mediaType: BANNER,
        ad: bid.creative,
        ttl: 60000 // 1 min
      });
    }
  });

  return responses;
}

/**
 * Attempt to fetch GDPR consent to include in bidderRequest object
 * @param {object} config required; This is the same paramthat's used in pbjs.requestBids
 * @param {function} fn  required; The next function ins the chain used by hook.js
 */
const requestBidsHook = function (config, nextFn) {
  const context = this;
  const args = arguments;

  let consentData = {
    consentString: '',
    gdprApplies: false
  };

  if (cmpExists()) {
    checkConsent(function () {
      Object.assign(consentData, {
        consentString: consent_string,
        gdprApplies: gdpr_applies
      });

      gdprDataHandler.setConsentData(consentData);
      return nextFn.apply(context, args);
    });
  }
  else {
    gdprDataHandler.setConsentData(consentData);
    return nextFn.apply(context, args);
  }
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  isBidRequestValid,
  buildRequests,
  interpretResponse
};

registerBidder(spec);

$$PREBID_GLOBAL$$.requestBids.addHook(requestBidsHook, 50);
$$PREBID_GLOBAL$$.requestBids.addHook(loadPersonaGroupHook, 50);

/**
 *=============================== User Sync ====================================
 */

const triggerSync = function () {
  window.__sw_start_time = (new Date()).getTime();

  try {

    window.swSyncDone = false;

    if (readCookie("switch-synchronised") != "1") {

      const sync = function () {

        if (window.swSyncDone) {
          return;
        }

        window.swSyncDone = true;

        let zidSyncUri = "//delivery.zidtech.com/sync";

        zidSyncUri += `?consent_string=${consent_string}`;
        zidSyncUri += `&gdpr_applies=${gdpr_applies ? 1 : 0}`;
        zidSyncUri += `&dsync=delivery.zidtech.com`;

        let swid = readCookie('__SW');
        if (swid === null) {
          swid = '';
        }

        zidSyncUri += `&swid=${swid}`;

        // do sync
        const iframe = document.createElement('iframe');
        const syncIframe = document.createElement('iframe');

        document.body.appendChild(syncIframe);

        syncIframe.setAttribute('seamless', 'seamless');
        syncIframe.setAttribute('frameBorder', '0');
        syncIframe.setAttribute('frameSpacing', '0');
        syncIframe.setAttribute('scrolling', 'no');
        syncIframe.setAttribute('style', 'border:none; padding: 0px; margin: 0px; position: absolute;');
        syncIframe.setAttribute('width', '0');
        syncIframe.setAttribute('height', '0');
        syncIframe.src = zidSyncUri;


        const d = new Date();
        d.setTime(d.getTime() + (24 * 60 * 60 * 1000));
        const expires = "expires=" + d.toUTCString();
        document.cookie = "switch-synchronised=1;" + expires + ";path=/";
      };

      if (document.readyState === "complete" || document.readyState === "interactive") {
        sync();
      }
      else {
        if (document.addEventListener) {
          document.addEventListener("DOMContentLoaded", sync, false);
        }
        else if (document.attachEvent) {
          document.attachEvent("onreadystatechange", function () {
            if (document.readyState === "complete") {
              sync();
            }
          });
        }
        setTimeout(function () {
          if (document.readyState === "complete" || document.readyState === "interactive") {
            sync();
          }
        }, 10);
      }
    }
  } catch (e) {
  }
};


getDataProtectionModuleData();


(function initSync() {
  if (cmpExists()) {
    checkConsent(function () {
      triggerSync();
    });
  }
  else {
    triggerSync();
  }
})();

/**
 *============================== postMessage ===================================
 */

/**
 * Handle a postMessage requesting a render of the advert
 * @param {Object} message
 */
const handlePostMessage = function (message) {
  if (typeof message.data !== 'string' || message.data.indexOf('__switch_') !== 0) {
    return;
  }

  switch (0) {
    case message.data.indexOf('__switch_swid:'):
      const swid = message.data.substring(14);
      writeCookie('__SW', swid, 60 * 60 * 24 * 365);
      break;
    case message.data.indexOf('__switch_uid:'):
      const uid = message.data.substring(13);
      storeUID(uid);
      break;
  }
};

(function bindPostMessageHandlers() {
  if (window.addEventListener) {
    window.addEventListener('message', handlePostMessage, false);
  }
  else if (window.attachEvent) {
    window.attachEvent('onmessage', handlePostMessage);
  }
})();
