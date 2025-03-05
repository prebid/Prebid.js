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

const { AUCTION_END, BROWSI_INIT } = EVENTS;

function setStaticData() {
  const brwd = window.browsitag?.rtd;
  _staticData = {
    url: encodeURIComponent(window.location.href),
    version: getGlobal().version,
    ...(brwd ? {
      pvid: brwd.pvid,
      device: brwd.d,
      geo: brwd.g,
      aid: brwd.aid,
      es: brwd.es,
      pk: brwd.pk,
      sk: brwd.sk,
      t: brwd.t,
    } : {})
  };
}

function getTimeOffset(ts) {
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
  return args.adUnits.map(adUnit => {
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
      ...(shouldSampleRtm ? { rtm } : {})
    }
  });
}

function handleAuctionEnd(args) {
  const event = {
    et: 'auction_data_sent',
    to: getTimeOffset(_staticData.t),
    pvid: _staticData.pvid,
    pk: _staticData.pk,
    sk: _staticData.sk,
    geo: _staticData.geo,
    dp: _staticData.device,
    aid: _staticData.aid,
    pbv: _staticData.version,
    url: _staticData.url,
    aucid: args.auctionId,
    ad_units: getAdUnitsData(args)
  }
  sendEvent(event, 'rtd_demand');
}

function handleModuleInit(args) {
  if (args.moduleName !== 'browsi') return;

  const { geo, device } = _staticData;

  const event = {
    et: 'rtd_init',
    to: getTimeOffset(_staticData.t || args.t),
    pvid: _staticData.pvid || args.pvid,
    pk: _staticData.pk || args.pk,
    sk: _staticData.sk || args.sk,
    pbv: _staticData.version,
    url: _staticData.url,
    ...(geo ? { geo } : {}),
    ...(device ? { dp: device } : {}),
    ...(args.s ? { s: args.s } : {}),
  }
  sendEvent(event, 'rtd_supply');
}

let browsiAnalytics = Object.assign(adapter({ url: EVENT_SERVER_URL, analyticsType }), {
  track({ eventType, args }) {
    switch (eventType) {
      case BROWSI_INIT:
        handleModuleInit(args);
        break;
      case AUCTION_END:
        handleAuctionEnd(args);
        break;
      default:
        break;
    }
  }
});

function sendEvent(event, topic) {
  const { pvid } = _staticData;

  try {
    const body = JSON.stringify([event]);
    ajax(`${EVENT_SERVER_URL}/${topic}?p=${pvid}`, () => { }, body, {
      contentType: 'application/json',
      method: 'POST'
    });
  } catch (err) { logMessage('Browsi Analytics error') }
}

browsiAnalytics.originEnableAnalytics = browsiAnalytics.enableAnalytics;

browsiAnalytics.enableAnalytics = function (config) {
  setStaticData();
  browsiAnalytics.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: browsiAnalytics,
  code: PROVIDER_NAME,
  gvlid: GVLID
});

export default browsiAnalytics;
