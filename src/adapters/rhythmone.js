var bidmanager = require('../bidmanager.js'),
  bidfactory = require('../bidfactory.js'),
  CONSTANTS = require('../constants.json');

import {ajax as ajax} from '../ajax';

function track(debug) {
  if(debug === true){
    //console.log('GA: %s %s %s', p1, p2, p3 || '');
  }
}

var w = (typeof window !== "undefined" ? window : {});
w.trackR1Impression = track;
  
module.exports = function(bidManager, global, loader){

  var version = "0.9.0.0",
    defaultZone = "1r",
    defaultPath = "mvo",
    debug = false,
    auctionEnded = false,
    requestCompleted = false,
    placementCodes = {};
    
  if(typeof global === "undefined")
    global = window;
      
  if(typeof bidManager === "undefined")
    bidManager = bidmanager;
    
  if(typeof loader === "undefined")
    loader = ajax;
  
  function applyMacros(txt, values){
    return txt.replace(/\{([^\}]+)\}/g, function(match){
      var v = values[match.replace(/[\{\}]/g, "").toLowerCase()];
      if(typeof v !== "undefined") return v;
      return match;
    });
  }
  
  function load(bidParams, url, callback){
    loader(url, function(responseText, response){
      if(response.status === 200)
        callback(200, "success", response.responseText);
      else
        callback(-1, "http error "+response.status, response.responseText);
    }, false, {method:"GET", withCredentials: true});
  }

  function flashInstalled(){
    var n = global.navigator,
      p = n.plugins,
      m = n.mimeTypes,
      t = "application/x-shockwave-flash",
      x = global.ActiveXObject;

    if(p && 
      p["Shockwave Flash"] &&
      m &&
      m[t] &&
      m[t].enabledPlugin)
        return true;

    if(x){
      try{if((new global.ActiveXObject("ShockwaveFlash.ShockwaveFlash"))) return true;}
      catch(e){}
    }

    return false;
  }
  
  var bidderCode = "rhythmone",
    bidLostTimeout = null;
  
  function attempt(valueFunction, defaultValue){
    try{
      return valueFunction();
    }catch(ex){}
    return defaultValue;
  }
  
  function logToConsole(txt){
    if(debug)
      console.log(txt);
  }
  
  function sniffAuctionEnd(){
  
    global.$$PREBID_GLOBAL$$.onEvent('bidWon', function (e) {
    
      if(e.bidderCode === bidderCode){
        placementCodes[e.adUnitCode] = true;
        track(debug, 'hb', "bidWon");
      }
      
      if(auctionEnded){
        clearTimeout(bidLostTimeout);
        bidLostTimeout = setTimeout(function(){
          for(var k in placementCodes)
            if(placementCodes[k] === false)
              track(debug, 'hb', "bidLost");
        }, 50);
      }
    });
  
    global.$$PREBID_GLOBAL$$.onEvent('auctionEnd', function () {
    
      auctionEnded = true;

      if(requestCompleted === false)
        track(debug, 'hb', 'rmpReplyFail', "prebid timeout post auction");
    });
  }
  
  function getBidParameters(bids){
    for(var i=0;i<bids.length;i++)
      if(typeof bids[i].params === "object" && bids[i].params.placementId)
        return bids[i].params;
    return null;
  }
  
  function noBids(params){
    for(var i=0; i<params.bids.length; i++){
      if(params.bids[i].success !== 1){
        logToConsole("registering nobid for slot "+params.bids[i].placementCode);
        var bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
        bid.bidderCode = bidderCode;
        track(debug, 'hb', 'bidResponse', 0);
        bidmanager.addBidResponse(params.bids[i].placementCode, bid);
      }
    }
  }
  
  function getRMPURL(bidParams, bids){
    var endpoint = "//tag.1rx.io/rmp/{placementId}/0/{path}?z={zone}",
      query = [];

    if(typeof bidParams.endpoint === "string")
      endpoint = bidParams.endpoint;
    
    if(typeof bidParams.zone === "string")
      defaultZone = bidParams.zone;
      
    if(typeof bidParams.path === "string")
      defaultPath = bidParams.path;
      
    if(bidParams.debug === true)
      debug = true;
    
    if(bidParams.trace === true)
      query.push("trace=true");
    
    endpoint = applyMacros(endpoint, {
      placementid:bidParams.placementId,
      zone: defaultZone,
      path: defaultPath
    });

    function p(k,v){
      if(v instanceof Array)
        v = v.join(",");
      if(typeof v !== "undefined")
        query.push(encodeURIComponent(k)+"="+encodeURIComponent(v));
    }

    p("domain", attempt(function(){
        var d = global.document.location.ancestorOrigins;
        if(d && d.length > 0)
          return d[d.length-1];
        return global.top.document.location.hostname;
      },""));
    p("title", attempt(function(){return global.top.document.title;},""));
    p("url", attempt(function(){
        var l;
        try{l = global.top.document.location.href.toString();}
        catch(ex){l = global.document.location.href.toString();}
        return l;
      },""));
    p("dsh", (global.screen ? global.screen.height : ""));
    p("dsw", (global.screen ? global.screen.width : ""));
    p("tz", (new Date()).getTimezoneOffset());
    p("dtype", ((/(ios|ipod|ipad|iphone|android)/i).test(global.navigator.userAgent) ? 1 : ((/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(global.navigator.userAgent) ? 3 : 2)));
    p("flash", (flashInstalled() ? 1 : 0));
    
    var placementCodes = [],
      heights = [],
      widths = [],
      floors = [],
      mediaTypes = [],
      fat = /(^v|(\.0)+$)/gi,
      i=0;

    p("hbv", global.$$PREBID_GLOBAL$$.version.replace(fat,"")+","+version.replace(fat,""));
	
    for(; i<bids.length; i++){

      track(debug, 'hb', 'bidRequest');
      var th = [], tw = [];
      
      if(bids[i].sizes.length > 0 && typeof bids[i].sizes[0] === "number")
        bids[i].sizes = [bids[i].sizes];
      
      for(var j = 0; j<bids[i].sizes.length; j++){
        tw.push(bids[i].sizes[j][0]);
        th.push(bids[i].sizes[j][1]);
      }
      placementCodes.push(bids[i].placementCode);
      heights.push(th.join("|"));
      widths.push(tw.join("|"));
      mediaTypes.push(((/video/i).test(bids[i].mediaType) ? "v" : "d"));
      floors.push(0);
    }
    
    p("imp", placementCodes);
    p("w", widths);
    p("h", heights);
    p("floor", floors);
    p("t", mediaTypes);
    
    endpoint += "&"+query.join("&");
    
    return endpoint;
  }
  
  this.callBids = function(params){

    var slotMap = {},
      bidParams = getBidParameters(params.bids);
  
    debug = (bidParams !== null && bidParams.debug === true);
  
    track(debug, 'hb', 'callBids');

    if(bidParams === null){
      noBids(params);
      track(debug, 'hb', 'misconfiguration');
      return;
    }

    sniffAuctionEnd();

    track(debug, 'hb', 'rmpRequest');

    for(var i = 0; i<params.bids.length; i++)
      slotMap[params.bids[i].placementCode] = params.bids[i];
    
    load(bidParams, getRMPURL(bidParams, params.bids), function(code, msg, txt){
    
      if(auctionEnded === true)
        return;
    
      requestCompleted = true;
    
      logToConsole("response text: "+txt);
    
      if(code === -1)
        track(debug, "hb", "rmpReplyFail", msg);
      else{
        try{
          var result = JSON.parse(txt),
            registerBid = function(bid){
            
              //{"id":"ffe73abd-91b3-56d3-d0ee-015a91b356d4",
              //	"impid":"123",
              //    "price":17.13,
              //    "nurl":"http://1r-qa-ads.rhythmxchange.com/rmp/389633/0/ivh?reqId=6594035297396414163",
              //    "cid":"366183",
              //    "crid":"366182",
              //    "h":480,
              //    "w":640}
			
              slotMap[bid.impid].success = 1;
              
              var pbResponse = bidfactory.createBid(CONSTANTS.STATUS.GOOD),
                placementCode = slotMap[bid.impid].placementCode;
            
              placementCodes[placementCode] = false;
            
              pbResponse.bidderCode = bidderCode;
              pbResponse.cpm = parseFloat(bid.price);
              pbResponse.width = bid.w;
              pbResponse.height = bid.h;
              
              if((/video/i).test(slotMap[bid.impid].mediaType)){
                pbResponse.mediaType = "video";
                pbResponse.vastUrl = bid.nurl;
                pbResponse.descriptionUrl = bid.nurl;
              }
              else
                pbResponse.ad = bid.adm;
              
              logToConsole("registering bid "+placementCode+" "+JSON.stringify(pbResponse));
              
              track(debug, "hb", "bidResponse", 1);
              bidManager.addBidResponse(placementCode, pbResponse);
            };
            
          track(debug, "hb", "rmpReplySuccess");
          
          for(i=0; result.seatbid && i<result.seatbid.length; i++)
            for(var j=0; result.seatbid[i].bid && j<result.seatbid[i].bid.length; j++){
              registerBid(result.seatbid[i].bid[j]);
            }
        }
        catch(ex){
          track(debug, "hb", "rmpReplyFail", "invalid json in rmp response");
        }
      }

      // if no bids are successful, inform prebid
      noBids(params);
      
      // when all bids are complete, log a report
      track(debug, 'hb', 'bidsComplete');
    });
    
    logToConsole("version: "+version);
  };
};