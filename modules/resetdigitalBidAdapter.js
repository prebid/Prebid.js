import { timestamp, deepAccess, isStr, deepClone, isPlainObject } from '../src/utils.js';
import { getOrigin } from '../libraries/getOrigin/index.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'resetdigital';
const GVLID = 1162;
const CURRENCY = 'USD';

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: ['banner', 'video'],
  isBidRequestValid: function (bid) {
    return !!(bid.params.pubId || bid.params.zoneId);
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const stack =
      bidderRequest.refererInfo && bidderRequest.refererInfo.stack
        ? bidderRequest.refererInfo.stack
        : [];

    const spb =
      config.getConfig('userSync') &&
      config.getConfig('userSync').syncsPerBidder
        ? config.getConfig('userSync').syncsPerBidder
        : 5;

    function extractUserIdsFromEids(eids) {
      const result = {};

      if (!Array.isArray(eids)) return result;

      eids.forEach(eid => {
        const source = eid.source;
        if (!source || !Array.isArray(eid.uids)) return;

        if (eid.uids.length === 1) {
          const uid = eid.uids[0];
          result[source] = { id: uid.id };
          if (uid.ext) {
            result[source].ext = uid.ext;
          }
        } else {
          const subObj = {};
          eid.uids.forEach(uid => {
            if (uid.ext && uid.ext.rtiPartner) {
              subObj[uid.ext.rtiPartner] = uid.id;
            }
          });
          if (Object.keys(subObj).length > 0) {
            result[source] = subObj;
          }
        }
      });

      return result;
    }

    const userIds = extractUserIdsFromEids(bidderRequest.userIdAsEids);

    const payload = {
      start_time: timestamp(),
      language: window.navigator.userLanguage || window.navigator.language,
      site: {
        domain: getOrigin(),
        iframe: !bidderRequest.refererInfo.reachedTop,
        url: stack && stack.length > 0 ? stack[stack.length - 1] : null,
        https: window.location.protocol === 'https:',
        referrer: bidderRequest.refererInfo.page,
      },
      imps: [],
      user_ids: userIds,
      sync_limit: spb,
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr = {
        applies: bidderRequest.gdprConsent.gdprApplies,
        consent: bidderRequest.gdprConsent.consentString,
      };
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      payload.ccpa = bidderRequest.uspConsent;
    }

    function getOrtb2Keywords(ortb2Obj) {
      const fields = [
        'site.keywords',
        'site.content.keywords',
        'user.keywords',
        'app.keywords',
        'app.content.keywords',
      ];
      const result = [];

      fields.forEach((path) => {
        const keyStr = deepAccess(ortb2Obj, path);
        if (isStr(keyStr)) result.push(keyStr);
      });
      return result;
    }

    const ortb2 = deepClone(bidderRequest && bidderRequest.ortb2);
    const ortb2KeywordsList = getOrtb2Keywords(ortb2);
    let metaKeywords = document.getElementsByTagName('meta')['keywords'];
    if (metaKeywords && metaKeywords.content) {
      metaKeywords = metaKeywords.content.split(',');
    }

    for (let x = 0; x < validBidRequests.length; x++) {
      const req = validBidRequests[x];

      let bidFloor = req.params.bidFloor ? req.params.bidFloor : null;
      let bidFloorCur = req.params.bidFloor ? req.params.bidFloorCur : null;

      if (typeof req.getFloor === 'function') {
        const floorInfo = req.getFloor({
          currency: CURRENCY,
          mediaType: BANNER,
          size: '*',
        });
        if (
          isPlainObject(floorInfo) &&
          floorInfo.currency === CURRENCY &&
          !isNaN(parseFloat(floorInfo.floor))
        ) {
          bidFloor = parseFloat(floorInfo.floor);
          bidFloorCur = CURRENCY;
        }
      }

      let paramsKeywords = req.params.keywords;
      if (typeof req.params.keywords === 'string') {
        paramsKeywords = req.params.keywords.split(',');
      } else if (Array.isArray(req.params.keywords)) {
        paramsKeywords = req.params.keywords;
      } else {
        paramsKeywords = [];
      }

      const keywords = ortb2KeywordsList
        .concat(paramsKeywords)
        .concat(metaKeywords);

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
        imp_id: req.bidId,
        sizes: req.sizes,
        force_bid: req.params.forceBid,
        coppa: config.getConfig('coppa') === true ? 1 : 0,
        media_types: deepAccess(req, 'mediaTypes'),
      });
    }

    if (bidderRequest?.ortb2?.source?.ext?.schain) {
      payload.schain = bidderRequest.ortb2.source.ext.schain;
    }

    const params = validBidRequests[0].params;
    const url = params.endpoint ? params.endpoint : '//ads.resetsrv.com';
    return {
      method: 'POST',
      url: url,
      data: JSON.stringify(payload),
      bids: validBidRequests,
    };
  },
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    if (!serverResponse || !serverResponse.body) {
      return bidResponses;
    }

    const res = serverResponse.body;
    if (!res.bids || !res.bids.length) {
      return [];
    }

    for (let x = 0; x < serverResponse.body.bids.length; x++) {
      const bid = serverResponse.body.bids[x];

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
          advertiserDomains: bid.adomain,
        },
      });
    }

    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent) {
    const syncs = [];
    if (!serverResponses.length || !serverResponses[0].body) {
      return syncs;
    }

    let gdprParams = '';
    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        gdprParams = `gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${
          gdprConsent.consentString
        }`;
      } else {
        gdprParams = `gdpr_consent=${gdprConsent.consentString}`;
      }
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: `https://async.resetdigital.co/async_usersync.html?${gdprParams}`,
      });
    } else if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: `https://meta.resetdigital.co/pchain${
          gdprParams ? `?${gdprParams}` : ''
        }`,
      });
    }
    return syncs;
  },
};

registerBidder(spec);
