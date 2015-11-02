var adloader = require('../adloader.js');
var utils = require('../utils.js');
var analyticsmanager = require('../analyticsmanager.js');



var GoogleAnalytics = function GoogleAnalytics(){
	var isCalled = false;
	var isLoaded = false;
	var code = 'google';

	function load(params){
		//load js
		adloader.loadScript('//www.google-analytics.com/analytics.js',function(){
			utils.logMessage('GoogleAnalytics is loaded');

            window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
            ga('create', params.id, 'auto');
            ga('send', 'pageview');

            //process queue
            call();
            
		});

	}

	function call(){
		utils.logMessage('GoogleAnalytics event called.');	
        setEventProcess();
		analyticsmanager.processEventQue(code);
	}

	function setEventProcess(){

		//generateAnalyticsEvents
		var bidResponse = pbjs.getBidResponses();

		pbjs.eventQue[code] = pbjs.eventQue[code] || [];
		pbjs.eventQue[code].push(function(){
			ga('send', 'event', 'Prebid.js Bids', 'Requests', 'appnexus', 123);
			ga('send', 'event', 'Prebid.js Bids', 'Requests', 'amazon', 123);
			utils.logMessage('event called ' + code);
		});
	}

	return {
		load: load,
		call: call
	};
};
module.exports = GoogleAnalytics;