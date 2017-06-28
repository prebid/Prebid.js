import {createBid} from 'src/bidfactory';
import {addBidResponse} from 'src/bidmanager';
import {logError, getTopWindowLocation} from 'src/utils';
import {ajax} from 'src/ajax';
import {STATUS} from 'src/constants';
import adaptermanager from 'src/adaptermanager';

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
        bid.cpm = 0.50;//idToBidMap[id].price;
        bid.adId = id;
        if(isNative(idToSlotMap[id])) {
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
        passback.bidderCode = idToSlotMap[id].bidderCode;
        addBidResponse(idToSlotMap[id].placementCode, passback);
      }
    });
  }

  function impression(slot) {
    return {
      id: slot.bidId,
      banner: banner(slot),
      native: native(slot),
      tagid: slot.params.ct.toString(),
    };
  }

  function banner(slot) {
    const size = adSize(slot);
    return slot.nativeParams ? null : {
      w: size[0],
      h: size[1],
    };
  }

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

  function addAsset(assets, asset) {
    if(asset) {
      assets.push(asset);
    }
  }

  function titleAsset(id, params, defaultLen) {
    if (params) {
      return {
        id: id,
        required: params.required ? 1 : 0,
        title: {
          len: params.len || 100,
        },
      };
    }
    return null;
  }

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

  function dataAsset(id, params, type, defaultLen) {
    return params ? {
      id: id,
      required: params.required ? 1 : 0,
      data: {
        type,
        len: params.len || 50,
      }
    } : null;
  }

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

  function referrer() {
    try {
      return window.top.document.referrer;
    } catch (e) {
      return document.referrer;
    }
  }

  function device() {
    return {
      ua: navigator.userAgent,
      language: (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage),
    };
  }

  function parse(rawResponse) {
    try {
      if(rawResponse) {
        return JSON.parse(rawResponse);
      }
    } catch (ex) {
      logError('pulsepointLite.safeParse', 'ERROR', ex);
    }
    return null;
  }

  function adSize(slot) {
    if(!slot.params.cf) {
      return [1, 1];
    }
    const size = slot.params.cf.toUpperCase().split('X');
    const width = parseInt(slot.params.cw || size[0], 10);
    const height = parseInt(slot.params.ch || size[1], 10);
    return [width, height];
  }

  function nativeResponse(slot, bid) {
    if(slot.nativeParams) {
      const nativeAd = parse(bid.adm);
      const keys = {};
      if(nativeAd && nativeAd.native && nativeAd.native.assets) {
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

  function isNative(slot) {
    return slot.nativeParams;
  }

  return {
    callBids: _callBids
  };
}

// registering an alias for backwards compatibility.
adaptermanager.registerBidAdapter(new PulsePointLiteAdapter, 'ppLite');

module.exports = PulsePointLiteAdapter;
