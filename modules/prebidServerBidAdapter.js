import Adapter from 'src/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS, S2S } from 'src/constants';
import { queueSync, persist } from 'src/cookie';
import adaptermanager from 'src/adaptermanager';

const TYPE = S2S.SRC;
const cookiePersistMessage = `Your browser may be blocking 3rd party cookies. By clicking on this page you allow Prebid Server and other advertising partners to place cookies to help us advertise. You can opt out of their cookies <a href="https://www.appnexus.com/en/company/platform-privacy-policy#choices" target="_blank">here</a>.`;
const cookiePersistUrl = 'https://ib.adnxs.com/seg?add=1&redir=';

const paramTypes = {
  'appnexus': {
    'member': 'string',
    'invCode': 'string',
    'placementId': 'number'
  },
  'rubicon': {
    'accountId': 'number',
    'siteId': 'number',
    'zoneId': 'number'
  },
  'indexExchange': {
    'siteID': 'number'
  },
  'audienceNetwork': {
    'placementId': 'string'
  },
  'pubmatic': {
    'publisherId': 'string',
    'adSlot': 'string'
  }
};

let _cookiesQueued = false;

/**
 * Bidder adapter for Prebid Server
 */
function PrebidServer() {
  let baseAdapter = Adapter.createNew('prebidServer');
  let config;

  baseAdapter.setConfig = function(s2sconfig) {
    config = s2sconfig;
  };

  function convertTypes(adUnits) {
    adUnits.forEach(adUnit => {
      adUnit.bids.forEach(bid => {
        const types = paramTypes[bid.bidder] || [];
        Object.keys(types).forEach(key => {
          if (bid.params[key] && typeof bid.params[key] !== types[key]) {
            // mismatch type. Try to fix
            utils.logMessage(`Mismatched type for Prebid Server : ${bid.bidder} : ${key}. Required Type:${types[key]}`);
            bid.params[key] = tryConvertType(types[key], bid.params[key]);
            // don't send invalid values
            if (isNaN(bid.params[key])) {
              delete bid.params.key;
            }
          }
        });
      });
    });
  }

  function tryConvertType(typeToConvert, value) {
    if (typeToConvert === 'string') {
      return value && value.toString();
    }
    if (typeToConvert === 'number') {
      return Number(value);
    }
  }

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function(bidRequest) {
    const isDebug = !!$$PREBID_GLOBAL$$.logging;
    convertTypes(bidRequest.ad_units);
    let requestJson = {
      account_id: config.accountId,
      tid: bidRequest.tid,
      max_bids: config.maxBids,
      timeout_millis: config.timeout,
      url: utils.getTopWindowUrl(),
      prebid_version: '$prebid.version$',
      ad_units: bidRequest.ad_units.filter(hasSizes),
      is_debug: isDebug
    };

    const payload = JSON.stringify(requestJson);
    ajax(config.endpoint, handleResponse, payload, {
      contentType: 'text/plain',
      withCredentials: true
    });
  };

  // at this point ad units should have a size array either directly or mapped so filter for that
  function hasSizes(unit) {
    return unit.sizes && unit.sizes.length;
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    let result;
    try {
      result = JSON.parse(response);

      if (result.status === 'OK' || result.status === 'no_cookie') {
        if (result.bidder_status) {
          result.bidder_status.forEach(bidder => {
            if (bidder.no_cookie && !_cookiesQueued) {
              queueSync({bidder: bidder.bidder, url: bidder.usersync.url, type: bidder.usersync.type});
            }
          });
        }

        if (result.bids) {
          result.bids.forEach(bidObj => {
            let bidRequest = utils.getBidRequest(bidObj.bid_id);
            let cpm = bidObj.price;
            let status;
            if (cpm !== 0) {
              status = STATUS.GOOD;
            } else {
              status = STATUS.NO_BID;
            }

            let bidObject = bidfactory.createBid(status, bidRequest);
            bidObject.source = TYPE;
            bidObject.creative_id = bidObj.creative_id;
            bidObject.bidderCode = bidObj.bidder;
            bidObject.cpm = cpm;
            bidObject.ad = bidObj.adm;
            bidObject.width = bidObj.width;
            bidObject.height = bidObj.height;
            if (bidObj.deal_id) {
              bidObject.dealId = bidObj.deal_id;
            }

            bidmanager.addBidResponse(bidObj.code, bidObject);
          });
        }

        const receivedBidIds = result.bids ? result.bids.map(bidObj => bidObj.bid_id) : [];

        // issue a no-bid response for every bid request that can not be matched with received bids
        config.bidders.forEach(bidder => {
          utils
            .getBidderRequestAllAdUnits(bidder)
            .bids.filter(bidRequest => !receivedBidIds.includes(bidRequest.bidId))
            .forEach(bidRequest => {
              let bidObject = bidfactory.createBid(STATUS.NO_BID, bidRequest);
              bidObject.source = TYPE;
              bidObject.adUnitCode = bidRequest.placementCode;
              bidObject.bidderCode = bidRequest.bidder;

              bidmanager.addBidResponse(bidObject.adUnitCode, bidObject);
            });
        });
      }
      if (result.status === 'no_cookie' && config.cookieSet) {
        // cookie sync
        persist(cookiePersistUrl, cookiePersistMessage);
      }
    } catch (error) {
      utils.logError(error);
    }

    if (!result || result.status && result.status.includes('Error')) {
      utils.logError('error parsing response: ', result.status);
    }
  }
  /**
   * @param  {} {bidders} list of bidders to request user syncs for.
   */
  baseAdapter.queueSync = function({bidderCodes}) {
    if (!_cookiesQueued) {
      _cookiesQueued = true;
      const payload = JSON.stringify({
        uuid: utils.generateUUID(),
        bidders: bidderCodes
      });
      ajax(config.syncEndpoint, (response) => {
        try {
          response = JSON.parse(response);
          response.bidder_status.forEach(bidder => queueSync({bidder: bidder.bidder, url: bidder.usersync.url, type: bidder.usersync.type}));
        }
        catch (e) {
          utils.logError(e);
        }
      },
      payload, {
        contentType: 'text/plain',
        withCredentials: true
      });
    }
  }

  return {
    queueSync: baseAdapter.queueSync,
    setConfig: baseAdapter.setConfig,
    createNew: PrebidServer.createNew,
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    type: TYPE
  };
}

PrebidServer.createNew = function() {
  return new PrebidServer();
};

adaptermanager.registerBidAdapter(new PrebidServer(), 'prebidServer');

module.exports = PrebidServer;
