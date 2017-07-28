/**
 * @file Audience Network <==> prebid.js adaptor
 */


let events = require('../events');
let bidmanager = require('../bidmanager');
let bidfactory = require('../bidfactory');
let utils = require('../utils');
let CONSTANTS = require('../constants.json');

let AudienceNetworkAdapter = function AudienceNetworkAdapter() {
  "use strict";

  /**
   * Request the specified bids from Audience Network
   * @param {Object} params the bidder-level params (from prebid)
   * @param {Array} params.bids the bids requested
   */
  function _callBids(params) {

    if (!params.bids && params.bids[0]) {
      // no bids requested
      return;
    }

    let getPlacementSize = function(bid, warn = false){
      let adWidth = 0, adHeight = 0;
      let sizes = bid.sizes || {};

      if (sizes.length === 2 &&
          typeof sizes[0] === 'number' &&
          typeof sizes[1] === 'number') {
        // The array contains 1 size (the items are the values)
        adWidth = sizes[0];
        adHeight = sizes[1];
      } else if (sizes.length >= 1) {
        // The array contains array of sizes, use the first size
        adWidth = sizes[0][0];
        adHeight = sizes[0][1];

        if (warn && sizes.length > 1) {
          utils.logInfo(
            `AudienceNetworkAdapter supports only one size per ` +
            `impression, but ${sizes.length} sizes passed for ` +
            `placementId ${bid.params.placementId}. Using first only.`
          );
        }
      }
      return {height: adHeight, width: adWidth};
    };

    let getPlacementWebAdFormat = function(bid) {
      if (bid.params.native) {
        return 'native';
      }
      if (bid.params.fullwidth) {
        return 'fullwidth';
      }

      let size = getPlacementSize(bid);
      if (
        (size.width === 320 && size.height === 50) ||
        (size.width === 300 && size.height === 250) ||
        (size.width === 728 && size.height === 90)
      ) {
        return `${size.width}x${size.height}`;
      }
    };

    let getTagVersion = function() {
      const tagVersion = params.bids[0].params.tagVersion;
      if (Array.isArray(tagVersion)) {
        return tagVersion[Math.floor(Math.random() * tagVersion.length)];
      }
      return tagVersion || '5.5.web';
    }

    const tagVersion = getTagVersion();
    let url = `https://an.facebook.com/v2/placementbid.json?sdk=${tagVersion}&`;

    let wwwExperimentChance = Number(params.bids[0].params.wwwExperiment);
    if (
      wwwExperimentChance > 0 &&
      wwwExperimentChance <= 100 &&
      Math.floor(Math.random() * wwwExperimentChance) === 0
    ) {
      url = url.replace('an.facebook.com', 'www.facebook.com/an');
    }

    let adPlacementIdToBidMap = new Map();
    for (let pbjsBidReq of params.bids) {
      if (adPlacementIdToBidMap[pbjsBidReq.params.placementId] === undefined) {
        adPlacementIdToBidMap[pbjsBidReq.params.placementId] = [];
      }
      adPlacementIdToBidMap[pbjsBidReq.params.placementId].push(pbjsBidReq);

      url +=
        `placementids[]=${encodeURIComponent(pbjsBidReq.params.placementId)}&` +
        `adformats[]=${encodeURIComponent(getPlacementWebAdFormat(pbjsBidReq))}&`;
    }
    if (params.bids[0].params.testMode) {
      url += 'testmode=true&';
    }

    let http = new HttpClient();
    const requestTimeMS = new Date().getTime();
    http.get(url, function(response) {
      const placementIDArr = [];
      const anBidRequestId = response.request_id;
      for (let placementId in adPlacementIdToBidMap) {
        let anBidArr = response.bids[placementId];
        let anBidReqArr = adPlacementIdToBidMap[placementId];
        for (let idx = 0; idx < anBidReqArr.length; idx++) {
          let pbjsBid = anBidReqArr[idx];

          if (anBidArr === null || anBidArr === undefined ||
            anBidArr[idx] === null || anBidArr[idx] === undefined) {
            let noResponseBidObject = bidfactory.createBid(2);
            noResponseBidObject.bidderCode = params.bidderCode;
            bidmanager.addBidResponse(pbjsBid.placementCode, noResponseBidObject);
            continue;
          }

          let anBid = anBidArr[idx];
          let bidObject = bidfactory.createBid(1);
          bidObject.bidderCode = params.bidderCode;
          bidObject.cpm = anBid.bid_price_cents / 100;
          let size = getPlacementSize(pbjsBid);
          bidObject.width = size.width;
          bidObject.height = size.height;
          bidObject.fbBidId = anBid.bid_id;
          bidObject.fbPlacementId = placementId;
          placementIDArr.push(placementId);
          const format = getPlacementWebAdFormat(pbjsBid);
          bidObject.fbFormat = format;
          bidObject.ad = getTag(tagVersion, placementId, anBid.bid_id, format);
          bidmanager.addBidResponse(pbjsBid.placementCode, bidObject);
        }
      }

      const responseTimeMS = new Date().getTime();
      const bidLatencyMS = responseTimeMS - requestTimeMS;
      const latencySincePageLoad = responseTimeMS - performance.timing.navigationStart;
      const existingEvents = events.getEvents();
      const timeout = existingEvents.some(
        event => event.args &&
          event.eventType === CONSTANTS.EVENTS.BID_TIMEOUT &&
          event.args.bidderCode === params.bidderCode);

      let latencyUrl = 'https://an.facebook.com/placementbidlatency.json?';
      latencyUrl += 'bid_request_id=' + anBidRequestId;
      latencyUrl += '&latency_ms=' + bidLatencyMS.toString();
      latencyUrl += '&bid_returned_time_since_page_load_ms=' + latencySincePageLoad.toString();
      latencyUrl += '&timeout=' + timeout.toString();
      for (const placement_id of placementIDArr) {
        latencyUrl += '&placement_ids[]=' + placement_id;
      }

      let httpRequest = new XMLHttpRequest();
      httpRequest.open('GET', latencyUrl, true);
      httpRequest.withCredentials = true;
      httpRequest.send(null);
    });
  }

  let HttpClient = function() {
    this.get = function(aUrl, aCallback) {
      let anHttpRequest = new XMLHttpRequest();
      anHttpRequest.onreadystatechange = function() {
        if (anHttpRequest.readyState === 4 && anHttpRequest.status === 200) {
          let resp = JSON.parse(anHttpRequest.responseText);
          utils.logInfo(`ANAdapter: ${aUrl} ==> ${JSON.stringify(resp)}`);
          aCallback(resp);
        }
      };

      anHttpRequest.open( "GET", aUrl, true );
      anHttpRequest.withCredentials = true;
      anHttpRequest.send( null );
    };
  };

  let getTag = function(tagVersion, placementId, bidId, format) {
    const script = `(function(a,b,c){var d='https://www.facebook.com',e='https://connect.facebook.net/en_US/fbadnw55.js',f={iframeLoaded:true,xhrLoaded:true},g=a.data,h=function(){if(Date.now){return Date.now();}else return +new Date();},i=function(aa){var ba=d+'/audience_network/client_event',ca={cb:h(),event_name:'ADNW_ADERROR',ad_pivot_type:'audience_network_mobile_web',sdk_version:'5.5.web',app_id:g.placementid.split('_')[0],publisher_id:g.placementid.split('_')[1],error_message:aa},da=[];for(var ea in ca)da.push(encodeURIComponent(ea)+'='+encodeURIComponent(ca[ea]));var fa=ba+'?'+da.join('&'),ga=new XMLHttpRequest();ga.open('GET',fa,true);ga.send();if(g.onAdError)g.onAdError('1000','Internal error.');},j=function(){if(b.currentScript){return b.currentScript;}else{var aa=b.getElementsByTagName('script');return aa[aa.length-1];}},k=function(aa){try{return aa.document.referrer;}catch(ba){}return '';},l=function(){var aa=a,ba=[aa];try{while(aa!==aa.parent&&aa.parent.document)ba.push(aa=aa.parent);}catch(ca){}return ba.reverse();},m=function(){var aa=l();for(var ba=0;ba<aa.length;ba++){var ca=aa[ba],da=ca.ADNW||{};ca.ADNW=da;if(!ca.ADNW)continue;return da.v55=da.v55||{ads:[],window:ca};}throw new Error('no_writable_global');},n=function(aa){var ba=aa.indexOf('/',aa.indexOf('://')+3);if(ba===-1)return aa;return aa.substring(0,ba);},o=function(aa){return aa.location.href||k(aa);},p=function(aa){if(aa.sdkLoaded)return;var ba=aa.window.document,ca=ba.createElement('iframe');ca.name='fbadnw';ca.style.display='none';ba.body.appendChild(ca);var da=ca.contentDocument.createElement('script');da.src=e;da.async=true;ca.contentDocument.body.appendChild(da);aa.sdkLoaded=true;},q=function(aa){var ba=/^https?:\\/\\/www\\.google(\\.com?)?.\\w{2,3}$/;return !!aa.match(ba);},r=function(aa){return !!aa.match(/cdn\\.ampproject\\.org$/);},s=function(){var aa=c.ancestorOrigins||[],ba=aa[aa.length-1]||c.origin,ca=aa[aa.length-2]||c.origin;if(q(ba)&&r(ca)){return n(ca);}else return n(ba);},t=function(aa){try{return JSON.parse(aa);}catch(ba){i(ba.message);throw ba;}},u=function(aa,ba,ca){if(!aa.iframe){var da=ca.createElement('iframe');da.src=d+'/audiencenetwork/iframe/';da.style.display='none';ca.body.appendChild(da);aa.iframe=da;aa.iframeAppendedTime=h();aa.iframeData={};}ba.iframe=aa.iframe;ba.iframeData=aa.iframeData;ba.tagJsIframeAppendedTime=aa.iframeAppendedTime||0;},v=function(aa){var ba=d+'/audiencenetwork/xhr/?sdk=5.5.web';for(var ca in aa)if(typeof aa[ca]!=='function')ba+='&'+ca+'='+encodeURIComponent(aa[ca]);var da=new XMLHttpRequest();da.open('GET',ba,true);da.withCredentials=true;da.onreadystatechange=function(){if(da.readyState===4){var ea=t(da.response);aa.events.push({name:'xhrLoaded',source:aa.iframe.contentWindow,data:ea,postMessageTimestamp:h(),receivedTimestamp:h()});}};da.send();},w=function(aa,ba){var ca=d+'/audiencenetwork/xhriframe/?sdk=5.5.web';for(var da in ba)if(typeof ba[da]!=='function')ca+='&'+da+'='+encodeURIComponent(ba[da]);var ea=b.createElement('iframe');ea.src=ca;ea.style.display='none';b.body.appendChild(ea);ba.iframe=ea;ba.iframeData={};ba.tagJsIframeAppendedTime=h();},x=function(aa){var ba=function(event){try{var da=event.data;if(da.name in f)aa.events.push({name:da.name,source:event.source,data:da.data});}catch(ea){}},ca=aa.iframe.contentWindow.parent;ca.addEventListener('message',ba,false);},y=function(aa){if(aa.context&&aa.context.sourceUrl)return true;try{return !!JSON.parse(decodeURI(aa.name)).ampcontextVersion;}catch(ba){return false;}},z=function(aa){var ba=h(),ca=l()[0],da=j().parentElement,ea=ca!=a.top,fa=ca.$sf&&ca.$sf.ext,ga=o(ca),ha=m();p(ha);var ia={amp:y(ca),events:[],tagJsInitTime:ba,rootElement:da,iframe:null,tagJsIframeAppendedTime:ha.iframeAppendedTime||0,url:ga,domain:s(),channel:n(o(ca)),width:screen.width,height:screen.height,pixelratio:a.devicePixelRatio,placementindex:ha.ads.length,crossdomain:ea,safeframe:!!fa,placementid:g.placementid,format:g.format||'300x250',testmode:!!g.testmode,onAdLoaded:g.onAdLoaded,onAdError:g.onAdError};if(g.bidid)ia.bidid=g.bidid;if(ea){w(ha,ia);}else{u(ha,ia,ca.document);v(ia);}x(ia);ia.rootElement.dataset.placementid=ia.placementid;ha.ads.push(ia);};try{z();}catch(aa){i(aa.message||aa);throw aa;}})(window,document,location);`;

    switch (tagVersion) {
      case '5.5.web':
        if (format === 'native') {
          return `
            <html>
              <head>
                <script type="text/javascript">
                  window.onload = function() {
                      if (parent) {
                          var oHead = document.getElementsByTagName("head")[0];
                          var arrStyleSheets = parent.document.getElementsByTagName("style");
                          for (var i = 0; i < arrStyleSheets.length; i++)
                              oHead.appendChild(arrStyleSheets[i].cloneNode(true));
                      }
                  }
                </script>
              </head>
              <body>
                <div style="display:none; position: relative;">
                  <script type="text/javascript">
                    var data = {
                      placementid: '${placementId}',
                      bidid: '${bidId}',
                      format: '${format}',
                      testmode: false,
                      onAdLoaded: function(element) {
                        console.log('Audience Network [${placementId}] ad loaded');
                        element.style.display = 'block';
                      },
                      onAdError: function(errorCode, errorMessage) {
                        console.log('Audience Network [${placementId}] error (' + errorCode + ') ' + errorMessage);
                      }
                    };
                  </script>
                  <script>
                    ${script}
                  </script>
                  <div class="thirdPartyRoot">
                    <a class="fbAdLink">
                      <div class="fbAdMedia thirdPartyMediaClass"></div>
                      <div class="fbAdSubtitle thirdPartySubtitleClass"></div>
                      <div class="fbDefaultNativeAdWrapper">
                        <div class="fbAdCallToAction thirdPartyCallToActionClass"></div>
                        <div class="fbAdTitle thirdPartyTitleClass"></div>
                      </div>
                    </a>
                  </div>
                </div>
              </body>
            </html>`;
        }
        return `
          <div style="display:none; position: relative;">
            <script type="text/javascript">
              var data = {
                placementid: '${placementId}',
                bidid: '${bidId}',
                format: '${format}',
                testmode: false,
                onAdLoaded: function(element) {
                  console.log('Audience Network [${placementId}] ad loaded');
                  element.style.display = 'block';
                },
                onAdError: function(errorCode, errorMessage) {
                  console.log('Audience Network [${placementId}] error (' + errorCode + ') ' + errorMessage);
                  // PASSBACK goes here
                }
              };
            </script>
            <script>
              ${script}
            </script>
          </div>`;

      default:
        throw new Exception ('Unsupported tag version ' + tagVersion);
    }
  }

  // Export the callBids function, so that prebid.js can execute this function
  // when the page asks to send out anBid requests.
  return {
    callBids: _callBids
  };
};

module.exports = AudienceNetworkAdapter;
