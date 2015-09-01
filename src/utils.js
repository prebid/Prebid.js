var CONSTANTS = require('./constants.json');
var objectType_function = 'function';
var objectType_undefined = 'undefined';
var objectType_object = 'object';
var objectType_string = 'string';
var objectType_number = 'number';

var _loggingChecked = false;

var _lgPriceCap = 5.00;
var _mgPriceCap = 10.00;
var _hgPriceCap = 20.00;

var t_Arr = 'Array',
    t_Str = 'String',
    t_Fn = 'Function',
    hasOwnProperty = Object.prototype.hasOwnProperty,
    slice = Array.prototype.slice;

/*
 *   Substitues into a string from a given map using the token
 *   Usage
 *   var str = 'text %%REPLACE%% this text with %%SOMETHING%%';
 *   var map = {};
 *   map['replace'] = 'it was subbed';
 *   map['something'] = 'something else';
 *   console.log(replaceTokenInString(str, map, '%%')); => "text it was subbed this text with something else"
 */
exports.replaceTokenInString = function(str, map, token) {
  this._each(map, function (value, key) {
    value = (value === undefined) ? '' : value;

    var keyString = token + key.toUpperCase() + token,
        re = new RegExp(keyString, 'g');

    str = str.replace(re, value);
  });
  return str
};

/* utility method to get incremental integer starting from 1 */
var getIncrementalInteger = (function() {
	var count = 0;
	return function() {
		count++;
		return count;
	};
})();

function _getUniqueIdentifierStr() {
	return getIncrementalInteger() + Math.random().toString(16).substr(2);
}

//generate a random string (to be used as a dynamic JSONP callback)
exports.getUniqueIdentifierStr = _getUniqueIdentifierStr;

exports.getBidIdParamater = function(key, paramsObj) {
	if (paramsObj && paramsObj[key]) {
		return paramsObj[key];
	}
	return '';
};

exports.tryAppendQueryString = function(existingUrl, key, value) {
	if (value) {
		return existingUrl += key + '=' + encodeURIComponent(value) + '&';
	}
	return existingUrl;
};

//parse a GPT-Style General Size Array or a string like "300x250" into a format
//suitable for passing to a GPT tag, may include size and/or promo sizes
exports.parseSizesInput = function(sizeObj) {
	var sizeQueryString;
	var parsedSizes = [];

	//if a string for now we can assume it is a single size, like "300x250"
	if (typeof sizeObj === objectType_string) {
		//multiple sizes will be comma-separated
		var sizes = sizeObj.split(',');
		//regular expression to match strigns like 300x250
		//start of line, at least 1 number, an "x" , then at least 1 number, and the then end of the line
		var sizeRegex = /^(\d)+x(\d)+$/i;
		if (sizes) {
			for (var curSizePos in sizes) {
				if (hasOwn(sizes, curSizePos) && sizes[curSizePos].match(sizeRegex)) {
					parsedSizes.push(sizes[curSizePos]);
				}
			}
		}
	} else if (typeof sizeObj === objectType_object) {
		var sizeArrayLength = sizeObj.length;
		//don't process empty array
		if (sizeArrayLength > 0) {
			//if we are a 2 item array of 2 numbers, we must be a SingleSize array
			if (sizeArrayLength === 2 && typeof sizeObj[0] === objectType_number && typeof sizeObj[1] === objectType_number) {
				parsedSizes.push(this.parseGPTSingleSizeArray(sizeObj));
			} else {
				//otherwise, we must be a MultiSize array
				for (var i = 0; i < sizeArrayLength; i++) {
					parsedSizes.push(this.parseGPTSingleSizeArray(sizeObj[i]));
				}

			}
		}
	}


	//combine string into proper querystring for impbus
	var parsedSizesLength = parsedSizes.length;
	if (parsedSizesLength > 0) {
		//first value should be "size"
		sizeQueryString = 'size=' + parsedSizes[0];
		if (parsedSizesLength > 1) {
			//any subsequent values should be "promo_sizes"
			sizeQueryString += '&promo_sizes=';
			for (var j = 1; j < parsedSizesLength; j++) {
				sizeQueryString += parsedSizes[j] += ',';
			}
			//remove trailing comma
			if (sizeQueryString && sizeQueryString.charAt(sizeQueryString.length - 1) === ',') {
				sizeQueryString = sizeQueryString.slice(0, sizeQueryString.length - 1);
			}
		}
	}

	return sizeQueryString;

};

//parse a GPT style sigle size array, (i.e [300,250])
//into an AppNexus style string, (i.e. 300x250)
exports.parseGPTSingleSizeArray = function(singleSize) {
	//if we aren't exactly 2 items in this array, it is invalid
  if (this.isArray(singleSize) && singleSize.length === 2 && (!isNaN(singleSize[0]) && !isNaN(singleSize[1]))) {
		return singleSize[0] + 'x' + singleSize[1];
	}
};

exports.getTopWindowUrl = function() {
	try {
		return window.top.location.href;
	} catch (e) {
		return window.location.href;
	}
};

exports.logMessage = function(msg) {
	if (debugTurnedOn() && hasConsoleLogger()) {
		console.log('MESSAGE: ' + msg);
	}
};

function hasConsoleLogger() {
	return (window.console && window.console.log);
}
exports.hasConsoleLogger = hasConsoleLogger;

var errLogFn = (function (hasLogger) {
  if (!hasLogger) return '';
  return window.console.error ? 'error' : 'log';
}(hasConsoleLogger()));

var debugTurnedOn = function() {
	if (pbjs.logging === false && _loggingChecked === false) {
		pbjs.logging = !!getParameterByName(CONSTANTS.DEBUG_MODE);
		_loggingChecked = true;
	}

	if (pbjs.logging) {
		return true;
	}
	return false;

};
exports.debugTurnedOn = debugTurnedOn;

exports.logError = function(msg, code, exception) {
	var errCode = code || 'ERROR';
	if (debugTurnedOn() && hasConsoleLogger()) {
    console[errLogFn].call(console, errCode + ': ' + msg, exception || '');
	}
};

exports.createInvisibleIframe = function _createInvisibleIframe() {
	var f = document.createElement('iframe');
	f.id = _getUniqueIdentifierStr();
	f.height = 0;
	f.width = 0;
	f.border = '0px';
	f.hspace = '0';
	f.vspace = '0';
	f.marginWidth = '0';
	f.marginHeight = '0';
	f.style.border = '0';
	f.scrolling = 'no';
	f.frameBorder = '0';
	f.src = 'about:self';
	f.style = 'display:none';
	return f;
};

/*
 *   Check if a given paramater name exists in query string
 *   and if it does return the value
 */
var getParameterByName = function(name) {
	var regexS = '[\\?&]' + name + '=([^&#]*)',
		regex = new RegExp(regexS),
		results = regex.exec(window.location.search);
	if (results === null) {
		return '';
	}
	return decodeURIComponent(results[1].replace(/\+/g, ' '));
};

exports.getPriceBucketString = function(cpm) {
	var low = '',
		med = '',
		high = '',
		cpmFloat = 0,
		returnObj = {
			low: low,
			med: med,
			high: high
		};
	try {
		cpmFloat = parseFloat(cpm);
		if (cpmFloat) {
			//round to closet .5
			if (cpmFloat > _lgPriceCap) {
				returnObj.low = _lgPriceCap.toFixed(2);
			} else {
				returnObj.low = (Math.floor(cpm * 2) / 2).toFixed(2);
			}

			//round to closet .1
			if (cpmFloat > _mgPriceCap) {
				returnObj.med = _mgPriceCap.toFixed(2);
			} else {
				returnObj.med = (Math.floor(cpm * 10) / 10).toFixed(2);
			}

			//round to closet .01
			if (cpmFloat > _lgPriceCap) {
				returnObj.high = _lgPriceCap.toFixed(2);
			} else {
				returnObj.high = (Math.floor(cpm * 100) / 100).toFixed(2);
			}

		}

	} catch (e) {
		this.logError('Exception parsing CPM :' + e.message);
	}
	return returnObj;

};

/**
 * This function validates paramaters. 
 * @param  {object[string]} paramObj          [description]
 * @param  {string[]} requiredParamsArr [description]
 * @return {bool}                   Bool if paramaters are valid
 */
exports.hasValidBidRequest = function(paramObj, requiredParamsArr){

	for(var i = 0; i < requiredParamsArr.length; i++){
		var found = false;

    this._each(paramObj, function (value, key) {
      if (key === requiredParamsArr[i]) {
        found = true;
      }
    });

		if(!found){
			this.logError('Params are missing for adapter. One of these required paramaters are missing: ' + requiredParamsArr);
			return false;
		}
	}

	return true;
};

// Handle addEventListener gracefully in older browsers
exports.addEventHandler = function(element, event, func) {
		if (element.addEventListener) {
			element.addEventListener(event, func, true);
		} else if (element.attachEvent) {
			element.attachEvent('on' + event, func);
		}
	};
  /**
   * Return if the object is of the
   * given type.
   * @param {*} object to test
   * @param {String} _t type string (e.g., Array)
   * @return {Boolean} if object is of type _t
   */
exports.isA = function(object, _t) {
    return toString.call(object) === '[object ' + _t + ']';
};

exports.isFn = function (object) {
  return this.isA(object, t_Fn);
};

exports.isStr = function (object) {
  return this.isA(object, t_Str);
};

exports.isArray = function (object) {
  return this.isA(object, t_Arr);
};

/**
 * Return if the object is "empty";
 * this includes falsey, no keys, or no items at indices
 * @param {*} object object to test
 * @return {Boolean} if object is empty
 */
exports.isEmpty = function(object) {
    if (!object) return true;
    if (this.isArray(object) || this.isStr(object)) return !(object.length > 0);
    for (var k in object) {
      if (hasOwnProperty.call(object, k)) return false;
    }
    return true;
  };

  /**
   * Iterate object with the function
   * falls back to es5 `forEach`
   * @param {Array|Object} object
   * @param {Function(value, key, object)} fn
   */
exports._each = function(object, fn) {
    if (this.isEmpty(object)) return;
    if (this.isFn(object.forEach)) return object.forEach(fn);

    var k = 0,
        l = object.length;

    if (l > 0) {
      for (; k < l; k++) fn(object[k], k, object);
    } else {
      for (k in object) {
        if (hasOwnProperty.call(object, k)) fn(object[k], k, object);
      }
    }
  };
