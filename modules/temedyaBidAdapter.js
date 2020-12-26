import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';

const BIDDER_CODE = 'temedya';
const ENDPOINT_URL = 'https://adm.vidyome.com/';
const ENDPOINT_METHOD = 'GET';
const CURRENCY = 'TRY';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],
  /**
  * Determines whether or not the given bid request is valid.
  *
  * @param {BidRequest} bid The bid params to validate.
  * @return boolean True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: function (bid) {
    return !!(bid.params.widgetId);
  },
  /**
  * Make a server request from the list of BidRequests.
  *
  * @param {validBidRequests[]} - an array of bids
  * @return ServerRequest Info describing the request to the server.
  */
  buildRequests: function (validBidRequests, bidderRequest) {

    return validBidRequests.map(req => {
      const mediaType = this._isBannerRequest(req) ? 'display' : NATIVE;

      const data = {
        wid: req.params.widgetId,
        type: mediaType,
        count: (req.params.count > 6 ? 6 : req.params.count) || 1,
        mediaType: mediaType,
        requestid: req.bidId
      };

      if (mediaType === 'display') {
        data.sizes = utils.parseSizesInput(
          req.mediaTypes && req.mediaTypes.banner && req.mediaTypes.banner.sizes
        ).join('|')
      }

      /** @type {ServerRequest} */
      return {
        method: ENDPOINT_METHOD,
        url: ENDPOINT_URL,
        data: utils.parseQueryStringParameters(data),
        options: { withCredentials: false, requestId: req.bidId, mediaType: mediaType }
      };
    });

  },

  /**
  * Unpack the response from the server into a list of bids.
  *
  * @param {ServerResponse} serverResponse A successful response from the server.
  * @return {Bid[]} An array of bids which were nested inside the server.
  */
  interpretResponse: function (serverResponse, bidRequest) {
    try {
      const bidResponse = serverResponse.body;
      const bidResponses = [];

      //utils.logInfo(`bidResponse`, bidResponse);

      if (bidResponse && bidRequest.options.mediaType == NATIVE ) {
        bidResponse.ads.forEach(function(ad) {

          utils.logInfo(`bidRequest.options`, bidRequest.options);
          utils.logInfo(`ad`, ad);
          utils.logInfo(`NATIVE`, NATIVE);

          bidResponses.push({
            requestId: bidRequest.options.requestId,
            cpm: parseFloat(ad.assets.cpm) || 1,
            width: 320,
            height: 240,
            creativeId: ad.assets.id,
            currency: ad.currency || CURRENCY,
            netRevenue: false,
            mediaType: NATIVE,
            ttl: 360,
            native: {
              title: ad.assets.title,
              body: ad.assets.body || '',
              icon: {
                url: ad.assets.files[0],
                width: 320,
                height: 240
              },
              image: {
                url: ad.assets.files[0],
                width: 320,
                height: 240
              },
              privacyLink: '',
              clickUrl: ad.assets.click_url,
              displayUrl: ad.assets.click_url,
              cta: '',
              sponsoredBy: ad.assets.sponsor || '',
              impressionTrackers: [bidResponse.base.widget.impression + '&ids=' + ad.id + ':' + ad.assets.id],
            },
          });
        });
      } else if (bidResponse && bidRequest.options.mediaType == 'display' ) {

        bidResponse.ads.forEach(function(ad) {

          let w = ad.assets.width || 300;
          let h = ad.assets.height || 250;

          let htmlTag = '<div id="TEM_TAG" style="border: 1px inset rgba(0,0,0,.85); padding: 0; margin: 0;" width="' + w + '" height="' + h + '">';
          htmlTag+= '<style>';
          htmlTag+= '#TEM_TAG .text-elements {position: absolute;bottom: 0;left: 0; right: 0; padding: 10px; background: rgba(0,0,0,.85)}';
          htmlTag+= '#TEM_TAG .text-elements h2 {margin: 0!important; text-align: left; font-weight: bold; font-size: 16px!important;line-height: 20px!important;font-style: normal;text-decoration: none;color: #fff; font-family: Helvetica, sans-serif;}';
          htmlTag+= '#TEM_TAG .text-elements p {font-weight: 700!important; margin: 10px 0; font-size: 11px!important; line-height: 14px!important; font-style: normal!important; text-decoration: none!important; font-family: Helvetica, sans-serif !important; display: block!important; overflow: hidden!important; padding-top: 1px!important; text-transform: uppercase; letter-spacing: 1.2px; color: #fff; opacity: .5;}';
          htmlTag+= '</style>';
          htmlTag+= '<a href="' + ad.assets.click_url + '" target="_blank">';
          htmlTag+= '<div class="image-with-text">';
          htmlTag+= '<div class="tem-img"><img src="' + ad.assets.files[0] + '" style="width:' + w + 'px;height:' + h + 'px;"/></div>';
          if(ad.assets.title) {
            htmlTag+= '<div class="text-elements">';
            htmlTag+= '<h2>' + ad.assets.title + '</h2>';
            htmlTag+= '<p>' + (ad.assets.sponsor || '') + '</p>';
            htmlTag+= '</div>';
          };
          htmlTag+= '</div></a><img style="display: none;" src="' + bidResponse.base.widget.impression + '&ids=' + ad.id + ':' + ad.assets.id + '">';
          htmlTag+= '</div>';

          bidResponses.push({
            requestId: bidRequest.options.requestId,
            cpm: parseFloat(ad.assets.cpm) || 1,
            width: w,
            height: h,
            creativeId: ad.assets.id,
            currency: ad.currency || CURRENCY,
            netRevenue: false,
            ttl: 360,
            mediaType: BANNER,
            ad: htmlTag
          });

        });
      }

      utils.logInfo(`bidResponse`, bidResponses);

      return bidResponses;
    } catch (err) {
      utils.logError(err);
      return [];
    }
  },

  /**
   * @param {BidRequest} req
   * @return {boolean}
   * @private
   */
  _isBannerRequest(req) {
    return !!(req.mediaTypes && req.mediaTypes.banner);
  },

}
registerBidder(spec);
