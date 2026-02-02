// jshint esversion: 6, es3: false, node: true
'use strict';

import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO, NATIVE} from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {config} from '../src/config.js';
import {triggerPixel, logInfo, logError} from '../src/utils.js';

const BIDDER_CODE = 'allegro';
const BIDDER_URL = 'https://prebid.rtb.allegrogroup.com/v1/rtb/prebid/bid';
const GVLID = 1493;

/**
 * Traverses an OpenRTB bid request object and moves any ext objects into
 * DoubleClick (Google) style bracketed keys (e.g. ext -> [com.google.doubleclick.site]).
 * Also normalizes certain integer flags into booleans (e.g. gdpr: 1 -> true).
 * This mutates the provided request object in-place.
 *
 * @param request OpenRTB bid request being prepared for sending.
 */
function convertExtensionFields(request) {
  if (request.imp) {
    request.imp.forEach(imp => {
      if (imp.banner?.ext) {
        moveExt(imp.banner, '[com.google.doubleclick.banner_ext]')
      }
      if (imp.ext) {
        moveExt(imp, '[com.google.doubleclick.imp]')
      }
    });
  }

  if (request.app?.ext) {
    moveExt(request.app, '[com.google.doubleclick.app]')
  }

  if (request.site?.ext) {
    moveExt(request.site, '[com.google.doubleclick.site]')
  }

  if (request.site?.publisher?.ext) {
    moveExt(request.site.publisher, '[com.google.doubleclick.publisher]')
  }

  if (request.user?.ext) {
    moveExt(request.user, '[com.google.doubleclick.user]')
  }

  if (request.user?.data) {
    request.user.data.forEach(data => {
      if (data.ext) {
        moveExt(data, '[com.google.doubleclick.data]')
      }
    });
  }

  if (request.device?.ext) {
    moveExt(request.device, '[com.google.doubleclick.device]')
  }

  if (request.device?.geo?.ext) {
    moveExt(request.device.geo, '[com.google.doubleclick.geo]')
  }

  if (request.regs?.ext) {
    if (request.regs?.ext?.gdpr !== undefined) {
      request.regs.ext.gdpr = request.regs.ext.gdpr === 1;
    }

    moveExt(request.regs, '[com.google.doubleclick.regs]')
  }

  if (request.source?.ext) {
    moveExt(request.source, '[com.google.doubleclick.source]')
  }

  if (request.ext) {
    moveExt(request, '[com.google.doubleclick.bid_request]')
  }
}

/**
 * Moves an `ext` field from a given object to a new bracketed key, cloning its contents.
 * If object or ext is missing nothing is done.
 *
 * @param obj The object potentially containing `ext`.
 * @param {string} newKey The destination key name (e.g. '[com.google.doubleclick.site]').
 */
function moveExt(obj, newKey) {
  if (!obj || !obj.ext) {
    return;
  }
  const extCopy = {...obj.ext};
  delete obj.ext;
  obj[newKey] = extCopy;
}

/**
 * Custom ORTB converter configuration adjusting request/imp level boolean coercions
 * and migrating extension fields depending on config. Provides `toORTB` and `fromORTB`
 * helpers used in buildRequests / interpretResponse.
 */
const converter = ortbConverter({
  context: {
    mediaType: BANNER,
    ttl: 360,
    netRevenue: true
  },

  /**
   * Builds and post-processes a single impression object, coercing integer flags to booleans.
   *
   * @param {Function} buildImp Base builder provided by ortbConverter.
   * @param bidRequest Individual bid request from Prebid.
   * @param context Shared converter context.
   * @returns {Object} ORTB impression object.
   */
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    if (imp?.banner?.topframe !== undefined) {
      imp.banner.topframe = imp.banner.topframe === 1;
    }
    if (imp?.secure !== undefined) {
      imp.secure = imp.secure === 1;
    }
    return imp;
  },

  /**
   * Builds the full ORTB request and normalizes integer flags. Optionally migrates ext fields
   * into Google style bracketed keys unless disabled via `allegro.convertExtensionFields` config.
   *
   * @param {Function} buildRequest Base builder provided by ortbConverter.
   * @param {Object[]} imps Array of impression objects.
   * @param bidderRequest Prebid bidderRequest (contains refererInfo, gdpr, etc.).
   * @param context Shared converter context.
   * @returns {Object} Mutated ORTB request object ready to serialize.
   */
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    if (request?.device?.dnt !== undefined) {
      request.device.dnt = request.device.dnt === 1;
    }

    if (request?.device?.sua?.mobile !== undefined) {
      request.device.sua.mobile = request.device.sua.mobile === 1;
    }

    if (request?.test !== undefined) {
      request.test = request.test === 1;
    }

    // by default, we convert extension fields unless the config explicitly disables it
    const convertExtConfig = config.getConfig('allegro.convertExtensionFields');
    if (convertExtConfig === undefined || convertExtConfig === true) {
      convertExtensionFields(request);
    }

    if (request?.source?.schain && !isSchainValid(request.source.schain)) {
      delete request.source.schain;
    }

    return request;
  }
})

/**
 * Validates supply chain object structure
 * @param schain - Supply chain object
 * @return {boolean} True if valid, false otherwise
 */
function isSchainValid(schain) {
  try {
    if (!schain || !schain.nodes || !Array.isArray(schain.nodes)) {
      return false;
    }
    const requiredFields = ['asi', 'sid', 'hp'];
    return schain.nodes.every(node =>
      requiredFields.every(field => node.hasOwnProperty(field))
    );
  } catch (error) {
    logError('Allegro: Error validating schain:', error);
    return false;
  }
}

/**
 * Allegro Bid Adapter specification object consumed by Prebid core.
 */
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  gvlid: GVLID,

  /**
   * Validates an incoming bid object.
   *
   * @param bid Prebid bid request params.
   * @returns {boolean} True if bid is considered valid.
   */
  isBidRequestValid: function (bid) {
    return !!(bid);
  },

  /**
   * Generates the network request payload for the adapter.
   *
   * @param bidRequests List of valid bid requests.
   * @param bidderRequest Aggregated bidder request data (gdpr, usp, refererInfo, etc.).
   * @returns Request details for Prebid to send.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    const url = config.getConfig('allegro.bidderUrl') || BIDDER_URL;

    return {
      method: 'POST',
      url: url,
      data: converter.toORTB({bidderRequest, bidRequests}),
      options: {
        contentType: 'text/plain'
      },
    }
  },

  /**
   * Parses the server response into Prebid bid objects.
   *
   * @param response Server response wrapper from Prebid XHR (expects `body`).
   * @param request Original request object passed to server (contains `data`).
   */
  interpretResponse: function (response, request) {
    if (!response.body) return;
    return converter.fromORTB({response: response.body, request: request.data}).bids;
  },

  /**
   * Fires impression tracking pixel when the bid wins if enabled by config.
   *
   * @param bid The winning bid object.
   */
  onBidWon: function (bid) {
    const triggerImpressionPixel = config.getConfig('allegro.triggerImpressionPixel');

    if (triggerImpressionPixel && bid.burl) {
      triggerPixel(bid.burl);
    }

    if (config.getConfig('debug')) {
      logInfo('bid won', bid);
    }
  }

}

registerBidder(spec);
