/**
 * This module adds Relevad provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch categories and segments from Relevad server and pass them to the bidders
 * @module modules/relevadRtdProvider
 * @requires module:modules/realTimeData
 */

import {deepSetValue, isEmpty, logError, mergeDeep} from '../src/utils.js';
import {submodule} from '../src/hook.js';
import {ajax} from '../src/ajax.js';
import {config} from '../src/config.js';
import {getRefererInfo} from '../src/refererDetection.js';

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'RelevadRTDModule';

const SEGTAX_IAB = 6; // IAB Content Taxonomy v2
const CATTAX_IAB = 6; // IAB Contextual Taxonomy v2.2
const RELEVAD_API_DOMAIN = 'https://prebid.relestar.com';
const entries = Object.entries;
const AJAX_OPTIONS = {
  withCredentials: true,
  referrerPolicy: 'unsafe-url',
  crossOrigin: true,
};

export let serverData = {}; // Tracks data returned from Relevad RTD server

/**
 * Provides contextual IAB categories and segments to the bidders.
 *
 * @param      {Object}    reqBidsConfigObj  Bids request configuration
 * @param      {Function}  onDone            Ajax callback
 * @param      {Object}    moduleConfig      Rtd module configuration
 * @param      {Object}    userConsent       user GDPR consent
 */
export function getBidRequestData(reqBidsConfigObj, onDone, moduleConfig, userConsent) {
  moduleConfig.params = moduleConfig.params || {};
  moduleConfig.params.partnerid = moduleConfig.params.partnerid ? moduleConfig.params.partnerid : 1;

  const adunitInfo = reqBidsConfigObj.adUnits.map(adunit => { return [adunit.code, adunit.bids.map(bid => { return [bid.bidder, bid.params] })]; });
  serverData.page = moduleConfig.params.actualUrl || getRefererInfo().page || '';
  const url = (RELEVAD_API_DOMAIN + '/apis/rweb2/' +
                '?url=' + encodeURIComponent(serverData.page) +
                '&au=' + encodeURIComponent(JSON.stringify(adunitInfo)) +
                '&pid=' + encodeURIComponent(moduleConfig.params?.publisherid || '') +
                '&aid=' + encodeURIComponent(moduleConfig.params?.apikey || '') +
                '&cid=' + encodeURIComponent(moduleConfig.params?.partnerid || '') +
                '&gdpra=' + encodeURIComponent(userConsent?.gdpr?.gdprApplies || '') +
                '&gdprc=' + encodeURIComponent(userConsent?.gdpr?.consentString || '')
  );

  ajax(url,
    {
      success: function (response, req) {
        if (req.status === 200) {
          try {
            const data = JSON.parse(response);
            serverData.rawdata = data;
            if (data) {
              addRtdData(reqBidsConfigObj, data, moduleConfig);
            }
          } catch (e) {
            logError(SUBMODULE_NAME, 'unable to parse data: ' + e);
          }
          onDone();
        }
      },
      error: function () {
        logError(SUBMODULE_NAME, 'unable to receive data');
        onDone();
      }
    },
    null,
    { method: 'GET', ...AJAX_OPTIONS, },
  );
}

/**
 * Sets global ORTB user and site data
 *
 * @param      {Object}  ortb2     The global ORTB structure
 * @param      {Object}  rtdData   Rtd segments and categories
 */
export function setGlobalOrtb2(ortb2, rtdData) {
  try {
    const addOrtb2 = composeOrtb2Data(rtdData, 'site');
    !isEmpty(addOrtb2) && mergeDeep(ortb2, addOrtb2);
  } catch (e) {
    logError(e)
  }
}

/**
 * Compose ORTB2 data fragment from RTD data
 *
 * @param  {Object}  rtdData RTD segments and categories
 * @param  {string}      prefix  Site path prefix
 * @return {Object} ORTB2 fragment ready to be merged into global or bidder ORTB
 */
function composeOrtb2Data(rtdData, prefix) {
  const segments = rtdData.segments;
  const categories = rtdData.categories;
  const content = rtdData.content;
  const addOrtb2 = {};

  !isEmpty(segments) && deepSetValue(addOrtb2, 'user.ext.data.relevad_rtd', segments);
  !isEmpty(categories.cat) && deepSetValue(addOrtb2, prefix + '.cat', categories.cat);
  !isEmpty(categories.pagecat) && deepSetValue(addOrtb2, prefix + '.pagecat', categories.pagecat);
  !isEmpty(categories.sectioncat) && deepSetValue(addOrtb2, prefix + '.sectioncat', categories.sectioncat);
  !isEmpty(categories.sectioncat) && deepSetValue(addOrtb2, prefix + '.ext.data.relevad_rtd', categories.sectioncat);
  !isEmpty(categories.cattax) && deepSetValue(addOrtb2, prefix + '.cattax', categories.cattax);

  if (!isEmpty(content) && !isEmpty(content.segs) && content.segtax) {
    const contentSegments = {
      name: 'relevad',
      ext: { segtax: content.segtax },
      segment: content.segs.map(x => { return {id: x}; })
    };
    deepSetValue(addOrtb2, prefix + '.content.data', [contentSegments]);
  }
  return addOrtb2;
}

/**
 * Sets ORTB user and site data for a given bidder
 *
 * @param      {Object}  bidderOrtbFragment  The bidder ORTB fragment
 * @param      {Object}  bidder     The bidder name
 * @param      {Object}  rtdData    RTD categories and segments
 */
function setBidderSiteAndContent(bidderOrtbFragment, bidder, rtdData) {
  try {
    const addOrtb2 = composeOrtb2Data(rtdData, 'site');
    !isEmpty(rtdData.segments) && deepSetValue(addOrtb2, 'user.ext.data.relevad_rtd', rtdData.segments);
    !isEmpty(rtdData.segments) && deepSetValue(addOrtb2, 'user.ext.data.segments', rtdData.segments);
    !isEmpty(rtdData.categories) && deepSetValue(addOrtb2, 'user.ext.data.contextual_categories', rtdData.categories.pagecat);
    if (isEmpty(addOrtb2)) {
      return;
    }
    bidderOrtbFragment[bidder] = bidderOrtbFragment[bidder] || {};
    mergeDeep(bidderOrtbFragment[bidder], addOrtb2);
  } catch (e) {
    logError(e)
  }
}

/**
 * Filters dictionary entries
 *
 * @param      {Object}   dict A dictionary with numeric values
 * @param      {string}  minscore       The minimum value
 * @return     {Array<string>} Array of category names with scores greater or equal to minscore
 */
function filterByScore(dict, minscore) {
  if (dict && !isEmpty(dict)) {
    minscore = minscore && typeof minscore === 'number' ? minscore : 30;
    try {
      const filteredCategories = Object.keys(Object.fromEntries(Object.entries(dict).filter(([k, v]) => v > minscore)));
      return isEmpty(filteredCategories) ? null : filteredCategories;
    } catch (e) {
      logError(e);
    }
  }
  return null;
}

/**
 * Filters RTD by relevancy score
 *
 * @param      {object}  data      The Input RTD
 * @param      {string}  minscore  The minimum relevancy score
 * @return     {object}  Filtered RTD
 */
function getFiltered(data, minscore) {
  const relevadData = {'segments': []};

  minscore = minscore && typeof minscore === 'number' ? minscore : 30;

  const cats = filterByScore(data.cats, minscore);
  const pcats = filterByScore(data.pcats, minscore) || cats;
  const scats = filterByScore(data.scats, minscore) || pcats;
  const cattax = (data.cattax || data.cattax === undefined) ? data.cattax : CATTAX_IAB;
  relevadData.categories = {cat: cats, pagecat: pcats, sectioncat: scats, cattax: cattax};

  const contsegs = filterByScore(data.contsegs, minscore);
  const segtax = data.segtax ? data.segtax : SEGTAX_IAB;
  relevadData.content = {segs: contsegs, segtax: segtax};

  try {
    if (data && data.segments) {
      for (const segId in data.segments) {
        if (data.segments.hasOwnProperty(segId)) {
          relevadData.segments.push(data.segments[segId].toString());
        }
      }
    }
  } catch (e) {
    logError(e);
  }
  return relevadData;
}

/**
 * Adds Rtd data to global ORTB structure and bidder requests
 *
 * @param      {Object}  reqBids       The bid requests list
 * @param      {Object}  data          The Rtd data
 * @param      {Object}  moduleConfig  The Rtd module configuration
 */
export function addRtdData(reqBids, data, moduleConfig) {
  moduleConfig = moduleConfig || {};
  moduleConfig.params = moduleConfig.params || {};
  const globalMinScore = moduleConfig.params.hasOwnProperty('minscore') ? moduleConfig.params.minscore : 30;
  const relevadData = getFiltered(data, globalMinScore);
  const relevadList = relevadData.segments.concat(relevadData.categories.pagecat);
  // Publisher side bidder whitelist
  const biddersParamsExist = !!(moduleConfig?.params?.bidders);
  // RTD Server-side bidder whitelist
  const wl = data.wl || null;
  const noWhitelists = !biddersParamsExist && isEmpty(wl);

  // Add RTD data to the global ORTB fragments when no whitelists present
  noWhitelists && setGlobalOrtb2(reqBids.ortb2Fragments?.global, relevadData);

  // Target GAM/GPT
  const setgpt = moduleConfig.params.setgpt || !moduleConfig.params.hasOwnProperty('setgpt');
  if (moduleConfig.dryrun || (typeof window.googletag !== 'undefined' && setgpt)) {
    try {
      if (window.googletag && window.googletag.pubads && (typeof window.googletag.pubads === 'function')) {
        window.googletag.pubads().getSlots().forEach(function (n) {
          if (typeof n.setTargeting !== 'undefined' && relevadList && relevadList.length > 0) {
            n.setTargeting('relevad_rtd', relevadList);
          }
        });
      }
    } catch (e) {
      logError(e);
    }
  }

  // Set per-bidder RTD
  const adUnits = reqBids.adUnits;
  adUnits.forEach(adUnit => {
    noWhitelists && deepSetValue(adUnit, 'ortb2Imp.ext.data.relevad_rtd', relevadList);

    adUnit.hasOwnProperty('bids') && adUnit.bids.forEach(bid => {
      const bidderIndex = (moduleConfig.params.hasOwnProperty('bidders') ? moduleConfig.params.bidders.findIndex(function (i) {
        return i.bidder === bid.bidder;
      }) : false);
      const indexFound = !!(typeof bidderIndex === 'number' && bidderIndex >= 0);
      try {
        if (
          !biddersParamsExist ||
            (indexFound &&
              (!moduleConfig.params.bidders[bidderIndex].hasOwnProperty('adUnitCodes') ||
                moduleConfig.params.bidders[bidderIndex].adUnitCodes.indexOf(adUnit.code) !== -1
              )
            )
        ) {
          let wb = isEmpty(wl) || wl[bid.bidder] === true;
          if (!wb && !isEmpty(wl[bid.bidder])) {
            wb = true;
            for (const [key, value] of entries(wl[bid.bidder])) {
              const params = bid?.params || {};
              wb = wb && (key in params) && params[key] === value;
            }
          }
          if (wb && !isEmpty(relevadList)) {
            setBidderSiteAndContent(reqBids.ortb2Fragments?.bidder, bid.bidder, relevadData);
            setBidderSiteAndContent(bid, 'ortb2', relevadData);
            deepSetValue(bid, 'params.keywords.relevad_rtd', relevadList);
            !(bid.params?.target || '').includes('relevad_rtd=') && deepSetValue(bid, 'params.target', [].concat(bid.params?.target ? [bid.params.target] : []).concat(relevadList.map(entry => { return 'relevad_rtd=' + entry; })).join(';'));
            const firstPartyData = {};
            firstPartyData[bid.bidder] = { firstPartyData: { relevad_rtd: relevadList } };
            config.setConfig(firstPartyData);
          }
        }
      } catch (e) {
        logError(e);
      }
    });
  });

  serverData = {...serverData, ...relevadData};
  return adUnits;
}

/**
 * Sends bid info to the RTD server
 *
 * @param      {JSON}  data  Bids information
 * @param      {object}  config  Configuraion
 */
function sendBids(data, config) {
  const dataJson = JSON.stringify(data);

  if (!config.dryrun) {
    ajax(RELEVAD_API_DOMAIN + '/apis/bids/', () => {}, dataJson, AJAX_OPTIONS);
  }
  serverData = { clientdata: data };
};

/**
 * Processes AUCTION_END event
 *
 * @param      {object}  auctionDetails  Auction details
 * @param      {object}  config          Module configuration
 * @param      {object}  userConsent     User GDPR consent object
 */
function onAuctionEnd(auctionDetails, config, userConsent) {
  const adunitObj = {};
  const adunits = [];

  // Add Bids Received
  auctionDetails.bidsReceived.forEach((bidObj) => {
    if (!adunitObj[bidObj.adUnitCode]) { adunitObj[bidObj.adUnitCode] = []; }

    adunitObj[bidObj.adUnitCode].push({
      bidder: bidObj.bidderCode || bidObj.bidder,
      cpm: bidObj.cpm,
      currency: bidObj.currency,
      dealId: bidObj.dealId,
      type: bidObj.mediaType,
      ttr: bidObj.timeToRespond,
      size: bidObj.size
    });
  });

  entries(adunitObj).forEach(([adunitCode, bidsReceived]) => {
    adunits.push({code: adunitCode, bids: bidsReceived});
  });

  const data = {
    event: 'bids',
    adunits: adunits,
    reledata: serverData.rawdata,
    pid: encodeURIComponent(config.params?.publisherid || ''),
    aid: encodeURIComponent(config.params?.apikey || ''),
    cid: encodeURIComponent(config.params?.partnerid || ''),
    gdpra: encodeURIComponent(userConsent?.gdpr?.gdprApplies || ''),
    gdprc: encodeURIComponent(userConsent?.gdpr?.consentString || ''),
  }
  if (!config.dryrun) {
    data.page = serverData?.page || config?.params?.actualUrl || getRefererInfo().page || '';
  }

  sendBids(data, config);
}

export function init(config) {
  return true;
}

export const relevadSubmodule = {
  name: SUBMODULE_NAME,
  init: init,
  onAuctionEndEvent: onAuctionEnd,
  getBidRequestData: getBidRequestData
};

submodule(MODULE_NAME, relevadSubmodule);
