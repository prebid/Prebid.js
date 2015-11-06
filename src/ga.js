/**
 * ga.js - analytics adapter for google analytics 
 */

var events = require('./events');

var analyticsQueue = [];
var gaGlobal = null;
var enableCheck = true;

exports.enableAnalytics = function(ga){
	gaGlobal = ga;

	var category = 'Prebid.js Bids';

	//bidRequests 
	events.on('bidRequest', function(adunit, bid){
		analyticsQueue.push(function(){
			gaGlobal('send','event',category,'Requests',bidder,1);
		});
		checkAnalytics();
	});

	//bidResponses 
	events.on('bidResponse', function(adunit, bid){
		analyticsQueue.push(function(){
			var cpmCents = convertToCents(bid.cpm),
			bidder = bid.bidder;
			gaGlobal('send','event',category,'Bids',bidder, cpmCents);
			gaGlobal('send','event', category, 'Bid Load Time', bidder, bid.timeToRespond);
			if(typeof bid.timeToRespond !== objectType_undefined){
				var dis = getLoadTimeDistribution(bid.timeToRespond);
        		gaGlobal('send', 'event', 'Prebid.js Load Time Distribution', dis, bidder, 1);
			}
			if(bid.cpm > 0){
	    		analyticsQueue.push(function(){
	        		var cpmDis = getCpmDistribution(bid.cpm);
	        		gaGlobal('send', 'event', 'Prebid.js CPM Distribution', cpmDis, bidder, 1);
	        	});
	    	}
		});
		checkAnalytics();
	});

	//bidTimeouts 
	events.on('bidTimeout', function(adunit, bid){
		if(Number(bid.timeout) > 0){
    		analyticsQueue.push(function(){
    	 	gaGlobal('send','event',category,'Timeouts',bidder);
    		});
    	}
		checkAnalytics();
	});
   
	//wins
	events.on('bidWon', function(adunit, bid){
		if(bid.win > 0 ){
	    	analyticsQueue.push(function(){
	       		gaGlobal('send','event', category,'Wins', bidder, cpmCents ); 
	       	});
    	}
		checkAnalytics();
	});

};


function checkAnalytics(){
	if(enableCheck && typeof gaGlobal === 'function'){
		for(var i = 0; i < analyticsQueue.length; i++){
			analyticsQueue[i].call();
		}
		analyticsQueue.push = function(fn){
			fn.call();
		};
		enableCheck = false;
	}

}


function convertToCents(dollars){
	if(dollars){
		return Math.floor(dollars * 100);  
	}
	return 0;
}

function getLoadTimeDistribution(time){
	var distribution;
	if(time >=0 && time <200){
		distribution = '0-200ms';
	}else if(time >=200 && time <300){
		distribution = '200-300ms';
	}else if(time >=300 && time <400){
		distribution = '300-400ms';
	}else if(time >=400 && time <500){
		distribution = '400-500ms';
	}else if(time >=500 && time <600){
		distribution = '500-600ms';
	}else if(time >=600 && time <800){
		distribution = '600-800ms';
	}else if(time >=800 && time <1000){
		distribution = '800-1000ms';
	}else if(time >=1000 && time <1200){
		distribution = '1000-1200ms';
	}else if(time >=1200 && time <1500){
		distribution = '1200-1500ms';
	}else if(time >=1500 && time <2000){
		distribution = '1500-2000ms';
	}else if(time >=2000){
		distribution = '2000ms above';
	}

	return distribution;
}


function getCpmDistribution(cpm){
	var distribution;
	if(cpm >=0 && cpm <0.5){
		distribution = '$0-0.5';
	}else if(cpm >=0.5 && cpm <1){
		distribution = '$0.5-1';
	}else if(cpm >=1 && cpm <1.5){
		distribution = '$1-1.5';		
	}else if(cpm >=1.5 && cpm <2){
		distribution = '$1.5-2';		
	}else if(cpm >=2 && cpm <2.5){
		distribution = '$2-2.5';		
	}else if(cpm >=2.5 && cpm <3){
		distribution = '$2.5-3';		
	}else if(cpm >=3 && cpm <4){
		distribution = '$3-4';		
	}else if(cpm >=4 && cpm <6){
		distribution = '$4-6';		
	}else if(cpm >=6 && cpm <8){
		distribution = '$6-8';		
	}else if(cpm >=8){
		distribution = '$8 above';
	}
	return distribution;
}
