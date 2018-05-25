import * as utils from 'src/utils';
import {
  registerBidder
} from 'src/adapters/bidderFactory';
import {
  BANNER
} from 'src/mediaTypes';
import {
  config
} from 'src/config';

const BIDDER_CODE = 'zid';
const SUPPORTED_MEDIA_TYPES = [BANNER];

var cN = "";

var personaGroup;


var gC = function (key) {
    var match = document.cookie.match(new RegExp(key + '=([^;]+)'));
    if (match) return match[1];
  },

  //setCookie
  sC = function (cN, cookieType, value) {
    document.cookie = cN + cookieType + "=" + value + "; path=/; max-age=900000";
  };


//if(!gC('personaGroup')) { // check group id cookie

if(1===1) { // check group id cookie

  var personpersonaFile = Math.floor(Math.random() * 40) + 1;

  var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
  xhr.open('GET', 'https://cdn.zeroidtech.com/zi/' + personpersonaFile + '.z', false);
  xhr.setRequestHeader('Content-Type', 'text/plain');
  xhr.setRequestHeader('Accept', '*');
  xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
  xhr.send();
  if (xhr.status === 200) {

    var response = xhr.responseText;
    console.log("responsse = ", response);
    var responseArray = response.split(",");
    console.log("responseArray : ", responseArray);
    var randomIndex = Math.floor(Math.random() * responseArray.length) + 1;
    var groupid = responseArray[randomIndex];

    //sC(cN,'anonymousPersonaID', groupid);
    sC(cN,'personaGroup', groupid);

    personaGroup = groupid;

  }
  else if (xhr.status !== 200) {
    sC(cN,'personaGroup', 123456789);
  }
}
else{
  personaGroup = gC('anonymousPersonaID');
}

function setChainIDTargeting(adUnitCode, chainID) {
  try {
    window.googletag.cmd.push(function () {
      window.googletag.pubads().getSlots().forEach(function (gptSlot) {
        if (gptSlot.getSlotElementId() == adUnitCode && gptSlot.getTargeting("_swcid").length === 0) {
          gptSlot.setTargeting("_swcid", chainID);
        }
      });
    });
  } catch (e) {}
}

function isBidRequestValid(bid) {
  return bid && bid.params && bid.params.adUnitID && typeof bid.params.adUnitID === 'number';
}

function buildRequests(validBidRequests) {

  var generateID = function () {
    if (crypto && crypto.getRandomValues) {
      return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      )
    }
    var d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  };

  var domain = "delivery.zeroidtech.com";
  var loadID = generateID();

  window.googletag = window.googletag || {};
  window.googletag.cmd = window.googletag.cmd || [];
  window.googletag.cmd.push(function () {
    window.googletag.pubads().setTargeting("_swlid", loadID);
  });

  let cur = config.getConfig('currency');

  var request = {
    loadID: loadID,
    url: utils.getTopWindowUrl(),
    referrer: document.referrer,
    bidRequests: [],
    requestTime: (new Date()).getTime(),
    currency: cur,
  };

  if ('__sw_start_time' in window) {
    request.loadTime = window.__sw_start_time;
  }

  utils._each(validBidRequests, function (bid) {

    var chainID = generateID();

    setChainIDTargeting(bid.adUnitCode, chainID);

    var bidRequest = {
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

  return {
    method: 'POST',
    url: "https://" + domain + "/prebid?persona=" + personaGroup,//"bbgdn37ok6g0cek8mae0",
    data: JSON.stringify(request),
    options: {
      contentType: 'application/Json',
      withCredentials: false
    }
  };
}

function interpretResponse(serverResponse, originalBidRequest) {

  window.googletag.cmd.push(function () {
    window.googletag.pubads().setTargeting("hb_time", (new Date()).getTime());
  });

  let responses = [];

  if (!serverResponse || !serverResponse.body || !serverResponse.body.bids) {
    return responses;
  }

  utils._each(serverResponse.body.bids, function (bid) {

    setChainIDTargeting(bid.adUnitCode, bid.chainID);

    if (bid.cpm > 0) {
      responses.push({
        bidderCode: BIDDER_CODE,
        requestId: bid.bidID,
        cpm: bid.cpm,
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

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  isBidRequestValid,
  buildRequests,
  interpretResponse
};

registerBidder(spec);

(function () {

  window.__sw_start_time = (new Date()).getTime();

  function getCookie(name) {
    name = name + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }
  try {

    window.swSyncDone = false;

    if (getCookie("switch-synchronised") != "1") {

      var sync = function() {

        if(window.swSyncDone) {
          return;
        }

        window.swSyncDone = true;

        // do sync
        var iframe = document.createElement('iframe');

        document.body.appendChild(iframe);

        iframe.setAttribute('seamless', 'seamless');
        iframe.setAttribute('frameBorder', '0');
        iframe.setAttribute('frameSpacing', '0');
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('style', 'border:none; padding: 0px; margin: 0px; position: absolute;');
        iframe.setAttribute('width', '0');
        iframe.setAttribute('height', '0');
        iframe.src = "//delivery.h.switchadhub.com/sync";
        var d = new Date();
        d.setTime(d.getTime() + (24 * 60 * 60 * 1000));
        var expires = "expires=" + d.toUTCString();
        document.cookie ="switch-synchronised=1;" + expires + ";path=/";
      };

      if(document.readyState === "complete" || document.readyState === "interactive") {
        sync();
      } else {
        if ( document.addEventListener ) {
          document.addEventListener( "DOMContentLoaded", sync, false );
        } else if ( document.attachEvent ) {
          document.attachEvent( "onreadystatechange", function(){
            if(document.readyState === "complete") {
              sync();
            }
          } );
        }
        setTimeout(function(){
          if(document.readyState === "complete" || document.readyState === "interactive") {
            sync();
          }
        }, 10);
      }
    }
  } catch (e) {}

})();
