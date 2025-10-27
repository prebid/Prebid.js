import { logMessage, isGptPubadsDefined, timestamp } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import { getGlobal } from '../src/prebidGlobal.js';

const analyticsType = 'endpoint';
const PROVIDER_NAME = 'browsi';
const GVLID = 329;
const EVENT_SERVER_URL = `https://events.browsiprod.com/events/v2`;

/** @type {null|Object} */
let _staticData = null;
/** @type {string} */
let VERSION = getGlobal().version;
/** @type {string} */
let URL = encodeURIComponent(window.location.href);

const { AUCTION_END, BROWSI_INIT, BROWSI_DATA } = EVENTS;

export function getStaticData() {
  return _staticData;
}

export function setStaticData(data) {
  _staticData = {
    pvid: data.pvid,
    device: data.d,
    geo: data.g,
    aid: data.aid,
    es: data.es,
    pk: data.pk,
    sk: data.sk,
    t: data.t,
  };
}

function getTimeOffset(ts) {
  if (!ts) return undefined;
  return timestamp() - ts;
}

function getAdUnitPathByCode(code) {
  const slots = isGptPubadsDefined() && window.googletag.pubads().getSlots();
  if (!slots || !slots.length) return null;
  const match = slots.find(slot => slot.getSlotElementId() === code);
  return match?.getAdUnitPath();
}

function getAdUnitsData(args) {
  const shouldSampleRtm = !!_staticData?.es;
  return args.adUnits?.map(adUnit => {
    let rtm;
    const pbd = adUnit.bids
      .filter(({ ortb2Imp }) => {
        const brwData = ortb2Imp?.ext?.data?.browsi;
        if (brwData && !rtm) rtm = brwData;
        return !!brwData;
      })
      .map(bid => bid.bidder);
    return {
      plid: adUnit.code,
      au: getAdUnitPathByCode(adUnit.code),
      pbd,
      dpc: rtm ? Object.keys(rtm).length : 0,
      ...(shouldSampleRtm && rtm ? { rtm } : {})
    }
  });
}

function handleAuctionEnd(args) {
  const event = {
    et: 'auction_data_sent',
    to: getTimeOffset(_staticData?.t),
    pvid: _staticData?.pvid,
    pk: _staticData?.pk,
    sk: _staticData?.sk,
    geo: _staticData?.geo,
    dp: _staticData?.device,
    aid: _staticData?.aid,
    pbv: VERSION,
    url: URL,
    aucid: args.auctionId,
    ad_units: getAdUnitsData(args)
  }
  sendEvent(event, 'rtd_demand');
}

function handleBrowsiData(args) {
  if (args.moduleName !== 'browsi') return;
  setStaticData(args);
}

function handleModuleInit(args) {
  if (args.moduleName !== 'browsi') return;
  const event = {
    et: 'rtd_init',
    to: getTimeOffset(args.t),
    pvid: args.pvid,
    pk: args.pk,
    sk: args.sk,
    pbv: VERSION,
    url: URL,
    ...(args.rsn ? { rsn: args.rsn } : {}),
  }
  sendEvent(event, 'rtd_supply');
}

function sendEvent(event, topic) {
  try {
    const pvid = event.pvid || _staticData?.pvid || '';
    const body = JSON.stringify([event]);
    ajax(`${EVENT_SERVER_URL}/${topic}?p=${pvid}`, () => { }, body, {
      contentType: 'application/json',
      method: 'POST'
    });
  } catch (err) { logMessage('Browsi Analytics error') }
}

let browsiAnalytics = Object.assign(adapter({ url: EVENT_SERVER_URL, analyticsType }), {
  track({ eventType, args }) {
    switch (eventType) {
      case BROWSI_INIT:
        handleModuleInit(args);
        break;
      case BROWSI_DATA:
        handleBrowsiData(args);
        break;
      case AUCTION_END:
        handleAuctionEnd(args);
        break;
      default:
        break;
    }
  }
});

browsiAnalytics.originEnableAnalytics = browsiAnalytics.enableAnalytics;

browsiAnalytics.enableAnalytics = function (config) {
  browsiAnalytics.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: browsiAnalytics,
  code: PROVIDER_NAME,
  gvlid: GVLID
});

export default browsiAnalytics;
