import * as utils from '../src/utils';
import { Renderer } from '../src/Renderer';
import { registerBidder } from '../src/adapters/bidderFactory';
import { VIDEO } from '../src/mediaTypes';

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

    if (utils.deepAccess(bid, 'mediaTypes.video.context') == 'outstream' || utils.deepAccess(bid, 'params.ad_unit') == 'outstream') {
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
    const spotxRequests = bidRequests.map(function(bid) {
      const channelId = utils.getBidIdParameter('channel_id', bid.params);
      let pubcid = null;

      const playerSize = utils.deepAccess(bid, 'mediaTypes.video.playerSize');
      const contentWidth = playerSize[0][0];
      const contentHeight = playerSize[0][1];

      const secure = isPageSecure || (utils.getBidIdParameter('secure', bid.params) ? 1 : 0);

      const ext = {
        sdk_name: 'Prebid 1+',
        versionOrtb: ORTB_VERSION
      };

      if (utils.getBidIdParameter('hide_skin', bid.params) != '') {
        ext.hide_skin = +!!utils.getBidIdParameter('hide_skin', bid.params);
      }

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

      if (utils.getBidIdParameter('pre_market_bids', bid.params) != '' && utils.isArray(utils.getBidIdParameter('pre_market_bids', bid.params))) {
        const preMarketBids = utils.getBidIdParameter('pre_market_bids', bid.params);
        ext.pre_market_bids = [];
        for (let i in preMarketBids) {
          const preMarketBid = preMarketBids[i];
          let vastStr = '';
          if (preMarketBid['vast_url']) {
            vastStr = '<?xml version="1.0" encoding="utf-8"?><VAST version="2.0"><Ad><Wrapper><VASTAdTagURI>' + preMarketBid['vast_url'] + '</VASTAdTagURI></Wrapper></Ad></VAST>';
          } else if (preMarketBid['vast_string']) {
            vastStr = preMarketBid['vast_string'];
          }
          ext.pre_market_bids.push({
            id: preMarketBid['deal_id'],
            seatbid: [{
              bid: [{
                impid: Date.now(),
                dealid: preMarketBid['deal_id'],
                price: preMarketBid['price'],
                adm: vastStr
              }]
            }],
            cur: preMarketBid['currency'],
            ext: {
              event_log: [{}]
            }
          });
        }
      }

      const mimes = utils.getBidIdParameter('mimes', bid.params) || ['application/javascript', 'video/mp4', 'video/webm'];

      const spotxReq = {
        id: bid.bidId,
        secure: secure,
        video: {
          w: contentWidth,
          h: contentHeight,
          ext: ext,
          mimes: mimes
        }
      };

      if (utils.getBidIdParameter('price_floor', bid.params) != '') {
        spotxReq.bidfloor = utils.getBidIdParameter('price_floor', bid.params);
      }

      if (utils.getBidIdParameter('start_delay', bid.params) != '') {
        spotxReq.video.startdelay = 0 + Boolean(utils.getBidIdParameter('start_delay', bid.params));
      }

      if (bid.crumbs && bid.crumbs.pubcid) {
        pubcid = bid.crumbs.pubcid;
      }

      const language = navigator.language ? 'language' : 'userLanguage';
      const device = {
        h: screen.height,
        w: screen.width,
        dnt: utils.getDNT() ? 1 : 0,
        language: navigator[language].split('-')[0],
        make: navigator.vendor ? navigator.vendor : '',
        ua: navigator.userAgent
      };

      const requestPayload = {
        id: channelId,
        imp: spotxReq,
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

      const userExt = {};

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
    });

    return spotxRequests;
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

    if (serverResponseBody && utils.isArray(serverResponseBody.seatbid)) {
      utils._each(serverResponseBody.seatbid, function(bids) {
        utils._each(bids.bid, function(spotxBid) {
          let currentBidRequest = {};
          for (let i in bidderRequest.bidRequest.bids) {
            if (spotxBid.impid == bidderRequest.bidRequest.bids[i].bidId) {
              currentBidRequest = bidderRequest.bidRequest.bids[i];
            }
          }

          /**
           * Make sure currency and price are the right ones
           * TODO: what about the pre_market_bid partners sizes?
           */
          utils._each(currentBidRequest.params.pre_market_bids, function(pmb) {
            if (pmb.deal_id == spotxBid.id) {
              spotxBid.price = pmb.price;
              serverResponseBody.cur = pmb.currency;
            }
          });

          const bid = {
            requestId: currentBidRequest.bidId,
            currency: serverResponseBody.cur || 'USD',
            cpm: spotxBid.price,
            creativeId: spotxBid.crid || '',
            ttl: 360,
            netRevenue: true,
            channel_id: serverResponseBody.id,
            cache_key: spotxBid.ext.cache_key,
            vastUrl: '//search.spotxchange.com/ad/vast.html?key=' + spotxBid.ext.cache_key,
            mediaType: VIDEO,
            width: spotxBid.w,
            height: spotxBid.h
          };

          const context1 = utils.deepAccess(currentBidRequest, 'mediaTypes.video.context');
          const context2 = utils.deepAccess(currentBidRequest, 'params.ad_unit');
          if (context1 == 'outstream' || context2 == 'outstream') {
            const playersize = utils.deepAccess(currentBidRequest, 'mediaTypes.video.playerSize');
            const renderer = Renderer.install({
              id: 0,
              url: '//',
              config: {
                adText: 'SpotX Outstream Video Ad via Prebid.js',
                player_width: playersize[0][0],
                player_height: playersize[0][1],
                content_page_url: utils.deepAccess(bidderRequest, 'data.site.page'),
                ad_mute: +!!utils.deepAccess(currentBidRequest, 'params.ad_mute'),
                hide_skin: +!!utils.deepAccess(currentBidRequest, 'params.hide_skin'),
                outstream_options: utils.deepAccess(currentBidRequest, 'params.outstream_options'),
                outstream_function: utils.deepAccess(currentBidRequest, 'params.outstream_function')
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

function createOutstreamScript(bid) {
  const slot = utils.getBidIdParameter('slot', bid.renderer.config.outstream_options);
  utils.logMessage('[SPOTX][renderer] Handle SpotX outstream renderer');
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

  const playersizeAutoAdapt = utils.getBidIdParameter('playersize_auto_adapt', bid.renderer.config.outstream_options);
  if (playersizeAutoAdapt && utils.isBoolean(playersizeAutoAdapt) && playersizeAutoAdapt === true) {
    if (bid.width && utils.isNumber(bid.width) && bid.height && utils.isNumber(bid.height)) {
      const ratio = bid.width / bid.height;
      const slotClientWidth = window.document.getElementById(slot).clientWidth;
      let playerWidth = bid.renderer.config.player_width;
      let playerHeight = bid.renderer.config.player_height;
      let contentWidth = 0;
      let contentHeight = 0;
      if (slotClientWidth < playerWidth) {
        playerWidth = slotClientWidth;
        playerHeight = playerWidth / ratio;
      }
      if (ratio <= 1) {
        contentWidth = Math.round(playerHeight * ratio);
        contentHeight = playerHeight;
      } else {
        contentWidth = playerWidth;
        contentHeight = Math.round(playerWidth / ratio);
      }

      dataSpotXParams['data-spotx_content_width'] = '' + contentWidth;
      dataSpotXParams['data-spotx_content_height'] = '' + contentHeight;
    } else {
      utils.logWarn('[SPOTX][renderer] PlayerSize auto adapt: bid.width and bid.height are incorrect');
    }
  }

  const customOverride = utils.getBidIdParameter('custom_override', bid.renderer.config.outstream_options);
  if (customOverride && utils.isPlainObject(customOverride)) {
    utils.logMessage('[SPOTX][renderer] Custom beahavior.');
    for (let name in customOverride) {
      if (customOverride.hasOwnProperty(name)) {
        if (name === 'channel_id' || name === 'vast_url' || name === 'content_page_url' || name === 'ad_unit') {
          utils.logWarn('[SPOTX][renderer] Custom beahavior: following option cannot be overrided: ' + name);
        } else {
          dataSpotXParams['data-spotx_' + name] = customOverride[name];
        }
      }
    }
  }

  for (let key in dataSpotXParams) {
    if (dataSpotXParams.hasOwnProperty(key)) {
      script.setAttribute(key, dataSpotXParams[key]);
    }
  }

  return script;
}

function outstreamRender(bid) {
  const script = createOutstreamScript(bid);
  if (bid.renderer.config.outstream_function != null && typeof bid.renderer.config.outstream_function === 'function') {
    bid.renderer.config.outstream_function(bid, script);
  } else {
    try {
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
