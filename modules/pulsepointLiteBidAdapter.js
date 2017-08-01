import {createBid} from 'src/bidfactory';
import {addBidResponse} from 'src/bidmanager';
import {logError, getTopWindowLocation} from 'src/utils';
import {ajax} from 'src/ajax';
import {STATUS} from 'src/constants';
import adaptermanager from 'src/adaptermanager';

/**
 * PulsePoint "Lite" Adapter.  This adapter implementation is lighter than the
 * alternative/original PulsePointAdapter because it has no external
 * dependencies and relies on a single OpenRTB request to the PulsePoint
 * bidder instead of separate requests per slot.
 */
function PulsePointLiteAdapter() {
  const bidUrl = window.location.protocol + '//bid.contextweb.com/header/ortb';
  const ajaxOptions = {
    method: 'POST',
    withCredentials: true,
    contentType: 'text/plain'
  };
  const NATIVE_DEFAULTS = {
    TITLE_LEN: 100,
    DESCR_LEN: 200,
    SPONSORED_BY_LEN: 50,
    IMG_MIN: 150,
    ICON_MIN: 50,
  };

  /**
   * Makes the call to PulsePoint endpoint and registers bids.
   */
  function _callBids(bidRequest) {
    try {
      // construct the openrtb bid request from slots
      const request = {
        imp: bidRequest.bids.map(slot => impression(slot)),
        site: site(bidRequest),
        device: device(),
      };
      ajax(bidUrl, (rawResponse) => {
        bidResponseAvailable(bidRequest, rawResponse);
      }, JSON.stringify(request), ajaxOptions);
    } catch (e) {
      // register passback on any exceptions while attempting to fetch response.
      logError('pulsepoint.requestBid', 'ERROR', e);
      bidResponseAvailable(bidRequest);
    }
  }

  /**
   * Callback for bids, after the call to PulsePoint completes.
   */
  function bidResponseAvailable(bidRequest, rawResponse) {
    const idToSlotMap = {};
    const idToBidMap = {};
    // extract the request bids and the response bids, keyed by impr-id
    bidRequest.bids.forEach((slot) => {
      idToSlotMap[slot.bidId] = slot;
    });
    const bidResponse = parse(rawResponse);
    if (bidResponse) {
      bidResponse.seatbid.forEach(seatBid => seatBid.bid.forEach((bid) => {
        idToBidMap[bid.impid] = bid;
      }));
    }
    // register the responses
    Object.keys(idToSlotMap).forEach((id) => {
      if (idToBidMap[id]) {
        const size = adSize(idToSlotMap[id]);
        const bid = createBid(STATUS.GOOD, bidRequest);
        bid.bidderCode = bidRequest.bidderCode;
        bid.cpm = idToBidMap[id].price;
        bid.adId = id;
        if (isNative(idToSlotMap[id])) {
          bid.native = nativeResponse(idToSlotMap[id], idToBidMap[id]);
          bid.mediaType = 'native';
        } else {
          bid.ad = idToBidMap[id].adm;
          bid.width = size[0];
          bid.height = size[1];
        }
        addBidResponse(idToSlotMap[id].placementCode, bid);
      } else {
        const passback = createBid(STATUS.NO_BID, bidRequest);
        passback.bidderCode = bidRequest.bidderCode;
        passback.adId = id;
        addBidResponse(idToSlotMap[id].placementCode, passback);
      }
    });
  }

  /**
   * Produces an OpenRTBImpression from a slot config.
   */
  function impression(slot) {
    return {
      id: slot.bidId,
      banner: banner(slot),
      native: native(slot),
      tagid: slot.params.ct.toString(),
    };
  }

  /**
   * Produces an OpenRTB Banner object for the slot given.
   */
  function banner(slot) {
    const size = adSize(slot);
    return slot.nativeParams ? null : {
      w: size[0],
      h: size[1],
    };
  }

  /**
   * Produces an OpenRTB Native object for the slot given.
   */
  function native(slot) {
    if (slot.nativeParams) {
      const assets = [];
      addAsset(assets, titleAsset(assets.length + 1, slot.nativeParams.title, NATIVE_DEFAULTS.TITLE_LEN));
      addAsset(assets, dataAsset(assets.length + 1, slot.nativeParams.body, 2, NATIVE_DEFAULTS.DESCR_LEN));
      addAsset(assets, dataAsset(assets.length + 1, slot.nativeParams.sponsoredBy, 1, NATIVE_DEFAULTS.SPONSORED_BY_LEN));
      addAsset(assets, imageAsset(assets.length + 1, slot.nativeParams.icon, 1, NATIVE_DEFAULTS.ICON_MIN, NATIVE_DEFAULTS.ICON_MIN));
      addAsset(assets, imageAsset(assets.length + 1, slot.nativeParams.image, 3, NATIVE_DEFAULTS.IMG_MIN, NATIVE_DEFAULTS.IMG_MIN));
      return {
        request: JSON.stringify({ assets }),
        ver: '1.1',
      };
    }
    return null;
  }

  /**
   * Helper method to add an asset to the assets list.
   */
  function addAsset(assets, asset) {
    if (asset) {
      assets.push(asset);
    }
  }

  /**
   * Produces a Native Title asset for the configuration given.
   */
  function titleAsset(id, params, defaultLen) {
    if (params) {
      return {
        id: id,
        required: params.required ? 1 : 0,
        title: {
          len: params.len || defaultLen,
        },
      };
    }
    return null;
  }

  /**
   * Produces a Native Image asset for the configuration given.
   */
  function imageAsset(id, params, type, defaultMinWidth, defaultMinHeight) {
    return params ? {
      id: id,
      required: params.required ? 1 : 0,
      img: {
        type,
        wmin: params.wmin || defaultMinWidth,
        hmin: params.hmin || defaultMinHeight,
      }
    } : null;
  }

  /**
   * Produces a Native Data asset for the configuration given.
   */
  function dataAsset(id, params, type, defaultLen) {
    return params ? {
      id: id,
      required: params.required ? 1 : 0,
      data: {
        type,
        len: params.len || defaultLen,
      }
    } : null;
  }

  /**
   * Produces an OpenRTB site object.
   */
  function site(bidderRequest) {
    const pubId = bidderRequest.bids.length > 0 ? bidderRequest.bids[0].params.cp : '0';
    return {
      publisher: {
        id: pubId.toString(),
      },
      ref: referrer(),
      page: getTopWindowLocation().href,
    };
  }

  /**
   * Attempts to capture the referrer url.
   */
  function referrer() {
    try {
      return window.top.document.referrer;
    } catch (e) {
      return document.referrer;
    }
  }

  /**
   * Produces an OpenRTB Device object.
   */
  function device() {
    return {
      ua: navigator.userAgent,
      language: (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage),
    };
  }

  /**
   * Safely parses the input given. Returns null on
   * parsing failure.
   */
  function parse(rawResponse) {
    try {
      if (rawResponse) {
        return JSON.parse(rawResponse);
      }
    } catch (ex) {
      logError('pulsepointLite.safeParse', 'ERROR', ex);
    }
    return null;
  }

  /**
   * Determines the AdSize for the slot.
   */
  function adSize(slot) {
    if (slot.params.cf) {
      const size = slot.params.cf.toUpperCase().split('X');
      const width = parseInt(slot.params.cw || size[0], 10);
      const height = parseInt(slot.params.ch || size[1], 10);
      return [width, height];
    }
    return [1, 1];
  }

  /**
   * Parses the native response from the Bid given.
   */
  function nativeResponse(slot, bid) {
    if (slot.nativeParams) {
      const nativeAd = parse(bid.adm);
      const keys = {};
      if (nativeAd && nativeAd.native && nativeAd.native.assets) {
        nativeAd.native.assets.forEach((asset) => {
          keys.title = asset.title ? asset.title.text : keys.title;
          keys.body = asset.data && asset.data.type === 2 ? asset.data.value : keys.body;
          keys.sponsoredBy = asset.data && asset.data.type === 1 ? asset.data.value : keys.sponsoredBy;
          keys.image = asset.img && asset.img.type === 3 ? asset.img.url : keys.image;
          keys.icon = asset.img && asset.img.type === 1 ? asset.img.url : keys.icon;
        });
        if (nativeAd.native.link) {
          keys.clickUrl = encodeURIComponent(nativeAd.native.link.url);
        }
        keys.impressionTrackers = nativeAd.native.imptrackers;
        return keys;
      }
    }
    return null;
  }

  /**
   * Parses the native response from the Bid given.
   */
  function isNative(slot) {
    return !!slot.nativeParams;
  }

  return {
    callBids: _callBids
  };
}

/**
 * "pulseLite" will be the adapter name going forward. "pulsepointLite" to be
 * deprecated, but kept here for backwards compatibility.
 * Reason is key truncation. When the Publisher opts for sending all bids to DFP, then
 * the keys get truncated due to the limit in key-size (20 characters, detailed
 * here https://support.google.com/dfp_premium/answer/1628457?hl=en). Here is an
 * example, where keys got truncated when using the "pulsepointLite" alias - "hb_adid_pulsepointLi=1300bd87d59c4c2"
*/
adaptermanager.registerBidAdapter(new PulsePointLiteAdapter(), 'pulseLite', {
  supportedMediaTypes: [ 'native' ]
});
adaptermanager.aliasBidAdapter('pulseLite', 'pulsepointLite');

module.exports = PulsePointLiteAdapter;
