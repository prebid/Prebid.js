import Adapter from 'src/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { STATUS } from 'src/constants';
import adaptermanager from 'src/adaptermanager';
import { loadScript } from 'src/adloader';

const XhbAdapter = function XhbAdapter() {
  const baseAdapter = new Adapter('xhb');
  let usersync = false;

  const _defaultBidderSettings = {
    alwaysUseBid: true,
    adserverTargeting: [
      {
        key: 'hb_xhb_deal',
        val: function (bidResponse) {
          return bidResponse.dealId;
        }
      },
      {
        key: 'hb_xhb_adid',
        val: function (bidResponse) {
          return bidResponse.adId;
        }
      }
    ]
  };
  bidmanager.registerDefaultBidderSetting('xhb', _defaultBidderSettings);

  baseAdapter.callBids = function (params) {
    const anArr = params.bids;
    for (let i = 0; i < anArr.length; i++) {
      let bidRequest = anArr[i];
      let callbackId = bidRequest.bidId;
      loadScript(buildJPTCall(bidRequest, callbackId));
    }
  };

  function buildJPTCall(bid, callbackId) {
    // determine tag params
    const placementId = utils.getBidIdParameter('placementId', bid.params);
    const member = utils.getBidIdParameter('member', bid.params);
    const inventoryCode = utils.getBidIdParameter('invCode', bid.params);
    let referrer = utils.getBidIdParameter('referrer', bid.params);
    const altReferrer = utils.getBidIdParameter('alt_referrer', bid.params);

    // Build tag, always use https
    let jptCall = 'https://ib.adnxs.com/jpt?';

    jptCall = utils.tryAppendQueryString(jptCall, 'callback', '$$PREBID_GLOBAL$$.handleXhbCB');
    jptCall = utils.tryAppendQueryString(jptCall, 'callback_uid', callbackId);
    jptCall = utils.tryAppendQueryString(jptCall, 'id', placementId);
    jptCall = utils.tryAppendQueryString(jptCall, 'psa', '0');
    jptCall = utils.tryAppendQueryString(jptCall, 'member', member);
    jptCall = utils.tryAppendQueryString(jptCall, 'code', inventoryCode);
    jptCall = utils.tryAppendQueryString(jptCall, 'traffic_source_code', (utils.getBidIdParameter('trafficSourceCode', bid.params)));

    // sizes takes a bit more logic
    let sizeQueryString = '';
    let parsedSizes = utils.parseSizesInput(bid.sizes);

    // combine string into proper querystring for impbus
    let parsedSizesLength = parsedSizes.length;
    if (parsedSizesLength > 0) {
      // first value should be "size"
      sizeQueryString = 'size=' + parsedSizes[0];
      if (parsedSizesLength > 1) {
        // any subsequent values should be "promo_sizes"
        sizeQueryString += '&promo_sizes=';
        for (let j = 1; j < parsedSizesLength; j++) {
          sizeQueryString += parsedSizes[j] += ',';
        }
        // remove trailing comma
        if (sizeQueryString && sizeQueryString.charAt(sizeQueryString.length - 1) === ',') {
          sizeQueryString = sizeQueryString.slice(0, sizeQueryString.length - 1);
        }
      }
    }

    if (sizeQueryString) {
      jptCall += sizeQueryString + '&';
    }

    // append referrer
    if (referrer === '') {
      referrer = utils.getTopWindowUrl();
    }

    jptCall = utils.tryAppendQueryString(jptCall, 'referrer', referrer);
    jptCall = utils.tryAppendQueryString(jptCall, 'alt_referrer', altReferrer);

    // remove the trailing "&"
    if (jptCall.lastIndexOf('&') === jptCall.length - 1) {
      jptCall = jptCall.substring(0, jptCall.length - 1);
    }

    return jptCall;
  }

  // expose the callback to the global object:
  $$PREBID_GLOBAL$$.handleXhbCB = function (jptResponseObj) {
    let bidCode;

    if (jptResponseObj && jptResponseObj.callback_uid) {
      let responseCPM;
      const id = jptResponseObj.callback_uid;
      let placementCode = '';
      const bidObj = utils.getBidRequest(id);
      if (bidObj) {
        bidCode = bidObj.bidder;
        placementCode = bidObj.placementCode;

        // set the status
        bidObj.status = STATUS.GOOD;
      }

      let bid = [];
      if (jptResponseObj.result && jptResponseObj.result.ad && jptResponseObj.result.ad !== '') {
        responseCPM = 0.00;

        // store bid response
        // bid status is good (indicating 1)
        let adId = jptResponseObj.result.creative_id;
        bid = bidfactory.createBid(STATUS.GOOD, bidObj);
        bid.creative_id = adId;
        bid.bidderCode = bidCode;
        bid.cpm = responseCPM;
        bid.adUrl = jptResponseObj.result.ad;
        bid.width = jptResponseObj.result.width;
        bid.height = jptResponseObj.result.height;
        bid.dealId = '99999999';

        bidmanager.addBidResponse(placementCode, bid);
      } else {
        // no response data
        // indicate that there is no bid for this placement
        bid = bidfactory.createBid(STATUS.NO_BID, bidObj);
        bid.bidderCode = bidCode;
        bidmanager.addBidResponse(placementCode, bid);
      }

      if (!usersync) {
        let iframe = utils.createInvisibleIframe();
        iframe.src = '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html';
        try {
          document.body.appendChild(iframe);
        } catch (error) {
          utils.logError(error);
        }
        usersync = true;
      }
    }
  };

  return {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    buildJPTCall: buildJPTCall
  };
};

adaptermanager.registerBidAdapter(new XhbAdapter(), 'xhb');

module.exports = XhbAdapter;
