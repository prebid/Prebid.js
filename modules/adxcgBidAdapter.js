import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { STATUS } from 'src/constants';
import adaptermanager from 'src/adaptermanager';
import { ajax } from 'src/ajax';
import * as url from 'src/url';

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
        sizes.push(utils.parseSizesInput(bid.sizes).join('|'));
      });

      let location = utils.getTopWindowLocation();
      let secure = location.protocol == 'https:';

      let requestUrl = url.parse(location.href);
      requestUrl.search = null;
      requestUrl.hash = null;

      let adxcgRequestUrl = url.format({
        protocol: secure ? 'https' : 'http',
        hostname: secure ? 'ad-emea-secure.adxcg.net' : 'ad-emea.adxcg.net',
        pathname: '/get/adi',
        search: {
          renderformat: 'javascript',
          ver: 'r20141124',
          adzoneid: adZoneIds.join(','),
          format: sizes.join(','),
          prebidBidIds: prebidBidIds.join(','),
          url: escape(url.format(requestUrl)),
          secure: secure ? '1' : '0'
        }
      });

      utils.logMessage(`submitting request: ${adxcgRequestUrl}`);
      ajax(adxcgRequestUrl, handleResponse, null, {
        withCredentials: true
      });
    }
  }

  function handleResponse(response) {
    let adxcgBidReponseList;

    try {
      adxcgBidReponseList = JSON.parse(response);
      utils.logMessage(`adxcgBidReponseList: ${JSON.stringify(adxcgBidReponseList)}`);
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
          clickUrl: escape(nativeResponse.link.url),
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

      utils.logMessage(`submitting bid[${bidRequest.placementCode}]: ${JSON.stringify(bid)}`);
      bidmanager.addBidResponse(bidRequest.placementCode, bid);
    });

    Object.keys(bidRequests)
      .map(bidId => bidRequests[bidId].placementCode)
      .forEach(placementCode => {
        utils.logMessage(`creating no_bid bid for: ${placementCode}`);
        bidmanager.addBidResponse(placementCode, bidfactory.createBid(STATUS.NO_BID));
      });
  };

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new AdxcgAdapter(), 'adxcg', {
  supportedMediaTypes: ['video', 'native']
});

module.exports = AdxcgAdapter;
