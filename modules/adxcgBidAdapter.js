import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { STATUS } from 'src/constants';
import adaptermanager from 'src/adaptermanager';
import { ajax } from 'src/ajax';

/**
 * Adapter for requesting bids from Adxcg
 * updated from latest prebid repo on 2017.08.30
 */
function AdxcgAdapter() {
  let bidRequests = {};

  function _callBids(params) {
    if (params.bids && params.bids.length > 0) {
      let adZoneIds = [];
      let prebidBidIds = [];
      let sizes = [];

      params.bids.forEach(bid => {
        bidRequests[bid.bidId] = bid;
        adZoneIds.push(utils.getBidIdParameter('adzoneid', bid.params));
        prebidBidIds.push(bid.bidId);

        let parsedSizes = parseWidthAndHeight(bid);
        sizes.push(parsedSizes);
      });

      let secure = window.location.protocol == 'https:';

      let requestUrl = (secure ? 'https://ad-emea-secure' : 'http://ad-emea') + '.adxcg.net/get/adi?renderformat=javascript&ver=r20141124' +
        '&adzoneid=' + adZoneIds.join(',') +
        '&format=' + sizes.join(',') +
        '&prebidBidIds=' + prebidBidIds.join(',') +
        '&url=' + escape(removeUrlParameters(document.location.href));

      if (secure) {
        requestUrl += '&secure=1';
      }

      utils.logMessage('submitting request: ' + requestUrl);
      ajax(requestUrl, handleResponse);
    }
  }

  function handleResponse(response) {
    let adxcgBidReponseList;

    try {
      adxcgBidReponseList = JSON.parse(response);
      utils.logMessage('adxcgBidReponseList: ' + JSON.stringify(adxcgBidReponseList));
    } catch (error) {
      adxcgBidReponseList = [];
      utils.logError(error);
    }

    adxcgBidReponseList.forEach(adxcgBidReponse => {
      let bidRequest = bidRequests[adxcgBidReponse.bidId];
      delete bidRequests[adxcgBidReponse.bidId];

      let bid = bidfactory.createBid(STATUS.GOOD, bidRequest);

      bid.creative_id = adxcgBidReponse.creativeId;
      bid.code = 'adxcg';
      bid.bidderCode = 'adxcg';
      bid.cpm = adxcgBidReponse.cpm;

      if (adxcgBidReponse.ad) {
        bid.ad = adxcgBidReponse.ad;
      } else if (adxcgBidReponse.vastUrl) {
        bid.vastUrl = adxcgBidReponse.vastUrl;
        bid.descriptionUrl = adxcgBidReponse.vastUrl;
        bid.mediaType = 'video';
      } else if (adxcgBidReponse.nativeResponse) {
        bid.mediaType = 'native';

        let nativeResponse = adxcgBidReponse.nativeResponse;

        bid.native = {
          clickUrl: nativeResponse.link.url,
          impressionTrackers: nativeResponse.imptrackers
        };

        nativeResponse.assets.forEach(asset => {
          if (asset.title && asset.title.text) {
            bid.native.title = asset.title.text;
          }

          if (asset.img && asset.img.url) {
            bid.native.image = asset.img.url;
          }

          if (asset.data && asset.data.label == 'DESC' && asset.data.value) {
            bid.native.body = asset.data.value;
          }

          if (asset.data && asset.data.label == 'SPONSORED' && asset.data.value) {
            bid.native.sponsoredBy = asset.data.value;
          }
        });
      }

      bid.width = adxcgBidReponse.width;
      bid.height = adxcgBidReponse.height;

      utils.logMessage('submitting bid[' + bidRequest.placementCode + ']:' + JSON.stringify(bid));
      bidmanager.addBidResponse(bidRequest.placementCode, bid);
    });

    Object.keys(bidRequests)
      .map(bidId => bidRequests[bidId].placementCode)
      .forEach(placementCode => {
        utils.logMessage('creating no_bid bid for => ' + placementCode);
        bidmanager.addBidResponse(placementCode, bidfactory.createBid(STATUS.NO_BID));
      });
  };

  function removeUrlParameters(oldURL) {
    let index = 0;
    let newURL = oldURL;
    index = oldURL.indexOf('?');
    if (index == -1) {
      index = oldURL.indexOf('#');
    }
    if (index != -1) {
      newURL = oldURL.substring(0, index);
    }
    return newURL;
  }

  function parseWidthAndHeight(bid) {
    let fSizes = '';
    let sizeArrayLength = bid.sizes.length;
    if (sizeArrayLength === 2 && typeof bid.sizes[0] === 'number' && typeof bid.sizes[1] === 'number') {
      fSizes = bid.sizes[0] + 'x' + bid.sizes[1];
    } else {
      for (let i = 0; i < sizeArrayLength; i++) {
        fSizes += (i != 0 ? '|' : '') + bid.sizes[i][0] + 'x' + bid.sizes[i][1];
      }
    }
    return fSizes;
  }

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new AdxcgAdapter(), 'adxcg', {
  supportedMediaTypes: ['video', 'native']
});

module.exports = AdxcgAdapter;
