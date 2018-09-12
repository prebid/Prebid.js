import {
  ajax
} from 'src/ajax';
import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import adaptermanager from 'src/adaptermanager';
import * as url from 'src/url';
import find from 'core-js/library/fn/array/find';

const analyticsType = 'endpoint';
const emptyUrl = '';
const pageViewId = (!window.top.ADAGIO || !window.top.ADAGIO.pageviewId) ? '_' : window.top.ADAGIO.pageviewId;

let requestSent = false;
let payload = { pv_id: pageViewId };
let adUnits = [];

let adagioAnalytics = Object.assign(adapter({ emptyUrl, analyticsType }), {
  track({ eventType, args }) {
    if (typeof args !== 'undefined') {
      if (eventType === CONSTANTS.EVENTS.BID_REQUESTED) {
        let { bids = [] } = args;
        bids.forEach(function (bid) {
          let { adUnitCode, params = {} } = bid;
          let { category, pagetype, device, placement, siteId } = params.features || {};
          adUnits.push({ adu_id: adUnitCode, plcmt: placement, bids: [] });
          Object.assign(payload, { siteId, cat: category, pgtyp: pagetype, dvc: device });
        });
      } else if (eventType === CONSTANTS.EVENTS.BID_RESPONSE) {
        let { adUnitCode, bidderCode, cpm, netRevenue, currency, timeToRespond, statusMessage, width, height } = args;
        let adUnit = find(adUnits, (adUnit) => adUnit.adu_id === adUnitCode);
        adUnit.bids = adUnit.bids.concat([{
          bidder: bidderCode,
          cpm,
          net_rev: netRevenue ? 1 : 0,
          cur: currency,
          ttr: timeToRespond,
          sts: statusMessage,
          w: width,
          h: height
        }]);
      } else if (eventType === CONSTANTS.EVENTS.BID_WON) {
        let { adUnitCode } = args;
        let adUnit = find(adUnits, (adUnit) => adUnit.adu_id === adUnitCode);
        Object.assign(adUnit, { won: 1 });
      }
    }

    if (eventType === CONSTANTS.EVENTS.AUCTION_END) {
      send('auction_end');
    }
  }
});

function send(evt) {
  const data = Object.assign({ evt }, payload, { b: encodeURI(btoa(JSON.stringify(adUnits))) });
  const ep = url.format({
    protocol: 'https',
    hostname: 'cbids.4dex.io',
    pathname: '/bids.gif',
    search: data
  });
  requestSent = true;
  ajax(ep, undefined, undefined, { method: 'GET' });
}

window.top.addEventListener('unload', function () {
  if (!requestSent) {
    send('unload');
  }
});

adaptermanager.registerAnalyticsAdapter({
  adapter: adagioAnalytics,
  code: 'adagio'
});

export default adagioAnalytics;
