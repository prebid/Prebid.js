/**
 * This module adds [DFP support]{@link https://www.doubleclickbygoogle.com/} for Video to Prebid.
 */

import { registerVideoSupport } from '../src/adServerManager';
import { getWinningBids } from '../src/targeting';
import { formatQS, format as buildUrl } from '../src/url';
import { parseSizesInput } from '../src/utils';

/**
 * @typedef {Object} DfpVideoParams
 *
 * This object contains the params needed to form a URL which hits the
 * [DFP API]{@link https://support.google.com/dfp_premium/answer/1068325?hl=en}.
 *
 * All params (except iu, mentioned below) should be considered optional. This module will choose reasonable
 * defaults for all of the other required params.
 *
 * The cust_params property, if present, must be an object. It will be merged with the rest of the
 * standard Prebid targeting params (hb_adid, hb_bidder, etc).
 *
 * @param {string} iu This param *must* be included, in order for us to create a valid request.
 * @param [string] description_url This field is required if you want Ad Exchange to bid on our ad unit...
 *   but otherwise optional
 */

/**
 * @typedef {Object} DfpVideoOptions
 *
 * @param {Object} adUnit The adUnit which this bid is supposed to help fill.
 * @param [Object] bid The bid which should be considered alongside the rest of the adserver's demand.
 *   If this isn't defined, then we'll use the winning bid for the adUnit.
 *
 * @param {DfpVideoParams} params Query params which should be set on the DFP request.
 *   These will override this module's defaults whenever they conflict.
 */

/** Safe defaults which work on pretty much all video calls. */
const defaultParamConstants = {
  env: 'vp',
  gdfp_req: 1,
  output: 'xml_vast3',
  unviewed_position_start: 1,
};

/**
 * Merge all the bid data and publisher-supplied options into a single URL, and then return it.
 *
 * @see [The DFP API]{@link https://support.google.com/dfp_premium/answer/1068325?hl=en#env} for details.
 *
 * @param {DfpVideoOptions} options Options which should be used to construct the URL.
 *
 * @return {string} A URL which calls DFP, letting options.bid
 *   (or the auction's winning bid for this adUnit, if undefined) compete alongside the rest of the
 *   demand in DFP.
 */
export default function buildDfpVideoUrl(options) {
  const adUnit = options.adUnit;
  const bid = options.bid || getWinningBids(adUnit.code)[0];

  const derivedParams = {
    correlator: Date.now(),
    sz: parseSizesInput(adUnit.sizes).join('|'),
    url: location.href,
  };

  const customParams = Object.assign({},
    bid.adserverTargeting,
    { hb_uuid: bid.videoCacheKey },
    options.params.cust_params);

  const queryParams = Object.assign({},
    defaultParamConstants,
    derivedParams,
    options.params,
    { cust_params: encodeURIComponent(formatQS(customParams)) });

  return buildUrl({
    protocol: 'https',
    host: 'pubads.g.doubleclick.net',
    pathname: '/gampad/ads',
    search: queryParams
  });
}

registerVideoSupport('dfp', {
  buildVideoUrl: buildDfpVideoUrl
});
