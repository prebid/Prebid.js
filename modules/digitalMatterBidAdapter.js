import { getDNT } from '../libraries/navigatorData/dnt.js';
import {deepAccess, deepSetValue, getWinDimensions, inIframe, logWarn, parseSizesInput} from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {hasPurpose1Consent} from '../src/utils/gdpr.js';

const BIDDER_CODE = 'digitalMatter';
const GVLID = 1345;
const ENDPOINT_URL = 'https://adx.digitalmatter.services/'

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],
  aliases: ['dichange', 'digitalmatter'],
  bidParameters: ['accountId', 'siteId'],
  isBidRequestValid: function (bid) {
    if (typeof bid.params !== 'object') {
      return false;
    }
    if (!hasBannerMediaType(bid)) {
      logWarn('Invalid bid request: missing required mediaType - banner');
      return false;
    }

    return !!(bid.params.accountId && bid.params.siteId)
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const common = bidderRequest.ortb2 || {};
    const site = common.site;
    const tid = common?.source?.tid;
    const {user} = common || {};

    if (!site.page) {
      site.page = bidderRequest.refererInfo.page;
    }

    const device = getDevice(common.device);
    const schain = getByKey(validBidRequests, 'ortb2.source.ext.schain');
    const eids = getByKey(validBidRequests, 'userIdAsEids');
    const currency = config.getConfig('currency')
    const cur = currency && [currency];

    const imp = validBidRequests.map((bid, id) => {
      const {accountId, siteId} = bid.params;
      const bannerParams = deepAccess(bid, 'mediaTypes.banner');
      const position = deepAccess(bid, 'mediaTypes.banner.pos') ?? 0;

      return {
        id: bid.adUnitCode,
        bidId: bid.bidId,
        accountId: accountId,
        adUnitCode: bid.adUnitCode,
        siteId: siteId,
        banner: {
          pos: position,
          topframe: inIframe() ? 0 : 1,
          format: bannerParams.sizes.map(sizeArr => ({
            w: sizeArr[0],
            h: sizeArr[1]
          }))
        },
        sizes: parseSizesInput(bannerParams.sizes),
      };
    });

    const ext = {
      prebid: {
        targeting: {
          includewinners: true,
          includebidderkeys: false
        }
      }
    };

    const payload = {
      id: bidderRequest.bidderRequestId,
      tid,
      site,
      device,
      user,
      cur,
      imp,
      test: config.getConfig('debug') ? 1 : 0,
      tmax: bidderRequest.timeout,
      start: bidderRequest.auctionStart,
      ext
    };

    if (schain) {
      deepSetValue(payload, 'source.ext.schain', schain);
    }

    if (eids) {
      deepSetValue(payload, 'user.ext.eids', eids);
    }

    if (deepAccess(bidderRequest, 'gdprConsent.gdprApplies') !== undefined) {
      deepSetValue(payload, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(payload, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies & 1);
    }

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: ENDPOINT_URL + 'openrtb2/auction',
      data: payloadString,
    };
  },
  interpretResponse: function (serverResponse) {
    const body = serverResponse.body || serverResponse;
    const {cur} = body;
    const bids = [];

    if (body && body.bids && Array.isArray(body.bids)) {
      body.bids.forEach(bidItem => {
        const bid = {
          requestId: bidItem.bidid,
          adomain: bidItem.adomain,
          cpm: bidItem.cpm,
          currency: cur,
          netRevenue: true,
          ttl: bidItem.ttl || 300,
          creativeId: bidItem.creativeid,
          width: bidItem.width,
          height: bidItem.height,
          dealId: bidItem.dealid,
          ad: bidItem.ad,
          meta: bidItem.meta,
        };

        bids.push(bid);
      });
    }

    return bids
  },
  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent, gppConsent) {
    if (usersSynced) {
      return [];
    }

    const userSyncs = [];

    function checkGppStatus(gppConsent) {
      if (gppConsent && Array.isArray(gppConsent.applicableSections)) {
        return gppConsent.applicableSections.every(sec => typeof sec === 'number' && sec <= 5);
      }
      return true;
    }

    if (hasPurpose1Consent(gdprConsent) && checkGppStatus(gppConsent)) {
      responses.forEach(response => {
        if (response.body.ext && response.body.ext.usersync) {
          try {
            const userSync = response.body.ext.usersync;

            userSync.forEach((element) => {
              const url = element.url;
              const type = element.type;

              if (url) {
                if ((type === 'image' || type === 'redirect') && syncOptions.pixelEnabled) {
                  userSyncs.push({type: 'image', url: url});
                } else if (type === 'iframe' && syncOptions.iframeEnabled) {
                  userSyncs.push({type: 'iframe', url: url});
                }
              }
            })
          } catch (e) {
            //
          }
        }
      });
    }

    return userSyncs;
  }
}

const usersSynced = false;

function hasBannerMediaType(bidRequest) {
  return !!deepAccess(bidRequest, 'mediaTypes.banner');
}

function getDevice(data) {
  let dnt = data.dnt;
  if (!dnt) {
    dnt = getDNT() ? 1 : 0;
  }
  const { innerWidth, innerHeight } = getWinDimensions();

  return {
    w: data.w || innerWidth,
    h: data.h || innerHeight,
    ua: data.ua || navigator.userAgent,
    dnt: dnt,
    language: data.language || navigator.language,
  }
}

function getByKey(collection, key) {
  for (let i = 0, result; i < collection.length; i++) {
    result = deepAccess(collection[i], key);
    if (result) {
      return result;
    }
  }
}

registerBidder(spec);
