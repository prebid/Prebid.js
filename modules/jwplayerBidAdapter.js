import {getDNT} from '../libraries/dnt/index.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO } from '../src/mediaTypes.js';
import { isArray, isFn, deepAccess, deepSetValue, logError, logWarn } from '../src/utils.js';
import { config } from '../src/config.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';

const BIDDER_CODE = 'jwplayer';
const BASE_URL = 'https://vpb-server.jwplayer.com/';
const AUCTION_URL = BASE_URL + 'openrtb2/auction';
const USER_SYNC_URL = BASE_URL + 'setuid';
const GVLID = 1046;
const SUPPORTED_AD_TYPES = [VIDEO];

const VIDEO_ORTB_PARAMS = [
  'pos',
  'w',
  'h',
  'playbackend',
  'mimes',
  'minduration',
  'maxduration',
  'protocols',
  'startdelay',
  'placement',
  'plcmt',
  'skip',
  'skipafter',
  'minbitrate',
  'maxbitrate',
  'delivery',
  'playbackmethod',
  'api',
  'linearity'
];

function getBidAdapter() {
  function isBidRequestValid(bid) {
    const params = bid && bid.params;
    if (!params) {
      return false;
    }

    return !!params.placementId && !!params.publisherId && !!params.siteId;
  }

  function buildRequests(bidRequests, bidderRequest) {
    if (!bidRequests) {
      return;
    }

    if (!hasContentUrl(bidderRequest.ortb2)) {
      logError(`${BIDDER_CODE}: cannot bid without a valid Content URL. Please populate ortb2.site.content.url`);
      return;
    }

    const warnings = getWarnings(bidderRequest);
    warnings.forEach(warning => {
      logWarn(`${BIDDER_CODE}: ${warning}`);
    });

    return bidRequests.map(bidRequest => {
      const payload = buildRequest(bidRequest, bidderRequest);

      return {
        method: 'POST',
        url: AUCTION_URL,
        data: payload
      }
    });
  }

  function interpretResponse(serverResponse) {
    const outgoingBidResponses = [];
    const serverResponseBody = serverResponse.body;

    logResponseWarnings(serverResponseBody);

    const seatBids = serverResponseBody && serverResponseBody.seatbid;
    if (!isArray(seatBids)) {
      return outgoingBidResponses;
    }

    const cur = serverResponseBody.cur;

    seatBids.forEach(seatBid => {
      seatBid.bid.forEach(bid => {
        const bidResponse = {
          requestId: serverResponseBody.id,
          cpm: bid.price,
          currency: cur,
          width: bid.w,
          height: bid.h,
          ad: bid.adm,
          vastXml: bid.adm,
          ttl: bid.ttl || 3600,
          netRevenue: false,
          creativeId: bid.adid,
          dealId: bid.dealid,
          meta: {
            advertiserDomains: bid.adomain,
            mediaType: VIDEO,
            primaryCatId: bid.cat,
          }
        };

        outgoingBidResponses.push(bidResponse);
      });
    });

    return outgoingBidResponses;
  }

  function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
    if (!hasPurpose1Consent(gdprConsent)) {
      return [];
    }

    const userSyncs = [];
    const consentQueryParams = getUserSyncConsentQueryParams(gdprConsent);
    const url = `https://ib.adnxs.com/getuid?${USER_SYNC_URL}?bidder=jwplayer&uid=$UID&f=i` + consentQueryParams

    if (syncOptions.iframeEnabled) {
      userSyncs.push({
        type: 'iframe',
        url
      });
    }

    if (syncOptions.pixelEnabled) {
      userSyncs.push({
        type: 'image',
        url
      });
    }

    return userSyncs;
  }

  return {
    code: BIDDER_CODE,
    gvlid: GVLID,
    supportedMediaTypes: SUPPORTED_AD_TYPES,
    isBidRequestValid,
    buildRequests,
    interpretResponse,
    getUserSyncs
  }

  function getUserSyncConsentQueryParams(gdprConsent) {
    if (!gdprConsent) {
      return '';
    }

    const consentString = gdprConsent.consentString;
    if (!consentString) {
      return '';
    }

    let gdpr = 0;
    const gdprApplies = gdprConsent.gdprApplies;
    if (typeof gdprApplies === 'boolean') {
      gdpr = Number(gdprApplies)
    }

    return `&gdpr=${gdpr}&gdpr_consent=${consentString}`;
  }

  function buildRequest(bidRequest, bidderRequest) {
    const openrtbRequest = {
      id: bidRequest.bidId,
      imp: getRequestImpressions(bidRequest, bidderRequest),
      site: getRequestSite(bidRequest, bidderRequest),
      device: getRequestDevice(bidderRequest.ortb2),
      user: getRequestUser(bidderRequest.ortb2),
    };

    // GDPR Consent Params
    if (bidderRequest.gdprConsent) {
      deepSetValue(openrtbRequest, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(openrtbRequest, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
    }

    // CCPA
    if (bidderRequest.uspConsent) {
      deepSetValue(openrtbRequest, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    const schain = bidRequest?.ortb2?.source?.ext?.schain;
    if (schain) {
      deepSetValue(openrtbRequest, 'source.schain', schain);
    }

    openrtbRequest.tmax = bidderRequest.timeout || 200;

    return JSON.stringify(openrtbRequest);
  }

  function getRequestImpressions(bidRequest) {
    const impressionObject = {
      id: bidRequest.adUnitCode,
    };

    impressionObject.video = getImpressionVideo(bidRequest);

    const bidFloorData = getBidFloorData(bidRequest);
    if (bidFloorData) {
      impressionObject.bidfloor = bidFloorData.floor;
      impressionObject.bidfloorcur = bidFloorData.currency;
    }

    impressionObject.ext = getImpressionExtension(bidRequest);

    return [impressionObject];
  }

  function getImpressionVideo(bidRequest) {
    const videoParams = deepAccess(bidRequest, 'mediaTypes.video', {});

    const video = {};

    VIDEO_ORTB_PARAMS.forEach((param) => {
      if (videoParams.hasOwnProperty(param)) {
        video[param] = videoParams[param];
      }
    });

    setPlayerSize(video, videoParams);

    if (!videoParams.plcmt) {
      logWarn(`${BIDDER_CODE}: Please set a value to mediaTypes.video.plcmt`);
    }

    return video;
  }

  function getImpressionExtension(bidRequest) {
    return {
      prebid: {
        bidder: {
          jwplayer: {
            placementId: bidRequest.params.placementId
          }
        }
      }
    };
  }

  function setPlayerSize(videoImp, videoParams) {
    if (videoImp.w !== undefined && videoImp.h !== undefined) {
      return;
    }

    const playerSize = getNormalizedPlayerSize(videoParams.playerSize);
    if (!playerSize.length) {
      logWarn(logWarn(`${BIDDER_CODE}: Video size has not been set. Please set values in video.h and video.w`));
      return;
    }

    if (videoImp.w === undefined) {
      videoImp.w = playerSize[0];
    }

    if (videoImp.h === undefined) {
      videoImp.h = playerSize[1];
    }
  }

  function getNormalizedPlayerSize(playerSize) {
    if (!Array.isArray(playerSize)) {
      return [];
    }

    if (Array.isArray(playerSize[0])) {
      playerSize = playerSize[0];
    }

    if (playerSize.length < 2) {
      return [];
    }

    return playerSize;
  }

  function getBidFloorData(bidRequest) {
    const { params } = bidRequest;
    const currency = params.currency || 'USD';

    let floorData;
    if (isFn(bidRequest.getFloor)) {
      const bidFloorRequest = {
        currency: currency,
        mediaType: VIDEO,
        size: '*'
      };
      floorData = bidRequest.getFloor(bidFloorRequest);
    } else if (params.bidFloor) {
      floorData = { floor: params.bidFloor, currency: currency };
    }

    return floorData;
  }

  function getRequestSite(bidRequest, bidderRequest) {
    const site = bidderRequest.ortb2.site || {};

    site.domain = site.domain || config.publisherDomain || window.location.hostname;
    site.page = site.page || config.pageUrl || window.location.href;

    const referer = bidderRequest.refererInfo && bidderRequest.refererInfo.referer;
    if (!site.ref && referer) {
      site.ref = referer;
    }

    const jwplayerPublisherExtChain = 'publisher.ext.jwplayer.';

    deepSetValue(site, jwplayerPublisherExtChain + 'publisherId', bidRequest.params.publisherId);
    deepSetValue(site, jwplayerPublisherExtChain + 'siteId', bidRequest.params.siteId);

    return site;
  }

  function getRequestDevice(ortb2) {
    const device = Object.assign({
      h: screen.height,
      w: screen.width,
      ua: navigator.userAgent,
      dnt: getDNT() ? 1 : 0,
      js: 1
    }, ortb2.device || {})

    const language = getLanguage();
    if (!device.language && language) {
      device.language = language;
    }

    return device;
  }

  function getLanguage() {
    const navigatorLanguage = navigator.language;
    if (!navigatorLanguage) {
      return;
    }

    const languageCodeSegments = navigatorLanguage.split('-');
    if (!languageCodeSegments.length) {
      return;
    }

    return languageCodeSegments[0];
  }

  function getRequestUser(ortb2) {
    const user = ortb2.user || {};
    if (config.getConfig('coppa') === true) {
      user.coppa = true;
    }

    return user;
  }

  function hasContentUrl(ortb2) {
    const site = ortb2.site;
    const content = site && site.content;
    return !!(content && content.url);
  }

  function getWarnings(bidderRequest) {
    const content = bidderRequest.ortb2.site.content;
    const contentChain = 'ortb2.site.content.';
    const warnings = [];
    if (!content.id) {
      warnings.push(getMissingFieldMessage(contentChain + 'id'));
    }

    if (!content.title) {
      warnings.push(getMissingFieldMessage(contentChain + 'title'));
    }

    if (!content.ext || !content.ext.description) {
      warnings.push(getMissingFieldMessage(contentChain + 'ext.description'));
    }

    return warnings;
  }

  function getMissingFieldMessage(fieldName) {
    return `Optional field ${fieldName} is not populated; we recommend populating for maximum performance.`
  }

  function logResponseWarnings(serverResponseBody) {
    const warningPayload = deepAccess(serverResponseBody, 'ext.warnings');
    if (!warningPayload) {
      return;
    }

    const warningCategories = Object.keys(warningPayload);
    warningCategories.forEach(category => {
      const warnings = warningPayload[category];
      if (!isArray(warnings)) {
        return;
      }

      warnings.forEach(warning => {
        logWarn(`${BIDDER_CODE}: [Bid Response][Warning Code: ${warning.code}] ${warning.message}`);
      });
    });
  }
}

export const spec = getBidAdapter();

registerBidder(spec);
