import { timestamp, deepAccess, isStr, deepClone } from '../src/utils.js';
import { getOrigin } from '../libraries/getOrigin/index.js';
import { config } from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const BIDDER_CODE = 'resetdigital';
const CURRENCY = 'USD';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [ 'banner', 'video' ],
  isBidRequestValid: function(bid) {
    return (!!(bid.params.pubId || bid.params.zoneId));
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    let stack = (bidderRequest.refererInfo &&
      bidderRequest.refererInfo.stack ? bidderRequest.refererInfo.stack
      : [])

    let spb = (config.getConfig('userSync') && config.getConfig('userSync').syncsPerBidder)
      ? config.getConfig('userSync').syncsPerBidder : 5

    const payload = {
      start_time: timestamp(),
      language: window.navigator.userLanguage || window.navigator.language,
      site: {
        domain: getOrigin(),
        iframe: !bidderRequest.refererInfo.reachedTop,
        // TODO: the last element in refererInfo.stack is window.location.href, that's unlikely to have been the intent here
        url: stack && stack.length > 0 ? [stack.length - 1] : null,
        https: (window.location.protocol === 'https:'),
        // TODO: is 'page' the right value here?
        referrer: bidderRequest.refererInfo.page
      },
      imps: [],
      user_ids: validBidRequests[0].userId,
      sync_limit: spb
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr = {
        applies: bidderRequest.gdprConsent.gdprApplies,
        consent: bidderRequest.gdprConsent.consentString
      };
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      payload.ccpa = bidderRequest.uspConsent;
    }

    function getOrtb2Keywords(ortb2Obj) {
      const fields = ['site.keywords', 'site.content.keywords', 'user.keywords', 'app.keywords', 'app.content.keywords'];
      let result = [];

      fields.forEach(path => {
        let keyStr = deepAccess(ortb2Obj, path);
        if (isStr(keyStr)) result.push(keyStr);
      });
      return result;
    }

    // get the ortb2 keywords data (if it exists)
    let ortb2 = deepClone(bidderRequest && bidderRequest.ortb2);
    let ortb2KeywordsList = getOrtb2Keywords(ortb2);
    // get meta keywords data (if it exists)
    let metaKeywords = document.getElementsByTagName('meta')['keywords'];
    if (metaKeywords && metaKeywords.content) {
      metaKeywords = metaKeywords.content.split(',');
    }

    for (let x = 0; x < validBidRequests.length; x++) {
      let req = validBidRequests[x];

      let bidFloor = req.params.bidFloor ? req.params.bidFloor : null;
      let bidFloorCur = req.params.bidFloor ? req.params.bidFloorCur : null;

      if (typeof req.getFloor === 'function') {
        const floorInfo = req.getFloor({
          currency: CURRENCY,
          mediaType: BANNER,
          size: '*'
        });
        if (typeof floorInfo === 'object' && floorInfo.currency === CURRENCY && !isNaN(parseFloat(floorInfo.floor))) {
          bidFloor = parseFloat(floorInfo.floor);
          bidFloorCur = CURRENCY;
        }
      }

      // get param kewords (if it exists)
      let paramsKeywords = req.params.keywords ? req.params.keywords.split(',') : [];
      // merge all keywords
      let keywords = ortb2KeywordsList.concat(paramsKeywords).concat(metaKeywords);

      payload.imps.push({
        pub_id: req.params.pubId,
        site_id: req.params.siteID ? req.params.siteID : null,
        placement_id: req.params.placement ? req.params.placement : null,
        position: req.params.position ? req.params.position : null,
        bid_floor: bidFloor,
        bid_floor_cur: bidFloorCur,
        lat_long: req.params.latLong ? req.params.latLong : null,
        inventory: req.params.inventory ? req.params.inventory : null,
        visitor: req.params.visitor ? req.params.visitor : null,
        keywords: keywords.join(','),
        zone_id: req.params.zoneId,
        bid_id: req.bidId,
        imp_id: req.transactionId,
        sizes: req.sizes,
        force_bid: req.params.forceBid,
        coppa: config.getConfig('coppa') === true ? 1 : 0,
        media_types: deepAccess(req, 'mediaTypes')
      });
    }

    let params = validBidRequests[0].params
    let url = params.endpoint ? params.endpoint : '//ads.resetsrv.com'
    return {
      method: 'POST',
      url: url,
      data: JSON.stringify(payload),
      bids: validBidRequests
    };
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    if (!serverResponse || !serverResponse.body) {
      return bidResponses
    }

    let res = serverResponse.body;
    if (!res.bids || !res.bids.length) {
      return []
    }

    for (let x = 0; x < serverResponse.body.bids.length; x++) {
      let bid = serverResponse.body.bids[x]

      bidResponses.push({
        requestId: bid.bid_id,
        cpm: bid.cpm,
        width: bid.w,
        height: bid.h,
        ad: bid.html,
        vastUrl: bid.vast_url,
        vastXml: bid.vast_xml,
        mediaType: bid.html ? 'banner' : 'video',
        ttl: 120,
        creativeId: bid.crid,
        dealId: bid.deal_id,
        netRevenue: true,
        currency: 'USD',
        meta: {
          advertiserDomains: bid.adomain
        }
      })
    }

    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent) {
    const syncs = []

    if (!serverResponses.length || !serverResponses[0].body) {
      return syncs
    }

    let pixels = serverResponses[0].body.pixels
    if (!pixels || !pixels.length) {
      return syncs
    }

    let gdprParams = null
    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        gdprParams = `gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`
      } else {
        gdprParams = `gdpr_consent=${gdprConsent.consentString}`
      }
    }

    for (let x = 0; x < pixels.length; x++) {
      let pixel = pixels[x]

      if ((pixel.type === 'iframe' && syncOptions.iframeEnabled) ||
        (pixel.type === 'image' && syncOptions.pixelEnabled)) {
        if (gdprParams && gdprParams.length) {
          pixel = (pixel.indexOf('?') === -1 ? '?' : '&') + gdprParams
        }
        syncs.push(pixel)
      }
    }
    return syncs;
  }
};

registerBidder(spec);
