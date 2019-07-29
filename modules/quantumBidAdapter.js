import * as utils from '../src/utils';
import { BANNER, NATIVE } from '../src/mediaTypes';
import {registerBidder} from '../src/adapters/bidderFactory';

const BIDDER_CODE = 'quantum';
const ENDPOINT_URL = '//s.sspqns.com/hb';
export const spec = {
  code: BIDDER_CODE,
  aliases: ['quantx', 'qtx'], // short code
  supportedMediaTypes: [BANNER, NATIVE],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */

  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.placementId);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    return bidRequests.map(bid => {
      const qtxRequest = {};
      let bidId = '';

      const params = bid.params;
      let placementId = params.placementId;

      let devEnpoint = false;
      if (params.useDev && params.useDev === '1') {
        devEnpoint = '//sdev.sspqns.com/hb';
      }
      let renderMode = 'native';
      for (let i = 0; i < bid.sizes.length; i++) {
        if (bid.sizes[i][0] > 1 && bid.sizes[i][1] > 1) {
          renderMode = 'banner';
          break;
        }
      }

      let mediaType = (bid.mediaType === 'native' || utils.deepAccess(bid, 'mediaTypes.native')) ? 'native' : 'banner';

      if (mediaType === 'native') {
        renderMode = 'native';
      }

      if (!bidId) {
        bidId = bid.bidId;
      }
      qtxRequest.auid = placementId;

      if (bidderRequest && bidderRequest.gdprConsent) {
        qtxRequest.quantx_user_consent_string = bidderRequest.gdprConsent.consentString;
        qtxRequest.quantx_gdpr = bidderRequest.gdprConsent.gdprApplies === true ? 1 : 0;
      };

      const url = devEnpoint || ENDPOINT_URL;

      return {
        method: 'GET',
        bidId: bidId,
        sizes: bid.sizes,
        mediaType: mediaType,
        renderMode: renderMode,
        url: url,
        'data': qtxRequest,
        bidderRequest
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
    const serverBody = serverResponse.body;
    const bidResponses = [];
    let responseCPM;
    let bid = {};
    let id = bidRequest.bidId;

    if (serverBody.price && serverBody.price !== 0) {
      responseCPM = parseFloat(serverBody.price);

      bid.creativeId = serverBody.creative_id || '0';
      bid.cpm = responseCPM;
      bid.requestId = bidRequest.bidId;
      bid.width = 1;
      bid.height = 1;
      bid.ttl = 200;
      bid.netRevenue = true;
      bid.currency = 'USD';

      if (serverBody.native) {
        bid.native = serverBody.native;
      }
      if (serverBody.cobj) {
        bid.cobj = serverBody.cobj;
      }
      if (!utils.isEmpty(bidRequest.sizes)) {
        bid.width = bidRequest.sizes[0][0];
        bid.height = bidRequest.sizes[0][1];
      }

      bid.nurl = serverBody.nurl;
      bid.sync = serverBody.sync;
      if (bidRequest.renderMode && bidRequest.renderMode === 'banner') {
        bid.mediaType = 'banner';
        if (serverBody.native) {
          const adAssetsUrl = '//cdn.elasticad.net/native/serve/js/quantx/quantumAd/';
          let assets = serverBody.native.assets;
          let link = serverBody.native.link;

          let trackers = [];
          if (serverBody.native.imptrackers) {
            trackers = serverBody.native.imptrackers;
          }

          let jstracker = '';
          if (serverBody.native.jstracker) {
            jstracker = encodeURIComponent(serverBody.native.jstracker);
          }

          if (serverBody.nurl) {
            trackers.push(serverBody.nurl);
          }

          let ad = {};
          ad['trackers'] = trackers;
          ad['jstrackers'] = jstracker;
          ad['eventtrackers'] = serverBody.native.eventtrackers || [];

          for (let i = 0; i < assets.length; i++) {
            let asset = assets[i];
            switch (asset['id']) {
              case 1:
                ad['title'] = asset['title']['text'];
                break;
              case 2:
                ad['sponsor_logo'] = asset['img']['url'];
                break;
              case 3:
                ad['content'] = asset['data']['value'];
                break;
              case 4:
                ad['main_image'] = asset['img']['url'];
                break;
              case 6:
                ad['teaser_type'] = 'vast';
                ad['video_url'] = asset['video']['vasttag'];
                break;
              case 10:
                ad['sponsor_name'] = asset['data']['value'];
                break;
              case 2001:
                ad['expanded_content_type'] = 'embed';
                ad['expanded_summary'] = asset['data']['value'];
                break;
              case 2002:
                ad['expanded_content_type'] = 'vast';
                ad['expanded_summary'] = asset['data']['value'];
                break;
              case 2003:
                ad['sponsor_url'] = asset['data']['value'];
                break;
              case 2004: // prism
                ad['content_type'] = 'prism';
                break;
              case 2005: // internal_landing_page
                ad['content_type'] = 'internal_landing_page';
                ad['internal_content_link'] = asset['data']['value'];
                break;
              case 2006: // teaser as vast
                ad['teaser_type'] = 'vast';
                ad['video_url'] = asset['data']['value'];
                break;
              case 2007:
                ad['autoexpand_content_type'] = asset['data']['value'];
                break;
              case 2022: // content page
                ad['content_type'] = 'full_text';
                ad['full_text'] = asset['data']['value'];
                break;
            }
          }

          ad['action_url'] = link.url;

          if (!ad['sponsor_url']) {
            ad['sponsor_url'] = ad['action_url'];
          }

          ad['clicktrackers'] = [];
          if (link.clicktrackers) {
            ad['clicktrackers'] = link.clicktrackers;
          }

          ad['main_image'] = '//resize-ssp.adux.com/scalecrop-290x130/' + window.btoa(ad['main_image']) + '/external';

          bid.ad = '<div id="ead_' + id + '\">' +
            '<div class="ad_container ead_' + id + '" style="clear: both; display:inline-block;width:100%">' +
            '  <div class="image_content">' +
            '    <a href="' + ad['action_url'] + '" class="ea_expand" target="_blank"><img src="' + ad['main_image'] + '" class="ea_image ead_image">' +
            '    </a>' +
            '  </div>' +
            '  <div class="ead_content"><a href="' + ad['action_url'] + '" class="ea_expand" style="text-decoration: none" target="_blank"><h2 style="margin:0px;">' + ad['title'] + '</h2></a>' +
            '    <p class="ea_summary">' + ad['content'] + '&nbsp;</p></div>' +
            '  <div style="text-align:right;" class="ea_hide_brand_logo ea_hide_brand_name">' +
            '    <p style="margin:0;"><span class="ea_creative_var_label">Sponsored by</span>' +
            '      <a href="' + ad['sponsor_url'] + '" class="ea_link" target="_blank" style="display:inline;" target="_blank"><img src="' + ad['sponsor_logo'] + '" class="ea_image" style="vertical-align:middle;"></a>' +
            '    </p>' +
            '  </div>' +
            '</div>' +
            '<script type="application/javascript">var eanAD = ' + JSON.stringify(ad) + ';</script>' +
            '<script src="' + adAssetsUrl + 'qad.js" type="application/javascript"></script>' +
            '<link rel="stylesheet" href="' + adAssetsUrl + 'qad.css">' +
            '</div>';
        }
      } else {
        // native
        bid.mediaType = 'native';
        if (bidRequest.mediaType === 'native') {
          if (serverBody.native) {
            let assets = serverBody.native.assets;
            let link = serverBody.native.link;

            let trackers = [];
            if (serverBody.native.imptrackers) {
              trackers = serverBody.native.imptrackers;
            }

            if (serverBody.nurl) {
              trackers.push(serverBody.nurl);
            }

            let native = {};

            for (let i = 0; i < assets.length; i++) {
              let asset = assets[i];
              switch (asset['id']) {
                case 1:
                  native.title = asset['title']['text'];
                  break;
                case 2:
                  native.icon = {
                    url: asset['img']['url'],
                    width: asset['img']['w'],
                    height: asset['img']['h']
                  };
                  break;
                case 3:
                  native.body = asset['data']['value'];
                  break;
                case 4:
                  native.image = {
                    url: asset['img']['url'],
                    width: asset['img']['w'],
                    height: asset['img']['h']
                  };
                  break;
                case 10:
                  native.sponsoredBy = asset['data']['value'];
                  break;
              }
            }
            native.cta = 'read more';
            if (serverBody.language) {
              native.cta = 'read more';
            }

            native.clickUrl = link.url;
            native.impressionTrackers = trackers;
            if (link.clicktrackers) {
              native.clickTrackers = link.clicktrackers;
            }
            native.eventtrackers = native.eventtrackers || [];

            bid.qtx_native = utils.deepClone(serverBody.native);
            bid.native = native;
          }
        }
      }
      bidResponses.push(bid);
    }

    return bidResponses;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse} serverResponse A successful response from the server
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (syncOptions, serverResponse) {
    const syncs = [];
    utils._each(serverResponse, function(serverResponse) {
      if (serverResponse.body && serverResponse.body.sync) {
        utils._each(serverResponse.body.sync, function (pixel) {
          syncs.push({
            type: 'image',
            url: pixel
          });
        });
      }
    });
    return syncs;
  }
}
registerBidder(spec);
