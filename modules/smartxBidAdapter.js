import * as utils from '../src/utils.js';
import {
  Renderer
} from '../src/Renderer.js';
import {
  registerBidder
} from '../src/adapters/bidderFactory.js';
import {
  VIDEO
} from '../src/mediaTypes.js';
const BIDDER_CODE = 'smartx';
const URL = 'https://bid.sxp.smartclip.net/bid/1000';
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   * From Prebid.js: isBidRequestValid - Verify the the AdUnits.bids, respond with true (valid) or false (invalid).
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
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
    if (!utils.getBidIdParameter('tagId', bid.params)) {
      utils.logError(BIDDER_CODE + ': tagId is not present in bidder params');
      return false;
    }
    if (!utils.getBidIdParameter('publisherId', bid.params)) {
      utils.logError(BIDDER_CODE + ': publisherId is not present in bidder params');
      return false;
    }
    if (!utils.getBidIdParameter('siteId', bid.params)) {
      utils.logError(BIDDER_CODE + ': siteId is not present in bidder params');
      return false;
    }
    if (utils.deepAccess(bid, 'mediaTypes.video.context') === 'outstream') {
      if (!utils.getBidIdParameter('outstream_options', bid.params)) {
        utils.logError(BIDDER_CODE + ': outstream_options parameter is not defined');
        return false;
      }
      if (!utils.getBidIdParameter('slot', bid.params.outstream_options)) {
        utils.logError(BIDDER_CODE + ': slot parameter is not defined in outstream_options object in the configuration');
        return false;
      }
      if (!utils.getBidIdParameter('outstream_function', bid.params)) {
        utils.logMessage(BIDDER_CODE + ': outstream_function parameter is not defined. The default outstream renderer will be injected in the header.');
        return true;
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
  buildRequests: function (bidRequests, bidderRequest) {
    const page = bidderRequest.refererInfo.referer;
    const isPageSecure = !!page.match(/^https:/)

    const smartxRequests = bidRequests.map(function (bid) {
      const tagId = utils.getBidIdParameter('tagId', bid.params);
      const publisherId = utils.getBidIdParameter('publisherId', bid.params);
      const bidfloor = getBidFloor(bid) || 0;
      const bidfloorcur = utils.getBidIdParameter('bidfloorcur', bid.params) || 'EUR';
      const siteId = utils.getBidIdParameter('siteId', bid.params);
      const domain = utils.getBidIdParameter('domain', bid.params);
      const cat = utils.getBidIdParameter('cat', bid.params) || [''];
      let pubcid = null;
      const playerSize = utils.deepAccess(bid, 'mediaTypes.video.playerSize');
      const contentWidth = playerSize[0][0];
      const contentHeight = playerSize[0][1];
      const secure = +(isPageSecure || (utils.getBidIdParameter('secure', bid.params) ? 1 : 0));
      const ext = {
        sdk_name: 'Prebid 1+'
      };
      const mimes = utils.getBidIdParameter('mimes', bid.params) || ['application/javascript', 'video/mp4', 'video/webm'];
      const linearity = utils.getBidIdParameter('linearity', bid.params) || 1;
      const minduration = utils.getBidIdParameter('minduration', bid.params) || 0;
      const maxduration = utils.getBidIdParameter('maxduration', bid.params) || 500;
      const startdelay = utils.getBidIdParameter('startdelay', bid.params) || 0;
      const minbitrate = utils.getBidIdParameter('minbitrate', bid.params) || 0;
      const maxbitrate = utils.getBidIdParameter('maxbitrate', bid.params) || 3500;
      const delivery = utils.getBidIdParameter('delivery', bid.params) || [2];
      const pos = utils.getBidIdParameter('pos', bid.params) || 1;
      const api = utils.getBidIdParameter('api', bid.params) || [2];
      const protocols = utils.getBidIdParameter('protocols', bid.params) || [2, 3, 5, 6];
      var contextcustom = utils.deepAccess(bid, 'mediaTypes.video.context');
      var placement = 1;

      if (contextcustom === 'outstream') {
        placement = 3;
      }

      let smartxReq = [{
        id: bid.bidId,
        secure: secure,
        bidfloor: bidfloor,
        bidfloorcur: bidfloorcur,
        video: {
          w: contentWidth,
          h: contentHeight,
          mimes: mimes,
          linearity: linearity,
          minduration: minduration,
          maxduration: maxduration,
          startdelay: startdelay,
          protocols: protocols,
          minbitrate: minbitrate,
          maxbitrate: maxbitrate,
          delivery: delivery,
          pos: pos,
          placement: placement,
          api: api,
          ext: ext
        },
        tagid: tagId,
        ext: {
          'smart.bidpricetype': 1
        }
      }];

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

      const at = utils.getBidIdParameter('at', bid.params) || 2;

      const cur = utils.getBidIdParameter('cur', bid.params) || ['EUR'];

      const requestPayload = {
        id: utils.generateUUID(),
        imp: smartxReq,
        site: {
          id: siteId,
          page: page,
          cat: cat,
          domain: domain,
          publisher: {
            id: publisherId
          }
        },
        device: device,
        at: at,
        cur: cur
      };

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
        requestPayload.user = {
          ext: userExt
        };
      }

      // Targeting
      if (utils.getBidIdParameter('data', bid.params.user)) {
        var targetingarr = [];
        for (var i = 0; i < bid.params.user.data.length; i++) {
          var isemq = (bid.params.user.data[i].name) || 'empty';
          if (isemq !== 'empty') {
            var provider = bid.params.user.data[i].name;
            var targetingstring = (bid.params.user.data[i].segment[0].value) || 'empty';
            targetingarr.push({
              id: provider,
              name: provider,
              segment: {
                name: provider,
                value: targetingstring,
              }
            })
          }
        }

        // Todo: USER ID MODULE

        requestPayload.user = {
          ext: userExt,
          data: targetingarr
        }
      }

      return {
        method: 'POST',
        url: URL,
        data: requestPayload,
        bidRequest: bidderRequest,
        options: {
          contentType: 'application/json',
          customHeaders: {
            'x-openrtb-version': '2.3'
          }
        }
      };
    });

    return smartxRequests;
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidderRequest) {
    const bidResponses = [];
    const serverResponseBody = serverResponse.body;
    if (serverResponseBody && utils.isArray(serverResponseBody.seatbid)) {
      utils._each(serverResponseBody.seatbid, function (bids) {
        utils._each(bids.bid, function (smartxBid) {
          let currentBidRequest = {};
          for (let i in bidderRequest.bidRequest.bids) {
            if (smartxBid.impid == bidderRequest.bidRequest.bids[i].bidId) {
              currentBidRequest = bidderRequest.bidRequest.bids[i];
            }
          }
          /**
           * Make sure currency and price are the right ones
           * TODO: what about the pre_market_bid partners sizes?
           */
          utils._each(currentBidRequest.params.pre_market_bids, function (pmb) {
            if (pmb.deal_id == smartxBid.id) {
              smartxBid.price = pmb.price;
              serverResponseBody.cur = pmb.currency;
            }
          });

          const bid = {
            requestId: currentBidRequest.bidId,
            currency: serverResponseBody.cur || 'USD',
            cpm: smartxBid.price,
            creativeId: smartxBid.crid || '',
            ttl: 360,
            netRevenue: true,
            vastContent: smartxBid.adm,
            vastXml: smartxBid.adm,
            mediaType: VIDEO,
            width: smartxBid.w,
            height: smartxBid.h
          };

          bid.meta = bid.meta || {};
          if (smartxBid && smartxBid.adomain && smartxBid.adomain.length > 0) {
            bid.meta.advertiserDomains = smartxBid.adomain;
          }

          const context = utils.deepAccess(currentBidRequest, 'mediaTypes.video.context');

          if (context === 'outstream') {
            const playersize = utils.deepAccess(currentBidRequest, 'mediaTypes.video.playerSize');
            const renderer = Renderer.install({
              id: 0,
              url: '/',
              config: {
                adText: 'SmartX Outstream Video Ad via Prebid.js',
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
                  return utils.logMessage('SmartX outstream video impression event');
                },
                loaded: function loaded() {
                  return utils.logMessage('SmartX outstream video loaded event');
                },
                ended: function ended() {
                  return utils.logMessage('SmartX outstream renderer video event');
                }
              });
            } catch (err) {
              utils.logWarn('Prebid Error calling setRender or setEventHandlers on renderer', err);
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
  const confMinAdWidth = utils.getBidIdParameter('minAdWidth', bid.renderer.config.outstream_options) || 290;
  const confMaxAdWidth = utils.getBidIdParameter('maxAdWidth', bid.renderer.config.outstream_options) || 900;
  const confStartOpen = utils.getBidIdParameter('startOpen', bid.renderer.config.outstream_options);
  const confEndingScreen = utils.getBidIdParameter('endingScreen', bid.renderer.config.outstream_options);
  const confTitle = utils.getBidIdParameter('title', bid.renderer.config.outstream_options);
  const confSkipOffset = utils.getBidIdParameter('skipOffset', bid.renderer.config.outstream_options);
  const confDesiredBitrate = utils.getBidIdParameter('desiredBitrate', bid.renderer.config.outstream_options);
  const elementId = utils.getBidIdParameter('slot', bid.renderer.config.outstream_options) || bid.adUnitCode;

  utils.logMessage('[SMARTX][renderer] Handle SmartX outstream renderer');

  var smartPlayObj = {
    minAdWidth: confMinAdWidth,
    maxAdWidth: confMaxAdWidth,
    title: confTitle,
    skipOffset: confSkipOffset,
    startOpen: confStartOpen,
    endingScreen: confEndingScreen,
    desiredBitrate: confDesiredBitrate,
    onStartCallback: function (m, n) {
      try {
        window.sc_smartIntxtStart(n);
      } catch (f) {}
    },
    onCappedCallback: function (m, n) {
      try {
        window.sc_smartIntxtNoad(n);
      } catch (f) {}
    },
    onEndCallback: function (m, n) {
      try {
        window.sc_smartIntxtEnd(n);
      } catch (f) {}
    },
  };

  smartPlayObj.adResponse = bid.vastContent;

  const divID = '[id="' + elementId + '"]';
  var script = document.createElement('script');
  script.src = 'https://dco.smartclip.net/?plc=7777778';
  script.type = 'text/javascript';
  script.async = 'true';
  script.onload = script.onreadystatechange = function () {
    try {
      // eslint-disable-next-line
      let _outstreamPlayer = new OutstreamPlayer(divID, smartPlayObj);
    } catch (e) {
      utils.logError('[SmartPlay][renderer] Error caught: ' + e);
    }
  };
  return script;
}

function outstreamRender(bid) {
  const script = createOutstreamScript(bid);
  if (bid.renderer.config.outstream_function != null && typeof bid.renderer.config.outstream_function === 'function') {
    bid.renderer.config.outstream_function(bid, script);
  } else {
    try {
      const slot = utils.getBidIdParameter('slot', bid.renderer.config.outstream_options);
      if (slot && window.document.getElementById(slot)) {
        window.document.getElementById(slot).appendChild(script);
      } else {
        window.document.getElementsByTagName('head')[0].appendChild(script);
      }
    } catch (err) {
      utils.logError('[SMARTX][renderer] Error:' + err.message)
    }
  }
}

/**
 * Get the floor price from bid.params for backward compatibility.
 * If not found, then check floor module.
 * @param bid A valid bid object
 * @returns {*|number} floor price
 */
function getBidFloor(bid) {
  let floor = utils.getBidIdParameter('bidfloor', bid.params);
  let floorcur = utils.getBidIdParameter('bidfloorcur', bid.params) || 'EUR';

  if (!floor && utils.isFn(bid.getFloor)) {
    const floorObj = bid.getFloor({
      currency: floorcur,
      mediaType: '*',
      size: '*'
    });

    if (utils.isPlainObject(floorObj) && !isNaN(floorObj.floor) && floorObj.currency === floorcur) {
      floor = floorObj.floor;
    }
  }

  return floor;
}

registerBidder(spec);
