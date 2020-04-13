import * as utils from '../src/utils.js';
import { Renderer } from '../src/Renderer.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'spotx';
const URL = 'https://search.spotxchange.com/openrtb/2.3/dados/';
const ORTB_VERSION = '2.3';
export const GOOGLE_CONSENT = { consented_providers: ['3', '7', '11', '12', '15', '20', '22', '35', '43', '46', '48', '55', '57', '61', '62', '66', '70', '80', '83', '85', '86', '89', '93', '108', '122', '124', '125', '126', '131', '134', '135', '136', '143', '144', '147', '149', '153', '154', '159', '161', '162', '165', '167', '171', '178', '184', '188', '192', '195', '196', '202', '209', '211', '218', '221', '228', '229', '230', '236', '239', '241', '253', '255', '259', '266', '271', '272', '274', '286', '291', '294', '303', '308', '310', '311', '313', '314', '316', '317', '322', '323', '327', '336', '338', '340', '348', '350', '358', '359', '363', '367', '370', '371', '384', '385', '389', '393', '394', '397', '398', '407', '414', '415', '424', '429', '430', '432', '436', '438', '440', '442', '443', '445', '448', '449', '453', '459', '479', '482', '486', '491', '492', '494', '495', '503', '505', '510', '522', '523', '528', '537', '540', '550', '559', '560', '568', '571', '574', '575', '576', '584', '585', '587', '588', '590', '591', '592', '595', '609', '621', '624', '723', '725', '733', '737', '776', '780', '782', '787', '797', '798', '802', '803', '814', '817', '820', '821', '827', '829', '839', '853', '864', '867', '874', '899', '904', '922', '926', '931', '932', '933', '938', '955', '973', '976', '979', '981', '985', '987', '991', '1003', '1024', '1025', '1027', '1028', '1029', '1033', '1034', '1040', '1047', '1048', '1051', '1052', '1053', '1054', '1062', '1063', '1067', '1072', '1085', '1092', '1095', '1097', '1099', '1100', '1107', '1126', '1127', '1143', '1149', '1152', '1162', '1166', '1167', '1170', '1171', '1172', '1188', '1192', '1199', '1201', '1204', '1205', '1211', '1212', '1215', '1220', '1225', '1226', '1227', '1230', '1232', '1236', '1241', '1248', '1250', '1252', '1268', '1275', '1276', '1284', '1286', '1298', '1301', '1307', '1312', '1313', '1317', '1329', '1336', '1344', '1345', '1356', '1362', '1365', '1375', '1403', '1409', '1411', '1415', '1416', '1419', '1423', '1440', '1442', '1449', '1451', '1455', '1456', '1468', '1496', '1503', '1509', '1512', '1514', '1517', '1520', '1525', '1540', '1547', '1548', '1555', '1558', '1570', '1575', '1577', '1579', '1583', '1584', '1591', '1598', '1603', '1608', '1613', '1616', '1626', '1631', '1633', '1638', '1642', '1648', '1651', '1652', '1653', '1660', '1665', '1667', '1669', '1671', '1674', '1677', '1678', '1682', '1684', '1697', '1703', '1705', '1716', '1720', '1721', '1722', '1725', '1732', '1733', '1735', '1739', '1741', '1745', '1750', '1753', '1760', '1765', '1769', '1776', '1780', '1782', '1786', '1791', '1794', '1799', '1800', '1801', '1810', '1827', '1831', '1832', '1834', '1837', '1840', '1843', '1844', '1845', '1858', '1859', '1863', '1866', '1870', '1872', '1875', '1878', '1880', '1882', '1883', '1889', '1892', '1896', '1898', '1899', '1902', '1905', '1911', '1922', '1928', '1929', '1934', '1942', '1943', '1944', '1945', '1958', '1960', '1962', '1963', '1964', '1967', '1968', '1978', '1985', '1986', '1987', '1998', '2003', '2007', '2012', '2013', '2027', '2035', '2038', '2039', '2044', '2047', '2052', '2056', '2059', '2062', '2064', '2068', '2070', '2072', '2078', '2079', '2084', '2088', '2090', '2095', '2100', '2103', '2107', '2109', '2113', '2115', '2121', '2127', '2130', '2133', '2137', '2140', '2141', '2145', '2147', '2150', '2156', '2166', '2170', '2171', '2176', '2177', '2179', '2183', '2186', '2192', '2198', '2202', '2205', '2214', '2216', '2219', '2220', '2222', '2223', '2224', '2225', '2227', '2228', '2234', '2238', '2247', '2251', '2253', '2262', '2264', '2271', '2276', '2278', '2279', '2282', '2290', '2292', '2295', '2299', '2305', '2306', '2310', '2311', '2312', '2315', '2320', '2325', '2328', '2331', '2334', '2335', '2336', '2337', '2343', '2346', '2354', '2357', '2358', '2359', '2366', '2370', '2373', '2376', '2377', '2380', '2382', '2387', '2389', '2392', '2394', '2400', '2403', '2405', '2406', '2407', '2410', '2411', '2413', '2414', '2415', '2416', '2418', '2422', '2425', '2427', '2435', '2437', '2440', '2441', '2447', '2453', '2459', '2461', '2462', '2464', '2467', '2468', '2472', '2477', '2481', '2484', '2486', '2492', '2493', '2496', '2497', '2498', '2499', '2504', '2506', '2510', '2511', '2512', '2517', '2526', '2527', '2531', '2532', '2534', '2542', '2544', '2552', '2555', '2559', '2563', '2564', '2567', '2568', '2569', '2571', '2572', '2573', '2575', '2577', '2579', '2583', '2584', '2586', '2589', '2595', '2596', '2597', '2601', '2604', '2605', '2609', '2610', '2612', '2614', '2621', '2622', '2624', '2628', '2629', '2632', '2634', '2636', '2639', '2643', '2645', '2646', '2647', '2649', '2650', '2651', '2652', '2656', '2657', '2658', '2660', '2661', '2662', '2663', '2664', '2669', '2670', '2673', '2676', '2677', '2678', '2681', '2682', '2684', '2685', '2686', '2689', '2690', '2691', '2695', '2698', '2699', '2702', '2704', '2705', '2706', '2707', '2709', '2710', '2713', '2714', '2727', '2729', '2739', '2758', '2765', '2766', '2767', '2768', '2770', '2771', '2772', '2776', '2777', '2778', '2779', '2780', '2783', '2784', '2786', '2787', '2791', '2792', '2793', '2797', '2798', '2801', '2802', '2803', '2805', '2808', '2809', '2810', '2811', '2812', '2813', '2814', '2817', '2818', '2824', '2826', '2827', '2829', '2830', '2831', '2832', '2834', '2836', '2838', '2840', '2842', '2843', '2844', '2850', '2851', '2852', '2854', '2858', '2860', '2862', '2864', '2865', '2866', '2867', '2868', '2869', '2871'] };

export const spec = {
  code: BIDDER_CODE,
  gvlid: 165,
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

      if (utils.getBidIdParameter('spotx_all_google_consent', bid.params) == 1) {
        userExt['consented_providers_settings'] = GOOGLE_CONSENT;
      }

      // Add GDPR flag and consent string
      if (bidderRequest && bidderRequest.gdprConsent) {
        userExt.consent = bidderRequest.gdprConsent.consentString;

        if (typeof bidderRequest.gdprConsent.gdprApplies !== 'undefined') {
          utils.deepSetValue(requestPayload, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
        }
      }

      if (bidderRequest && bidderRequest.uspConsent) {
        utils.deepSetValue(requestPayload, 'regs.ext.us_privacy', bidderRequest.uspConsent);
      }

      // ID5 fied
      if (bid && bid.userId && bid.userId.id5id) {
        userExt.eids = userExt.eids || [];
        userExt.eids.push(
          {
            source: 'id5-sync.com',
            uids: [{
              id: bid.userId.id5id
            }]
          }
        )
      }

      // Add common id if available
      if (pubcid) {
        userExt.fpc = pubcid;
      }

      // Add schain object if it is present
      if (bid && bid.schain) {
        requestPayload['source'] = {
          ext: {
            schain: bid.schain
          }
        };
      }

      if (bid && bid.userId && bid.userId.tdid) {
        userExt.eids = userExt.eids || [];
        userExt.eids.push(
          {
            source: 'adserver.org',
            uids: [{
              id: bid.userId.tdid,
              ext: {
                rtiPartner: 'TDID'
              }
            }]
          }
        )
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
            vastUrl: 'https://search.spotxchange.com/ad/vast.html?key=' + spotxBid.ext.cache_key,
            videoCacheKey: spotxBid.ext.cache_key,
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
  script.src = 'https://js.spotx.tv/easi/v1/' + bid.channel_id + '.js';
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
