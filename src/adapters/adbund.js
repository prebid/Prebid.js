var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');

var adBundAdapter = function adBundAdapter() {
	var bidAPI = '//52.66.158.121:8888/prebid/ad/get';

    function _stringify (param) {
        var result = [];
        var key;
        for (key in param) {
            if (param.hasOwnProperty(key)) {
                result.push(key + '=' + encodeURIComponent(param[key]));
            }
        }
        return result.join('&');
    }

    function _jsonp (server, param, handler) {
        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        var callbackName = 'jsonp_' + (new Date()).getTime().toString(36);

        param[param.jsonp] = callbackName;
        global[callbackName] = function (data) {
            handler && handler(data);
            try {
                global[callbackName] = undefined;
                script.parentNode.removeChild(script);
            } catch (e) {}
        };

        script.charset = 'utf-8';
        script.src = server + '?' + _stringify(param);
        head.insertBefore(script, head.lastChild);
    }

	function _requestBids (bid) {
		var param = Object.assign({}, bid.params);
		param.sizes = JSON.stringify(param.sizes || bid.sizes);
		param.jsonp = 'callback';
		_jsonp(bidAPI, param, function (data) {
			var response;
			if (data && data.cpm) {
				response = bidfactory.createBid(1);
				response.bidderCode = 'adbund';
				Object.assign(response, data);
			} else {
				response = bidfactory.createBid(2);
			}
			bidmanager.addBidResponse(bid.placementCode, response);
		});
	}

	function _callBids(params) {
		(params.bids || []).forEach(function (bid) {
			_requestBids(bid);
		});
	}

    return {
        callBids: _callBids
    };
};

module.exports = adBundAdapter;