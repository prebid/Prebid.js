/*
- register a hook function on the makeBidRequests hook (after the main function ran)

- this hook function will:
1. verify s2sconfig is defined and we (or our aliases) are included to the config
2. filter bidRequests that match to our bidderName or any registered aliases
3. for each request, read the bidderRequests.bids[].params to modify the keys/values
  a. in particular change the keywords structure, apply underscore casing for keys, adjust use_payment_rule name, and convert certain values' types
  b. will import some functions from the anKeywords library, but ideally should be kept separate to avoid including this code when it's not needed (strict client-side setups) and avoid the rest of the appnexus adapter's need for inclusion for those strictly server-side setups.
*/

// import { CONSTANTS } from '../src/cons tants.js';
import {isArray, isPlainObject, isStr} from '../src/utils.js';
import {getHook} from '../src/hook.js';
import {config} from '../src/config.js';
import {convertCamelToUnderscore, appnexusAliases} from '../libraries/appnexusUtils/anUtils.js';
import {convertTypes} from '../libraries/transformParamsUtils/convertTypes.js';
import adapterManager from '../src/adapterManager.js';

// keywords: { 'genre': ['rock', 'pop'], 'pets': ['dog'] } goes to 'genre=rock,genre=pop,pets=dog'
function convertKeywordsToString(keywords) {
  let result = '';
  Object.keys(keywords).forEach(key => {
    // if 'text' or ''
    if (isStr(keywords[key])) {
      if (keywords[key] !== '') {
        result += `${key}=${keywords[key]},`
      } else {
        result += `${key},`;
      }
    } else if (isArray(keywords[key])) {
      if (keywords[key][0] === '') {
        result += `${key},`
      } else {
        keywords[key].forEach(val => {
          result += `${key}=${val},`
        });
      }
    }
  });

  // remove last trailing comma
  result = result.substring(0, result.length - 1);
  return result;
}

function digForAppNexusBidder(s2sConfig) {
  let result = false;
  // check for plain setup
  if (s2sConfig?.bidders?.includes('appnexus')) result = true;

  // registered aliases
  const aliasList = appnexusAliases.map(aliasObj => (aliasObj.code));
  if (!result && s2sConfig?.bidders?.filter(s2sBidder => aliasList.includes(s2sBidder)).length > 0) result = true;

  // pbjs.aliasBidder
  if (!result) {
    result = !!(s2sConfig?.bidders?.find(bidder => (adapterManager.resolveAlias(bidder) === 'appnexus')));
  }

  return result;
}

// need a separate check b/c we're checking a specific bidRequest to see if we modify it, not just that we have a server-side bidder somewhere in prebid.js
// function isThisOurBidderInDisguise(tarBidder, s2sConfig) {
//   if (tarBidder === 'appnexus') return true;

//   if (isPlainObject(s2sConfig?.extPrebid?.aliases) && !!(Object.entries(s2sConfig?.extPrebid?.aliases).find((pair) => (pair[0] === tarBidder && pair[1] === 'appnexus')))) return true;

//   if (appnexusAliases.map(aliasObj => (aliasObj.code)).includes(tarBidder)) return true;

//   if (adapterManager.resolveAlias(tarBidder) === 'appnexus') return true;

//   return false;
// }

export function convertAnParams(next, bidderRequests) {
  // check s2sconfig
  const s2sConfig = config.getConfig('s2sConfig');
  let proceed = false;

  if (isPlainObject(s2sConfig)) {
    proceed = digForAppNexusBidder(s2sConfig);
  } else if (isArray(s2sConfig)) {
    s2sConfig.forEach(s2sCfg => {
      proceed = digForAppNexusBidder(s2sCfg);
    });
  }

  if (proceed) {
    bidderRequests
      .flatMap(br => br.bids)
      .filter(bid => bid.src === 's2s' && adapterManager.resolveAlias(bid.bidder) === 'appnexus')
      .forEach((bid) => {
        transformBidParams(bid);
      });
  }

  next(bidderRequests);
}

function transformBidParams(bid) {
  let params = bid.params;
  if (params) {
    params = convertTypes({
      'member': 'string',
      'invCode': 'string',
      'placementId': 'number',
      'keywords': convertKeywordsToString,
      'publisherId': 'number'
    }, params);

    Object.keys(params).forEach(paramKey => {
      let convertedKey = convertCamelToUnderscore(paramKey);
      if (convertedKey !== paramKey) {
        params[convertedKey] = params[paramKey];
        delete params[paramKey];
      }
    });

    params.use_pmt_rule = (typeof params.use_payment_rule === 'boolean') ? params.use_payment_rule : false;
    if (params.use_payment_rule) {
      delete params.use_payment_rule;
    }
  }
}

getHook('makeBidRequests').after(convertAnParams, 9);
