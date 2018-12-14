import Adapter from 'src/adapter';
import bidfactory from 'src/bidfactory';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS, S2S, EVENTS } from 'src/constants';
import adaptermanager from 'src/adaptermanager';
import { config } from 'src/config';
import { VIDEO } from 'src/mediaTypes';
import { isValid } from 'src/adapters/bidderFactory';
import events from 'src/events';
import includes from 'core-js/library/fn/array/includes';
import { S2S_VENDORS } from './config.js';

const getConfig = config.getConfig;

const TYPE = S2S.SRC;
let _synced = false;
const DEFAULT_S2S_TTL = 60;
const DEFAULT_S2S_CURRENCY = 'USD';
const DEFAULT_S2S_NETREVENUE = true;

let _s2sConfig;

const s2sDefaultConfig = {
  enabled: false,
  timeout: 1000,
  maxBids: 1,
  adapter: 'prebidServer'
};

config.setDefaults({
  's2sConfig': s2sDefaultConfig
});

/**
 * Set config for server to server header bidding
 * @typedef {Object} options - required
 * @property {boolean} enabled enables S2S bidding
 * @property {string[]} bidders bidders to request S2S
 * @property {string} endpoint endpoint to contact
 *  === optional params below ===
 * @property {number} [timeout] timeout for S2S bidders - should be lower than `pbjs.requestBids({timeout})`
 * @property {boolean} [cacheMarkup] whether to cache the adm result
 * @property {string} [adapter] adapter code to use for S2S
 * @property {string} [syncEndpoint] endpoint URL for syncing cookies
 */
function setS2sConfig(options) {
  if (options.defaultVendor) {
    let vendor = options.defaultVendor;
    let optionKeys = Object.keys(options);
    if (S2S_VENDORS[vendor]) {
      // vendor keys will be set if either: the key was not specified by user
      // or if the user did not set their own distinct value (ie using the system default) to override the vendor
      Object.keys(S2S_VENDORS[vendor]).forEach((vendorKey) => {
        if (s2sDefaultConfig[vendorKey] === options[vendorKey] || !includes(optionKeys, vendorKey)) {
          options[vendorKey] = S2S_VENDORS[vendor][vendorKey];
        }
      });
    } else {
      utils.logError('Incorrect or unavailable prebid server default vendor option: ' + vendor);
      return false;
    }
  }

  let keys = Object.keys(options);

  if (['accountId', 'bidders', 'endpoint'].filter(key => {
    if (!includes(keys, key)) {
      utils.logError(key + ' missing in server to server config');
      return true;
    }
    return false;
  }).length > 0) {
    return;
  }

  _s2sConfig = options;
}
getConfig('s2sConfig', ({s2sConfig}) => setS2sConfig(s2sConfig));

/**
 * resets the _synced variable back to false, primiarily used for testing purposes
*/
export function resetSyncedStatus() {
  _synced = false;
}

/**
 * @param  {Array} bidderCodes list of bidders to request user syncs for.
 */
function queueSync(bidderCodes, gdprConsent) {
  if (_synced) {
    return;
  }
  _synced = true;

  const payload = {
    uuid: utils.generateUUID(),
    bidders: bidderCodes,
    account: _s2sConfig.accountId
  };

  if (gdprConsent) {
    // only populate gdpr field if we know CMP returned consent information (ie didn't timeout or have an error)
    if (typeof gdprConsent.consentString !== 'undefined') {
      payload.gdpr = (gdprConsent.gdprApplies) ? 1 : 0;
    }
    // attempt to populate gdpr_consent if we know gdprApplies or it may apply
    if (gdprConsent.gdprApplies !== false) {
      payload.gdpr_consent = gdprConsent.consentString;
    }
  }
  const jsonPayload = JSON.stringify(payload);

  ajax(_s2sConfig.syncEndpoint,
    (response) => {
      try {
        response = JSON.parse(response);
        response.bidder_status.forEach(bidder => doBidderSync(bidder.usersync.type, bidder.usersync.url, bidder.bidder));
      } catch (e) {
        utils.logError(e);
      }
    },
    jsonPayload,
    {
      contentType: 'text/plain',
      withCredentials: true
    });
}

/**
 * Run a cookie sync for the given type, url, and bidder
 *
 * @param {string} type the type of sync, "image", "redirect", "iframe"
 * @param {string} url the url to sync
 * @param {string} bidder name of bidder doing sync for
 */
function doBidderSync(type, url, bidder) {
  if (!url) {
    utils.logError(`No sync url for bidder "${bidder}": ${url}`);
  } else if (type === 'image' || type === 'redirect') {
    utils.logMessage(`Invoking image pixel user sync for bidder: "${bidder}"`);
    utils.triggerPixel(url);
  } else if (type == 'iframe') {
    utils.logMessage(`Invoking iframe user sync for bidder: "${bidder}"`);
    utils.insertUserSyncIframe(url);
  } else {
    utils.logError(`User sync type "${type}" not supported for bidder: "${bidder}"`);
  }
}

/**
 * Do client-side syncs for bidders.
 *
 * @param {Array} bidders a list of bidder names
 */
function doClientSideSyncs(bidders) {
  bidders.forEach(bidder => {
    let clientAdapter = adaptermanager.getBidAdapter(bidder);
    if (clientAdapter && clientAdapter.registerSyncs) {
      clientAdapter.registerSyncs([]);
    }
  });
}

function _getDigiTrustQueryParams() {
  function getDigiTrustId() {
    let digiTrustUser = window.DigiTrust && (config.getConfig('digiTrustId') || window.DigiTrust.getUser({member: 'T9QSFKPDN9'}));
    return (digiTrustUser && digiTrustUser.success && digiTrustUser.identity) || null;
  }
  let digiTrustId = getDigiTrustId();
  // Verify there is an ID and this user has not opted out
  if (!digiTrustId || (digiTrustId.privacy && digiTrustId.privacy.optout)) {
    return null;
  }
  return {
    id: digiTrustId.id,
    keyv: digiTrustId.keyv,
    pref: 0
  };
}

function _appendSiteAppDevice(request) {
  if (!request) return;

  // ORTB specifies app OR site
  if (typeof config.getConfig('app') === 'object') {
    request.app = config.getConfig('app');
    request.app.publisher = {id: _s2sConfig.accountId}
  } else {
    request.site = {
      publisher: { id: _s2sConfig.accountId },
      page: utils.getTopWindowUrl()
    }
  }
  if (typeof config.getConfig('device') === 'object') {
    request.device = config.getConfig('device');
  }
  if (!request.device) {
    request.device = {};
  }
  if (!request.device.w) {
    request.device.w = window.innerWidth;
  }
  if (!request.device.h) {
    request.device.h = window.innerHeight;
  }
}

function transformHeightWidth(adUnit) {
  let sizesObj = [];
  let sizes = utils.parseSizesInput(adUnit.sizes);
  sizes.forEach(size => {
    let heightWidth = size.split('x');
    let sizeObj = {
      'w': parseInt(heightWidth[0]),
      'h': parseInt(heightWidth[1])
    };
    sizesObj.push(sizeObj);
  });
  return sizesObj;
}

/*
 * Protocol spec for legacy endpoint
 * e.g., https://<prebid-server-url>/v1/auction
 */
const LEGACY_PROTOCOL = {

  buildRequest(s2sBidRequest, bidRequests, adUnits) {
    adUnits.forEach(adUnit => {
      adUnit.bids.forEach(bid => {
        const adapter = adaptermanager.bidderRegistry[bid.bidder];
        if (adapter && adapter.getSpec().transformBidParams) {
          bid.params = adapter.getSpec().transformBidParams(bid.params, isOpenRtb());
        }
      });
    });

    // pbs expects an ad_unit.video attribute if the imp is video
    adUnits.forEach(adUnit => {
      adUnit.sizes = transformHeightWidth(adUnit);
      const videoMediaType = utils.deepAccess(adUnit, 'mediaTypes.video');
      if (videoMediaType) {
        adUnit.video = Object.assign({}, videoMediaType);
        delete adUnit.mediaTypes;
        // default is assumed to be 'banner' so if there is a video type
        // we assume video only until PBS can support multi-format auction
        adUnit.media_types = [VIDEO];
      }
    });

    const request = {
      account_id: _s2sConfig.accountId,
      tid: s2sBidRequest.tid,
      max_bids: _s2sConfig.maxBids,
      timeout_millis: _s2sConfig.timeout,
      secure: _s2sConfig.secure,
      cache_markup: _s2sConfig.cacheMarkup === 1 || _s2sConfig.cacheMarkup === 2 ? _s2sConfig.cacheMarkup : 0,
      url: utils.getTopWindowUrl(),
      prebid_version: '$prebid.version$',
      ad_units: adUnits,
      is_debug: !!getConfig('debug'),
    };

    _appendSiteAppDevice(request);

    let digiTrust = _getDigiTrustQueryParams();
    if (digiTrust) {
      request.digiTrust = digiTrust;
    }

    return request;
  },

  interpretResponse(result, bidderRequests, requestedBidders) {
    const bids = [];
    if (result.status === 'OK' || result.status === 'no_cookie') {
      if (result.bidder_status) {
        result.bidder_status.forEach(bidder => {
          if (bidder.error) {
            utils.logWarn(`Prebid Server returned error: '${bidder.error}' for ${bidder.bidder}`);
          }

          bidderRequests.filter(bidderRequest => bidderRequest.bidderCode === bidder.bidder)
            .forEach(bidderRequest =>
              (bidderRequest.bids || []).forEach(bid =>
                bid.serverResponseTimeMs = bidder.response_time_ms
              )
            )
        });
      }

      if (result.bids) {
        result.bids.forEach(bidObj => {
          const bidRequest = utils.getBidRequest(bidObj.bid_id, bidderRequests);
          const cpm = bidObj.price;
          const status = cpm !== 0 ? STATUS.GOOD : STATUS.NO_BID;
          let bidObject = bidfactory.createBid(status, bidRequest);

          bidObject.source = TYPE;
          bidObject.creative_id = bidObj.creative_id;
          bidObject.bidderCode = bidObj.bidder;
          bidObject.cpm = cpm;
          if (bidObj.cache_id) {
            bidObject.cache_id = bidObj.cache_id;
          }
          if (bidObj.cache_url) {
            bidObject.cache_url = bidObj.cache_url;
          }
          // From ORTB see section 4.2.3: adm Optional means of conveying ad markup in case the bid wins; supersedes the win notice if markup is included in both.
          if (bidObj.media_type === VIDEO) {
            bidObject.mediaType = VIDEO;
            if (bidObj.adm) {
              bidObject.vastXml = bidObj.adm;
            }
            if (bidObj.nurl) {
              bidObject.vastUrl = bidObj.nurl;
            }
            // when video bid is already cached by Prebid Server, videoCacheKey and vastUrl should be provided properly
            if (bidObj.cache_id && bidObj.cache_url) {
              bidObject.videoCacheKey = bidObj.cache_id;
              bidObject.vastUrl = bidObj.cache_url;
            }
          } else {
            if (bidObj.adm && bidObj.nurl) {
              bidObject.ad = bidObj.adm;
              bidObject.ad += utils.createTrackPixelHtml(decodeURIComponent(bidObj.nurl));
            } else if (bidObj.adm) {
              bidObject.ad = bidObj.adm;
            } else if (bidObj.nurl) {
              bidObject.adUrl = bidObj.nurl;
            }
          }

          bidObject.width = bidObj.width;
          bidObject.height = bidObj.height;
          bidObject.adserverTargeting = bidObj.ad_server_targeting;
          if (bidObj.deal_id) {
            bidObject.dealId = bidObj.deal_id;
          }
          bidObject.requestId = bidObj.bid_id;
          bidObject.creativeId = bidObj.creative_id;

          // TODO: Remove when prebid-server returns ttl, currency and netRevenue
          bidObject.ttl = (bidObj.ttl) ? bidObj.ttl : DEFAULT_S2S_TTL;
          bidObject.currency = (bidObj.currency) ? bidObj.currency : DEFAULT_S2S_CURRENCY;
          bidObject.netRevenue = (bidObj.netRevenue) ? bidObj.netRevenue : DEFAULT_S2S_NETREVENUE;

          if (result.burl) { bidObject.burl = result.burl; }

          bids.push({ adUnit: bidObj.code, bid: bidObject });
        });
      }
    }

    return bids;
  }
};

/*
 * Protocol spec for OpenRTB endpoint
 * e.g., https://<prebid-server-url>/v1/openrtb2/auction
 */
let bidIdMap = {};
const OPEN_RTB_PROTOCOL = {
  buildRequest(s2sBidRequest, bidRequests, adUnits) {
    let imps = [];
    let aliases = {};

    // transform ad unit into array of OpenRTB impression objects
    adUnits.forEach(adUnit => {
      adUnit.bids.forEach(bid => {
        // OpenRTB response contains the adunit code and bidder name. These are
        // combined to create a unique key for each bid since an id isn't returned
        bidIdMap[`${adUnit.code}${bid.bidder}`] = bid.bid_id;

        // check for and store valid aliases to add to the request
        if (adaptermanager.aliasRegistry[bid.bidder]) {
          aliases[bid.bidder] = adaptermanager.aliasRegistry[bid.bidder];
        }
      });

      let banner;
      // default to banner if mediaTypes isn't defined
      if (utils.isEmpty(adUnit.mediaTypes)) {
        const sizeObjects = adUnit.sizes.map(size => ({ w: size[0], h: size[1] }));
        banner = {format: sizeObjects};
      }

      const bannerParams = utils.deepAccess(adUnit, 'mediaTypes.banner');
      if (bannerParams && bannerParams.sizes) {
        const sizes = utils.parseSizesInput(bannerParams.sizes);

        // get banner sizes in form [{ w: <int>, h: <int> }, ...]
        const format = sizes.map(size => {
          const [ width, height ] = size.split('x');
          const w = parseInt(width, 10);
          const h = parseInt(height, 10);
          return { w, h };
        });

        banner = {format};
      }

      let video;
      const videoParams = utils.deepAccess(adUnit, 'mediaTypes.video');
      if (!utils.isEmpty(videoParams)) {
        video = videoParams;
      }

      // get bidder params in form { <bidder code>: {...params} }
      const ext = adUnit.bids.reduce((acc, bid) => {
        const adapter = adaptermanager.bidderRegistry[bid.bidder];
        if (adapter && adapter.getSpec().transformBidParams) {
          bid.params = adapter.getSpec().transformBidParams(bid.params, isOpenRtb());
        }
        acc[bid.bidder] = bid.params;
        return acc;
      }, {});

      const imp = { id: adUnit.code, ext, secure: _s2sConfig.secure };

      if (banner) { imp.banner = banner; }
      if (video) { imp.video = video; }

      imps.push(imp);
    });

    const request = {
      id: s2sBidRequest.tid,
      source: {tid: s2sBidRequest.tid},
      tmax: _s2sConfig.timeout,
      imp: imps,
      test: getConfig('debug') ? 1 : 0,
    };

    _appendSiteAppDevice(request);

    const digiTrust = _getDigiTrustQueryParams();
    if (digiTrust) {
      request.user = { ext: { digitrust: digiTrust } };
    }

    if (!utils.isEmpty(aliases)) {
      request.ext = { prebid: { aliases } };
    }

    if (bidRequests && bidRequests[0].gdprConsent) {
      // note - gdprApplies & consentString may be undefined in certain use-cases for consentManagement module
      let gdprApplies;
      if (typeof bidRequests[0].gdprConsent.gdprApplies === 'boolean') {
        gdprApplies = bidRequests[0].gdprConsent.gdprApplies ? 1 : 0;
      }

      if (request.regs) {
        if (request.regs.ext) {
          request.regs.ext.gdpr = gdprApplies;
        } else {
          request.regs.ext = { gdpr: gdprApplies };
        }
      } else {
        request.regs = { ext: { gdpr: gdprApplies } };
      }

      let consentString = bidRequests[0].gdprConsent.consentString;
      if (request.user) {
        if (request.user.ext) {
          request.user.ext.consent = consentString;
        } else {
          request.user.ext = { consent: consentString };
        }
      } else {
        request.user = { ext: { consent: consentString } };
      }
    }

    return request;
  },

  interpretResponse(response, bidderRequests, requestedBidders) {
    const bids = [];

    if (response.seatbid) {
      // a seatbid object contains a `bid` array and a `seat` string
      response.seatbid.forEach(seatbid => {
        (seatbid.bid || []).forEach(bid => {
          let bidRequest;
          let key = `${bid.impid}${seatbid.seat}`;
          if (bidIdMap[key]) {
            bidRequest = utils.getBidRequest(
              bidIdMap[key],
              bidderRequests
            );
          }

          const cpm = bid.price;
          const status = cpm !== 0 ? STATUS.GOOD : STATUS.NO_BID;
          let bidObject = bidfactory.createBid(status, bidRequest || {
            bidder: seatbid.seat,
            src: TYPE
          });

          bidObject.cpm = cpm;

          let serverResponseTimeMs = utils.deepAccess(response, ['ext', 'responsetimemillis', seatbid.seat].join('.'));
          if (bidRequest && serverResponseTimeMs) {
            bidRequest.serverResponseTimeMs = serverResponseTimeMs;
          }

          if (utils.deepAccess(bid, 'ext.prebid.type') === VIDEO) {
            bidObject.mediaType = VIDEO;
            if (bid.adm) { bidObject.vastXml = bid.adm; }
            if (bid.nurl) { bidObject.vastUrl = bid.nurl; }
          } else { // banner
            if (bid.adm && bid.nurl) {
              bidObject.ad = bid.adm;
              bidObject.ad += utils.createTrackPixelHtml(decodeURIComponent(bid.nurl));
            } else if (bid.adm) {
              bidObject.ad = bid.adm;
            } else if (bid.nurl) {
              bidObject.adUrl = bid.nurl;
            }
          }

          bidObject.width = bid.w;
          bidObject.height = bid.h;
          if (bid.dealid) { bidObject.dealId = bid.dealid; }
          bidObject.requestId = bid.id;
          bidObject.creative_id = bid.crid;
          bidObject.creativeId = bid.crid;
          if (bid.burl) { bidObject.burl = bid.burl; }

          // TODO: Remove when prebid-server returns ttl, currency and netRevenue
          bidObject.ttl = (bid.ttl) ? bid.ttl : DEFAULT_S2S_TTL;
          bidObject.currency = (bid.currency) ? bid.currency : DEFAULT_S2S_CURRENCY;
          bidObject.netRevenue = (bid.netRevenue) ? bid.netRevenue : DEFAULT_S2S_NETREVENUE;

          bids.push({ adUnit: bid.impid, bid: bidObject });
        });
      });
    }

    return bids;
  }
};

const isOpenRtb = () => {
  const OPEN_RTB_PATH = '/openrtb2/';

  const endpoint = (_s2sConfig && _s2sConfig.endpoint) || '';
  return ~endpoint.indexOf(OPEN_RTB_PATH);
}

/*
 * Returns the required protocol adapter to communicate with the configured
 * endpoint. The adapter is an object containing `buildRequest` and
 * `interpretResponse` functions.
 *
 * Usage:
 * // build JSON payload to send to server
 * const request = protocol().buildRequest(s2sBidRequest, adUnits);
 *
 * // turn server response into bid object array
 * const bids = protocol().interpretResponse(response, bidRequests, requestedBidders);
 */
const protocolAdapter = () => {
  return isOpenRtb() ? OPEN_RTB_PROTOCOL : LEGACY_PROTOCOL;
};

/**
 * Bidder adapter for Prebid Server
 */
export function PrebidServer() {
  const baseAdapter = new Adapter('prebidServer');

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function(s2sBidRequest, bidRequests, addBidResponse, done, ajax) {
    const adUnits = utils.deepClone(s2sBidRequest.ad_units);

    // at this point ad units should have a size array either directly or mapped so filter for that
    const adUnitsWithSizes = adUnits.filter(unit => unit.sizes && unit.sizes.length);

    // in case config.bidders contains invalid bidders, we only process those we sent requests for
    const requestedBidders = adUnitsWithSizes
      .map(adUnit => adUnit.bids.map(bid => bid.bidder).filter(utils.uniques))
      .reduce(utils.flatten)
      .filter(utils.uniques);

    if (_s2sConfig && _s2sConfig.syncEndpoint) {
      let consent = (Array.isArray(bidRequests) && bidRequests.length > 0) ? bidRequests[0].gdprConsent : undefined;
      queueSync(_s2sConfig.bidders, consent);
    }

    const request = protocolAdapter().buildRequest(s2sBidRequest, bidRequests, adUnitsWithSizes);
    const requestJson = JSON.stringify(request);

    ajax(
      _s2sConfig.endpoint,
      {
        success: response => handleResponse(response, requestedBidders, bidRequests, addBidResponse, done),
        error: done
      },
      requestJson,
      { contentType: 'text/plain', withCredentials: true }
    );
  };

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response, requestedBidders, bidderRequests, addBidResponse, done) {
    let result;
    let bids = [];

    try {
      result = JSON.parse(response);

      bids = protocolAdapter().interpretResponse(
        result,
        bidderRequests,
        requestedBidders
      );

      bids.forEach(({adUnit, bid}) => {
        if (isValid(adUnit, bid, bidderRequests)) {
          addBidResponse(adUnit, bid);
        }
      });

      bidderRequests.forEach(bidderRequest => events.emit(EVENTS.BIDDER_DONE, bidderRequest));
    } catch (error) {
      utils.logError(error);
    }

    if (!result || (result.status && includes(result.status, 'Error'))) {
      utils.logError('error parsing response: ', result.status);
    }

    done();
    doClientSideSyncs(requestedBidders);
  }

  return Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    type: TYPE
  });
}

adaptermanager.registerBidAdapter(new PrebidServer(), 'prebidServer');
