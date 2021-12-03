import {config} from './config.js';
import {
  deepAccess,
  deepClone, deepEqual,
  delayExecution,
  logError,
  logMessage as utilsLogMessage,
  logWarn as utilsLogWarn,
  mergeDeep
} from './utils.js';
import {addBidderRequests, addBidResponse} from './auction.js';
import {processBidderRequests} from './adapters/bidderFactory.js';

const OVERRIDE_KEY = '$$PREBID_GLOBAL$$:debugging';
const interceptorHooks = [];

export let addBidResponseBound;
export let addBidderRequestsBound;

function logMessage(...args) {
  utilsLogMessage('DEBUG:', ...args);
}

function logWarn(...args) {
  utilsLogWarn('DEBUG:', ...args);
}

function addHooks(overrides) {
  addBidResponseBound = addBidResponseHook.bind(overrides);
  addBidResponse.before(addBidResponseBound, 5);

  addBidderRequestsBound = addBidderRequestsHook.bind(overrides);
  addBidderRequests.before(addBidderRequestsBound, 5);
  interceptorHooks.forEach(([hookFn, interceptor]) => {
    hookFn.before(interceptor);
  })
}

function removeHooks() {
  addBidResponse.getHooks({hook: addBidResponseBound}).remove();
  addBidderRequests.getHooks({hook: addBidderRequestsBound}).remove();
  interceptorHooks.forEach(([hookFn, interceptor]) => {
    hookFn.getHooks({hook: interceptor}).remove();
  })
}

export function enableOverrides(overrides, fromSession = false) {
  bidInterceptor.updateConfig(overrides);
  config.setConfig({'debug': true});
  removeHooks();
  addHooks(overrides);
  logMessage(`bidder overrides enabled${fromSession ? ' from session' : ''}`);
}

export function disableOverrides() {
  bidInterceptor.updateConfig({});
  removeHooks();
  logMessage('bidder overrides disabled');
}

/**
 * @param {{bidder:string, adUnitCode:string}} overrideObj
 * @param {string} bidderCode
 * @param {string} adUnitCode
 * @returns {boolean}
 */
export function bidExcluded(overrideObj, bidderCode, adUnitCode) {
  if (overrideObj.bidder && overrideObj.bidder !== bidderCode) {
    return true;
  }
  if (overrideObj.adUnitCode && overrideObj.adUnitCode !== adUnitCode) {
    return true;
  }
  return false;
}

/**
 * @param {string[]} bidders
 * @param {string} bidderCode
 * @returns {boolean}
 */
export function bidderExcluded(bidders, bidderCode) {
  return (Array.isArray(bidders) && bidders.indexOf(bidderCode) === -1);
}

/**
 * @param {Object} overrideObj
 * @param {Object} bidObj
 * @param {Object} bidType
 * @returns {Object} bidObj with overridden properties
 */
export function applyBidOverrides(overrideObj, bidObj, bidType) {
  return Object.keys(overrideObj).filter(key => (['adUnitCode', 'bidder'].indexOf(key) === -1)).reduce(function(result, key) {
    logMessage(`bidder overrides changed '${result.adUnitCode}/${result.bidderCode}' ${bidType}.${key} from '${result[key]}.js' to '${overrideObj[key]}'`);
    result[key] = overrideObj[key];
    return result;
  }, bidObj);
}

export function addBidResponseHook(next, adUnitCode, bid) {
  const overrides = this;

  if (bidderExcluded(overrides.bidders, bid.bidderCode)) {
    logWarn(`bidder '${bid.bidderCode}' excluded from auction by bidder overrides`);
    return;
  }

  if (Array.isArray(overrides.bids)) {
    overrides.bids.forEach(function(overrideBid) {
      if (!bidExcluded(overrideBid, bid.bidderCode, adUnitCode)) {
        applyBidOverrides(overrideBid, bid, 'bidder');
      }
    });
  }

  next(adUnitCode, bid);
}

export function addBidderRequestsHook(next, bidderRequests) {
  const overrides = this;

  const includedBidderRequests = bidderRequests.filter(function (bidderRequest) {
    if (bidderExcluded(overrides.bidders, bidderRequest.bidderCode)) {
      logWarn(`bidRequest '${bidderRequest.bidderCode}' excluded from auction by bidder overrides`);
      return false;
    }
    return true;
  });

  if (Array.isArray(overrides.bidRequests)) {
    includedBidderRequests.forEach(function(bidderRequest) {
      overrides.bidRequests.forEach(function(overrideBid) {
        bidderRequest.bids.forEach(function(bid) {
          if (!bidExcluded(overrideBid, bidderRequest.bidderCode, bid.adUnitCode)) {
            applyBidOverrides(overrideBid, bid, 'bidRequest');
          }
        });
      });
    });
  }

  next(includedBidderRequests);
}

export function getConfig(debugging, {sessionStorage = window.sessionStorage} = {}) {
  if (!debugging.enabled) {
    disableOverrides();
    try {
      sessionStorage.removeItem(OVERRIDE_KEY);
    } catch (e) {}
  } else {
    try {
      const intKey = bidInterceptor.KEYS.rules;
      const config = deepClone(debugging);
      if (config[intKey]) {
        config[intKey] = bidInterceptor.serializeConfig(config[intKey]);
      }
      sessionStorage.setItem(OVERRIDE_KEY, JSON.stringify(config));
    } catch (e) {}
    enableOverrides(debugging);
  }
}

config.getConfig('debugging', ({debugging}) => getConfig(debugging));

export function sessionLoader(storage) {
  let overrides;
  try {
    storage = storage || window.sessionStorage;
    overrides = JSON.parse(storage.getItem(OVERRIDE_KEY));
  } catch (e) {
  }
  if (overrides) {
    enableOverrides(overrides, true);
  }
}

/**
 * @typedef {Number|String|boolean|null|undefined} Scalar
 */

export function BidInterceptor(opts = {}) {
  ({setTimeout: this.setTimeout = window.setTimeout.bind(window)} = opts);
  this.rules = [];
}

Object.assign(BidInterceptor.prototype, {
  KEYS: {
    rules: 'intercept',
    match: 'when',
    replace: 'then',
    options: 'options',
    delay: 'delay',
    suppress: 'suppressWarnings'
  },
  DEFAULT_RULE_OPTIONS: {
    delay: 0
  },
  serializeConfig(ruleDefs) {
    const suppress = `${this.KEYS.options}.${this.KEYS.suppress}`;
    function isSerializable(ruleDef, i) {
      const serializable = deepEqual(ruleDef, JSON.parse(JSON.stringify(ruleDef)), {checkTypes: true});
      if (!serializable && !deepAccess(ruleDef, suppress)) {
        logWarn(`Bid interceptor rule definition #${i + 1} is not serializable and will be lost after a refresh. Rule definition: `, ruleDef);
      }
      return serializable;
    }
    return ruleDefs.filter(isSerializable);
  },
  updateConfig(config) {
    this.rules = (config[this.KEYS.rules] || []).map((ruleDef, i) => this.rule(ruleDef, i + 1))
  },
  /**
   * @typedef {Object} RuleOptions
   * @property {Number} [delay=0] delay between bid interception and mocking of response (to simulate network delay)
   * @property {boolean} [suppressWarnings=false] if enabled, do not warn about unserializable rules
   *
   * @typedef {Object} Rule
   * @property {Number} no rule number (used only as an identifier for logging)
   * @property {function({}, {}): boolean} match a predicate function that tests a bid against this rule
   * @property {ReplacerFn} replacer generator function for mock bid responses
   * @property {RuleOptions} options
   */

  /**
   * @param {{}} ruleDef
   * @param {Number} ruleNo
   * @returns {Rule}
   */
  rule(ruleDef, ruleNo) {
    return {
      no: ruleNo,
      match: this.matcher(ruleDef[this.KEYS.match], ruleNo),
      replace: this.replacer(ruleDef[this.KEYS.replace] || {}, ruleNo),
      options: Object.assign({}, this.DEFAULT_RULE_OPTIONS, ruleDef[this.KEYS.options]),
    }
  },
  /**
   * @typedef {Function} MatchPredicate
   * @param {*} candidate a bid to match, or a portion of it if used inside an ObjectMather.
   * e.g. matcher((bid, bidRequest) => ....) or matcher({property: (property, bidRequest) => ...})
   * @param {BidRequest} bidRequest the request `candidate` belongs to
   * @returns {boolean}
   *
   * @typedef {{[key]: Scalar|RegExp|MatchPredicate|ObjectMatcher}} ObjectMatcher
   */

  /**
   * @param {MatchPredicate|ObjectMatcher} matchDef matcher definition
   * @param {Number} ruleNo
   * @returns {MatchPredicate} a predicate function that matches a bid against the given `matchDef`
   */
  matcher(matchDef, ruleNo) {
    if (typeof matchDef === 'function') {
      return matchDef;
    }
    if (typeof matchDef !== 'object') {
      logError(`Invalid '${this.KEYS.match}' definition for debug bid interceptor (in rule #${ruleNo})`);
      return () => false;
    }
    function matches(candidate, {ref = matchDef, args = []}) {
      return Object.entries(ref).map(([key, val]) => {
        const cVal = candidate[key];
        if (val instanceof RegExp) {
          return val.exec(cVal) != null;
        }
        if (typeof val === 'function') {
          return !!val(cVal, ...args);
        }
        if (typeof val === 'object') {
          return matches(cVal, {ref: val, args});
        }
        return cVal === val;
      }).every((i) => i);
    }
    return (candidate, ...args) => matches(candidate, {args});
  },
  /**
   * @typedef {Function} ReplacerFn
   * @param {*} bid a bid that was intercepted
   * @param {BidRequest} bidRequest the request `bid` belongs to
   * @returns {*} the response to mock for `bid`, or a portion of it if used inside an ObjectReplacer.
   * e.g. replacer((bid, bidRequest) => mockResponse) or replacer({property: (bid, bidRequest) => mockProperty})
   *
   * @typedef {{[key]: ReplacerFn|ObjectReplacer|*}} ObjectReplacer
   */

  /**
   * @param {ReplacerFn|ObjectReplacer} replDef replacer definition
   * @param ruleNo
   * @return {ReplacerFn}
   */
  replacer(replDef, ruleNo) {
    let replFn;
    if (typeof replDef === 'function') {
      replFn = ({args}) => replDef(...args);
    } else if (typeof replDef !== 'object') {
      logError(`Invalid '${this.KEYS.replace}' definition for debug bid interceptor (in rule #${ruleNo})`);
      replFn = () => ({});
    } else {
      replFn = ({args, ref = replDef}) => {
        const result = {};
        Object.entries(ref).forEach(([key, val]) => {
          if (typeof val === 'function') {
            result[key] = val(...args);
          } else if (typeof val === 'object') {
            result[key] = replFn({args, ref: val})
          } else {
            result[key] = val;
          }
        });
        return result;
      }
    }
    return (bid, ...args) => {
      const response = this.responseDefaults(bid);
      mergeDeep(response, replFn({args: [bid, ...args]}));
      if (!response.ad) {
        response.ad = this.defaultAd(bid, response);
      }
      return response;
    }
  },
  responseDefaults(bid) {
    return {
      requestId: bid.bidId,
      cpm: 3.5764,
      currency: 'EUR',
      width: 300,
      height: 250,
      ttl: 360,
      creativeId: 'mock-creative-id',
      netRevenue: false,
      meta: {}
    };
  },
  defaultAd(bid, bidResponse) {
    return `
        <html>
          <head>
            <style>
             #ad {
                width: ${bidResponse.width}px;
                height: ${bidResponse.height}px;
                background-color: #f6f6ae;
                color: #85144b;
                padding: 5px;
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
             }
             #bidder {
                font-family: monospace;
                font-weight: normal;
             }
             #title {
               font-size: x-large;
               font-weight: bold;
               margin-bottom: 5px;
             }
             #body {
                font-size: large;
                margin-top: 5px;
             }
            </style>
          </head>
          <body>
          <div id="ad">
            <div id="title">Mock ad: <span id="bidder">${bid.bidder}</span></div>
            <div id="body">${bidResponse.width}x${bidResponse.height}</div>
          </div>
          </body>
        </html>
    `;
  },
  /**
   * Match a candidate bid against all registered rules.
   *
   * @param {{}} candidate
   * @param args
   * @returns {Rule|undefined} the first matching rule, or undefined if no match was found.
   */
  match(candidate, ...args) {
    return this.rules.find((rule) => rule.match(candidate, ...args));
  },
  /**
   * Match a set of bids against all registered rules.
   *
   * @param bids
   * @param bidRequest
   * @returns {[{bid: *, rule: Rule}[], *[]]} a 2-tuple for matching bids (decorated with the matching rule) and
   * non-matching bids.
   */
  matchAll(bids, bidRequest) {
    const [matches, remainder] = [[], []];
    bids.forEach((bid) => {
      const rule = this.match(bid, bidRequest);
      if (rule != null) {
        matches.push({rule: rule, bid: bid});
      } else {
        remainder.push(bid);
      }
    })
    return [matches, remainder];
  },
  /**
   * Run a set of bids against all registered rules, filter out those that match,
   * and generate mock responses for them.
   *
   * @param {{}[]} bids?
   * @param {BidRequest} bidRequest
   * @param {function(*)} addBid called once for each mock response
   * @param {function()} done called once after all mock responses have been run through `addBid`
   * @returns {{bids: {}[], bidRequest: {}} remaining bids that did not match any rule (this applies also to
   * bidRequest.bids)
   */
  intercept({bids, bidRequest, addBid, done}) {
    if (bids == null) {
      bids = bidRequest.bids;
    }
    const [matches, remainder] = this.matchAll(bids, bidRequest);
    if (matches.length > 0) {
      const callDone = delayExecution(done, matches.length);
      matches.forEach((match) => {
        const mockResponse = match.rule.replace(match.bid, bidRequest);
        const delay = match.rule.options[this.KEYS.delay];
        logMessage(`Intercepted bid request (matching rule #${match.rule.no}), mocking response in ${delay}ms. Request, response:`, match.bid, mockResponse)
        this.setTimeout(() => {
          addBid(mockResponse, match.bid);
          callDone();
        }, delay)
      });
      bidRequest = deepClone(bidRequest);
      bids = bidRequest.bids = remainder;
    } else {
      this.setTimeout(done, 0);
    }
    return {bids, bidRequest};
  }
});

const bidInterceptor = new BidInterceptor();

/**
 * Register an interceptor function to attach before the given `hookFn` when debugging is enabled.
 *
 * The interceptor function should accept an instance of BidInterceptor#intercept as its second argument (after
 * the hook continuation `next`).
 */
export function registerBidInterceptor(hookFn, interceptor) {
  const interceptBids = (...args) => bidInterceptor.intercept(...args);
  interceptorHooks.push([hookFn, function (next, ...args) {
    interceptor(next, interceptBids, ...args)
  }]);
}

export function bidderBidInterceptor(next, interceptBids, spec, bids, bidRequest, ajax, wrapCallback, cbs) {
  const done = delayExecution(cbs.onCompletion, 2);
  ({bids, bidRequest} = interceptBids({bids, bidRequest, addBid: cbs.onBid, done}));
  if (bids.length === 0) {
    done();
  } else {
    next(spec, bids, bidRequest, ajax, wrapCallback, {...cbs, onCompletion: done});
  }
}

registerBidInterceptor(processBidderRequests, bidderBidInterceptor);
