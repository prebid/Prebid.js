import { getDNT } from '../libraries/navigatorData/dnt.js';
import {
  logError,
  deepAccess,
  isArray,
  generateUUID,
  isEmpty,
  _each,
  logMessage,
  logWarn,
  isFn,
  isPlainObject,
  getBidIdParameter
} from '../src/utils.js';
import {
  Renderer
} from '../src/Renderer.js';
import {
  registerBidder
} from '../src/adapters/bidderFactory.js';
import {
  VIDEO
} from '../src/mediaTypes.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'smartx';
const URL = 'https://bid.sxp.smartclip.net/bid/1000';
const GVLID = 115;
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
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
      logError(BIDDER_CODE + ': params is not defined or is incorrect in the bidder settings.');
      return false;
    }
    if (!deepAccess(bid, 'mediaTypes.video')) {
      logError(BIDDER_CODE + ': mediaTypes.video is not present in the bidder settings.');
      return false;
    }
    const playerSize = deepAccess(bid, 'mediaTypes.video.playerSize');
    if (!playerSize || !isArray(playerSize)) {
      logError(BIDDER_CODE + ': mediaTypes.video.playerSize is not defined in the bidder settings.');
      return false;
    }
    if (!getBidIdParameter('tagId', bid.params)) {
      logError(BIDDER_CODE + ': tagId is not present in bidder params');
      return false;
    }
    if (!getBidIdParameter('publisherId', bid.params)) {
      logError(BIDDER_CODE + ': publisherId is not present in bidder params');
      return false;
    }
    if (!getBidIdParameter('siteId', bid.params)) {
      logError(BIDDER_CODE + ': siteId is not present in bidder params');
      return false;
    }
    if (deepAccess(bid, 'mediaTypes.video.context') === 'outstream') {
      if (!getBidIdParameter('outstream_options', bid.params)) {
        logError(BIDDER_CODE + ': outstream_options parameter is not defined');
        return false;
      }
      if (!getBidIdParameter('slot', bid.params.outstream_options)) {
        logError(BIDDER_CODE + ': slot parameter is not defined in outstream_options object in the configuration');
        return false;
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
    const page = bidderRequest.refererInfo.page || bidderRequest.refererInfo.topmostLocation;
    const isPageSecure = !!page.match(/^https:/)

    const smartxRequests = bidRequests.map(function (bid) {
      const tagId = getBidIdParameter('tagId', bid.params);
      const publisherId = getBidIdParameter('publisherId', bid.params);
      const bidfloor = getBidFloor(bid) || 0;
      const bidfloorcur = getBidIdParameter('bidfloorcur', bid.params) || 'EUR';
      const siteId = getBidIdParameter('siteId', bid.params);
      const sitekey = getBidIdParameter('sitekey', bid.params);
      const domain = getBidIdParameter('domain', bid.params);
      const cat = getBidIdParameter('cat', bid.params) || [''];
      let pubcid = null;
      const playerSize = deepAccess(bid, 'mediaTypes.video.playerSize');
      const contentWidth = playerSize[0][0];
      const contentHeight = playerSize[0][1];
      const secure = +(isPageSecure || (getBidIdParameter('secure', bid.params) ? 1 : 0));
      const ext = {
        sdk_name: 'Prebid 1+'
      };
      const mimes = getBidIdParameter('mimes', bid.params) || ['application/javascript', 'video/mp4', 'video/webm'];
      const linearity = getBidIdParameter('linearity', bid.params) || 1;
      const minduration = getBidIdParameter('minduration', bid.params) || 0;
      const maxduration = getBidIdParameter('maxduration', bid.params) || 500;
      const startdelay = getBidIdParameter('startdelay', bid.params) || 0;
      const minbitrate = getBidIdParameter('minbitrate', bid.params) || 0;
      const maxbitrate = getBidIdParameter('maxbitrate', bid.params) || 3500;
      const delivery = getBidIdParameter('delivery', bid.params) || [2];
      const pos = getBidIdParameter('pos', bid.params) || 1;
      const api = getBidIdParameter('api', bid.params) || [2];
      const protocols = getBidIdParameter('protocols', bid.params) || [2, 3, 5, 6];

      const smartxReq = [{
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
        dnt: getDNT() ? 1 : 0,
        language: navigator[language].split('-')[0],
        make: navigator.vendor ? navigator.vendor : '',
        ua: navigator.userAgent
      };

      const at = getBidIdParameter('at', bid.params) || 2;

      const cur = getBidIdParameter('cur', bid.params) || ['EUR'];

      const requestPayload = {
        id: generateUUID(),
        imp: smartxReq,
        site: {
          id: siteId,
          page: page,
          cat: cat,
          domain: domain,
          publisher: {
            id: publisherId
          },
          content: {
            ext: {
              prebid: {
                name: 'pbjs',
                version: '$prebid.version$'
              }
            }
          }
        },
        device: device,
        at: at,
        cur: cur,
        ext: {}
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

      // Add sitekey if available
      if (sitekey) {
        requestPayload.site.content.ext.sitekey = sitekey;
      }

      // Add common id if available
      if (pubcid) {
        userExt.fpc = pubcid;
      }

      // Add schain object if available from the new location
      const schain = bid?.ortb2?.source?.ext?.schain;
      if (bid && schain) {
        requestPayload['source'] = {
          ext: {
            schain: schain
          }
        };
      }

      // Only add the user object if it's not empty
      if (!isEmpty(userExt)) {
        requestPayload.user = {
          ext: userExt
        };
      }

      // Add targeting
      if (getBidIdParameter('data', bid.params.user)) {
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
            });
          }
        }

        requestPayload.user = {
          ext: userExt,
          data: targetingarr
        };
      }

      return {
        method: 'POST',
        url: URL,
        data: requestPayload,
        bidRequest: bidderRequest,
        options: {
          contentType: 'application/json',
          customHeaders: {
            'x-openrtb-version': '2.5'
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
    if (serverResponseBody && isArray(serverResponseBody.seatbid)) {
      _each(serverResponseBody.seatbid, function (bids) {
        _each(bids.bid, function (smartxBid) {
          let currentBidRequest = {};
          for (const i in bidderRequest.bidRequest.bids) {
            if (smartxBid.impid === bidderRequest.bidRequest.bids[i].bidId) {
              currentBidRequest = bidderRequest.bidRequest.bids[i];
            }
          }
          /**
           * Make sure currency and price are the right ones
           */
          _each(currentBidRequest.params.pre_market_bids, function (pmb) {
            if (pmb.deal_id === smartxBid.id) {
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

          const context = deepAccess(currentBidRequest, 'mediaTypes.video.context');

          if (context === 'outstream') {
            const playersize = deepAccess(currentBidRequest, 'mediaTypes.video.playerSize');
            const renderer = Renderer.install({
              id: 0,
              url: 'https://dco.smartclip.net/?plc=7777779',
              config: {
                adText: 'SmartX Outstream Video Ad via Prebid.js',
                player_width: playersize[0][0],
                player_height: playersize[0][1],
                content_page_url: deepAccess(bidderRequest, 'data.site.page'),
                ad_mute: +!!deepAccess(currentBidRequest, 'params.ad_mute'),
                hide_skin: +!!deepAccess(currentBidRequest, 'params.hide_skin'),
                outstream_options: deepAccess(currentBidRequest, 'params.outstream_options')
              }
            });
            try {
              renderer.setRender(createOutstreamConfig);
              renderer.setEventHandlers({
                impression: function impression() {
                  return logMessage('SmartX outstream video impression event');
                },
                loaded: function loaded() {
                  return logMessage('SmartX outstream video loaded event');
                },
                ended: function ended() {
                  return logMessage('SmartX outstream renderer video event');
                }
              });
            } catch (err) {
              logWarn('Prebid Error calling setRender or setEventHandlers on renderer', err);
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

function createOutstreamConfig(bid) {
  const confMinAdWidth = getBidIdParameter('minAdWidth', bid.renderer.config.outstream_options) || 290;
  const confMaxAdWidth = getBidIdParameter('maxAdWidth', bid.renderer.config.outstream_options) || 900;
  const confStartOpen = getBidIdParameter('startOpen', bid.renderer.config.outstream_options)
  const confEndingScreen = getBidIdParameter('endingScreen', bid.renderer.config.outstream_options)
  const confTitle = getBidIdParameter('title', bid.renderer.config.outstream_options);
  const confSkipOffset = getBidIdParameter('skipOffset', bid.renderer.config.outstream_options);
  const confDesiredBitrate = getBidIdParameter('desiredBitrate', bid.renderer.config.outstream_options);
  const confVisibilityThreshold = getBidIdParameter('visibilityThreshold', bid.renderer.config.outstream_options);
  const elementId = getBidIdParameter('slot', bid.renderer.config.outstream_options) || bid.adUnitCode;

  logMessage('[SMARTX][renderer] Handle SmartX outstream renderer');

  var playerConfig = {
    minAdWidth: confMinAdWidth,
    maxAdWidth: confMaxAdWidth,
    coreSetup: {},
    layoutSettings: {},
    onCappedCallback: function() {
      try {
        window.sc_smartIntxtNoad();
      } catch (f) {}
    },
  };

  if (confStartOpen === 'true') {
    playerConfig.startOpen = true;
  } else if (confStartOpen === 'false') {
    playerConfig.startOpen = false;
  }

  if (confEndingScreen === 'true') {
    playerConfig.endingScreen = true;
  } else if (confEndingScreen === 'false') {
    playerConfig.endingScreen = false;
  }

  if (confTitle || bid.renderer.config.outstream_options.title === '') {
    playerConfig.layoutSettings.advertisingLabel = confTitle;
  }

  if (confSkipOffset) {
    playerConfig.coreSetup.skipOffset = confSkipOffset;
  }

  if (confDesiredBitrate) {
    playerConfig.coreSetup.desiredBitrate = confDesiredBitrate;
  }

  if (confVisibilityThreshold) {
    playerConfig.visibilityThreshold = confVisibilityThreshold;
  }

  playerConfig.adResponse = bid.vastContent;

  const divID = '[id="' + elementId + '"]';

  var playerListener = function callback(event) {
    switch (event) {
      case 'AdError':
        try {
          window.sc_smartIntxtError();
        } catch (f) {}
        break;

      case 'AdSlotStarted':
        try {
          window.sc_smartIntxtStart();
        } catch (f) {}
        break;

      case 'AdSlotComplete':
        try {
          window.sc_smartIntxtEnd();
        } catch (f) {}
        break;
    }
  };

  try {
    // eslint-disable-next-line
    outstreamplayer.connect(divID).setup(playerConfig, playerListener)
  } catch (e) {
    logError('[SMARTX][renderer] Error caught: ' + e);
  }
  return playerConfig;
}

/**
 * Get the floor price from bid.params for backward compatibility.
 * If not found, then check floor module.
 * @param bid A valid bid object
 * @returns {*|number} floor price
 */
function getBidFloor(bid) {
  let floor = getBidIdParameter('bidfloor', bid.params);
  const floorcur = getBidIdParameter('bidfloorcur', bid.params) || 'EUR';

  if (!floor && isFn(bid.getFloor)) {
    const floorObj = bid.getFloor({
      currency: floorcur,
      mediaType: '*',
      size: '*'
    });

    if (isPlainObject(floorObj) && !isNaN(floorObj.floor) && floorObj.currency === floorcur) {
      floor = floorObj.floor;
    }
  }

  return floor;
}

registerBidder(spec);
