var bidmanager = require('../bidmanager.js'),
  bidfactory = require('../bidfactory.js'),
  utils = require('../utils.js'),
  CONSTANTS = require('../constants.json');

import {ajax as ajax} from '../ajax';

function track(debug, p1, p2, p3) {
  if(debug === true){
    console.log('GA: %s %s %s', p1, p2, p3 || '');
  }
}

var w = (typeof window !== "undefined" ? window : {});
w.trackR1Impression = track;
  
module.exports = function(bidManager, global, loader){

  var version = "0.9.0.0",
    defaultZone = "1r",
    defaultPath = "mvo",
    bidfloor = 0,
    currency = "USD",
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
  
  function load(bidParams, url, postData, callback){
    if(bidParams.method === "get"){
      loader(url, function(responseText, response){
        if(response.status === 200)
          callback(200, "success", response.responseText);
        else
          callback(-1, "http error "+response.status, response.responseText);
      }, false, {method:"GET"});
    }
    else{
      loader(url, function(responseText, response){
        if(response.status === 200)
          callback(200, "success", response.responseText);
        else
          callback(-1, "http error "+response.status, response.responseText);
      }, postData, {method:"POST", contentType: "application/json"});
    }
  }

  var bidderCode = "rhythmone",
    bidLostTimeout = null;
  
  function setIfPresent(o, key, value){
    try{
      if(typeof value === "function")
        o[key] = value();
    }catch(ex){}
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
        var bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
        bid.bidderCode = bidderCode;
        track(debug, 'hb', 'bidResponse', 0);
        bidmanager.addBidResponse(params.bids[i].placementCode, bid);
      }
    }
  }
  
  function getRMPURL(bidParams, ortbJSON, bids){
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
      if(typeof v !== "undefined")
        query.push(encodeURIComponent(k)+"="+encodeURIComponent(v));
    }
    
    if(bidParams.method === "get"){
    
      p("domain", ortbJSON.site.domain);
      p("title", ortbJSON.site.name);
      p("url", ortbJSON.site.page);
      p("dsh", ortbJSON.device.h);
      p("dsw", ortbJSON.device.w);
      p("tz", (new Date()).getTimezoneOffset());
      p("dtype", ortbJSON.device.devicetype);
      
      var placementCodes = [],
        heights = [],
        widths = [],
        floors = [];
      
      for(var i = 0; i<bids.length; i++){

        track(debug, 'hb', 'bidRequest');
        var th = [], tw = [];
        
        for(var j = 0; j<bids[i].sizes.length; j++){
          tw.push(bids[i].sizes[j][0]);
          th.push(bids[i].sizes[j][1]);
        }
        placementCodes.push(bids[i].placementCode);
        heights.push(th.join("|"));
        widths.push(tw.join("|"));
        floors.push(0);
      }
      
      p("imp", placementCodes.join(","));
      p("w", widths.join(","));
      p("h", heights.join(","));
      p("floor", floors.join(","));
    }
    
    endpoint += "&"+query.join("&");
    
    return endpoint;
  }
  
  function getORTBJSON(bids, slotMap, bidParams){
    var o = {
      "device": {
        "langauge": global.navigator.language,
        "dnt": (global.navigator.doNotTrack === 1 ? 1 : 0)
      },
      "at": 2,
      "site": {},
      "tmax": 3000,
      "cur": [currency],
      "id": utils.generateUUID(),
      "imp":[]
    };
    
    setIfPresent(o.site, "page", function(){
      var l;
      try{l = global.top.document.location.href.toString();}
      catch(ex){l = document.location.href.toString();}
      return l;
    });
    setIfPresent(o.site, "domain", function(){
      var d = document.location.ancestorOrigins;
      if(d && d.length > 0)
        return d[d.length-1];
      return global.top.document.location.hostname;
    });
    setIfPresent(o.site, "name", function(){return global.top.document.title;});
    
    o.device.devicetype = ((/(ios|ipod|ipad|iphone|android)/i).test(global.navigator.userAgent) ? 1 : ((/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(global.navigator.userAgent) ? 3 : 2));
    
    setIfPresent(o.device, "h", function(){return global.screen.height;});
    setIfPresent(o.device, "w", function(){return global.screen.width;});
    
    for(var i = 0; i<bids.length; i++){
      var bidID = utils.generateUUID();
      slotMap[bidID] = bids[i];
      slotMap[bids[i].placementCode] = bids[i];
      
      if(bidParams.method === "post")
        track(debug, 'hb', 'bidRequest');
        
      for(var j = 0; j<bids[i].sizes.length; j++){
        o.imp.push({
          "id": bidID,
          "tagId": bids[i].placementCode,
          "bidfloor": bidfloor,
          "bidfloorcur": currency,
          "banner": {
            "id": utils.generateUUID(),
            "pos": 0,
            "w": bids[i].sizes[j][0],
            "h": bids[i].sizes[j][1]
          }
        });
      }
    }
    
    return o;
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

    // default to GET request
    if(typeof bidParams.method !== "string")
      bidParams.method = "get";
    
    bidParams.method = bidParams.method.toLowerCase();
    
    sniffAuctionEnd();

    track(debug, 'hb', 'rmpRequest');

    var ortbJSON = getORTBJSON(params.bids, slotMap, bidParams);
    
    load(bidParams, getRMPURL(bidParams, ortbJSON, params.bids), JSON.stringify(ortbJSON), function(code, msg, txt){
    
      if(auctionEnded === true)
        return;
    
      requestCompleted = true;
    
      logToConsole(txt);
    
      var bidCount = 0;
    
      if(code === -1)
        track(debug, 'hb', 'rmpReplyFail', msg);
      else{
        try{
          var result = JSON.parse(txt),
            registerBid = function(bid){
            
              slotMap[bid.impid].success = 1;
              
              var pbResponse = bidfactory.createBid(CONSTANTS.STATUS.GOOD),
                placementCode = slotMap[bid.impid].placementCode;
            
              placementCodes[placementCode] = false;
            
              pbResponse.bidderCode = bidderCode;
              pbResponse.cpm = parseFloat(bid.price);
              pbResponse.width = bid.w;
              pbResponse.height = bid.h;
              pbResponse.ad = bid.adm;
              
              logToConsole("registering bid "+placementCode+" "+JSON.stringify(pbResponse));
              
              track(debug, 'hb', 'bidResponse', 1);
              bidManager.addBidResponse(placementCode, pbResponse);
              bidCount++;
            };
            
          track(debug, 'hb', 'rmpReplySuccess');
          
          for(var i=0; result.seatbid && i<result.seatbid.length; i++)
            for(var j=0; result.seatbid[i].bid && j<result.seatbid[i].bid.length; j++)
              registerBid(result.seatbid[i].bid[j]);
        }
        catch(ex){
          track(debug, 'hb', 'rmpReplyFail', 'invalid json in rmp response');
        }
      }

      // if no bids are successful, inform prebid
      if(bidCount === 0)
        noBids(params);
      
      // when all bids are complete, log a report
      track(debug, 'hb', 'bidsComplete');
    });
    
    logToConsole("version: "+version);
  };
};