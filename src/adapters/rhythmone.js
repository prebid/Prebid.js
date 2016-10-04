var bidmanager = require('../bidmanager.js'),
  bidfactory = require('../bidfactory.js'),
  adloader = require('../adloader.js');

module.exports = function(bidManager, ZTStorage, ZTStorageCommandList, global){

  var version = "0.9.0.0";

  if(typeof global === "undefined")
    global = window;
      
  if(typeof bidManager === "undefined")
    bidManager = bidmanager;
  
  function generateId(length, base){
    var x = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_",
      r = "";

    while(r.length < base)
      r += x.charAt(Math.floor(Math.random() * base));

    return r;
  }
  
  function log(userId, publisherId, totalBids, successfulBids){
    var img = new Image(),
      url = '//rhythmanalytics.1rx.io/rhythmanalytics/img?tracking_id=prebid_r1&hit_type=event&time_ms='+(new Date()).getTime();

    url += "&page_url="+encodeURIComponent(document.location.href.toString());
    
    if(typeof userId === "string"){
        
      url += "&metric2="+encodeURIComponent(userId);
      
      if(typeof publisherId === "string")
        url += "&metric1="+encodeURIComponent(publisherId);
      
      if(typeof totalBids === "number" && typeof successfulBids === "number"){
        // send the bids report
        url += "&metric0=postBids";
        url += "&metric4="+totalBids;
        url += "&metric5="+successfulBids;
      }
      else url += "&metric0=preBids";
    }
    else url += "&metric0=init";
    
    img.src = url;
  }
  
  log();
  
  var rhythmBidderUtilities = {
    template: function(){return "<div id=\"{0}_wrapper\"></div><script type=\"text/javascript\">("+rhythmBidderUtilities.process.toString()+")({1}, {6}, {2}, {3}, \"{0}\", {4}, \"{5}\");</scr"+"ipt>";},
    process: "function (e,t,r,n,i,a,o){function d(e,t,r,i){var a=[\"bidderCode\",\"size\",\"adUnitCode\",\"cpm\",\"timeToRespond\"],o=[\"b\",\"s\",\"a\",\"c\",\"t\"],d=0,s=[],c=new Image,u=\"\",p=document.location.ancestorOrigins,l=\"//rhythmanalytics.1rx.io/rhythmanalytics/img?tracking_id=prebid_r1&hit_type=event&time_ms=\"+(new Date).getTime()+\"&metric0=allBids&metric1=\"+encodeURIComponent(t)+\"&metric2=\"+encodeURIComponent(n.user.id);for(var f in e)for(d=0;d<e[f].bids.length;d++){for(var g={},m=0;m<a.length;m++)g[o[m]]=e[f].bids[d][a[m]];s.push(g)}try{u=null!==r?i.document.location.href.toString():p&&p.length>0?p[p.length-1]:document.location.href.toString()}catch(b){}for(l+=\"&page_url=\"+encodeURIComponent(u),d=0;d<s.length&&10>d;d++)l+=\"&dimension\"+d+\"=\"+encodeURIComponent(JSON.stringify(s[d]));c.src=l}function s(e,t,n){var i=document.createElement(\"iframe\");i.style.border=\"0\",i.scrolling=\"no\",i.seamless=\"seamless\",i.style.height=r.h+\"px\",i.style.width=r.w+\"px\",e.style.height=r.h+\"px\",e.style.width=r.w+\"px\",e.appendChild(i),t?(i.contentWindow.document.open(),i.contentWindow.document.write('<html><head></head><body style=\"margin:0;padding:0;\">'+t+\"</body></html>\"),/(MSIE|Trident|Edge)/.test(window.navigator.userAgent)===!1&&i.contentWindow.document.close()):n&&(i.src=n)}var c=window,u=function(){try{for(;c;){if(c.$$PREBID_GLOBAL$$||c===window.top)return c.$$PREBID_GLOBAL$$;c=c.parent}}catch(e){}return null}(),p=u?u.getBidResponses():{},l=p[i],f=0;d(p,o,u,c);var g=[n.imp[0].bidfloor];if(l)for(var m=0;m<l.bids.length;m++)g.push(parseFloat(l.bids[m].cpm));g.sort(),f=g[g.length-2]+.01;var b=/\\$\\{AUCTION_([A-Z_]+)\\}/g,h={ID:n.id,BID_ID:r.id,IMP_ID:r.impid,SEAT_ID:a.id,AD_ID:r.adid,PRICE:f,CURRENCY:n.cur[0]};e&&(e=e.replace(b,function(e){var t=b.exec(e)[1];return h[t]?h[t]:e})),t&&(t=t.replace(b,function(e){var t=b.exec(e)[1];return h[t]?h[t]:e})),s(document.getElementById(i+\"_wrapper\"),e,t)}"
    /*
    process: function(markup, url, bidResponse, bidRequest, target, seat, publisherId){
    
      function log(bd, publisherId, pjs, win){
        var columns = ["bidderCode","size","adUnitCode","cpm","timeToRespond"],
          abbreviated = ["b", "s", "a", "c", "t"],
          i=0,
          data = [],
          img = new Image(),
          page = "",
          d = document.location.ancestorOrigins,
          url = '//rhythmanalytics.1rx.io/rhythmanalytics/img?tracking_id=prebid_r1&hit_type=event&time_ms='+(new Date()).getTime()+
            "&metric0=allBids"+
            "&metric1="+encodeURIComponent(publisherId)+
            "&metric2="+encodeURIComponent(bidRequest.user.id);
          
        for(var k in bd)
          for(i=0; i<bd[k].bids.length; i++){
            var cropped = {};
            for(var j=0; j<columns.length; j++)
              cropped[abbreviated[j]] = bd[k].bids[i][columns[j]];
            data.push(cropped);
          }
        
        try{
          page = (pjs !== null ? win.document.location.href.toString() : (d && d.length > 0 ? d[d.length-1] : document.location.href.toString()));
        }
        catch(ex){}

        url += "&page_url="+encodeURIComponent(page);
        
        for(i=0; i<data.length && i<10; i++)
          url += "&dimension"+i+"="+encodeURIComponent(JSON.stringify(data[i]));
        
        img.src = url;
      }
    
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
    
      log(responses, publisherId, pjs, w);
      
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
      
      frameWrap(document.getElementById(target+"_wrapper"), markup, url);
    }
    */
  };
  
  //console.log(JSON.stringify(rhythmBidderUtilities.process.toString()));
  
  function load( url, jsonObject, callback){
    
    var json = JSON.stringify(jsonObject),
      x;
    
    logToConsole("posting "+json+" to "+url);
    
    if(typeof global.XDomainRequest !== "undefined"){
      
      // this section is for IE 8 compatibility
      
      if(typeof global.xDomainRequests === "undefined")
        global.xDomainRequests = [];  // fixes IE8 issue where the domain request is garbage collected too early

      x = new global.XDomainRequest();
      x.onerror = function(){
        callback(-1, "http error - XDomainRequest");
      };
      x.ontimeout = function(){callback(-1, "http timeout - XDomainRequest");};
      x.onprogress = function(){};
      x.onload = function() {
        callback(200, "success", x.responseText);
      };
      x.open("POST", url, true);
      x.send(json);
      
      global.xDomainRequests.push(x); // fixes IE8 issue where the domain request is garbage collected too early
    }
    else{
      var called = false;
      x = new global.XMLHttpRequest(url);
      x.addEventListener("readystatechange", function(){
        if(x.readyState === 4){
          if(x.status === 200){
            callback(200, "success", x.responseText);
          }
          else if(!called){
            called = true;
            callback(-1, "http error "+x.status, x.responseText);
          }
        }
      });
      x.addEventListener("error", function(){if(!called){called = true;callback(-1, "http error - "+x.status);}});
      x.addEventListener("abort", function(){if(!called){called = true;callback(-1, "http abort - "+x.status);}});
      x.open('POST', url);
      x.setRequestHeader("Content-Type", "application/json");
      //x.setRequestHeader("x-openrtb-version", "2.3");  
      x.send(json);
    }
  }

  var bidderCode = "rhythmone";
  
  function GUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : r & 0x3 | 0x8).toString(16);
    });
  }
  
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
      "id": GUID()
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
      try{l = top.document.location.href.toString();}
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
      return top.document.location.hostname;
    });
    setIfPresent(o.site, "name", function(){return top.document.title;});
    
    if(!bid.params.placementId)
      bid.params.placementId = "39483";
  
    var endpoint = "//tag.1rx.io/rmp/{placementId}/0/vo?z=hb";
    if(typeof bid.params === "object"){
    
      if(typeof bid.params.page === "string")
        o.site.page = bid.params.page;
    
      if(typeof bid.params.endpoint === "string")
        endpoint = bid.params.endpoint;
      
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
  
    function finish(){
  
      var sandbox = new ZTStorage("//d3rim8qxq4v92b.cloudfront.net/ztstorage/bg.htm"),
        cl = new ZTStorageCommandList();
        
      cl.get("uGUID");
      cl.get("ip");
      
      sandbox.send(cl, function(response){
    
        function ipRetrieved(){
        
          var uGUID = response.uGUID;
          if(typeof uGUID === "undefined"){
            uGUID = GUID();
            cl = new ZTStorageCommandList();
            cl.set("uGUID", uGUID);
            sandbox.send(cl);
          }

          log(uGUID);
          
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
                      bid.params.placementId,
                      (reply.nurl?"\""+reply.nurl.replace(/"/g, "\\\"")+"\"":"false")
                    ];
                  if(i > -1 && i < values.length)
                    return values[i];
                });
                
                if(!(bidStack[bid.placementCode] instanceof Array))
                  bidStack[bid.placementCode] = [];

                bidStack[bid.placementCode].push(adResponse);
              }
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
                    successfulBids++;
                  }
                  stackLength++;
                }
                
                attemptedBids += stackLength;
                
                // when all bids are complete, log a report
                log(uGUID, placementID, attemptedBids, successfulBids);
              }
            }
            for(var j = 0; j<bid.sizes.length; j++){
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