import {getHook} from '../../src/hook.js';
import adapterManager from '../../src/adapterManager.js';
import {s2sDefaultConfig} from './index.js'; // eslint-disable-line prebid/validate-imports
import {isEmpty, deepSetValue, logWarn} from '../../src/utils.js';
import {config} from '../../src/config.js';
import {BANNER, VIDEO, NATIVE} from '../../src/mediaTypes.js';
import {GreedyPromise} from '../../src/utils/promise.js';

/**
 * Parameters can be set using the following methods (in that order)
 *  - pbjs.setConfig({ [bidder]: { [param]: '[value]' }})
 *  - params.[param] in adUnit.bids
 *  - params[param] where params is the argument supplied to the constructor
 */
const CONFIG_PARAMS = ['accountId', 'pbsHost'];

/**
 * This class can be used to create bid adapters for anyone using Prebid Server along with stored requests.
 * If customisations using constructor parameters isn't enough, it is possible to extend the class.
 * Example usage:
 *
 * const ExampleBidAdapter = new StoredRequestBidAdapterBase({
 *   pbsHost: 'prebid-server.example.com',
 *   spec: {
 *    code: 'examplebidder',
 *   },
 * });
 * registerBidder(ExampleBidAdapter.spec);
 */
class StoredRequestBidAdapterBase {
  /**
   * @param {Object} params
   * @param {Object} params.spec additional properties for the BidderSpec object
   *                 required properties: @property spec.code
   * @param {number} params.pbsBufferMs milliseconds to deduct from the prebid timeout to make the PBS timeout
   * @param {boolean} params.accountIdRequired if true, bids will be rejected if accountId is missing in config/params
   * @param {Array} params.nameMap optional mapping of all field names used in config/params.
   *                Example: { adUnitId: 'zoneId', accountId: 'customerId' }
   * @param {String} params.pbsHost Hostname for prebid server, will be used when not specified in config/params.
   *                 Example: 'prebid-server.example.com'
   */
  constructor(params) {
    if (!params?.spec?.code) {
      throw Error('params.spec.code must be supplied');
    }
    const throwErr = () => { throw Error('Not supported by StoredRequestBidAdapterBase') };
    Object.assign(this, {
      pbsBufferMs: 250,
      accountIdRequired: false,
      ...params,
      spec: {
        supportedMediaTypes: [BANNER, VIDEO, NATIVE],
        isBidRequestValid: () => false, // Will happen when a required config parameter (like pbsHost) is missing
        buildRequests: throwErr,
        interpretResponse: throwErr,
        ...params.spec,
      },
      byBidderCode: {},
      nameMap: {
        ...params?.nameMap,
      },
    });
    this.hookOn('startAuction', 'onStartAuction');
  }

  /**
   * Helper function that calls this[memberFn](parameters) in getHook(name).before(...)
   * If the return value of memberFn is truthy, it will be used as the first parameter to fn() */
  hookOn(name, memberFn) {
    const that = this;
    getHook(name).before(function (fn, param, ...rest) {
      fn.call(this, that[memberFn](param, ...rest) || param, ...rest);
    });
  }

  /** Returns true if the bidderCode is for this adapter, either directly of via an alias */
  isOurBidder(bidderCode) {
    const code = adapterManager.aliasRegistry[bidderCode] || bidderCode;
    return code === this.spec.code;
  }

  /** Returns true if the supplied s2sConfig object is the one created by this adapter  */
  isOurS2SConfig({ bidders }) {
    return (bidders || []).length === 1 && this.isOurBidder(bidders[0]);
  }

  /** Returns the state-object for the bidder s2sConfig was created for, if it was created by this adapter */
  getInfoFrom(s2sConfig) {
    return this.isOurS2SConfig(s2sConfig || {}) && this.byBidderCode[s2sConfig.bidders[0]];
  }

  /** Add a new s2sConfig-object for a bidder using this adapter. Override method to customize s2sConfig settings */
  addNewS2sConfig(s2sConfigArr, newConfig) {
    config.setConfig({
      s2sConfig: [
        // Filter out default s2sconfig object as it will otherwise disable s2s
        ...s2sConfigArr.filter((cfg) => cfg.bidders?.length || cfg.enabled),
        newConfig,
      ],
    });
  }

  getNewBiddersFromAdUnits(adUnits) {
    const newBidders = [];
    const seenNewBidders = {};
    // Search for bidders created using this adapter
    adUnits.forEach(({ bids = [] }) => {
      bids.forEach(({ bidder, params = {} }) => {
        if (!this.isOurBidder(bidder) || this.byBidderCode[bidder]) {
          return; // Other bidder or already initialized
        }
        let info = seenNewBidders[bidder];
        if (!info) {
          // Create new state-object for this (previously unseen) bidder.
          info = { bidder, waitingSync: {}, synced: {} };
          newBidders.push(info);
          seenNewBidders[bidder] = info;
        }
        // Set, when previously not set - config parameters from .params
        CONFIG_PARAMS.forEach((field) => {
          const fieldCustom = this.nameMap[field] || field;
          info[field] = info[field] || params[fieldCustom];
        });
      });
    });
    return newBidders;
  }

  /** Called the first time we've found any bidder(s) using this adapter */
  onFirstBiddersFound() {
    // time to init additional hooks
    this.hookOn('modifyPBSRequest', 'onModifyPBSRequest');
    this.hookOn('modifyPBSResult', 'onModifyPBSResult');
    this.hookOn('processPBSCookieSync', 'onProcessPBSCookieSync');
  }

  /** Called by the 'startAuction' hook. Will create one s2sConfig for each new bidder-code belonging to this adapter */
  onStartAuction({ adUnits, timeout }) {
    const newBidders = this.getNewBiddersFromAdUnits(adUnits);
    const hasBidders = () => !isEmpty(this.byBidderCode);
    const hadBidders = hasBidders();
    newBidders.forEach((info) => { // Create one s2sConfig for each new bidder found
      const { bidder } = info;
      let s2sConfigArr = config.getConfig('s2sConfig') || [];
      s2sConfigArr = Array.isArray(s2sConfigArr) ? s2sConfigArr : [s2sConfigArr];
      const bidderConfiguration = config.getConfig(bidder) || {};
      // Setup config paramters, see CONFIG_PARAMETERS
      for (const field of CONFIG_PARAMS) {
        const fieldCustom = this.nameMap[field] || field;
        info[field] = bidderConfiguration[fieldCustom] || info[field] || this[field];
      };
      if (!info.pbsHost || (!info.accountId && this.accountIdRequired)) {
        return; // missing config parameter(s), will result in invalid bid requests by: isBidRequestValid: () => false
      }
      info.pbsHost = info.pbsHost.trim().replace('http://', 'https://');
      if (info.pbsHost.indexOf('https://') < 0) {
        info.pbsHost = `https://${info.pbsHost}`;
      }
      const endpoint = `${info.pbsHost}/openrtb2/auction`;
      const syncEndpoint = `${info.pbsHost}/cookie_sync`;
      const { pbsBufferMs } = this;
      const pbjsTimeout = timeout || 1000;
      this.addNewS2sConfig(s2sConfigArr, {
        ...s2sDefaultConfig,
        bidders: [bidder],
        accountId: info.accountId || '1',
        enabled: true,
        endpoint: { p1Consent: endpoint, noP1Consent: endpoint },
        syncEndpoint: { p1Consent: syncEndpoint, noP1Consent: syncEndpoint },
        timeout: Math.min(Math.max(pbjsTimeout - pbsBufferMs, pbsBufferMs), pbjsTimeout),
        ...bidderConfiguration.s2sConfig,
      });
      this.byBidderCode[bidder] = info; // New bidder added
    });
    if (hasBidders() && !hadBidders) {
      this.onFirstBiddersFound();
    }
  }

  /** Called by the 'modifyPBSRequest' hook. */
  onModifyPBSRequest(req, { s2sConfig }) {
    // Remove aliases in PBS-request for all bidders belonging to adapter. This is necessary also for the normal
    // PBS requests (not using this adapter), as our aliases will then be included - which causes error-responses.
    const { aliases = {} } = req.ext?.prebid || {};
    for (const key in aliases) {
      if (this.byBidderCode[key]) {
        delete aliases[key];
      }
    }
    const info = this.getInfoFrom(s2sConfig);
    if (!info) {
      return; // Request didn't belong to this adapter
    }
    if (info.accountId) { // Use account-id as a stored BidRequest id
      deepSetValue(req, 'ext.prebid.storedrequest.id', info.accountId);
    }
    req.imp = req.imp.reduce((acc, imp) => {
      const { prebid = {} } = imp.ext || {};
      const params = prebid.bidder?.[info.bidder] || {};
      const adUnitFiedName = this.nameMap.adUnitCode || 'adUnitCode';
      const adUnitCode = params[adUnitFiedName];
      if (adUnitCode) {
        // Use params.adUnitCode as stored request id
        deepSetValue(imp, 'ext.prebid.storedrequest.id', adUnitCode);
        acc.push(imp);
      } else {
        logWarn(`${info.bidder} is skipping '${imp.id}' as '${adUnitFiedName}' is missing`);
      }
      delete prebid.bidder; // Delete prebid.bidder as we're using a stored request instead
      return acc;
    }, []);
  }

  /** Called by the 'modifyPBSResult' hook. */
  onModifyPBSResult(resp, { s2sConfig }) {
    const info = this.getInfoFrom(s2sConfig);
    if (!info) {
      return; // Response didn't belong to this adapter
    }
    const editBid = (bid) => { // Modify bidder-codes in bid to the bidder code for this bidder
      const { prebid = {} } = bid.ext || {};
      const { meta, targeting } = prebid;
      if (meta?.adaptercode) {
        meta.adaptercode = info.bidder;
      }
      if (targeting?.hb_bidder) {
        targeting.hb_bidder = info.bidder;
      }
      return bid;
    };
    // Create a single seat for this bidder - that holds the bids for all seats returned
    if (Array.isArray(resp.seatbid)) {
      resp.seatbid = [{
        seat: info.bidder,
        bid: [].concat(...resp.seatbid.map(({ bid }) => (bid || []).map(editBid))),
      }];
    }
    // Modify response times for actual PBS bidders into a single value that should be the response-time for this bidder
    const { responsetimemillis } = resp.ext || {};
    if (!isEmpty(responsetimemillis)) {
      resp.ext.responsetimemillis = {
        [info.bidder]: Math.max(...Object.values(responsetimemillis)),
      };
    }
    // Find PBS-bidders that we've not cookie-synced yet
    const unsynced = Object.keys(responsetimemillis).filter((bidder) => !info.synced[bidder]);
    unsynced.forEach((bidder) => {
      info.waitingSync[bidder] = true;
    });
    const { pendingSync } = info;
    if (pendingSync && !isEmpty(info.waitingSync)) {
      // If there's a cookie-sync call pending and we're having un-synced PBS bidders, then resume that call.
      // See onProcessPBSCookieSync()
      delete info.pendingSync;
      pendingSync();
    }
  }

  /**
   * Called by the 'processPBSCookieSync' hook.
   * As the server will perform the auction for us, the bidders are not known until after the auction response.
   * Delay the cookie sync to after the response and perform the syncing for the actual bidders.
   * @note it is possible for the promise to never resolve - for unnecessary cookie-sync calls or if
   * the PBS auction request fails.
   */
  onProcessPBSCookieSync(promise) {
    return promise.then((params) => new GreedyPromise((resolve) => {
      const {payload, s2sConfig} = params;
      const next = () => resolve(params);
      const info = this.getInfoFrom(s2sConfig);
      if (!info) {
        next();
        return; // Cookie-sync didn't belong to this adapter
      }
      const doSync = () => { // Trigger the cookie-syncing after changing which bidders to include
        payload.bidders = Object.keys(info.waitingSync);
        payload.bidders.forEach((bidder) => {
          info.synced[bidder] = true;
        });
        info.waitingSync = {};
        next();
      };
      if (!isEmpty(info.waitingSync)) {
        doSync(); // We're already waiting to sync some bidders, continue and do the call
      } else {
        info.pendingSync = doSync; // Wait for PBS auction response.
      }
    }));
  }
}

export default StoredRequestBidAdapterBase;
