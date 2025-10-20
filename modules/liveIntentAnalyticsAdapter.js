import { ajax } from '../src/ajax.js';
import { generateUUID, isNumber } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS } from '../src/constants.js';
import adapterManager from '../src/adapterManager.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { config as prebidConfig } from '../src/config.js';
import { auctionManager } from '../src/auctionManager.js';

import {getGlobalVarName} from '../src/buildOptions.js';

const ANALYTICS_TYPE = 'endpoint';
const URL = 'https://wba.liadm.com/analytic-events';
const GVL_ID = 148;
const ADAPTER_CODE = 'liveintent';
const { AUCTION_INIT, BID_WON } = EVENTS;
const INTEGRATION_ID = getGlobalVarName();

let partnerIdFromUserIdConfig;
let sendAuctionInitEvents;

const liAnalytics = Object.assign(adapter({URL, ANALYTICS_TYPE}), {
  track({ eventType, args }) {
    switch (eventType) {
      case AUCTION_INIT:
        if (sendAuctionInitEvents) {
          handleAuctionInitEvent(args);
        }
        break;
      case BID_WON:
        handleBidWonEvent(args);
        break;
    }
  }
});

function handleAuctionInitEvent(auctionInitEvent) {
  const liveIntentIdsPresent = checkLiveIntentIdsPresent(auctionInitEvent.bidderRequests)

  // This is for old integration that enable or disable the user id module
  // dependeing on the result of rolling the dice outside of Prebid.
  const partnerIdFromAnalyticsLabels = auctionInitEvent.analyticsLabels?.partnerId;

  const data = {
    id: generateUUID(),
    aid: auctionInitEvent.auctionId,
    u: getRefererInfo().page,
    ats: auctionInitEvent.timestamp,
    pid: partnerIdFromUserIdConfig || partnerIdFromAnalyticsLabels,
    iid: INTEGRATION_ID,
    tr: window.liTreatmentRate,
    me: encodeBoolean(window.liModuleEnabled),
    liip: encodeBoolean(liveIntentIdsPresent),
    aun: auctionInitEvent?.adUnits?.length || 0
  };
  const filteredData = ignoreUndefined(data);
  sendData('auction-init', filteredData);
}

function handleBidWonEvent(bidWonEvent) {
  const auction = auctionManager.index.getAuction({auctionId: bidWonEvent.auctionId});
  const liveIntentIdsPresent = checkLiveIntentIdsPresent(auction?.getBidRequests())

  // This is for old integration that enable or disable the user id module
  // depending on the result of rolling the dice outside of Prebid.
  const partnerIdFromAnalyticsLabels = bidWonEvent.analyticsLabels?.partnerId;

  const data = {
    id: generateUUID(),
    aid: bidWonEvent.auctionId,
    u: getRefererInfo().page,
    ats: auction?.getAuctionStart(),
    auc: bidWonEvent.adUnitCode,
    auid: bidWonEvent.adUnitId,
    cpm: bidWonEvent.cpm,
    c: bidWonEvent.currency,
    b: bidWonEvent.bidder,
    bc: bidWonEvent.bidderCode,
    pid: partnerIdFromUserIdConfig || partnerIdFromAnalyticsLabels,
    iid: INTEGRATION_ID,
    sts: bidWonEvent.requestTimestamp,
    rts: bidWonEvent.responseTimestamp,
    tr: window.liTreatmentRate,
    me: encodeBoolean(window.liModuleEnabled),
    liip: encodeBoolean(liveIntentIdsPresent)
  };

  const filteredData = ignoreUndefined(data);
  sendData('bid-won', filteredData);
}

function encodeBoolean(value) {
  return value === undefined ? undefined : value ? 'y' : 'n'
}

function checkLiveIntentIdsPresent(bidRequests) {
  const eids = bidRequests?.flatMap(r => r?.bids).flatMap(b => b?.userIdAsEids);
  return !!eids.find(eid => eid?.source === 'liveintent.com') || !!eids.flatMap(e => e?.uids).find(u => u?.ext?.provider === 'liveintent.com')
}

function sendData(path, data) {
  const fields = Object.entries(data);
  if (fields.length > 0) {
    const params = fields.map(([key, value]) => key + '=' + encodeURIComponent(value)).join('&');
    ajax(URL + '/' + path + '?' + params, undefined, null, { method: 'GET' });
  }
}

function ignoreUndefined(data) {
  const filteredData = Object.entries(data).filter(([key, value]) => isNumber(value) || value);
  return Object.fromEntries(filteredData);
}

// save the base class function
liAnalytics.originEnableAnalytics = liAnalytics.enableAnalytics;
// override enableAnalytics so we can get access to the config passed in from the page
liAnalytics.enableAnalytics = function (config) {
  const userIdModuleConfig = prebidConfig.getConfig('userSync.userIds').filter(m => m.name === 'liveIntentId')?.at(0)?.params
  partnerIdFromUserIdConfig = userIdModuleConfig?.liCollectConfig?.appId || userIdModuleConfig?.distributorId;
  sendAuctionInitEvents = config?.options.sendAuctionInitEvents;
  liAnalytics.originEnableAnalytics(config); // call the base class function
};

adapterManager.registerAnalyticsAdapter({
  adapter: liAnalytics,
  code: ADAPTER_CODE,
  gvlid: GVL_ID
});

export default liAnalytics;
