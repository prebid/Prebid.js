/*
  Copyright (c) 2016 RhythmOne, LLC. All rights reserved.
*/

var bidmanager = require('../bidmanager.js'),
  bidfactory = require('../bidfactory.js'),
  adloader = require('../adloader.js'),
  utils = require('../utils.js');

import {ajax as ajax} from '../ajax';

function setupGA() {
  /* jshint ignore:start */
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-63935000-31', { 'name': 'r1hbga' });
  ga('r1hbga.send', 'pageview');
  /* jshint ignore:end */
}

function track(p1, p2, p3) {
  window.ga('r1hbga.send', 'event', p1, p2, p3);
  //console.log('GA: %s %s %s', p1, p2, p3 || '');
}

setupGA();

var w = (typeof window !== "undefined" ? window : {});
w.trackR1Impression = track;
  
module.exports = function(bidManager, ZTStorage, ZTStorageCommandList, global, loader){

  var version = "0.9.0.0",
    defaultZone = "1r";
    
  if(typeof global === "undefined")
    global = window;
      
  if(typeof bidManager === "undefined")
    bidManager = bidmanager;
    
  if(typeof loader === "undefined")
    loader = ajax;
  
  function generateId(length, base){
    var x = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_",
      r = "";

    while(r.length < base)
      r += x.charAt(Math.floor(Math.random() * base));

    return r;
  }
  
  var rhythmBidderUtilities = {
    template: function(){return "<div id=\"{0}_wrapper\"></div><script type=\"text/javascript\">("+rhythmBidderUtilities.process.toString()+")({1}, {6}, {2}, {3}, \"{0}\", {4}, \"{5}\");</scr"+"ipt>";},

    process: function(markup, url, bidResponse, bidRequest, target, seat){
    
      function frameWrap(target, markup, url){
        var f = document.createElement("iframe");
        f.style.border="0";
        f.scrolling="no";
        f.seamless="seamless";
        f.style.height = bidResponse.h+"px";
        f.style.width = bidResponse.w+"px";
        
        target.style.height = bidResponse.h+"px";
        target.style.width = bidResponse.w+"px";
        target.appendChild(f);
        
        if(markup){
          f.contentWindow.document.open();
          f.contentWindow.document.write("<html><head></head><body style=\"margin:0;padding:0;\">"+markup+"</body></html>");
          if((/(MSIE|Trident|Edge)/).test(window.navigator.userAgent) === false)
            f.contentWindow.document.close();
        }
        else if(url)
          f.src = url;
      }
    
      var w = window,
        pjs = (function(){
          try{
            while(w){
              if(w.$$PREBID_GLOBAL$$ || w === window.top) return w.$$PREBID_GLOBAL$$;
              w = w.parent;
            }
          }
          catch(ex){}
          return null;
        })(),
        responses = (pjs ? pjs.getBidResponses() : {}),
        slotBids = responses[target],
        secondPrice = 0;
    
      //console.log(responses);
      
      window.parent.trackR1Impression('hb', 'impression');
      
      var prices = [bidRequest.imp[0].bidfloor];
        
      if(slotBids)
        for(var i=0; i<slotBids.bids.length; i++)
          prices.push(parseFloat(slotBids.bids[i].cpm));
      
      prices.sort();
      secondPrice = prices[prices.length-2]+0.01;
    
      var macroPattern = /\$\{AUCTION_([A-Z_]+)\}/g,
        values = {
          ID: bidRequest.id,
          BID_ID: bidResponse.id,
          IMP_ID: bidResponse.impid,
          SEAT_ID: seat.id,
          AD_ID: bidResponse.adid,
          PRICE: secondPrice,
          CURRENCY: bidRequest.cur[0]
        };
      
      if(markup)
        markup = markup.replace(macroPattern, function(match){
          var x = macroPattern.exec(match)[1];
          //console.log("found macro "+match+" replacing with value "+values[x]);
          if(values[x]) return values[x];
          return match;
        });
      
      if(url)
        url = url.replace(macroPattern, function(match){
          var x = macroPattern.exec(match)[1];
          //console.log("found macro "+match+" replacing with value "+values[x]);
          if(values[x]) return values[x];
          return match;
        });
      
      var wrapper = document.getElementById(target+"_wrapper");
      frameWrap(wrapper, markup, url);
      return wrapper;
    }
  };
  
  this.testAdWrapper = function(markup, url, bidResponse, bidRequest, target, seat, publisherId){
    return rhythmBidderUtilities.process(markup, url, bidResponse, bidRequest, target, seat, publisherId);
  };
  
  track('hb', 'start', version);
  
  //console.log(JSON.stringify(rhythmBidderUtilities.process.toString()));
  
  function load( url, jsonObject, callback){
    
    var json = JSON.stringify(jsonObject),
      called = false;
    
    logToConsole("posting "+json+" to "+url);
    
    loader(url, function(responseText, response){
      if(response.status === 200){
        clearTimeout(abort);
        callback(200, "success", response.responseText);
      }
      else if(!called){
        clearTimeout(abort);
        called = true;
        callback(-1, "http error "+response.status, response.responseText);
      }
    }, json, {method:"POST", contentType: "application/json"});
    
    var abort = setTimeout(function(){
      if(!called){
        called = true;
        callback(-1, "http request timeout", "");
      }
    }, Math.floor($$PREBID_GLOBAL$$.cbTimeout * 0.9));
  }

  var bidderCode = "rhythmone";
  
  function setIfPresent(o, key, value){
    try{
      if(typeof value === "function")
        o[key] = value();
    }catch(ex){}
  }
  
  function ORTB(bid, size, uGUID, ip, callback){
  
    var o = {
      "site": {
        "publisher":{}
      },
      "device": {
        "js": 1,
        "langauge": global.navigator.language,
        "ua": global.navigator.userAgent,
        "dnt": (global.navigator.doNotTrack === 1 ? 1 : 0),
        "ip": ip,
        "geo":{}
      },
      "user":{
        "id": uGUID
      },
      "imp": [],
      "at": 2,
      "tmax": 3000,
      "cur": ["USD"],
      "id": utils.generateUUID()
    };

    var imp = {
      "id": generateId(10, 26),
      "tagId": bid.placementCode,
      "bidfloor": 0,
      "bidfloorcur": "USD",
      "banner": {
        "id": generateId(10, 36),
        "pos": 0,
        "w": size[0],
        "h": size[1],
      }
    };
      
    if(bid.params && bid.params.battr && bid.params.battr.join && (/^[0-9,]+$/).test(bid.params.battr.join(",")))
      imp.banner.battr = bid.params.battr;
        
    if(bid.params && bid.params.btype && bid.params.btype.join && (/^[0-9,]+$/).test(bid.params.btype.join(",")))
      imp.banner.btype = bid.params.btype;
        
    o.imp.push(imp);
    
    setIfPresent(o.site, "page", function(){
      var d = (typeof bid.params === "object" ? bid.params.domain : null),
        l;
      try{l = global.top.document.location.href.toString();}
      catch(ex){l = document.location.href.toString();}
      if(d) l = l.replace(/^(https?)\:\/\/[^\/]*/i, function(m){
        m = (/^(https?)\:/ig).exec(m)[1];
        return m+"://"+d;
      });
      return l;
    });
    setIfPresent(o.site, "domain", function(){
      var d = (typeof bid.params === "object" ? bid.params.domain : null);
      if(typeof d === "string" && d.length > 0) return d;
      d = document.location.ancestorOrigins;
      if(d && d.length > 0)
        return d[d.length-1];
      return global.top.document.location.hostname;
    });
    setIfPresent(o.site, "name", function(){return top.document.title;});
    
    if(!bid.params.placementId){
      logToConsole("required parameter 'placementId' not provided.  cannot bid");
      return;
    }
  
    var endpoint = "//tag.1rx.io/rmp/{placementId}/0/vo?z={zone}";
    if(typeof bid.params === "object"){
    
      if(typeof bid.params.page === "string")
        o.site.page = bid.params.page;
    
      if(typeof bid.params.endpoint === "string")
        endpoint = bid.params.endpoint;
      
      if(typeof bid.params.zone === "string")
        defaultZone = bid.params.zone;
      
      if(typeof bid.params.ip === "string")
        o.device.ip = bid.params.ip;
    
      if(typeof bid.params.placementId !== "undefined")
        o.site.publisher.id = bid.params.placementId;
        
      if(bid.params.categories instanceof Array)
        o.site.cat = bid.params.categories;
        
      if(bid.params.keywords instanceof Array)
        bid.params.keywords = bid.params.keywords.join();
        
      if(typeof bid.params.keywords === "string")
        o.site.keywords = bid.params.keywords;
    }
    
    o.device.devicetype = ((/(ios|ipod|ipad|iphone|android)/i).test(global.navigator.userAgent) ? 1 : ((/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(global.navigator.userAgent) ? 3 : 2));
    
    setIfPresent(o.device, "h", function(){return global.screen.height;});
    setIfPresent(o.device, "w", function(){return global.screen.width;});
    
    endpoint = endpoint.replace(/{placementId}/i, bid.params.placementId);
    endpoint = endpoint.replace(/{zone}/i, defaultZone);
  
    var trace = (typeof bid.params === "object" ? bid.params.trace : null);
  
    // do we want geolocation data in the openRTB request?  It prompts the user.
    // http://tag.1rx.io/rmp/34887/0/vo?z=test
    load(endpoint + (trace === "true" ? "&trace=true" : ""), o, function(code, msg, txt){
      var bidResponse = -1;
      try{
        bidResponse = JSON.parse(txt);
      }catch(ex){
        logToConsole(txt+" is not parseable as JSON");
      }
      callback(bidResponse, o);
    });
  }
  
  function logToConsole(txt){
    if(debug)
      console.log(txt);
  }
  
  var bidCount = 0,
    bidStack = {},
    debug = false;
  
  this.callBids = function(params){
  
    track('hb', 'callBids');

    global.pbjs.addCallback("auctionEnd", function(){
      for(var i=0; i<bidCount; i++)
        track('hb', 'bidTooSlow');
    });
  
    function finish(){
  
      var sandbox = new ZTStorage("//d3rim8qxq4v92b.cloudfront.net/ztstorage/bg.htm"),
        cl = new ZTStorageCommandList();
        
      cl.get("uGUID");
      cl.get("ip");
      
      sandbox.send(cl, function(response){
    
        function ipRetrieved(){
        
          var uGUID = response.uGUID;
          if(typeof uGUID === "undefined"){
            uGUID = utils.generateUUID();
            cl = new ZTStorageCommandList();
            cl.set("uGUID", uGUID);
            sandbox.send(cl);
          }
          
          function bidSort(a, b){
            return b.cpm - a.cpm;
          }
          
          var attemptedBids = 0,
            successfulBids = 0,
            placementID;
          
          function mapBid(bid){
          
            placementID = bid.params.placementID;
            debug = (bid.params.debug === true || bid.params.debug === 1);
          
            function responseHandler(response, bidRequest){
            
              bidCount--;
              logToConsole("response: "+JSON.stringify(response));
              if(response !== -1){
                track('hb', 'rmpReplySuccess');
                var adResponse = bidfactory.createBid(1),
                reply = response.seatbid[0].bid[0];
            
                adResponse.bidderCode = bidderCode;
                adResponse.cpm = parseFloat(reply.price);
                adResponse.width = reply.w;
                adResponse.height = reply.h;
                
                adResponse.ad = rhythmBidderUtilities.template().replace(/\{([0-9]+)\}/g, function(match){
                  var i = parseInt(match[1]),
                    values = [
                      bid.placementCode, 
                      (reply.adm?"\""+reply.adm.replace(/"/g, "\\\"").replace(/\s+/g, " ").replace(/<\/script/g, "</scr\"+\"ipt")+"\"":"false"),
                      JSON.stringify(reply).replace(/<\/script/g, "</scr\"+\"ipt"),
                      JSON.stringify(bidRequest),
                      JSON.stringify(response).replace(/<\/script/g, "</scr\"+\"ipt"),
                      placementID,
                      (reply.nurl?"\""+reply.nurl.replace(/"/g, "\\\"")+"\"":"false")
                    ];
                  if(i > -1 && i < values.length)
                    return values[i];
                });
                
                if(!(bidStack[bid.placementCode] instanceof Array))
                  bidStack[bid.placementCode] = [];

                bidStack[bid.placementCode].push(adResponse);
              }
              else track('hb', 'rmpReplyFail');
              
              if(bidCount === 0){
             
                var stackLength = 0;
              
                logToConsole("sorting bids");
                // once all bid requests have been returned, sort each array in the bidStack by cpm
                // only register the highest bids per ad slot
                for(var k in bidStack){
                  if(bidStack[k] instanceof Array){
                    bidStack[k].sort(bidSort);
                    logToConsole("registering bid "+k+" "+JSON.stringify(bidStack[k][0]));
                    bidManager.addBidResponse(k, bidStack[k][0]);
                    track('hb', 'bidResponse');
                    successfulBids++;
                  }
                  stackLength++;
                }
                
                attemptedBids += stackLength;
                
                // if no bids are successful, inform prebid
                if(successfulBids === 0){
                  bid = bidfactory.createBid(2);
                  bid.bidderCode = bidderCode;
                  bidmanager.addBidResponse(bid.placementCode, bid);
                }
                
                // when all bids are complete, log a report
                track('hb', 'bidsComplete');
              }
            }
            track('hb', 'bidRequest');
            for(var j = 0; j<bid.sizes.length; j++){
              track('hb', 'rmpRequest');
              bidCount++;
              ORTB(bid, bid.sizes[j], uGUID, response.ip, responseHandler);
            }
          }
      
          // Map each bid to its response
          for(var i=0;i<params.bids.length;i++)
            mapBid(params.bids[i]);
            
          logToConsole("version: "+version);
        }
    
        if(typeof response.ip !== "string"){
          global.ipReceiver = function(reply){
            response.ip = reply.ip;
            cl = new ZTStorageCommandList();
            cl.set("ip", reply.ip);
            sandbox.send(cl, ipRetrieved);
          };
          adloader.loadScript("https://api.ipify.org/?format=jsonp&callback=ipReceiver", function(){});
        }
        else ipRetrieved();
      });
    }

    if(typeof ZTStorage === "undefined" || typeof ZTStorageCommandList === "undefined")
      adloader.loadScript("//d3rim8qxq4v92b.cloudfront.net/ztstorage/ztstorage.js", function(){
        ZTStorage = global.ztStorage;
        ZTStorageCommandList = global.ztStorageCommandList;
        finish();
      });
    else finish();
  };
};