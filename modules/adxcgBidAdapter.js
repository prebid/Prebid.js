import * as utils from 'src/utils';
import * as url from 'src/url';
import {registerBidder} from 'src/adapters/bidderFactory';
import {NATIVE, VIDEO} from 'src/mediaTypes';

/**
 * Adapter for requesting bids from adxcg.net
 * updated to latest prebid repo on 2017.10.20
 */

const BIDDER_CODE = 'adxcg';
const SUPPORTED_AD_TYPES = [VIDEO, NATIVE];
const SOURCE = 'pbjs10';
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params.adzoneid);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * an array of validBidRequests
   * Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    utils.logMessage(`buildRequests: ${JSON.stringify(validBidRequests)}`);

    let adZoneIds = [];
    let prebidBidIds = [];
    let sizes = [];

    validBidRequests.forEach(bid => {
      adZoneIds.push(utils.getBidIdParameter('adzoneid', bid.params));
      prebidBidIds.push(bid.bidId);
      sizes.push(utils.parseSizesInput(bid.sizes).join('|'));
    });

    let location = utils.getTopWindowLocation();
    let secure = location.protocol === 'https:';

    let requestUrl = url.parse(location.href);
    requestUrl.search = null;
    requestUrl.hash = null;

    let adxcgRequestUrl = url.format({
      protocol: secure ? 'https' : 'http',
      hostname: secure ? 'hbps.adxcg.net' : 'hbp.adxcg.net',
      pathname: '/get/adi',
      search: {
        renderformat: 'javascript',
        ver: 'r20171019PB10',
        adzoneid: adZoneIds.join(','),
        format: sizes.join(','),
        prebidBidIds: prebidBidIds.join(','),
        url: encodeURIComponent(url.format(requestUrl)),
        secure: secure ? '1' : '0',
        source: SOURCE,
        pbjs: '$prebid.version$'
      }
    });

    return {
      method: 'GET',
      url: adxcgRequestUrl,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {bidRequests[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequests) {
    let bids = [];

    serverResponse = serverResponse.body;
    if (serverResponse) {
      serverResponse.forEach(serverResponseOneItem => {
        let bid = {};

        bid.requestId = serverResponseOneItem.bidId;
        bid.cpm = serverResponseOneItem.cpm;
        bid.creativeId = parseInt(serverResponseOneItem.creativeId);
        bid.currency = 'USD';
        bid.netRevenue = serverResponseOneItem.netRevenue ? serverResponseOneItem.netRevenue : true;
        bid.ttl = 300;

        if (serverResponseOneItem.deal_id != null && serverResponseOneItem.deal_id.trim().length > 0) {
          bid.dealId = serverResponseOneItem.deal_id;
        }

        if (serverResponseOneItem.ad) {
          bid.ad = serverResponseOneItem.ad;
        } else if (serverResponseOneItem.vastUrl) {
          bid.vastUrl = serverResponseOneItem.vastUrl;
          bid.descriptionUrl = serverResponseOneItem.vastUrl;
          bid.mediaType = 'video';
        } else if (serverResponseOneItem.nativeResponse) {
          bid.mediaType = 'native';

          let nativeResponse = serverResponseOneItem.nativeResponse;

          bid['native'] = {
            clickUrl: encodeURIComponent(nativeResponse.link.url),
            impressionTrackers: nativeResponse.imptrackers
          };

          nativeResponse.assets.forEach(asset => {
            if (asset.title && asset.title.text) {
              bid['native'].title = asset.title.text;
            }

            if (asset.img && asset.img.url) {
              bid['native'].image = asset.img.url;
            }

            if (asset.data && asset.data.label === 'DESC' && asset.data.value) {
              bid['native'].body = asset.data.value;
            }

            if (asset.data && asset.data.label === 'SPONSORED' && asset.data.value) {
              bid['native'].sponsoredBy = asset.data.value;
            }
          });
        }

        bid.width = serverResponseOneItem.width;
        bid.height = serverResponseOneItem.height;
        utils.logMessage(`submitting bid[${serverResponseOneItem.bidId}]: ${JSON.stringify(bid)}`);
        bids.push(bid);
      });
    } else {
      utils.logMessage(`empty bid response`);
    }
    return bids;
  },
  getUserSyncs: function (syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: '//cdn.adxcg.net/pb-sync.html'
      }];
    }
  }
};
registerBidder(spec);
