window.pbjs.eventQue = window.pbjs.eventQue || [];

var utils = require('./utils.js');
var CONSTANTS = require('./constants.json');
var GoogleAnalytics = require('./analytics/google');
var _analyticsRegistry = {};
var objectType_undefined = 'undefined';



exports.load = function(analyticsArr) {
	for (var i = 0; i < analyticsArr.length; i++) {
		var analytics = analyticsArr[i];
		if (analytics.name && _analyticsRegistry[analytics.name]) {
			utils.logMessage('load analytics --- ' + analytics.name);
			var currentAnalytics = _analyticsRegistry[analytics.name];
			currentAnalytics.load(analytics.params);
		}
	}
};

exports.call = function(analyticsArr){
	
	for (var i = 0; i < analyticsArr.length; i++) {
		var analytics = analyticsArr[i];

		if (analytics.name && _analyticsRegistry[analytics.name]) {
			utils.logMessage('call event --- ' + analytics.name);
			var currentAnalytics = _analyticsRegistry[analytics.name];
			currentAnalytics.call();
		}
	}
};

//register analytics adaptor
exports.registerAnalyticsAdaptor = function(analyticsAdaptor, analyticsCode){
	try{
		if (analyticsAdaptor && analyticsCode) {
			if (typeof analyticsAdaptor.load === CONSTANTS.objectType_function) {
				_analyticsRegistry[analyticsCode] = analyticsAdaptor;
			} else {
				utils.logError('Analytics error for analytics code: ' + analyticsCode + 'analytics must implement a load() function');
			}
		} else {
			utils.logError('analyticsAdaptor or analyticsCode not specified');
		}
	}
	catch(e){
		utils.logError('Error registering analytics adapter : ' + e.message);
	}
};


pbjs.eventQue.push = function(cmd){
	cmd.call();
};

exports.processEventQue = function(analyticsCode){
	for (var i = 0; i < pbjs.eventQue[analyticsCode].length; i++) {
		if (typeof pbjs.eventQue[analyticsCode][i].called === objectType_undefined) {
			pbjs.eventQue[analyticsCode][i].call();
			pbjs.eventQue[analyticsCode][i].called = true;
		}
	}
}

// Register the bid adaptors here
this.registerAnalyticsAdaptor(GoogleAnalytics(), 'google');