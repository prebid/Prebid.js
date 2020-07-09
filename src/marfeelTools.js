/*
 * Copyright (c) 2019 by Marfeel Solutions (http://www.marfeel.com)
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Marfeel Solutions S.L and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Marfeel Solutions S.L and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Marfeel Solutions SL.
 */
import { config } from './config.js';
import { isArray } from './utils.js';
import CONSTANTS from './constants.json';
import { auctionManager } from './auctionManager.js';

var lastLocation;

export const blacklistedCacheBidders = ['teads'];

export const getLastLocation = () => lastLocation;

const extractLastLocationFromArray = (adUnitArr) => (
  adUnitArr &&
  adUnitArr[0] &&
  adUnitArr[0].bids &&
  adUnitArr[0].bids[0] &&
  adUnitArr[0].bids[0].params &&
  adUnitArr[0].bids[0].params.referrer) ? adUnitArr[0].bids[0].params.referrer : '';

const extractLastLocationFromObject = (adUnitArr) => (
  adUnitArr &&
  adUnitArr.bids &&
  adUnitArr.bids[0] &&
  adUnitArr.bids[0].params &&
  adUnitArr.bids[0].params.referrer) ? adUnitArr.bids[0].params.referrer : '';

export const setLastLocationFromLastAdUnit = (adUnitArr) => {
  if (isArray(adUnitArr)) {
    lastLocation = extractLastLocationFromArray(adUnitArr);
  } else {
    lastLocation = extractLastLocationFromObject(adUnitArr);
  }
}

const normalizeSizes = sizesArray => sizesArray.join('x');

function is1x1Allowed(auctionSizes) {
  const LARGE_SIZE_NORMALIZED = '300x250';

  return (auctionSizes.map(normalizeSizes).includes(LARGE_SIZE_NORMALIZED));
}

const getCurrentAuctionSizes = () => {
  const lastAdUnitUsed = [...auctionManager.getAdUnits()].pop();

  if (lastAdUnitUsed &&
      lastAdUnitUsed.mediaTypes &&
      lastAdUnitUsed.mediaTypes['banner'] &&
      lastAdUnitUsed.mediaTypes['banner'].sizes
  ) {
    return lastAdUnitUsed.mediaTypes['banner'].sizes;
  }

  return [];
}

export const isBidSizeAllowed = (bid, allowedSizes) => {
  const allowedSizesNormalized = allowedSizes.map(normalizeSizes);
  const bidSize = normalizeSizes([bid.width, bid.height]);

  return allowedSizesNormalized.includes(bidSize);
}

function add1x1IfAllowed(auctionSizes) {
  const SIZE_1_X_1 = [1, 1];

  return is1x1Allowed(auctionSizes) ? [...auctionSizes, SIZE_1_X_1] : auctionSizes;
}

export function getAllowedSizes() {
  return add1x1IfAllowed(getCurrentAuctionSizes())
}

export function getBidReferrer(bidderRequest) {
  const bids = bidderRequest.bids;
  const NO_REFERRER = 'no-referrer';
  const NO_REFERRER_LOG = 'Bid with no referrer';

  if (!bids || bids.length < 1) {
    // eslint-disable-next-line no-console
    console.warn(NO_REFERRER_LOG);
    return NO_REFERRER;
  }

  const bid = bids[0];

  if (bid && bid.params && bid.params.referrer) {
    return bid.params.referrer;
  } else {
    // eslint-disable-next-line no-console
    console.warn(NO_REFERRER_LOG);
    return NO_REFERRER;
  }
}

const isBidCached = (bid) => bid[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING][CONSTANTS.TARGETING_KEYS.CACHED];

const getBidName = (bid) => bid[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING][CONSTANTS.TARGETING_KEYS.BIDDER];

export const isBidAllowed = (bid) => !(isBidCached(bid) && blacklistedCacheBidders.includes(getBidName(bid)));

export const attachDomainToSiteRequest = (request, url) => {
  if (request && request.site) {
    request.site.domain = url.split('/')[2] || ''
  }

  return request;
};

export function getPageUrl(bidRequest, bidderRequest) {
  let pageUrl = config.getConfig('pageUrl');
  if (bidRequest.params.referrer) {
    pageUrl = bidRequest.params.referrer;
  } else if (!pageUrl) {
    pageUrl = bidderRequest.refererInfo.referer;
  }
  return bidRequest.params.secure ? pageUrl.replace(/^http:/i, 'https:') : pageUrl;
};
