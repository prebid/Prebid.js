(function(){
	/* This is a new revamped version of user_sync.html/js , previou version can be found in trunk at version 9406. */
	// please note, this js code is minified and added in user_sync.html

	var win = window,
		nav = navigator,
		top = win.top || win,
		current_hash   =  win.location.search.substr(1),
		encodeURIC = encodeURIComponent,
		decodeURIC = decodeURIComponent,
		parseInt = win.parseInt,
		PubMatic = win.PubMatic || ( win.PubMatic = {} ),
		pubId      = 0,
		siteId     = 0,
		adId       = 0,		
		s_pubmatic_com = "pubmatic.com",
		s_ads_pubmatic_com = "ads."+ s_pubmatic_com,
		secure  = 1,
		protocol = 'https://',
		isGDPR = (win.__cmp ? 1 : 0),		
		isFunction = function(obj){
	return typeof obj === "function";
},
		consoleLog = console.log.bind(console, "PubMatic:"),
		/**
 * Check if specified value is present in array
 * array - set of value to look for
 * value - value to look for
 * returns true if present else false
 */
isValueInArray = function( array , value ){
	var   i   = 0
		, len = array.length
		, rvalue = false
		;
		
	for( ;i<len; i++){
		if( array[i] === value ){
			rvalue = true;
			break;
		}
	}
	return rvalue;
},
		createDynamicScriptTag = function(url, onLoadFunc){
	var element = win.document.createElement("script");
	element.type = "text/javascript";
	element.src = url;
	element.async = true;
	if(isFunction(onLoadFunc)){
		element.onload = element.onreadystatechange = onLoadFunc;
	}
	var firstScriptTag = win.document.getElementsByTagName("script")[0];
	firstScriptTag && firstScriptTag.parentNode && isFunction(firstScriptTag.parentNode.appendChild) && firstScriptTag.parentNode.appendChild(element);
},
		createAndInsertHiddenFrameAsync = function(src){
	var element = win.document.createElement('iframe');
	element.src = src;
	element.style.height ="0px";
	element.style.width ="0px";
	element.style.display = "none";
	element.height = 0;
	element.width = 0;
	element.border = '0px';
	element.hspace = '0';
	element.vspace = '0';
	element.marginWidth = '0';
	element.marginHeight = '0';
	element.style.border = '0';
	element.scrolling = 'no';
	element.frameBorder = '0';	
	var firstScriptTag = win.document.getElementsByTagName("script")[0];
	firstScriptTag && firstScriptTag.parentNode && isFunction(firstScriptTag.parentNode.appendChild) && firstScriptTag.parentNode.appendChild(element);
},
		createAndInsertHiddenImageAsync = function(url){
	var element = win.document.createElement("img");
	element.src = url;
	element.style.height ="0px";
	element.style.width ="0px";
	element.style.display = "none";
	element.height = 0;
	element.width = 0;
	element.border = '0px';
	element.hspace = '0';
	element.vspace = '0';
	element.marginWidth = '0';
	element.marginHeight = '0';
	element.style.border = '0';
	element.scrolling = 'no';	
	var firstScriptTag = win.document.getElementsByTagName("script")[0];
	firstScriptTag && firstScriptTag.parentNode && isFunction(firstScriptTag.parentNode.appendChild) && firstScriptTag.parentNode.appendChild(element);
},
		getQueryParamsFromURL = function(url){
	var queryParams = {},
		queryString = url.split("?")[1];
	if(queryString){
		var params = queryString.split("&");
		for(var i=0, l=params.length; i<l; i++){
			var keyValue = params[i].split("=");
			if(keyValue.length == 2){
				queryParams[ keyValue[0] ] = keyValue[1];
			}
		}
	}
	return queryParams;
},
		localStorageKey = 'PubMatic',
localStorageKeyForUSP = 'PubMatic_USP',
		isLocalStoreEnabled = (function(){
	try{
		return win.localStorage && isFunction(win.localStorage.getItem) && isFunction(win.localStorage.setItem);
	}catch(e){
		return false;
	}
})(),
		lookupIabConsentTCF1 = function(cmpSuccess, cmpError) {
    function handleCmpResponseCallbacks() {
        var cmpResponse = {};
        function afterEach() {
        	//consoleLog("TCF1: in afterEach, ", cmpResponse);
            if (cmpResponse.getConsentData && cmpResponse.getVendorConsents) {
                cmpSuccess(cmpResponse);
            }
        }
        return {
            consentDataCallback: function (consentResponse) {
            	//consoleLog("TCF1: in consentDataCallback, ", consentResponse);
                cmpResponse.getConsentData = consentResponse;
                afterEach();
            },
            vendorConsentsCallback: function (consentResponse) {
            	//consoleLog("TCF1: in vendorConsentsCallback, ", consentResponse);
                cmpResponse.getVendorConsents = consentResponse;
                afterEach();
            }
        }
    }

    function callCMPOnSameFrame(){
    	//consoleLog("TCF1: calling CMP ");
		window.__cmp('getConsentData', null, callbackHandler.consentDataCallback);
		window.__cmp('getVendorConsents', null, callbackHandler.vendorConsentsCallback);
    }

    var callbackHandler = handleCmpResponseCallbacks();
    var cmpCallbacks = {};
    
    // to collect the consent information from the user, we perform two calls to the CMP in parallel:
    // first to collect the user's consent choices represented in an encoded string (via getConsentData)
    // second to collect the user's full unparsed consent information (via getVendorConsents)
    // the following code also determines where the CMP is located and uses the proper workflow to communicate with it:
    // check to see if CMP is found on the same window level as prebid and call it directly if so
    // check to see if prebid is in a safeframe (with CMP support)
    // else assume prebid may be inside an iframe and use the IAB CMP locator code to see if CMP's located in a higher parent window. this works in cross domain iframes
    // if the CMP is not found, the iframe function will call the cmpError exit callback to abort the rest of the CMP workflow
    
    if (window.__cmp) {
    	if(typeof window.__cmp === "function"){
    		callCMPOnSameFrame();
    	}else{
    		// call after some time
    		//consoleLog("TCF1: calling CMP after delay");
    		setTimeout(function(){
    			if(typeof window.__cmp === 'function'){
    				callCMPOnSameFrame();
    			}
    		}, 500);
    	}
    } else if(window !== top){
    	//consoleLog("TCF1: Tag is executing in iframe");
    	if (inASafeFrame() && typeof window.$sf.ext.cmp === 'function') {
	    	//consoleLog("TCF1: In safe-frame CMP detection");
	        callCmpWhileInSafeFrame('getConsentData', callbackHandler.consentDataCallback);
	        callCmpWhileInSafeFrame('getVendorConsents', callbackHandler.vendorConsentsCallback);
	    } else {
	    	//consoleLog("TCF1: In iframe CMP detection");
	        // find the CMP frame
	        var f = window;
	        var cmpFrame;
	        while (!cmpFrame) {
	            try {
	                if (f.frames['__cmpLocator']) cmpFrame = f;
	            } catch (e) {}
	            if (f === window.top) break;
	            f = f.parent;
	        }
	        callCmpWhileInIframe('getConsentData', cmpFrame, callbackHandler.consentDataCallback);
	        callCmpWhileInIframe('getVendorConsents', cmpFrame, callbackHandler.vendorConsentsCallback);
	    }
	} else {
		// we are on top frame; cmp js might not have loaded
		// call after some time
		//consoleLog("TCF1: cmp might not have loaded, calling CMP after delay");
		setTimeout(function(){
			if(typeof window.__cmp === 'function'){
				callCMPOnSameFrame();
			}
		}, 500);
	}

    function inASafeFrame() {
        return !!(window.$sf && window.$sf.ext);
    }

    function callCmpWhileInSafeFrame(commandName, callback) {
        function sfCallback(msgName, data) {
            if (msgName === 'cmpReturn') {
                var responseObj = (commandName === 'getConsentData') ? data.vendorConsentData : data.vendorConsents;
                callback(responseObj);
            }
        }
        window.$sf.ext.register(1, 1, sfCallback);
        window.$sf.ext.cmp(commandName);
    }

    function callCmpWhileInIframe(commandName, cmpFrame, moduleCallback) {
		/* Setup up a __cmp function to do the postMessage and stash the callback.
      	This function behaves (from the caller's perspective identicially to the in-frame __cmp call */
        window.__cmp = function (cmd, arg, callback) {
            if (!cmpFrame) {
                removePostMessageListener();
                var errmsg = 'TCF1: CMP not found';
                return cmpError(errmsg);
            }
            var callId = Math.random() + '';
            var msg = {
                __cmpCall: {
                    command: cmd,
                    parameter: arg,
                    callId: callId
                }
            };
            cmpCallbacks[callId] = callback;
            cmpFrame.postMessage(msg, '*');
        }
        /** when we get the return message, call the stashed callback */
        window.addEventListener('message', readPostMessageResponse, false);
        // call CMP
        window.__cmp(commandName, null, cmpIframeCallback);

        function readPostMessageResponse(event) {
            var json = (typeof event.data === 'string' && isValueInArray(event.data, 'cmpReturn')) ? JSON.parse(event.data) : event.data;
            if (json.__cmpReturn && json.__cmpReturn.callId) {
                var i = json.__cmpReturn;
                // TODO - clean up this logic (move listeners?); we have duplicate messages responses because 2 eventlisteners are active from the 2 cmp requests running in parallel
                if (typeof cmpCallbacks[i.callId] !== 'undefined') {
                    cmpCallbacks[i.callId](i.returnValue, i.success);
                    delete cmpCallbacks[i.callId];
                }
            }
        }

        function removePostMessageListener() {
            window.removeEventListener('message', readPostMessageResponse, false);
        }

        function cmpIframeCallback(consentObject) {
            removePostMessageListener();
            moduleCallback(consentObject);
        }
    }
},

lookupIabConsentTCF2 = function(cmpSuccess, cmpError) {

    function callbackHandler(tcData, success){
        if(success){
            cmpSuccess(tcData, success);
        } else {
            // todo: IGNORE: what to return here? errorMessage?
            cmpError(tcData, success);
        }
    }

    function callCMPOnSameFrame(){
        //consoleLog("TCF2: calling CMP ");
        window.__tcfapi('addEventListener', 2, callbackHandler);
    }
    
    var cmpCallbacks = {};

    if (window.__tcfapi) {
        if(typeof window.__tcfapi === "function"){
            callCMPOnSameFrame();
        }else{
            // call after some time
            //consoleLog("TCF2: calling CMP after delay");
            setTimeout(function(){
                if(typeof window.__tcfapi === 'function'){
                    callCMPOnSameFrame();
                }
            }, 500);
        }
    } else if(window !== top){
        //consoleLog("TCF2: Tag is executing in iframe");
        // if (inASafeFrame() && typeof window.$sf.ext.cmp === 'function') {
            // todo: IGNORE: code pending
            // //consoleLog("TCF2: In safe-frame CMP detection");
            // callCmpWhileInSafeFrame('getConsentData', callbackHandler.consentDataCallback);
            // callCmpWhileInSafeFrame('getVendorConsents', callbackHandler.vendorConsentsCallback);
        // } else {
            //consoleLog("TCF2: We are in iframe, need to find CMP frame");
            // find the CMP frame
            var f = window;
            var cmpFrame;
            while (!cmpFrame) {
                try {
                    if (f.frames['__tcfapiLocator']){
                        cmpFrame = f;
                        //consoleLog('TCF2: frame found.');
                    }
                } catch (e) {}
                if (f === window.top) break;
                f = f.parent;
            }            
            callCmpWhileInIframe('addEventListener', cmpFrame, callbackHandler);
        // }
    } else {
        // we are on top frame; cmp js might not have loaded
        // call after some time
        //consoleLog("TCF2: cmp might not have loaded, calling CMP after delay");
        setTimeout(function(){
            if(typeof window.__tcfapi === 'function'){
                callCMPOnSameFrame();
            }
        }, 500);
    }

    function inASafeFrame() {
        return !!(window.$sf && window.$sf.ext);
    }

    // function callCmpWhileInSafeFrame(commandName, callback) {
    //     // todo: IGNORE: need to make changes for TCF2
    //     function sfCallback(msgName, data) {
    //         if (msgName === 'cmpReturn') {
    //             var responseObj = (commandName === 'getConsentData') ? data.vendorConsentData : data.vendorConsents;
    //             callback(responseObj);
    //         }
    //     }
    //     window.$sf.ext.register(1, 1, sfCallback);
    //     window.$sf.ext.cmp(commandName);
    // }

    function callCmpWhileInIframe(commandName, cmpFrame, moduleCallback) {
        window.__tcfapi = function (cmd, version, callback, arg) {
            if (!cmpFrame) {
                removePostMessageListener();
                return cmpError({msg: 'TCF2: CMP not found'}, false);
            }
            var callId = Math.random() + '';
            var msg = {
                __tcfapiCall: {
                    command: cmd,
                    parameter: arg,
                    version: version,
                    callId: callId
                }
            };
            cmpCallbacks[callId] = callback;
            cmpFrame.postMessage(msg, '*');
        }
        /** when we get the return message, call the stashed callback */
        window.addEventListener('message', readPostMessageResponse, false);
        // call CMP
        window.__tcfapi(commandName, 2, cmpIframeCallback);

        function readPostMessageResponse(event) {
            var json = {};
            try{
                json = (typeof event.data === 'string') ? JSON.parse(event.data) : event.data;
            }catch(e){}
            if (json && json.__tcfapiReturn && json.__tcfapiReturn.callId) {
                var payload = json.__tcfapiReturn;
                if (typeof cmpCallbacks[payload.callId] === 'function') {
                    cmpCallbacks[payload.callId](payload.returnValue, payload.success);
                    cmpCallbacks[payload.callId] = null;
                }
            }
        }

        function removePostMessageListener() {
            window.removeEventListener('message', readPostMessageResponse, false);
        }

        function cmpIframeCallback(consentObject, success) {
            removePostMessageListener();
            moduleCallback(consentObject, success);
        }
    }
},

// public: this method is used by other files
// does not return anything
// gets the consent from CMP and stores in LS for further use
getUserConsentDataFromCMP = function(pubId, callback){
    var pubMaticVendorId = '76';
    // Commenting CMP TCF1 call and its callbacks as it is deprecated by IAB.
    /*function successTCF1(resp) {
    	//consoleLog('TCF1: Data received from CMP: ', resp);
        if(resp){
        	if(resp.getConsentData && resp.getConsentData.consentData){
        		//consoleLog("TCF1: using getConsentData.consentData: ", resp.getConsentData.consentData);
        		setConsentDataInLS(pubId, 'c', resp.getConsentData.consentData);
        	}else if(resp.getVendorConsents && resp.getVendorConsents.metadata){
        		//consoleLog("TCF1: using getVendorConsents.metadata: ", resp.getVendorConsents.metadata);
        		setConsentDataInLS(pubId, 'c', resp.getVendorConsents.metadata);
        	}
        }
    }*/

    /*function failureTCF1(){
    	//consoleLog("TCF1: ", arguments);
    	//consoleLog('TCF1: Failed to retrieve user consent data from CMP for pubId: ', pubId);
    }*/
    
    // Commenting lookupIabConsentTCF1 call as it is deprecated. 
    // lookupIabConsentTCF1(successTCF1, failureTCF1);

    function successTCF2(tcData) {
        //consoleLog('TCF2: Data received from CMP: ', tcData);
        if(tcData){
            var gdprAppliesBoolean = typeof tcData.gdprApplies === 'boolean' ? tcData.gdprApplies : false;
            if(tcData.tcString){
                //consoleLog("TCF2: using tcData.tcString: ", tcData.tcString);
                if(tcData.vendor && tcData.vendor.consents && tcData.vendor.consents[pubMaticVendorId]) {
                    setConsentDataInLS(pubId, 'c', tcData.tcString, (gdprAppliesBoolean ? '1': '0'));
                }
            }
        }
        if(callback) callback('GDPRTCF2');
    }

    function failureTCF2(){
        //consoleLog("TCF2: ", arguments);
        //consoleLog('TCF2: Failed to retrieve user consent data from CMP for pubId: ', pubId);
        if(callback) callback('GDPRTCF2');
    }
    
    lookupIabConsentTCF2(successTCF2, failureTCF2);
},

/*
	localStorage = {
		localStorageKey : {
			pubID: {
				c: "encoded user consent",
                g: '1' / '0'
			}
		}
	}
*/

// a dumb function to store data in LS; nothing specific to GDPR
setConsentDataInLS = function(pubId, dataType, consentString, gdprApplies){
	var pm;
	if(!isLocalStoreEnabled){
		//consoleLog('local storage is not enabled');
		return
	}
	try{
		pm = win.localStorage.getItem(localStorageKey);
	}catch(e){
		//consoleLog('failed in reading from LS');
	}
	if(pm && typeof pm === 'string'){
		try{
			pm = JSON.parse(pm);
		}catch(e){
			pm = {};
		}
	}else{
		pm = {};
	}
	//consoleLog('data from ls', pm);
	if(pm){
		if(!pm.hasOwnProperty(pubId)){
			pm[pubId] = {};
		}
		pm[pubId].t = (new Date()).getTime();
		pm[pubId][dataType] = encodeURIComponent(consentString);
        pm[pubId]['g'] = gdprApplies;
	}
	try{
		win.localStorage.setItem(localStorageKey, JSON.stringify(pm));
		//consoleLog('data stored in local storage successfuly')
	}catch(e){
		//consoleLog('local storage reading exception');
	}
},

// public: this method is used by other files
// just pulls data from LS and returns it; no CMP communication
getUserConsentDataFromLS = function(pubId){
	var data = {c:''};
	if(!isLocalStoreEnabled){
		//consoleLog('LS is not enabled');
		return data;
	}
	var pm;
	try{
		pm = win.localStorage.getItem(localStorageKey);
	}catch(e){
		//consoleLog('failed in reading from LS');
	}
	if(pm && typeof pm === 'string'){
		try{
			pm = JSON.parse(pm);
		}catch(e){
			pm = {};
		}
		if(pm.hasOwnProperty(pubId)){
			var pmRecord = pm[pubId];
			if(pmRecord && pmRecord.c && pmRecord.t){
				// check timestamp of data and current; if older than a day do not use it
				if(pmRecord.t && parseInt(pmRecord.t) > ( ( new Date() ).getTime() -  ( 24 * 60 * 60 * 1000 ) ) ){
					data.c = pmRecord.c;
                    data.g = pmRecord.g;
				}else{
					//consoleLog('data in LS had no timestamp or expired timestamp.', pmRecord);
				}
			}
		}
	}
	return data;
},
		// CCPA us_privacy
lookupIabUspConsent = function(uspSuccess, uspError){
	var USPAPI_VERSION = 1;
	function handleUspApiResponseCallbacks() {
		var uspResponse = {};

		function afterEach() {
			if (uspResponse.usPrivacy) {
				uspSuccess(uspResponse);
			} else {
				//consoleLog('USP: Unable to get USP consent string.');
			}
		}

		return {
			consentDataCallback: function(consentResponse, success){
				if (success && consentResponse.uspString) {
					uspResponse.usPrivacy = consentResponse.uspString;
				}
				afterEach();
			}
		};
	}

	var callbackHandler = handleUspApiResponseCallbacks();
	var uspapiCallbacks = {};

	// to collect the consent information from the user, we perform a call to USPAPI
	// to collect the user's consent choices represented as a string (via getUSPData)

	// the following code also determines where the USPAPI is located and uses the proper workflow to communicate with it:
	// - use the USPAPI locator code to see if USP's located in the current window or an ancestor window. This works in friendly or cross domain iframes
	// - if USPAPI is not found, the iframe function will call the uspError exit callback to abort the rest of the USPAPI workflow
	// - try to call the __uspapi() function directly, otherwise use the postMessage() api
	// find the CMP frame/window

	try {
		// try to call __uspapi directly
		window.__uspapi('getUSPData', USPAPI_VERSION, callbackHandler.consentDataCallback);
	} catch (e) {
		// must not have been accessible, try using postMessage() api
		var f = window;
		var uspapiFrame;
		while (!uspapiFrame) {
			try {
				if (f.frames['__uspapiLocator']) uspapiFrame = f;
			} catch (e) { }
			if (f === window.top) break;
			f = f.parent;
		}

		if (!uspapiFrame) {
			return uspError('USP CMP not found.');
		}
		callUspApiWhileInIframe('getUSPData', uspapiFrame, callbackHandler.consentDataCallback);
	}

	function callUspApiWhileInIframe(commandName, uspapiFrame, moduleCallback) {
		// Setup up a __uspapi function to do the postMessage and stash the callback.
		// This function behaves, from the caller's perspective, identicially to the in-frame __uspapi call (although it is not synchronous) 
		window.__uspapi = function (cmd, ver, callback) {
			var callId = Math.random() + '';
		  	var msg = {
				__uspapiCall: {
					command: cmd,
					version: ver,
					callId: callId
				}
			};
			uspapiCallbacks[callId] = callback;
			uspapiFrame.postMessage(msg, '*');
		}

		// when we get the return message, call the stashed callback 
		window.addEventListener('message', readPostMessageResponse, false);

		// call uspapi
		window.__uspapi(commandName, USPAPI_VERSION, uspapiCallback);

		function readPostMessageResponse(event) {
			var res = event && event.data && event.data.__uspapiReturn;
			if (res && res.callId) {
				if (typeof uspapiCallbacks[res.callId] !== 'undefined') {
					uspapiCallbacks[res.callId](res.returnValue, res.success);
					delete uspapiCallbacks[res.callId];
				}
			}
		}

		function uspapiCallback(consentObject, success) {
			window.removeEventListener('message', readPostMessageResponse, false);
			moduleCallback(consentObject, success);
		}
	}
},

// public: this method is used by other files
getUserUspConsentDataFromCMP = function(pubId, callback){
    function success(consentObject) {
    	//consoleLog('USP: Data received from CMP: ', consentObject);
        var valid = !!(consentObject && consentObject.usPrivacy);
		if (!valid) {
			//consoleLog(`USP: API returned unexpected value during lookup process.`, hookConfig, consentObject);
			return;
		}
		setUspConsentDataInLS(pubId, 'c', consentObject.usPrivacy);
		if(callback) callback('USP');
    }

    function failure(){
    	//consoleLog(arguments);
    	//consoleLog('USP: Failed to retrieve user consent data from CMP for pubId: ', pubId);
		if(callback) callback('USP');
    }
    
    lookupIabUspConsent(success, failure);

		setTimeout(function() {
			failure("USP: Failed to retrieve user consent data from CMP, failure callback calling..");
		}, 100);
},

setUspConsentDataInLS = function(pubId, dataType, data){
	var pm;
	if(!isLocalStoreEnabled){
		//consoleLog('USP: local storage is not enabled');
		return
	}
	try{
		pm = win.localStorage.getItem(localStorageKeyForUSP);
	}catch(e){
		//consoleLog('USP: failed in reading from LS');
	}
	if(pm && typeof pm === 'string'){
		try{
			pm = JSON.parse(pm);
		}catch(e){
			pm = {};
		}
	}else{
		pm = {};
	}
	//consoleLog('USP: data from ls', pm);
	if(pm){
		if(!pm.hasOwnProperty(pubId)){
			pm[pubId] = {};
		}
		pm[pubId].t = (new Date()).getTime();
		pm[pubId][dataType] = data;
	}
	try{
		win.localStorage.setItem(localStorageKeyForUSP, JSON.stringify(pm));
		//consoleLog('data stored in local storage successfuly')
	}catch(e){
		//consoleLog('local storage reading exception');
	}
},

// public: this method is used by other files
getUserUspConsentDataFromLS = function(pubId){
	var data = {c:''};
	if(!isLocalStoreEnabled){
		//consoleLog('USP: LS is not enabled');
		return data;
	}
	var pm;
	try{
		pm = win.localStorage.getItem(localStorageKeyForUSP);
	}catch(e){
		//consoleLog('USP: failed in reading from LS');
	}
	if(pm && typeof pm === 'string'){
		try{
			pm = JSON.parse(pm);
		}catch(e){
			pm = {};
		}
		if(pm.hasOwnProperty(pubId)){
			var pmRecord = pm[pubId];
			if(pmRecord && pmRecord.c && pmRecord.t){
				// check timestamp of data and current; if older than a day do not use it
				if(pmRecord.t && parseInt(pmRecord.t) > ( ( new Date() ).getTime() -  ( 24 * 60 * 60 * 1000 ) ) ){
					data.c = pmRecord.c;
				}else{
					//consoleLog('USP: data in LS had no timestamp or expired timestamp.', pmRecord);
				}
			}
		}
	}
	return data;
}
		,MAX_PAGE_URL_LEN = 512  //max url length of page url
		,current_frame_url = win.location.href 
		,encodeIfRequired = function( s ){
			try{
				s = typeof s === "string" ? s : ''+s; //Make sure that this is string
				s = decodeURIC(s) === s ? encodeURIC(s) : s;
				if(s.indexOf('&') >=0 || s.indexOf('=') >=0 || s.indexOf('?') >=0 ){
					//fail safe approach , minimal check
					//still some characters left which needs encoding as it may break
					//DEBUG_START
					log('Still need encoding :' + s );
					//DEBUG_END
					s = encodeURIC(s);
				}
				return s;
			}catch(ex){
				return "";
			}
		}
		, getTopFrameOfSameDomain = function(cWin) {

			if(isSafari){
				return cWin;
			}

			try {
				if (cWin.parent && cWin.parent.document && cWin.location && cWin.parent.document != cWin.document){
				  return getTopFrameOfSameDomain(cWin.parent);
				}
			} catch(e) {}

			return cWin;
		}
		/**
		* Get common data 
		*  u  	- currentURL of the page
		*  r	- referal url of the page
		*  IE  - true if current brw
		*  IEV - version of internet explorer
		*  IE6 - true if IE6
		*/
		
	   , getCommonMeta = function(){
		   var  obj = {}
			   , frame
			   , ua
			   , index
			   , getPageUrlFromUrl = function(url){
				   var returnURL = url,
					   matches;

				   if(url.indexOf('show'+s_ads_pubmatic_com) > 0 || url.indexOf('showadsak.'+s_pubmatic_com) > 0){
					   matches = url.match(/pageURL=(.*?&)/);
					   if(matches && matches[1]){
						   returnURL =  matches[1];
						   returnURL =  returnURL.substr(0, returnURL.length -1 );
						   try{
							   returnURL = decodeURIC( returnURL );
						   }catch(e){}
					   }
				   }
				   return returnURL;
			   }
		   ;

		   //New Code: START
		   obj.u = "";
		   obj.r = "";

		   try{

			   if(win.kadpageurl == "INSERT_ENCODED_PAGEURL_HERE"){
				   win.kadpageurl = "";
			   }

			   frame = getTopFrameOfSameDomain(win);
			   obj.r = getPageUrlFromUrl( frame.refurl || frame.document.referrer || '' ).substr( 0, MAX_PAGE_URL_LEN );
			   obj.u = getPageUrlFromUrl( frame !== top && frame.document.referrer != ""  ? frame.document.referrer : frame.location.href).substr(0, MAX_PAGE_URL_LEN );

			   if(obj.u === obj.r){
				   obj.r = "";
			   }

			   obj.u = encodeIfRequired( obj.u );
			   obj.r = encodeIfRequired( obj.r );

		   }catch(e){}
		   //New Code: END

		   if(!obj.u){
			   try{
				   // decodeURIC can throw errors like Malformed URI
				   current_frame_url = (current_frame_url == decodeURIC(current_frame_url) ) ? current_frame_url : decodeURIC(current_frame_url);
			   }catch(e){}
			   current_frame_url = getPageUrlFromUrl(current_frame_url); //PageURL in URL
			   obj.u = encodeURIC( current_frame_url.substr( 0, MAX_PAGE_URL_LEN) );
		   }

		   // this block is added also here as there are some cases
		   if(obj.u === obj.r){
			   obj.r = "";
		   }

		   ua = nav.userAgent;
		   index = ua.indexOf('MSIE' ); 

		   /*
			   As per microsoft documentation best way to detect IE 
			   http://msdn.microsoft.com/en-us/library/ms537509(v=vs.85).aspx
			*/
		   obj.IE = nav.appName == 'Microsoft Internet Explorer'; //keep it loose i.e. ==(double equal)
					   
		   if( obj.IE  && index > 0){
			   //we are interested in major version only
			   //NOTE:sustr len 3 is necessory here as ie version can be like 10 , reading 1 char will give wrong result in case of version 10 or 11
			   obj.IEV = parseInt(  ua.substr(index+5, 3) );  
			   obj.IE6 = obj.IEV < 7 ; 
		   }

		   obj.it = win.kadinventorytype ? win.kadinventorytype : 0;

		   return obj;
	   }

	   , CommonMeta = PubMatic.m || ( PubMatic.m = getCommonMeta() )

	;

	// hpars contains the params from URL
	// showad.js #PIX hpars are collected from hash param string
	// user_sync.html hpars are collected from query string
	var hpars = getQueryParamsFromURL(location.href);
	// userSyncFlow.js reads only p param not partnerId hence copying value of partnerId if p is not set
	if(!hpars['p']){
		hpars['p'] = hpars['partnerId'] ? hpars['partnerId'] : 0;
	}

	pubId = hpars.p || pubId;

	//############

/*
	syncup pixeling functionality
		p; pubId
		s; siteId
		a; adId
		kdntuid = 1; adserver has not set kadusercookie, call the ucookiesetpug
		np = 1 ; do not do any pixeling
		fp = 1 ; do the pixeling forcefully
		mpc = 15; if fp=1, if mpc has value then it will be used as max pixel count or will be set to 10
		+Params used to make SPUG call in cookie-less
			u : user_id
			d : dc id
			cp : coppa complaent (0 or 1)
			sc : secure (0 or 1)
			rs : response type (0,1,2,3,4)
			os : os id
	user_sync functionality
		predirect; third party url to be fired
		userIdMacro; replace this macro with pmuid 
*/

var last_cookie_str
	, all_cookies
	, esc        = escape   //Don not use this but think before changing it
	, unesc      = unescape //Don not use this but think before changing it
	, UNLOAD_TASK_DONE = false
	//ALL [Default] dsp , audience , fcap
	//DSP    DSP pixeling only , no audience no fcap
	//AUD    Audience pixeling only , no audience no fcap
	, pixelTask  = "ALL"
	// cookies
	, c_ktpca			= 'KTPCACOOKIE'
	, c_user			= 'KADUSERCOOKIE'
	, c_kcch			= 'KCCH'
	, c_dpsync			= 'DPSync4'
	, c_dpsync_old			= 'DPSync3'
	, c_dcid			= 'PUBMDCID'
	, c_uscc			= 'USCC'
	, c_syncrtb			= 'SyncRTB4'
	, c_syncrtb_old		= 'SyncRTB3'
	, c_pmfreq_on		= 'PMFREQ_ON'
	, c_optout_1			= 'pmoo'
	, c_optout_2			= 'optout'
	, c_pi				= 'pi' // pixeling information
	, c_repi			= 'repi' // this cookie will be set in case of repixeling call is inititated
	, c_pubSyncExp		= 'pubsyncexp' // this cookie will be set in case of PugMaster, when there are no more pixels to execute for the publisher
	, isGDPRRTCF2Received    = false
	, isUSPReceived     = false

	/**
	 * Read all the cookies for current frame
	 * Store it as key(cookiename),value pair(cookievalue) in all_cookies
	 */
	, readCookies = function() {
		var   str = ""
			, parts 
			, len   
			, index = 0
			, values 
		;
		//NOTE:Few browsers throw an exception on trying to access document.cookie if TPC is disabled
		try{
			str = document.cookie;
		}catch(ex){
			//We don't have access to read the cookies i.e. third party cookie is disabled
		}

		if( last_cookie_str!= str ){
			parts 		= str.split("; ");//keep it  "; "( semicolon , space )
			len   		= parts.length	 ;
			all_cookies = []			 ;

			for( ; index < len ; index++ ){
				values = parts[ index ].split( "=" );
				all_cookies[ values[0] ] =  values[1] ;
			}

			last_cookie_str = str;
		}
	  }

	/**
	 * Get the cookie value with name 
	 * undefined is returned if cookie is not present
	 */
	, getCookie = function ( name ){
		readCookies();  // just to make sure we have latest value of cookies
		return all_cookies[name] ; // undefined is returned if not cookie is found , carefull
	  }
	/**
	 * Get all cookie which contains specified name , returns array of all matching cookies
	 * name 	   - name to look in cookie names
	 * stopOnFirst - optional  default value is false
	 * 				 if true then stop on first cookie match and return that cookie only 
	 */
	, getCookiesWithStringInName = function ( name ,stopOnFirst ){
		var   key						    
		    , value
		    , values 
		;
		readCookies();
		!stopOnFirst && ( values = [] );

		for(key in all_cookies){

			if( all_cookies.hasOwnProperty( key ) ){

				if( key.indexOf(name) >= 0 ){

					value = { n: key , v: ( all_cookies[ key ] || "" )};

					if(stopOnFirst){

						values = value;
						break;
					} else {
						values.push(value);
					}
				}
			}
		}
		return values; // incase of stopOnFirst , returns undefined

	  }

	, isSameSiteNoneRequired = (function(){
		// Refer: https://developer.chrome.com/docs/multidevice/user-agent/
		var ua = navigator.userAgent,
			chromePattern = 'Chrome/',
			chromePattrenLength = chromePattern.length			
			chromePatternIndex = ua.indexOf(chromePattern),
			chromeVersion = 0;
	
		if(chromePatternIndex > -1){
			chromeVersion = parseInt(ua.substr(chromePatternIndex + chromePattrenLength, 3));// 3 to cover case when chrome reaches versions above 100
			if(chromeVersion >= 67){
				return true;
			}
		} else {
			chromePattern = 'CriOS/';
			chromePattrenLength = chromePattern.length;
			chromePatternIndex = ua.indexOf(chromePattern);
			chromeVersion = 0;

			if(chromePatternIndex > -1){
				chromeVersion = parseInt(ua.substr(chromePatternIndex + chromePattrenLength, 3));// 3 to cover case when chrome reaches versions above 100
				if(chromeVersion >= 67){
					return true;
				}
			}
		}
	
		return false;
	})()

	// upon enabling following flag the cookies will be passed only with secure traffic
	, addSecureAttributeInCookie = true // enable this flag when we want to set Secure attribute in cookies

	/**
	 *  set the cookie 
	 *  name 			- name of the cookie
	 *  value 			- value to be stored
	 *  expires_in_days - expiry time in days
	 *  path			- path in the url 
	 *  domain			- domain it belongs
	 */
	, setCookie = function ( name, value, expires_in_days, path, domain) {

		var   expire_date 
			, str							
				;

		//expire_date = ( ( new Date() ).getTime() +  ( expires_in_days * 24 * 60 * 60 * 1000 ) ); 
		//24 * 60 * 60 * 100 = 86400000 =864e5 //TODO:YUI Compressort makes it again 86400000
		//TODO:make sure expires is integer ,it works on string but better to check
		expire_date = new Date( new Date().getTime() +  expires_in_days * 864e5 ); 

		str = name  + "=" + value 
			+ ";expires=" + expire_date.toGMTString()
			+ ";path="    + path
			+ ";domain="  + domain
			;

		if(addSecureAttributeInCookie && secure) str += ";secure";
		if(isSameSiteNoneRequired) str += ";SameSite=None";
		try{
			document.cookie = str;
		}catch(ex){}
		//DEBUG_START
		log('SetCookie:'+name+' value:'+value+' Domain:'+domain+' Expires:'+expires_in_days);
		log('Actual Value:'+getCookie(name));
		//DEBUG_END

	  }
	  
	/**
	 * Deletes the cookie
	 * name 	- name of the cookie
	 * path		- path in url ( eg. ads.pubmatic.com/Adserfver .. here /AdServer is path )
	 * domain 	- domain it belonds (eg. pubmatic.com )
	 */
	, deleteCookie = function ( name , path , domain ) {

		try{
			document.cookie = name + "=;expires=Thu, 01-Jan-1970 00:00:01 GMT" 										  
						  + ";path="    +   path  
						  + ";domain="  +   domain 
						  + ((addSecureAttributeInCookie && secure) ? ";secure": "") 
						  + (isSameSiteNoneRequired ? ";SameSite=None" : "");
		}catch(ex){}
		//DEBUG_START
		log('Deleted cookie :'+name);
		log('After Delete   :'+getCookie( name ));
		//DEBUG_END
	  } 

	/**
	 * Adds specified eventhandler on element
	 * target 	- dom element to add event handler
	 * type		- type of the event like click,load,beforeunload
	 * callback - callback method as event handler 
	 */
	, addEventListener = function( target , type , callback ) {
		if (target.addEventListener) {

			target.addEventListener(type,callback);
		} else if (target.attachEvent) {

			target.attachEvent('on'+type,callback);
		} else {

			target['on'+type] = callback;
		}
	  }

	/**
	 *  Get called on unload of the #PIX frame
	 *  Calls frequency cookie aggregation
	 *  Deletes DPPIX_ON,SYCUPPIX_ON,PMFREQ_ON if set
	 */
	, unloadFrameTasks = function(){
		//DEBUG_START
		var event=arguments[0];
		log('Performing unload task on ' + event.type)
		log(UNLOAD_TASK_DONE);
		//DEBUG_END
		var cookie,
			hasOptedOut = userHasOptedOut()
		;

		if(hasOptedOut == true){
			// delete cookies
			deleteCookie( c_user,		'/', s_pubmatic_com );
			deleteCookie( c_kcch,		'/', s_ads_pubmatic_com );
			deleteCookie( c_dpsync,		'/', s_ads_pubmatic_com );
			deleteCookie( c_dpsync_old,		'/', s_ads_pubmatic_com );
			deleteCookie( c_syncrtb,	'/', s_ads_pubmatic_com );
			deleteCookie( c_syncrtb_old,	'/', s_ads_pubmatic_com );			
			deleteCookie( c_dcid,		'/', s_pubmatic_com );
			deleteCookie( c_uscc,		'/', s_pubmatic_com );
			deleteCookie( c_pi,			'/', s_pubmatic_com );
			deleteCookie( c_repi,		'/', s_ads_pubmatic_com );
		}

		if(!UNLOAD_TASK_DONE){
			UNLOAD_TASK_DONE = true;
			deleteCookie( c_kcch , '/' , s_ads_pubmatic_com );
			//cookieProblemInChrome
			deleteCookie( c_pi,			'/', s_pubmatic_com );

			if( pixelTask === "ALL"  ) {
				cookie = getCookie( c_pmfreq_on );
				if( !( cookie && cookie != "") && hasOptedOut == false){
					//set the cookie for 2 secs or brefore page unload , to avoid parallel execution
					//cookieProblemInChrome = cookies expiry less than a day are not being set; so setting cookie expiry to a day 
					setCookie( c_pmfreq_on, "YES", 1 ,'/', s_ads_pubmatic_com );
					doFreq();
					deleteCookie( c_pmfreq_on , '/' , s_ads_pubmatic_com);
				}
			}
		}
	}

	, callSPugNew = function(pubId){

		var sPugURL = 'image4.pubmatic.com/AdServer/SPug?partnerID=',
			url
		;

		if( getCookie( c_user )){
			url = protocol + (secure ? 's' : '' ) + sPugURL + pubId;
			// GDPR in cookie push SPUG call
			url = url + "&gdpr=" + hpars.gdpr;
			url = url + "&gdpr_consent=" + hpars.gdpr_consent;
			url = url + "&us_privacy=" + hpars.us_privacy; // USP CCPA
			//Delaying SPUG Call for 2 seconds
			setTimeout(function(){
				var pmuid = getCookie( c_user ), element;
				if( pmuid && pmuid != "" ) {
					createDynamicScriptTag(url);
				}
			}, 2000);
		}
	}

	/**
	 * Initiates frequency cookie aggregation for camfreq and pubfreq
	 * Most of this logic copied from cutil.js
	 * 
	 * Addserver server sets cookie for each network creative like below
	 * 	pubfreq_[pubid]_[siteid]_[random]:[networkId]-[count]
	 * 	pubfreq_30624_27963_12345 : 160-1
	 * 	pubfreq_30624_27963_12346 : 1124-1
	 * 	pubfreq_30624_27963_12347 : 334-1
	 * 	pubfreq_30624_27963_14343 : 334-1
	 * 	pubfreq_30624_27963_12348 : 1194-1
	 * 	pubfreq_30624_27963_12349 : 159-1
	 * 	pubfreq_30624_27963_12340 : 425-1
	 * 
	 * ===> Aggregated by AdHelper script ===
	 *	pubfreq_[pubid]:[networkid]-[networkid_count]:[networkid]-[networkid_count]
	 *	pubfreq_30624:160-1:1124-1:334-2:1194-1:159-1:425-1
	 *
	 * Same for camfreq
	 */

	, doFreq = function(){
			var   cur_time  = 0
				, cookies
				, cam_list  = []
				, site_list = []
				, len
				, index
				, cookie
				, name
				, value
				, nlist
				, site_id
				, i
				, nlen
				, getCampaignCookieData = function( name, value){
					var   master_cookie
						, parts
						, plen
						, i
						, data
						, cam_freq_time
						, freq_list
						, nt_count
						, ex_time
						, freq
						, nt_matched
						, j
						;

					name 	= name.substr( name.indexOf('camfreq') + 7);
					master_cookie = name.indexOf('_') < 0;
					parts 	= value.split(":");
					plen 	= parts.length;

					freq_list  = [];
					nt_count   = 0 ;

					for(i = 0; i< plen; i++){
						data = parts[i].split('-');

						if(data.length === 2){
							cam_freq_time = data[1].split('_');

							if(cam_freq_time.length === 2){
								if(master_cookie && cur_time > 0 ){
									if(cur_time <= parseInt( cam_freq_time[1] )){
										freq_list[ nt_count++ ]= [ parseInt(data[0]), parseInt(cam_freq_time[0]) , parseInt(cam_freq_time[1])];
									}
								}else{
									freq_list[ nt_count++ ]= [ parseInt(data[0]), parseInt(cam_freq_time[0]) , parseInt(cam_freq_time[1])];
								}
							}else{
								freq_list[ nt_count++ ] = [ parseInt(data[0]), parseInt(data[1]), 0];
							}
						}

					}


					if( nt_count > 0 ){

						for( i = 0; i < nt_count; i++ ){

							freq  	 = freq_list[i];
							ex_time  = freq[2];

							plen = cam_list.length;
							nt_matched = false;
							for( j = 0; j < plen; j++){

								if( cam_list[j][0] === freq[0] ){
									nt_matched = true;
									cam_list[j][1] = cam_list[j][1] + freq[1];

									if(ex_time > cam_list[j][2]){
										cam_list[j][2] = ex_time;
									}

								}

							}
							if(!nt_matched){
								cam_list[ plen ] =freq;
							}

						}
					}

				  }
				, getFreqCookieData = function ( name , value ){
					//FREQ COOKIE DATA
					var   parts
						, plen
						, i
						, data
						, freq_list
						, nt_count
						, freq
						, nt_matched
						, j
						, site_id
						, site_index = -1
						, site_count
						, nt_list
						;

					site_id = name 	= name.substr( name.indexOf('pubfreq_') + 8 );
					i = name.indexOf('_');

					if( i >= 0){
						site_id = name.substring(0, i); //TODO:debug this
					}

					site_id = parseInt(site_id)


					parts 	= value.split(":");
					plen 	= parts.length;

					freq_list  = [];


					for(i = 0; i < plen; i++){
						data = parts[i].split('-');

						if(data.length === 2){
							freq_list[i] = [ parseInt(data[0]), parseInt(data[1]) ];
						}else{
							break;
						}
					}

					site_count = site_list.length;

					for(i = 0; i < site_count ;i++){
						if( site_list[i][0] === site_id){
							site_index = i;
							break;
						}
					}

					nt_count = freq_list.length;

					if(nt_count > 0){

						if( site_index < 0){
							site_list[ site_count ] = [ site_id, freq_list ]; //add new entry for this site
						}else{

							nt_list = site_list[ site_index ][1]; 

							for( i =0; i < nt_count; i++ ){
								freq = freq_list[i];
								plen = nt_list.length;
								nt_matched = false;

								for( j = 0; j < plen ; j++ ){

									if(nt_list[j][0] === freq[0] ){
										nt_list[j][1] = nt_list[j][1] + freq[1];
										nt_matched = true;
										break;//TODO:is this good
									}
								}
								if(!nt_matched){
									nt_list[ plen ] = freq;
								}
							}
						}
					}
					//END FREQ COOKIE DATA
				}
			;

			readCookies();
			//TODO:cookie is set as _curtime only , can be access directly 
			cookie = getCookiesWithStringInName( '_curtime' , true ); 
			cookie && ( cur_time = parseInt(cookie.v) );


			//process campaign cookie
			cookies = getCookiesWithStringInName( 'camfreq' );
			len = cookies.length;

			for(index = 0; index < len; index++){
				cookie = cookies[ index ];
				//get the cookie data
				getCampaignCookieData( cookie.n, cookie.v);
				//delete the cookie
				deleteCookie( cookie.n , '/' , s_pubmatic_com );
			}

			len = cam_list.length;
			name = []
			for(index = 0; index < len; index++){
				value = cam_list[index];
				name.push( value[0] + '-' + value[1]  + '_' + value[2] );
			}
			if( name.length > 0){
				//set master cookie for camfreq
				setCookie ( "camfreq" , name.join(":") , 4 , '/' , s_pubmatic_com ) ;
			}
			//end of process campaign cookie

			//process freq cookie
			cookies = getCookiesWithStringInName( 'pubfreq_' );
			len = cookies.length;

			for(index = 0; index < len; index++){
				cookie = cookies[ index ];
				//get the cookie data
				getFreqCookieData( cookie.n, cookie.v);
				//delete the cookie
				deleteCookie( cookie.n , '/' , s_pubmatic_com );
			}

			len = site_list.length;


			for(index = 0; index < len; index++){
				value   = site_list[index];
				nlist   = value[1];
				site_id = value[0];
				name = []
				nlen = nlist.length;
				for(i = 0; i < nlen ; i++){
					value = nlist[ i ];
					name.push( value[0] + '-' + value[1] );
				}
				if( name.length > 0 ) {
					//TODO:change expiry time to 3 days , discuss this with adserver team
					//set the master cookie
					setCookie ( "pubfreq_"+site_id , name.join(":") , 4 , '/' , s_pubmatic_com ) ;
				}

			}

			//end of process freq cookie
	  }//doFreq_End

	, sharePmUserIdInPostMessage = function(){		
		// Add allowed publisher ids here
		var allowedPublisherIds = { 157347: 1 };
		var pubId = parseInt(hpars.p || 0);
		var continueSharing = allowedPublisherIds[pubId] === 1 ? true : false;
		var pmuid = getCookie(c_user);
		
		if(pmuid && continueSharing){
			// send the message to parent window
			var postMessageData = {
				type: "ssp-user-sync",
				ssp: "PubMatic",
				ssp_uid: pmuid,
				eid: {
					source: "pubmatic.com",
					uids: [{
						id: pmuid,
						atype: 3
					}]
				}
			};
			// send the message to parent window

      var targetFrame = window;
      while (targetFrame !== window.top) {
        try {
          targetFrame = targetFrame.parent;
        } catch (e) {
          break;
        }
      }

      if (targetFrame) {
        targetFrame.postMessage(JSON.stringify(postMessageData), '*');
      }
		}
	}

	// functionality from userSync.html  
	, userSyncPredirectHandeling = function(dontWrite){
		var	thirdpartyURL = hpars['predirect'],
			userIdMacro = hpars['userIdMacro'],
			pmuid = getCookie(c_user),
			url = protocol + (secure ? 's' : '' ) + "image4.pubmatic.com/AdServer/SPug?o=1"
		;

		// if we have user id to share
		if( pmuid ){
			if(thirdpartyURL){
				try{ //decodeURIC can throw exception on malformed URI
					thirdpartyURL = decodeURIC( thirdpartyURL );
				}catch(e){}

				if( pmuid ){
					if( userIdMacro && thirdpartyURL.indexOf( userIdMacro ) ){
						thirdpartyURL = thirdpartyURL.replace( userIdMacro , pmuid );
					}else{
						thirdpartyURL = thirdpartyURL + pmuid;
					}
					createAndInsertHiddenFrameAsync(thirdpartyURL);
				} else {
					// As ktpca is present and pmuid is not; 
					// so we need to initiate predirect url after some delay
					setTimeout(function(){
						userSyncPredirectHandeling();
					}, 1500);
				}
			}

			// Here we will push the userID in postMessage to parent window BUT only for selected publishers
			sharePmUserIdInPostMessage();

		}else{// if third party cookies are disabled
			//new code
			//image4.pubmatic.com/AdServer/SPug?o=1&u&p=&s=&d=&cp=&sc=&rs=&os=
			if(hpars.p && hpars.fp && hpars.rs && hpars.u){ // if partnerid is not passed then call should not be trigered.
        url += "&" + current_hash;
				createAndInsertHiddenFrameAsync(url);
			}
		}
	}

	, doRepixeling = function(){
		// If IE < 11 then CommonMeta.IE == true, we do not want to run repixeling feature on IE < 11
		// Disable Repixeling on IE11 and Edge as well
		if(getCookie(c_user)){
			if(!CommonMeta.IE && nav.userAgent.indexOf("rv:11") == -1 && nav.userAgent.indexOf("Edge") == -1){
				//cookieProblemInChrome 2 / (24*60*60) ==> 1
				//setCookie( c_repi, 1, 1, '/', s_ads_pubmatic_com );				
				unloadFrameTasks();
				initUserSyncFlow(true);
			}
		}						
	}

	, userHasOptedOut = function(){

		var cookie_1,
			cookie_2
		;
		cookie_1 = getCookie( c_optout_1 ); //check if user has opted out for 
		cookie_2 = getCookie( c_optout_2 ); //check if user has opted out for 

		if( cookie_1 !== "true" && cookie_1 !== "TRUE" && cookie_2 !== "true" && cookie_2 !== "TRUE" ){
			return false;
		}

		return true;
	}

	, initPugMasterCall = function(isRepixeling){
		// always pass kdntuid=1
		var pixelingServerURL = "image6.pubmatic.com/AdServer/PugMaster?sec=1&async=1&kdntuid=1&rnd="+Math.floor( Math.random()*100000001 );
		pixelingServerURL 	+=	"&p="		+ pubId
							+	"&s="		+ siteId
							+	"&a="		+ adId
							+	"&ptask=" 	+ pixelTask
							+	"&np=" 		+ (hpars.np || "0")
							+	"&fp=" 		+ (hpars.fp || "0")
							+	"&rp=" 		+ (isRepixeling ? "1" : "0")
							+	"&mpc="		+ (hpars.mpc || "0")
							+	"&spug=1"
							+	"&coppa="	+ (hpars.coppa || "0")
							+	"&gdpr="	+ hpars.gdpr
							+	"&gdpr_consent="	+ hpars.gdpr_consent
							+	"&us_privacy="		+ hpars.us_privacy // USP CCPA
		;

		//cookieProblemInChrome save expiry timestamp in cookie
		if((getCookie(c_pubSyncExp)||0) <= (new Date() ).getTime()){
			// using kcch only to avoid multiple calls from one page
			if(!getCookie(c_kcch)){
				// Add Locks
				//set cookie for 30 seconds only to avoid race condition through another #PIX
				//PugMaster_100 30 => 15
				//cookieProblemInChrome 15 / (24*60*60)  ==> 1
				setCookie( c_kcch, "YES", 1,'/', s_ads_pubmatic_com );

				//cookieProblemInChrome delete this cookie after 15 seconds
				setTimeout(function(){
					deleteCookie( c_kcch, '/', s_ads_pubmatic_com );
				}, 3000);

				createDynamicScriptTag(protocol+pixelingServerURL);
			}else{
				//userSyncPredirectHandeling();
				// we can implement it better with async code 
				setTimeout(function(){
					doRepixeling();
				}, 3000);
			}
		}else{
			userSyncPredirectHandeling();
		}
	}

	, initUserSyncFlow = function(isRepixeling){
		// hpars contains the params from URL
		// showad.js #PIX hpars are collected from hash param string
		// user_sync.html hpars are collected from query string

		//ALL [Default] dsp , audience , fcap
		//DSP    DSP pixeling only , no audience no fcap
		//AUD    Audience pixeling only , no audience no fcap
		pixelTask = hpars.ptask || "ALL" ;
		pubId  = parseInt( hpars.p || 0 );
		// if pubId is zero then try to get pubId from pp cookie
		if(pubId == 0){
			pubId = parseInt(getCookie('pp')) || 0;
		}
		siteId = parseInt( hpars.s || 0 );
		adId   = parseInt( hpars.a || 0 );

		// TODO: Later move GDPR, USP CCPA logic out

		// GDPR in #PIX flow
		//consoleLog('#PIX FLOW started ----------------');
		// Commenting getUserConsentDataFromCMP as initUserSyncFlow is getting called after receiving response of getUserConsentDataFromCMP(pubId)
		// getUserConsentDataFromCMP(pubId);
		var gdprData = getUserConsentDataFromLS(pubId);
		hpars.gdpr_consent = gdprData && gdprData.c ? gdprData.c : (hpars.gdpr_consent || '');
		hpars.gdpr = (gdprData && typeof gdprData.g === 'string') ? gdprData.g : (hpars.gdpr || '0');

		// USP CCPA
		// Commenting getUserUspConsentDataFromCMP as initUserSyncFlow is getting called after receiving response of getUserUspConsentDataFromCMP(pubId)
		// getUserUspConsentDataFromCMP(pubId);
		var uspData = getUserUspConsentDataFromLS(pubId);
		hpars.us_privacy = uspData && uspData.c ? uspData.c : hpars.us_privacy || '';

		//TODO:think on this
		//document.domain = s_pubmatic_com;

		var userOptedOut = userHasOptedOut();
		//consoleLog('#PIX: userOptedOut', userOptedOut);
		if(userOptedOut == false){
			//consoleLog('#PIX: setting KTPCACOOKIE');
			// check if third party cookies are enabled
			setCookie( c_ktpca, 'YES', 90 , '/', s_pubmatic_com );
		}

		// if user has opted out then
		// 		do not do pixeling
		// 		do not create userID
		if( userOptedOut ==  false && getCookie( c_ktpca ) === "YES" ){
			//consoleLog('#PIX: Cookies are enabled, userOptedOut:', userOptedOut);
			//consoleLog('#PIX: Delete KTPCACOOKIE');
			// delete ktpca cookie immediately
			deleteCookie( c_ktpca, '/', s_pubmatic_com );			
			initPugMasterCall(isRepixeling);
		}else{
			//consoleLog('#PIX: Third party cookies are disabled, or user has opted out:', userOptedOut);
			// if third party cookies are disabled
			// functionality from userSync.html
			//userSyncPredirectHandeling(); // this function now will be called by PubMatic._uidCB
      userSyncPredirectHandeling(); // this function now will be called by PubMatic._uidCB
		}
	}
;

// function to be called on completing request
PubMatic.PugMasterCallback = function(doCallSPug, doRePixelingFlag, noPixelsSelected){
	// delete the lock cookie after 2 seconds to have some gap between two syncup calls	
	setTimeout(function(){
		deleteCookie( c_kcch, '/', s_ads_pubmatic_com );
	}, 2000);

	if(doCallSPug || (!hpars.SPug && Math.floor(Math.random()*100) <= 10) ){
		callSPugNew(pubId);
	}

	if(doRePixelingFlag){
		setTimeout(function(){
			doRepixeling();
		}, 30000);
	}

	if(noPixelsSelected){
		// avoid call to PugMaster for next 6 hours
		setCookie( c_pubSyncExp, (new Date() ).getTime()+(60*60*6*1000), 1, '/', s_ads_pubmatic_com );
	}

	// functionality from userSync.html
	userSyncPredirectHandeling();
};

PubMatic.loadAsyncIframePixel = function(url){
	createAndInsertHiddenFrameAsync(url);
};

PubMatic.loadAsyncImagePixel = function(url){
	createAndInsertHiddenImageAsync(url);
};

PubMatic.loadAsyncScriptPixel = function(url){
	createDynamicScriptTag(url);
};

var receivedConsentData = function(value) {
	if(value === 'GDPRTCF2') isGDPRRTCF2Received = true;
	else isUSPReceived = true;

	// Received GDPR & USP response now call initUserSyncFlow;
	if(isGDPRRTCF2Received && isUSPReceived) initUserSyncFlow();	
}

var getUserGdprAndUspConsent = function() {
	var publisherId  = parseInt( hpars.p || 0 );
	// if pubId is zero then try to get pubId from pp cookie
	if(publisherId == 0){
		publisherId = parseInt(getCookie('pp')) || 0;
	}
	// GDPR
	getUserConsentDataFromCMP(publisherId, receivedConsentData);
	// USP CCPA
	getUserUspConsentDataFromCMP(publisherId, receivedConsentData);
};

// Get user gdpr consent and usp first and then call initUserSync flow.
getUserGdprAndUspConsent();
// Commenting initUserSyncFlow call calling it after getting response of getUserConsentDataFromCMP && getUserUspConsentDataFromCMP
// initUserSyncFlow();
// addEventListener( win , "unload" , unloadFrameTasks );
// addEventListener( win , "beforeunload" , unloadFrameTasks );

// Remove the unload event as chrome deprecated and it blocks the back/forward cache functionality.
// Instead added visibilityState and pagehide event as recommended.
if ('onvisibilitychange' in win.document) {
	addEventListener(win.document, "visibilitychange", function () {
		if (win.document.visibilityState === 'hidden') {
			unloadFrameTasks();
		}
	});
}
if ('onpagehide' in win) {
	addEventListener(win, "pagehide", unloadFrameTasks);
} else {
	addEventListener(win, "beforeunload", unloadFrameTasks);
}
//############


	// customJSHandler(hpars, 'user_sync.html');

})();