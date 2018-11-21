import * as utils from 'src/utils';
import { Renderer } from 'src/Renderer';
import { registerBidder } from 'src/adapters/bidderFactory';
import { VIDEO } from 'src/mediaTypes';

const BIDDER_CODE = 'spotx';
const URL = '//search.spotxchange.com/openrtb/2.3/dados/';
const ORTB_VERSION = '2.3';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['spotx'],
  supportedMediaTypes: [VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   * From Prebid.js: isBidRequestValid - Verify the the AdUnits.bids, respond with true (valid) or false (invalid).
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    if (bid && typeof bid.params !== 'object') {
      utils.logError(BIDDER_CODE + ': params is not defined or is incorrect in the bidder settings.');
      return false;
    }

    if (!utils.deepAccess(bid, 'mediaTypes.video')) {
      utils.logError(BIDDER_CODE + ': mediaTypes.video is not present in the bidder settings.');
      return false;
    }

    const playerSize = utils.deepAccess(bid, 'mediaTypes.video.playerSize');
    if (!playerSize || !utils.isArray(playerSize)) {
      utils.logError(BIDDER_CODE + ': mediaTypes.video.playerSize is not defined in the bidder settings.');
      return false;
    }

    if (!utils.getBidIdParameter('channel_id', bid.params)) {
      utils.logError(BIDDER_CODE + ': channel_id is not present in bidder params');
      return false;
    }

    const videoMediaType = utils.deepAccess(bid, 'mediaTypes.video');
    const context = utils.deepAccess(bid, 'mediaTypes.video.context');
    if ((bid.mediaType === 'video' || (videoMediaType && context !== 'outstream')) || utils.getBidIdParameter('ad_unit', bid.params) == 'outstream') {
      if (!utils.getBidIdParameter('outstream_function', bid.params)) {
        if (!utils.getBidIdParameter('outstream_options', bid.params)) {
          utils.logError(BIDDER_CODE + ': please define outstream_options parameter or override the default SpotX outstream rendering by defining your own Outstream function using field outstream_function.');
          return false;
        }
        if (!utils.getBidIdParameter('slot', bid.params.outstream_options)) {
          utils.logError(BIDDER_CODE + ': please define parameters slot outstream_options object in the configuration.');
          return false;
        }
      }
    }

    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   * from Prebid.js: buildRequests - Takes an array of valid bid requests, all of which are guaranteed to have passed the isBidRequestValid() test.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests, bidderRequest) {
    const page = bidderRequest.refererInfo.referer;
    const isPageSecure = !!page.match(/^https:/)

    const siteId = '';
    const bid = bidderRequest.bids[0];
    const channelId = utils.getBidIdParameter('channel_id', bid.params);
    let pubcid = null;

    const playerSize = utils.deepAccess(bid, 'mediaTypes.video.playerSize');
    const contentWidth = playerSize[0][0];
    const contentHeight = playerSize[0][1];

    const spotxImps = bidRequests.map(function(bid) {
      const secure = isPageSecure || (utils.getBidIdParameter('secure', bid.params) ? 1 : 0);

      const ext = {
        player_width: contentWidth,
        player_height: contentHeight,
        sdk_name: 'Prebid 1+',
        ad_mute: +!!utils.getBidIdParameter('ad_mute', bid.params),
        hide_skin: +!!utils.getBidIdParameter('hide_skin', bid.params),
        content_page_url: page,
        versionOrtb: ORTB_VERSION,
        bidId: bid.bidId
      };

      if (utils.getBidIdParameter('ad_volume', bid.params) != '') {
        ext.ad_volume = utils.getBidIdParameter('ad_volume', bid.params);
      }

      if (utils.getBidIdParameter('ad_unit', bid.params) != '') {
        ext.ad_unit = utils.getBidIdParameter('ad_unit', bid.params);
      }

      if (utils.getBidIdParameter('outstream_options', bid.params) != '') {
        ext.outstream_options = utils.getBidIdParameter('outstream_options', bid.params);
      }

      if (utils.getBidIdParameter('outstream_function', bid.params) != '') {
        ext.outstream_function = utils.getBidIdParameter('outstream_function', bid.params);
      }

      if (utils.getBidIdParameter('custom', bid.params) != '') {
        ext.custom = utils.getBidIdParameter('custom', bid.params);
      }

      const mimes = utils.getBidIdParameter('mimes', bid.params) || ['application/javascript', 'video/mp4', 'video/webm'];

      const spotxImp = {
        id: Date.now(),
        secure: secure,
        video: {
          w: contentWidth,
          h: contentHeight,
          ext: ext,
          mimes: mimes
        }
      };

      if (utils.getBidIdParameter('price_floor', bid.params) != '') {
        spotxImp.bidfloor = utils.getBidIdParameter('price_floor', bid.params);
      }

      if (utils.getBidIdParameter('start_delay', bid.params) != '') {
        spotxImp.video.startdelay = 0 + Boolean(utils.getBidIdParameter('start_delay', bid.params));
      }

      if (bid.crumbs && bid.crumbs.pubcid) {
        pubcid = bid.crumbs.pubcid;
      }

      return spotxImp;
    });

    const language = navigator.language ? 'language' : 'userLanguage';
    const device = {
      h: screen.height,
      w: screen.width,
      dnt: utils.getDNT() ? 1 : 0,
      language: navigator[language].split('-')[0],
      make: navigator.vendor ? navigator.vendor : '',
      ua: navigator.userAgent
    };

    let requestPayload = {
      id: channelId,
      imp: spotxImps,
      site: {
        id: siteId,
        page: page,
        content: 'content',
      },
      device: device,
      ext: {
        wrap_response: 1
      }
    };

    if (utils.getBidIdParameter('number_of_ads', bid.params)) {
      requestPayload['ext']['number_of_ads'] = utils.getBidIdParameter('number_of_ads', bid.params);
    }

    let userExt = {};

    // Add GDPR flag and consent string
    if (bidderRequest && bidderRequest.gdprConsent) {
      userExt.consent = bidderRequest.gdprConsent.consentString;

      if (typeof bidderRequest.gdprConsent.gdprApplies !== 'undefined') {
        requestPayload.regs = {
          ext: {
            gdpr: (bidderRequest.gdprConsent.gdprApplies ? 1 : 0)
          }
        };
      }
    }

    // Add common id if available
    if (pubcid) {
      userExt.fpc = pubcid;
    }

    // Only add the user object if it's not empty
    if (!utils.isEmpty(userExt)) {
      requestPayload.user = { ext: userExt };
    }

    return {
      method: 'POST',
      url: URL + channelId,
      data: requestPayload,
      bidRequest: bidderRequest
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidderRequest) {
    const bidResponses = [];
    const serverResponseBody = serverResponse.body;

    const requestMap = {};
    if (bidderRequest && bidderRequest.data && bidderRequest.data.imp) {
      utils._each(bidderRequest.data.imp, imp => requestMap[imp.id] = imp);
    }

    if (serverResponseBody && utils.isArray(serverResponseBody.seatbid)) {
      utils._each(serverResponseBody.seatbid, function(bids) {
        utils._each(bids.bid, function(spotxBid) {
          const request = requestMap[spotxBid.impid];

          const bid = {
            requestId: request.video.ext.bidId,
            currency: serverResponseBody.cur || 'USD',
            cpm: spotxBid.price,
            creativeId: spotxBid.crid || '',
            ttl: 360,
            netRevenue: true,
            channel_id: serverResponseBody.id,
            cache_key: spotxBid.ext.cache_key,
            slot: request.video.ext.slot
          };

          if (request.video) {
            bid.vastUrl = '//search.spotxchange.com/ad/vast.html?key=' + spotxBid.ext.cache_key;
            bid.mediaType = VIDEO;
            bid.width = spotxBid.w;
            bid.height = spotxBid.h;
          }

          const videoMediaType = utils.deepAccess(bidderRequest, 'mediaTypes.video');
          const context = utils.deepAccess(bidderRequest, 'mediaTypes.video.context');
          if ((bid.mediaType === 'video' || (videoMediaType && context !== 'outstream')) || (request.video.ext.ad_unit == 'outstream')) {
            const renderer = Renderer.install({
              id: 0,
              url: '//',
              config: {
                adText: 'SpotX Outstream Video Ad via Prebid.js',
                player_width: request.video.ext.player_width,
                player_height: request.video.ext.player_height,
                content_page_url: request.video.ext.content_page_url,
                ad_mute: request.video.ext.ad_mute,
                outstream_options: request.video.ext.outstream_options,
                outstream_function: request.video.ext.outstream_function
              }
            });

            try {
              renderer.setRender(outstreamRender);
              renderer.setEventHandlers({
                impression: function impression() {
                  return utils.logMessage('SpotX outstream video impression event');
                },
                loaded: function loaded() {
                  return utils.logMessage('SpotX outstream video loaded event');
                },
                ended: function ended() {
                  utils.logMessage('SpotX outstream renderer video event');
                }
              });
            } catch (err) {
              utils.logWarn('Prebid Error calling setRender or setEve,tHandlers on renderer', err);
            }
            bid.renderer = renderer;
          }

          bidResponses.push(bid);
        })
      });
    }

    return bidResponses;
  }
}

function outstreamRender(bid) {
  if (bid.renderer.config.outstream_function != null && typeof bid.renderer.config.outstream_function === 'function') {
    bid.renderer.config.outstream_function(bid);
  } else {
    try {
      utils.logMessage('[SPOTX][renderer] Handle SpotX outstream renderer');
      const slot = utils.getBidIdParameter('slot', bid.renderer.config.outstream_options);
      const contentWidth = utils.getBidIdParameter('content_width', bid.renderer.config.outstream_options);
      const contentHeight = utils.getBidIdParameter('content_height', bid.renderer.config.outstream_options);
      const inIframe = utils.getBidIdParameter('in_iframe', bid.renderer.config.outstream_options);
      const script = window.document.createElement('script');
      script.type = 'text/javascript';
      script.src = '//js.spotx.tv/easi/v1/' + bid.channel_id + '.js';
      let dataSpotXParams = {};
      dataSpotXParams['data-spotx_channel_id'] = '' + bid.channel_id;
      dataSpotXParams['data-spotx_vast_url'] = '' + bid.vastUrl;
      dataSpotXParams['data-spotx_content_page_url'] = bid.renderer.config.content_page_url;
      dataSpotXParams['data-spotx_ad_unit'] = 'incontent';

      utils.logMessage('[SPOTX][renderer] Default beahavior');
      if (utils.getBidIdParameter('ad_mute', bid.renderer.config.outstream_options)) {
        dataSpotXParams['data-spotx_ad_mute'] = '0';
      }
      dataSpotXParams['data-spotx_collapse'] = '0';
      dataSpotXParams['data-spotx_autoplay'] = '1';
      dataSpotXParams['data-spotx_blocked_autoplay_override_mode'] = '1';
      dataSpotXParams['data-spotx_video_slot_can_autoplay'] = '1';

      const customOverride = utils.getBidIdParameter('custom_override', bid.renderer.config.outstream_options);
      if (customOverride && utils.isArray(customOverride)) {
        utils.logMessage('[SPOTX][renderer] Custom beahavior.');
        customOverride.forEach(function(elt) {
          if (!utils.getBidIdParameter('name', elt) && !utils.getBidIdParameter('value', elt)) {
            utils.logWarn('[SPOTX][renderer] Custom beahavior: this option is wrong: ' + elt);
            return;
          }
          if (elt.name === 'channel_id' || elt.name === 'vast_url' || elt.name === 'content_page_url' || elt.name === 'ad_unit') {
            utils.logWarn('[SPOTX][renderer] Custom beahavior: following option cannot be overrided: ' + elt.name);
            return;
          }
          dataSpotXParams['data-spotx_' + elt.name] = elt.value;
        });
      }

      for (let key in dataSpotXParams) {
        if (dataSpotXParams.hasOwnProperty(key)) {
          script.setAttribute(key, dataSpotXParams[key]);
        }
      }

      const inIframe = utils.getBidIdParameter('in_iframe', bid.renderer.config.outstream_options);
      if (inIframe && window.document.getElementById(inIframe).nodeName == 'IFRAME') {
        const rawframe = window.document.getElementById(inIframe);
        let framedoc = rawframe.contentDocument;
        if (!framedoc && rawframe.contentWindow) {
          framedoc = rawframe.contentWindow.document;
        }
        framedoc.body.appendChild(script);
      } else {
        const slot = utils.getBidIdParameter('slot', bid.renderer.config.outstream_options);
        if (slot && window.document.getElementById(slot)) {
          window.document.getElementById(slot).appendChild(script);
        } else {
          window.document.getElementsByTagName('head')[0].appendChild(script);
        }
      }
    } catch (err) {
      utils.logError('[SPOTX][renderer] Error:' + err.message)
    }
  }
}

registerBidder(spec);
