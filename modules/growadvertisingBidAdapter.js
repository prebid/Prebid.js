'use strict';

import { getBidIdParameter, deepAccess, _each, triggerPixel } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';

const BIDDER_CODE = 'growads';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],

  isBidRequestValid: function (bid) {
    return bid.params && !!bid.params.zoneId;
  },

  buildRequests: function (validBidRequests) {
    let zoneId;
    let domain;
    let requestURI;
    let data = {};
    const zoneCounters = {};

    return validBidRequests.map(bidRequest => {
      zoneId = getBidIdParameter('zoneId', bidRequest.params);
      domain = getBidIdParameter('domain', bidRequest.params);

      if (!(zoneId in zoneCounters)) {
        zoneCounters[zoneId] = 0;
      }

      if (typeof domain === 'undefined' || domain.length === 0) {
        domain = 'portal.growadvertising.com';
      }

      requestURI = 'https://' + domain + '/adserve/bid';
      data = {
        type: 'prebidjs',
        zoneId: zoneId,
        i: zoneCounters[zoneId]
      };
      zoneCounters[zoneId]++;

      return {
        method: 'GET',
        url: requestURI,
        data: data,
        bidRequest: bidRequest
      };
    });
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const request = bidRequest.bidRequest;
    let bidResponses = [];
    let CPM;
    let width;
    let height;
    let response;
    let isCorrectSize = false;
    let isCorrectCPM = true;
    let minCPM;
    let maxCPM;
    let bid = {};

    let body = serverResponse.body;

    try {
      response = JSON.parse(body);
    } catch (ex) {
      response = body;
    }

    if (response && response.status === 'success' && request) {
      CPM = parseFloat(response.cpm);
      width = parseInt(response.width);
      height = parseInt(response.height);

      minCPM = getBidIdParameter('minCPM', request.params);
      maxCPM = getBidIdParameter('maxCPM', request.params);
      width = parseInt(response.width);
      height = parseInt(response.height);

      // Ensure response CPM is within the given bounds
      if (minCPM !== '' && CPM < parseFloat(minCPM)) {
        isCorrectCPM = false;
      }
      if (maxCPM !== '' && CPM > parseFloat(maxCPM)) {
        isCorrectCPM = false;
      }

      if (isCorrectCPM) {
        bid = {
          requestId: request.bidId,
          bidderCode: request.bidder,
          creativeId: response.creativeId,
          cpm: CPM,
          width: width,
          height: height,
          currency: response.currency,
          netRevenue: true,
          ttl: response.ttl,
          adUnitCode: request.adUnitCode,
          referrer: deepAccess(request, 'refererInfo.referer')
        };

        if (response.hasOwnProperty(NATIVE)) {
          bid[NATIVE] = {
            title: response[NATIVE].title,
            body: response[NATIVE].body,
            body2: response[NATIVE].body2,
            cta: response[NATIVE].cta,
            sponsoredBy: response[NATIVE].sponsoredBy,
            clickUrl: response[NATIVE].clickUrl,
            impressionTrackers: response[NATIVE].impressionTrackers,
          };

          if (response[NATIVE].image) {
            bid[NATIVE].image = {
              url: response[NATIVE].image.url,
              height: response[NATIVE].image.height,
              width: response[NATIVE].image.width
            };
          }

          if (response[NATIVE].icon) {
            bid[NATIVE].icon = {
              url: response[NATIVE].icon.url,
              height: response[NATIVE].icon.height,
              width: response[NATIVE].icon.width
            };
          }
          bid.mediaType = NATIVE;
          isCorrectSize = true;
        } else {
          bid.ad = response.ad;
          bid.mediaType = BANNER;
          // Ensure that response ad matches one of the placement sizes.
          _each(deepAccess(request, 'mediaTypes.banner.sizes', []), function (size) {
            if (width === size[0] && height === size[1]) {
              isCorrectSize = true;
            }
          });
        }

        if (isCorrectSize) {
          bidResponses.push(bid);
        }
      }
    }

    return bidResponses;
  },

  onBidWon: function (bid) {
    if (bid.vurl) {
      triggerPixel(bid.vurl);
    }
  },
};

registerBidder(spec);
