/**
 * This module adds [DFP support]{@link https://www.doubleclickbygoogle.com/} for Video to Prebid.
 */

import { registerVideoSupport } from './adserverManager';
import { getWinningBids } from './targeting';
import { formatQS, format as buildUrl } from './url';
import { parseSizesInput } from './utils';

/**
 * @typedef {Object} DfpVideoParams
 *
 * This object contains the params needed to form a URL which hits the
 * [DFP API](https://support.google.com/dfp_premium/answer/1068325?hl=en).
 *
 * All params (except iu, mentioned below) should be considered optional. This module will choose reasonable
 * defaults for all of the other required params.
 *
 * The cust_params property, if present, must be an object. It will be merged with the rest of the
 * standard Prebid targeting params (hb_adid, hb_bidder, etc).
 *
 * @param {string} iu This param *must* be included, in order for us to create a valid request.
 */

/**
 * @typedef {Object} DfpVideoOptions
 *
 * @param {Object} adUnit The adUnit which this bid is supposed to help fill.
 * @param [Object] bid The bid which should be considered alongside the rest of the adserver's demand.
 *   If this isn't defined, then we'll use the winning bid for the adUnit.
 *
 * @param {DfpVideoParams} params This object should have keys for each entry in the
 *   [DFP API]{@link https://support.google.com/dfp_premium/answer/1068325?hl=en#env}.
 *   Optional params there are optional keys here. Required Params there are required keys here.
 *   Keys in this object which aren't part of the official API will be folded into cust_params.
 */

/**
 * Safe defaults which work on all calls.
 */
const defaultParamConstants = {
  env: 'vp',
  gdfp_req: 1,
  output: 'xml_vast2',
  unviewed_position_start: 1,
};

/**
 * Merge all the bid data and publisher-supplied options into a single URL, and then return it.
 *
 * @see [The DFP API]{@link https://support.google.com/dfp_premium/answer/1068325?hl=en#env} for details.
 *
 * @param {DfpVideoOptions} options
 *
 * @return {string}
 */
export function buildDfpVideoUrl(options) {
  const bid = options.bid || getWinningBids(this.code)[0];
  const adUnit = options.adUnit;

  const derivedParams = {
    correlator: Date.now(),
    description_url: encodeURIComponent(bid.descriptionUrl),
    sz: parseSizesInput(adUnit.sizes).join('|'),
    url: location.href,
  };

  const customParams = Object.assign({},
    bid.adserverTargeting,
    { hb_uuid: bid.videoCacheKey.cacheId },
    options.params.cust_params);

  const queryParams = Object.assign({},
    defaultParamConstants,
    derivedParams,
    options.params,
    { cust_params: encodeURIComponent(formatQS(customParams))});

  return buildUrl({
    protocol: 'https',
    host: 'pubads.g.doubleclick.net',
    pathname: '/gampad/ads',
    search: queryParams
  });
}

registerVideoSupport('dfp', {
  buildVideoAdUrl: buildDfpVideoUrl
});
