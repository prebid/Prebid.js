import { ajaxBuilder } from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';

const TIMEOUT = 500;

/*
    GeoDetection module is to be used to get the region information.
    This needs to be called with the URL of API and path of region (e.g. location.data.region)
*/
$$PREBID_GLOBAL$$.detectLocation = function(URL, callback) {
    getRegion = function(loc) {
        try {
            let location = JSON.parse(loc);
            callback(location);
        } catch(e) {
            console.log("Location data is expected to be an object");
            callback({error: e});
        }
    }

    try {
        ajaxBuilder(TIMEOUT)(
            URL,
            { success: getRegion, error: function(e) {callback({error: e})} },
            null,
            { contentType: 'application/x-www-form-urlencoded', method: 'GET' }
        );
    } catch(e) {
        callback({error: e});
    }
}

var BIDDER_CODE = 'pubmatic';
var storage = getStorageManager({bidderCode: BIDDER_CODE});

$$PREBID_GLOBAL$$.getDataFromLocalStorage = function(key, expiry) {
	try {
		var storedObject = storage.getDataFromLocalStorage(key);
		if(storedObject) {
			var createdDate = JSON.parse(storedObject).createdDate;
			let currentDate = new Date().valueOf();
			const diff = Math.abs(currentDate - createdDate);
			if (diff > expiry) {
			  storage.removeDataFromLocalStorage(key);
			  return undefined;
			}
			return storedObject;	
		}
		return undefined;
	} catch(e) {
		return undefined;
	}
}

$$PREBID_GLOBAL$$.setAndStringifyToLocalStorage = function(key, object) {
	try {
	  object.createdDate = new Date().valueOf();
	  storage.setDataInLocalStorage(key, JSON.stringify(object));
	} catch (e) {
		refThis.logError("Error in setting localstorage ", e);
	}
}