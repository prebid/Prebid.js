import { auctionManager } from '../../src/auctionManager.js';
import { config } from '../../src/config.js';
import { getHook } from '../../src/hook.js';
import {
  BID_UNAUTHORIZED_VIDEO_REJECTION_REASON,
  type BidResponseFilterConfig,
  checkBidResponse,
  configureUnauthorizedVideo,
  resetUnauthorizedVideo
} from './unauthorizedVideo.js';

export const MODULE_NAME = 'bidResponseFilter';
export const BID_CATEGORY_REJECTION_REASON = 'Category is not allowed';
export const BID_ADV_DOMAINS_REJECTION_REASON = 'Adv domain is not allowed';
export const BID_ATTR_REJECTION_REASON = 'Attr is not allowed';
export const BID_MEDIA_TYPE_REJECTION_REASON = `Media type is not allowed`;
export { BID_UNAUTHORIZED_VIDEO_REJECTION_REASON };
export type {
  BidResponseFilterConfig,
  UnauthorizedVideoConfig,
  UnauthorizedVideoData
} from './unauthorizedVideo.js';

let moduleConfig: BidResponseFilterConfig;
let enabled = false;

function isIbvBannerOnMultiFormatAdUnit(metaMediaType, bidRequest) {
  const mediaTypes = Object.keys(bidRequest?.mediaTypes || {});
  return metaMediaType === 'banner' &&
    mediaTypes.length > 1 &&
    bidRequest?.mediaTypes?.video?.context === 'inbanner';
}

function init() {
  config.getConfig(MODULE_NAME, (cfg) => {
    moduleConfig = cfg[MODULE_NAME];
    if (enabled && !moduleConfig) {
      reset();
    } else if (!enabled && moduleConfig) {
      enabled = true;
      getHook('addBidResponse').before(addBidResponseHook);
    }
    if (enabled) {
      configureUnauthorizedVideo(moduleConfig.unauthorizedVideo, (bid) => getBattrLists(bid));
    }
  });
}

export function reset() {
  enabled = false;
  resetUnauthorizedVideo();
  getHook('addBidResponse').getHooks({ hook: addBidResponseHook }).remove();
}

function hasConfiguredBlocklist(section, keys) {
  return keys.some((key) => section[key] != null);
}

function blocklistValidationPasses(includeConfigPass, configLists, requestLists) {
  return includeConfigPass ? [configLists, requestLists] : [requestLists];
}

function findBlocklistRejection(passes, validate) {
  for (const lists of passes) {
    const reason = validate(lists);
    if (reason) return reason;
  }
}

function getCategoryRejection({ bcat, cattax, catConfig, primaryCatId, secondaryCatIds, metaCattax }) {
  const isCattaxMatch = Number(metaCattax) === Number(cattax);
  if ((catConfig.enforce && isCattaxMatch && bcat.some(category => [primaryCatId, ...secondaryCatIds].includes(category))) ||
    (catConfig.blockUnknown && (!isCattaxMatch || !primaryCatId))) {
    return BID_CATEGORY_REJECTION_REASON;
  }
}

function getAdvRejection({ badv, advConfig, advertiserDomains }) {
  if ((advConfig.enforce && badv.some(domain => advertiserDomains.includes(domain))) ||
    (advConfig.blockUnknown && !advertiserDomains.length)) {
    return BID_ADV_DOMAINS_REJECTION_REASON;
  }
}

function getAttrRejection({ battr, attrConfig, metaAttr }) {
  if (
    attrConfig.enforce && (
      (attrConfig.blockUnknown && (!Array.isArray(metaAttr) || metaAttr.length === 0)) ||
      (Array.isArray(metaAttr) && metaAttr.find(attr => battr.includes(attr)))
    )
  ) {
    return BID_ATTR_REJECTION_REASON;
  }
}

function getRequestBattr(bid, index) {
  return index.getBidRequest(bid)?.ortb2Imp?.[bid.mediaType]?.battr ??
    index.getAdUnit(bid)?.ortb2Imp?.[bid.mediaType]?.battr ??
    [];
}

function getBattrLists(bid, index = auctionManager.index) {
  return [moduleConfig?.attr?.battr ?? [], getRequestBattr(bid, index)];
}

export function addBidResponseHook(next, adUnitCode, bid, reject, index = auctionManager.index) {
  const catConfig = { enforce: true, blockUnknown: true, ...(moduleConfig?.cat || {}) };
  const advConfig = { enforce: true, blockUnknown: true, ...(moduleConfig?.adv || {}) };
  const attrConfig = { enforce: true, blockUnknown: false, ...(moduleConfig?.attr || {}) };
  const ortb2 = index.getOrtb2(bid) || {};
  const bidRequest = index.getBidRequest(bid);
  const requestBattr = getRequestBattr(bid, index);
  const mediaTypesConfig = {
    enforce: true,
    blockUnknown: true,
    rejectIbvBannerOnMultiFormat: false,
    ...(moduleConfig?.mediaTypes || {})
  };

  const {
    primaryCatId, secondaryCatIds = [],
    advertiserDomains = [],
    attr: metaAttr,
    mediaType: metaMediaType,
    cattax: metaCattax = 1,
  } = bid.meta || {};

  const blocklistFilters = [
    {
      includeConfigPass: hasConfiguredBlocklist(catConfig, ['bcat', 'cattax']),
      configLists: { bcat: catConfig.bcat ?? [], cattax: catConfig.cattax ?? 1 },
      requestLists: { bcat: ortb2.bcat ?? [], cattax: ortb2.cattax ?? 1 },
      validate: (lists) => getCategoryRejection({
        ...lists, catConfig, primaryCatId, secondaryCatIds, metaCattax
      }),
    },
    {
      includeConfigPass: hasConfiguredBlocklist(advConfig, ['badv']),
      configLists: { badv: advConfig.badv },
      requestLists: { badv: ortb2.badv ?? [] },
      validate: (lists) => getAdvRejection({ ...lists, advConfig, advertiserDomains }),
    },
    {
      includeConfigPass: hasConfiguredBlocklist(attrConfig, ['battr']),
      configLists: { battr: attrConfig.battr },
      requestLists: { battr: requestBattr },
      validate: (lists) => getAttrRejection({ ...lists, attrConfig, metaAttr }),
    },
  ];

  for (const { includeConfigPass, configLists, requestLists, validate } of blocklistFilters) {
    const reason = findBlocklistRejection(
      blocklistValidationPasses(includeConfigPass, configLists, requestLists),
      validate
    );
    if (reason) {
      reject(reason);
      return;
    }
  }

  const allowedMediaTypes = Object.keys(bidRequest?.mediaTypes || {});
  const rejectIbvBannerOnMultiFormat = mediaTypesConfig.rejectIbvBannerOnMultiFormat &&
    isIbvBannerOnMultiFormatAdUnit(metaMediaType, bidRequest);
  if ((mediaTypesConfig.enforce && (!allowedMediaTypes.includes(metaMediaType) || rejectIbvBannerOnMultiFormat)) ||
    (mediaTypesConfig.blockUnknown && !metaMediaType)) {
    reject(BID_MEDIA_TYPE_REJECTION_REASON);
  } else if (checkBidResponse(adUnitCode, bid, [attrConfig.battr ?? [], requestBattr])) {
    reject(BID_UNAUTHORIZED_VIDEO_REJECTION_REASON);
  } else {
    return next(adUnitCode, bid, reject);
  }
}

init();
