import {logError} from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import adapterManager from '../src/adapterManager.js';
import {EVENTS} from '../src/constants.js';
import {getRefererInfo} from '../src/refererDetection.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';

const ADAPTER_CODE = 'uniquest';
const BASE_URL = 'https://rcvp.ust-ad.com/';
const AUCTION_END_URI = 'pbaae';
const AD_RENDERED_URI = 'pbaars';

let sid;

function sendEvent(event, uri) {
  ajax(
    BASE_URL + uri,
    null,
    JSON.stringify(event)
  );
}

function adRenderSucceededHandler(eventType, args, pageUrl) {
  const event = {
    event_type: eventType,
    url: pageUrl,
    slot_id: sid,
    bid: {
      auction_id: args.bid?.auctionId,
      creative_id: args.bid?.creativeId,
      bidder: args.bid?.bidderCode,
      media_type: args.bid?.mediaType,
      size: args.bid?.size,
      cpm: String(args.bid?.cpm),
      currency: args.bid?.currency,
      original_cpm: String(args.bid?.originalCpm),
      original_currency: args.bid?.originalCurrency,
      hb_pb: String(args.bid?.adserverTargeting.hb_pb),
      bidding_time: args.bid?.timeToRespond,
      ad_unit_code: args.bid?.adUnitCode
    }
  };
  sendEvent(event, AD_RENDERED_URI);
}

function auctionEndHandler(eventType, args, pageUrl) {
  if (args.bidsReceived.length > 0) {
    const event = {
      event_type: eventType,
      url: pageUrl,
      slot_id: sid,
      bids: args.bidsReceived?.map(br => ({
        auction_id: br?.auctionId,
        creative_id: br?.creativeId,
        bidder: br?.bidder,
        media_type: br?.mediaType,
        size: br?.size,
        cpm: String(br?.cpm),
        currency: br?.currency,
        original_cpm: String(br?.originalCpm),
        original_currency: br?.originalCurrency,
        hb_pb: String(br?.adserverTargeting.hb_pb),
        bidding_time: br?.timeToRespond,
        ad_unit_code: br?.adUnitCode
      }))
    };
    sendEvent(event, AUCTION_END_URI);
  }
}

const baseAdapter = adapter({analyticsType: 'endpoint'});
const uniquestAdapter = Object.assign({}, baseAdapter, {

  enableAnalytics(config = {}) {
    if (config.options && config.options.sid) {
      sid = config.options.sid;
      baseAdapter.enableAnalytics.call(this, config);
    } else {
      logError('Config not found. Analytics is disabled due.');
    }
  },

  disableAnalytics() {
    sid = undefined;
    baseAdapter.disableAnalytics.apply(this, arguments);
  },

  track({eventType, args}) {
    const refererInfo = getRefererInfo();
    const pageUrl = refererInfo.page;

    switch (eventType) {
      case EVENTS.AD_RENDER_SUCCEEDED:
        adRenderSucceededHandler(eventType, args, pageUrl);
        break;
      case EVENTS.AUCTION_END:
        auctionEndHandler(eventType, args, pageUrl);
        break;
    }
  }
});

adapterManager.registerAnalyticsAdapter({
  adapter: uniquestAdapter,
  code: ADAPTER_CODE
});

export default uniquestAdapter;
