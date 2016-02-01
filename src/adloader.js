var utils = require('./utils');
//add a script tag to the page, used to add /jpt call to page
exports.loadScript = function(tagSrc, callback) {
	if(!tagSrc){
		utils.logError('Error attempting to request empty URL', 'adloader.js:loadScript');
		return;
	}
	var jptScript = document.createElement('script');
	jptScript.type = 'text/javascript';
	jptScript.async = true;


	// Execute a callback if necessary
	if (callback && typeof callback === "function") {
		if (jptScript.readyState) {
			jptScript.onreadystatechange = function() {
				if (jptScript.readyState == "loaded" || jptScript.readyState == "complete") {
					jptScript.onreadystatechange = null;
					callback();
				}
			};
		} else {
			jptScript.onload = function() {
				callback();
			};
		}
	}

	//call function to build the JPT call
	jptScript.src = tagSrc;

	//add the new script tag to the page
	var elToAppend = document.getElementsByTagName('head');
	elToAppend = elToAppend.length ? elToAppend : document.getElementsByTagName('body');
	if (elToAppend.length) {
		elToAppend = elToAppend[0];
		elToAppend.insertBefore(jptScript, elToAppend.firstChild);
	}
};

//track a impbus tracking pixel
//TODO: Decide if tracking via AJAX is sufficent, or do we need to
//run impression trackers via page pixels?
exports.trackPixel = function(pixelUrl) {
	if (!pixelUrl) {
		throw new TypeError('pixelUrl is required');
	}
	//add a cachebuster so we don't end up dropping any impressions
	(new Image()).src = pixelUrl + '&rnd=' + Math.random() * 100;
};
