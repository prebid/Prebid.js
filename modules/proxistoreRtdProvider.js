import { submodule } from '../src/hook.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { ajax } from '../src/ajax.js';

function init(config, userConsent) {
  return true;
}

/**
 * Provides segment data to proxistore adUnits
 *
 */
function getBidRequest(reqBidsConfigObj, prebidCallback, config, userConsent) {
  const { gdpr } = userConsent;
  const { vendorData } = gdpr;
  const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits;
  if (
    !gdpr.gdprApplies ||
    (gdpr.consentString &&
      vendorData.vendorConsents[4] &&
      vendorData.vendorConsents[1] &&
      vendorData.vendorConsents[53])
  ) {
    _getSddanTargeting(gdpr, true, prebidCallback, adUnits);
  } else if (gdpr) {
    _getSddanTargeting(gdpr, false, prebidCallback, adUnits);
  } else {
    _getSddanTargeting(null, null, prebidCallback, adUnits);
  }
}

function _set(obj, path, val) {
  var keys = path.split('.');
  var lastKey = keys.pop();
  var lastObj = keys.reduce(function (obj, key) {
    return (obj[key] = obj[key] || {});
  }, obj);
  lastObj[lastKey] = lastObj[lastKey] || val;
}

function _getSddanTargeting(tcData, isCookiebased, prebidCallback, adUnits) {
  const sdhost = isCookiebased === true ? 'sddan.com' : 'cookieless-data.com';
  const sdtcString = tcData
    ? '&gdpr=' +
      tcData.gdprApplies +
      '&gdpr_consent=' +
      (tcData.consentString ? tcData.consentString : '')
    : '';
  let sdUrl = '&url=' + encodeURIComponent(window.top.location.href);
  const uri =
    'https://kvt.' +
    sdhost +
    '/api/v1/public/p/1/d/1/s?' +
    sdUrl +
    sdtcString;
  ajax(
    uri,
    {
      success: (response) => {
        _updateBidRequest(JSON.parse(response), adUnits, prebidCallback);
      },
      error: () => prebidCallback()
      ,
    },
    null,
    {
      withCredentials: true,
      method: 'GET',
      crossOrigin: true,
      referrerPolicy: 'unsafe-url',
    }
  );
};

function _updateBidRequest(response, adUnits, callback) {
  if (response) {
    adUnits.forEach(function (adUnit) {
      if (adUnit.hasOwnProperty('bids')) {
        adUnit.bids
          .filter(function (bid) {
            return bid.bidder === 'proxistore';
          })
          .forEach(function (bid) {
            _set(bid, 'ortb2.user.ext.data', {segments: [], contextual_categories: {}});
            bid.ortb2.user.ext.data = response;
          });
      }
    });
  }
  callback();
}

export const proxistoreSubModule = {
  name: 'ProxistoreRTDModule',
  init: init,
  getBidRequestData: getBidRequest,
};

submodule('realTimeData', proxistoreSubModule);
