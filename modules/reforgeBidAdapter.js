import * as utils from '../src/utils.js';
import {
  Renderer
} from '../src/Renderer.js';
import {
  registerBidder
} from '../src/adapters/bidderFactory.js';
import {
  BANNER
} from '../src/mediaTypes.js';
const BIDDER_CODE = 'reforge';
const URL = 'http://use.reforge.in/bid?rtb_seat_id=0011&secret_key=wzP8eKAVkc&type=prebid&appid=40';
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  /**
   * Determines whether or not the given bid request is valid.
   * From Prebid.js: isBidRequestValid - Verify the the AdUnits.bids, respond with true (valid) or false (invalid).
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return true;
    // if (bid && typeof bid.params !== 'object') {
    //   utils.logError(BIDDER_CODE + ': params is not defined or is incorrect in the bidder settings.');
    //   return false;
    // }
    // if (!utils.deepAccess(bid, 'mediaTypes.video')) {
    //   utils.logError(BIDDER_CODE + ': mediaTypes.video is not present in the bidder settings.');
    //   return false;
    // }
    // const playerSize = utils.deepAccess(bid, 'mediaTypes.video.playerSize');
    // if (!playerSize || !utils.isArray(playerSize)) {
    //   utils.logError(BIDDER_CODE + ': mediaTypes.video.playerSize is not defined in the bidder settings.');
    //   return false;
    // }
    // if (!utils.getBidIdParameter('tagId', bid.params)) {
    //   utils.logError(BIDDER_CODE + ': tagId is not present in bidder params');
    //   return false;
    // }
    // if (!utils.getBidIdParameter('publisherId', bid.params)) {
    //   utils.logError(BIDDER_CODE + ': publisherId is not present in bidder params');
    //   return false;
    // }
    // if (!utils.getBidIdParameter('siteId', bid.params)) {
    //   utils.logError(BIDDER_CODE + ': siteId is not present in bidder params');
    //   return false;
    // }
    // if (!utils.getBidIdParameter('bidfloor', bid.params)) {
    //   utils.logError(BIDDER_CODE + ': bidfloor is not present in bidder params');
    //   return false;
    // }
    // if (!utils.getBidIdParameter('bidfloorcur', bid.params)) {
    //   utils.logError(BIDDER_CODE + ': bidfloorcur is not present in bidder params');
    //   return false;
    // }
    // if (utils.deepAccess(bid, 'mediaTypes.video.context') === 'outstream') {
    // if (!utils.getBidIdParameter('outstream_options', bid.params)) {
    //   utils.logError(BIDDER_CODE + ': outstream_options parameter is not defined');
    //   return false;
    // }
    // if (!utils.getBidIdParameter('slot', bid.params.outstream_options)) {
    //   utils.logError(BIDDER_CODE + ': slot parameter is not defined in outstream_options object in the configuration');
    //   return false;
    // }
    // if (!utils.getBidIdParameter('outstream_function', bid.params)) {
    //   utils.logMessage(BIDDER_CODE + ': outstream_function parameter is not defined. The default outstream renderer will be injected in the header. You can override the default reforge outstream rendering by defining your own Outstream function using field outstream_function.');
    //   return true;
    // }
    // }
  },
  /**
   * Make a server request from the list of BidRequests.
   * from Prebid.js: buildRequests - Takes an array of valid bid requests, all of which are guaranteed to have passed the isBidRequestValid() test.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    // const page = bidderRequest.refererInfo.referer;
    // const isPageSecure = !!page.match(/^https:/)

    const reforgeRequests = bidRequests.map(function (bid) {
      // const tagId = utils.getBidIdParameter('tagId', bid.params);
      // const publisherId = utils.getBidIdParameter('publisherId', bid.params);
      // const bidfloor = utils.getBidIdParameter('bidfloor', bid.params);
      // const bidfloorcur = utils.getBidIdParameter('bidfloorcur', bid.params);
      // const siteId = utils.getBidIdParameter('siteId', bid.params);
      // const domain = utils.getBidIdParameter('domain', bid.params);
      // const cat = utils.getBidIdParameter('cat', bid.params);
      // let pubcid = null;
      // const playerSize = utils.deepAccess(bid, 'mediaTypes.video.playerSize');
      // const contentWidth = playerSize[0][0];
      // const contentHeight = playerSize[0][1];
      // const secure = +(isPageSecure || (utils.getBidIdParameter('secure', bid.params) ? 1 : 0));
      // const ext = {
      //   sdk_name: 'Prebid 1+'
      // };
      // const mimes = utils.getBidIdParameter('mimes', bid.params) || ['application/javascript', 'video/mp4', 'video/webm'];
      // const linearity = utils.getBidIdParameter('linearity', bid.params) || 1;
      // const minduration = utils.getBidIdParameter('minduration', bid.params) || 0;
      // const maxduration = utils.getBidIdParameter('maxduration', bid.params) || 500;
      // const startdelay = utils.getBidIdParameter('startdelay', bid.params) || 0;
      // const minbitrate = utils.getBidIdParameter('minbitrate', bid.params) || 0;
      // const maxbitrate = utils.getBidIdParameter('maxbitrate', bid.params) || 3500;
      // const delivery = utils.getBidIdParameter('delivery', bid.params) || [2];
      // const pos = utils.getBidIdParameter('pos', bid.params) || 1;
      // const api = utils.getBidIdParameter('api', bid.params) || [2];
      // const protocols = utils.getBidIdParameter('protocols', bid.params) || [2, 3, 5, 6];
      // var contextcustom = utils.deepAccess(bid, 'mediaTypes.video.context');
      // var placement = 1;

      // if (contextcustom === 'outstream') {
      //   placement = 3;
      // }

      let reforgeReq = [
        {
          id: bid.params.imp[0].id,
          instl: bid.params.imp[0].instl,
          bidfloor: bid.params.imp[0].bidfloor,
          bidfloorcur: bid.params.imp[0].bidfloorcur,
          banner: {
            w: bid.params.imp[0].banner.w,
            h: bid.params.imp[0].banner.h,
            id: bid.params.imp[0].banner.id,
            btype: bid.params.imp[0].banner.btype,
            battr: bid.params.imp[0].banner.battr,
            topframe: bid.params.imp[0].banner.topframe,
            api: bid.params.imp[0].banner.api,
            pos: bid.params.imp[0].banner.pos,
            wmax: bid.params.imp[0].banner.wmax,
            hmax: bid.params.imp[0].banner.hmax
          },
          secure: bid.params.imp[0].secure
        }
      ];

      // let reforgeReq = {
      //   id: bid.bidId,
      //   secure: secure,
      //   bidfloor: bidfloor,
      //   bidfloorcur: bidfloorcur,
      //   video: {
      //     w: contentWidth,
      //     h: contentHeight,
      //     mimes: mimes,
      //     linearity: linearity,
      //     minduration: minduration,
      //     maxduration: maxduration,
      //     startdelay: startdelay,
      //     protocols: protocols,
      //     minbitrate: minbitrate,
      //     maxbitrate: maxbitrate,
      //     delivery: delivery,
      //     pos: pos,
      //     placement: placement,
      //     api: api,
      //     ext: ext
      //   },
      //   // tagid: tagId,
      //   ext: {
      //     'reforge.bidpricetype': 1
      //   }
      // };

      // let reforgeReq = {
      //   id: bid.bidId,
      //   secure: secure,
      //   bidfloor: bidfloor,
      //   bidfloorcur: bidfloorcur,
      //   video: {
      //     w: contentWidth,
      //     h: contentHeight,
      //     mimes: mimes,
      //     linearity: linearity,
      //     minduration: minduration,
      //     maxduration: maxduration,
      //     startdelay: startdelay,
      //     protocols: protocols,
      //     minbitrate: minbitrate,
      //     maxbitrate: maxbitrate,
      //     delivery: delivery,
      //     pos: pos,
      //     placement: placement,
      //     api: api,
      //     ext: ext
      //   },
      //   // tagid: tagId,
      //   ext: {
      //     'reforge.bidpricetype': 1
      //   }
      // };

      // if (bid.crumbs && bid.crumbs.pubcid) {
      //   pubcid = bid.crumbs.pubcid;
      // }

      // const language = navigator.language ? 'language' : 'userLanguage';
      // const device = {
      //   h: screen.height,
      //   w: screen.width,
      //   dnt: utils.getDNT() ? 1 : 0,
      //   language: navigator[language].split('-')[0],
      //   make: navigator.vendor ? navigator.vendor : '',
      //   ua: navigator.userAgent
      // };
      const at = utils.getBidIdParameter('at', bid.params);
      const cur = utils.getBidIdParameter('cur', bid.params);
      const id = utils.getBidIdParameter('id', bid.params);
      const tmax = utils.getBidIdParameter('tmax', bid.params);
      const bcat = utils.getBidIdParameter('bcat', bid.params);

      utils.logMessage('**** bid');
      utils.logMessage(bid);
      utils.logMessage('**** bid');

      utils.logMessage('****');
      utils.logMessage(utils.getBidIdParameter('id', bid.params.app.publisher));
      utils.logMessage('****');

      // utils.logMessage('**** bid');
      // utils.logMessage(bid);
      // utils.logMessage('**** bid');
      const requestPayload = {
        id: id,
        at: at,
        tmax: tmax,
        cur: cur,
        bcat: bcat,
        imp: reforgeReq,
        app: {
          id: utils.getBidIdParameter('id', bid.params.app),
          name: utils.getBidIdParameter('name', bid.params.app),
          bundle: utils.getBidIdParameter('bundle', bid.params.app),
          cat: utils.getBidIdParameter('cat', bid.params.app),
          publisher: {
            id: utils.getBidIdParameter('id', bid.params.app.publisher)
          },
          storeurl: utils.getBidIdParameter('storeurl', bid.params.app)
        },
        device: {
          dnt: utils.getBidIdParameter('dnt', bid.params.device),
          ua: utils.getBidIdParameter('ua', bid.params.device),
          ip: utils.getBidIdParameter('ip', bid.params.device),
          geo: {
            lat: utils.getBidIdParameter('lat', bid.params.device.geo),
            lon: utils.getBidIdParameter('lon', bid.params.device.geo),
            type: utils.getBidIdParameter('type', bid.params.device.geo),
            country: utils.getBidIdParameter('country', bid.params.device.geo),
          },
          dpidsha1: utils.getBidIdParameter('dpidsha1', bid.params.device),
          dpidmd5: utils.getBidIdParameter('dpidmd5', bid.params.device),
          make: utils.getBidIdParameter('make', bid.params.device),
          model: utils.getBidIdParameter('model', bid.params.device),
          os: utils.getBidIdParameter('os', bid.params.device),
          osv: utils.getBidIdParameter('osv', bid.params.device),
          devicetype: utils.getBidIdParameter('devicetype', bid.params.device),
          js: utils.getBidIdParameter('js', bid.params.device),
          connectiontype: utils.getBidIdParameter('connectiontype', bid.params.device),
          carrier: utils.getBidIdParameter('carrier', bid.params.device),
          ifa: utils.getBidIdParameter('ifa', bid.params.device)
        },
        user: {
          id: utils.getBidIdParameter('id', bid.params.user)
        },
        ext: {
          udi: {
            idfa: utils.getBidIdParameter('idfa', bid.params.ext.udi)
          },
          fd: utils.getBidIdParameter('fd', bid.params.ext),
          utctimestamp: utils.getBidIdParameter('utctimestamp', bid.params.ext),
          utcdatetime: utils.getBidIdParameter('utcdatetime', bid.params.ext)
        }
      };
      // const userExt = {};

      // Add GDPR flag and consent string
      // if (bidderRequest && bidderRequest.gdprConsent) {
      //   userExt.consent = bidderRequest.gdprConsent.consentString;
      //   if (typeof bidderRequest.gdprConsent.gdprApplies !== 'undefined') {
      //     requestPayload.regs = {
      //       ext: {
      //         gdpr: (bidderRequest.gdprConsent.gdprApplies ? 1 : 0)
      //       }
      //     };
      //   }
      // }

      // Add common id if available
      // if (pubcid) {
      //   userExt.fpc = pubcid;
      // }

      // Only add the user object if it's not empty
      // if (!utils.isEmpty(userExt)) {
      //   requestPayload.user = {
      //     ext: userExt
      //   };
      // }

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

        // requestPayload.user = {
        //   ext: userExt,
        //   data: targetingarr
        // }
      }

      return {
        method: 'POST',
        url: URL,
        data: requestPayload,
        bidRequest: bidderRequest,
        options: {
          contentType: 'application/json'
          // customHeaders: {
          //   'x-openrtb-version': '2.3'
          // }
        }
      };
    });

    return reforgeRequests;
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidderRequest) {
    utils.logMessage('****');
    utils.logMessage('iff serverResponse');
    utils.logMessage('****');
    const bidResponses = [];
    const serverResponseBody = serverResponse.body;
    if (serverResponseBody && utils.isArray(serverResponseBody.seatbid)) {
      utils.logMessage('****');
      utils.logMessage('iff serverbody');
      utils.logMessage('****');
      utils._each(serverResponseBody.seatbid, function (bids) {
        utils._each(bids.bid, function (reforgeBid) {
          let currentBidRequest = {};
          for (let i in bidderRequest.bidRequest.bids) {
            if (reforgeBid.impid == bidderRequest.bidRequest.bids[i].bidId) {
              utils.logMessage('**** imp');
              utils.logMessage('iff impid');
              utils.logMessage('**** imp');
              currentBidRequest = bidderRequest.bidRequest.bids[i];
            }
          }

          utils.logMessage('**** currentBidRequest');
          utils.logMessage('currentBidRequest');
          utils.logMessage('**** currentBidRequest');
          /**
           * Make sure currency and price are the right ones
           * TODO: what about the pre_market_bid partners sizes?
           */
          utils._each(currentBidRequest.params.pre_market_bids, function (pmb) {
            if (pmb.deal_id == reforgeBid.id) {
              reforgeBid.price = pmb.price;
              serverResponseBody.cur = pmb.currency;
            }
          });
          const bid = {
            requestId: currentBidRequest.bidId,
            currency: serverResponseBody.cur || 'USD',
            cpm: reforgeBid.price,
            creativeId: reforgeBid.crid || '',
            ttl: 360,
            netRevenue: true,
            vastContent: reforgeBid.adm,
            vastXml: reforgeBid.adm,
            mediaType: BANNER,
            width: reforgeBid.w,
            height: reforgeBid.h
          };
          const context = utils.deepAccess(currentBidRequest, 'mediaTypes.banner.context');
          if (context === 'outstream') {
            // const playersize = utils.deepAccess(currentBidRequest, 'mediaTypes.video.playerSize');
            const renderer = Renderer.install({
              id: 0,
              url: '//',
              config: {
                adText: 'reforge Outstream Video Ad via Prebid.js',
                player_width: utils.deepAccess(currentBidRequest, 'mediaTypes.banner.sizes[0][0]'),
                player_height: utils.deepAccess(currentBidRequest, 'mediaTypes.banner.sizes[0][1]'),
                content_page_url: utils.deepAccess(bidderRequest, 'data.site.page'),
                ad_mute: +!!utils.deepAccess(currentBidRequest, 'params.ad_mute'),
                hide_skin: +!!utils.deepAccess(currentBidRequest, 'params.hide_skin'),
                outstream_options: utils.deepAccess(currentBidRequest, 'params.outstream_options'),
                outstream_function: utils.deepAccess(currentBidRequest, 'params.outstream_function')
              }
            });
            try {
              // renderer.setRender(outstreamRender);
              renderer.setEventHandlers({
                impression: function impression() {
                  return utils.logMessage('reforge outstream video impression event');
                },
                loaded: function loaded() {
                  return utils.logMessage('reforge outstream video loaded event');
                },
                ended: function ended() {
                  utils.logMessage('reforge outstream renderer video event');
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
registerBidder(spec);
