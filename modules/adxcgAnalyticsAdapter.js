import {ajax} from 'src/ajax';
import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';
import * as url from 'src/url';
import * as utils from 'src/utils';

const emptyUrl = '';
const analyticsType = 'endpoint';
const adxcgAnalyticsVersion = 'v1.04';

let initOptions;
let auctionTimestamp;
let events = {
  bidRequests: [],
  bidResponses: []
};

var adxcgAnalyticsAdapter = Object.assign(adapter(
  {
    emptyUrl,
    analyticsType
  }), {
  track({eventType, args}) {
    if (typeof args !== 'undefined') {
      if (eventType === 'bidTimeout') {
        events.bidTimeout = args;
      } else if (eventType === 'auctionInit') {
        events.auctionInit = args;
        auctionTimestamp = args.timestamp;
      } else if (eventType === 'bidRequested') {
        events.bidRequests.push(args);
      } else if (eventType === 'bidResponse') {
        events.bidResponses.push(mapBidResponse(args));
      } else if (eventType === 'bidWon') {
        send({
          bidWon: mapBidResponse(args)
        });
      }
    }

    if (eventType === 'auctionEnd') {
      send(events);
    }
  }
});

function mapBidResponse(bidResponse) {
  return {
    adUnitCode: bidResponse.adUnitCode,
    statusMessage: bidResponse.statusMessage,
    bidderCode: bidResponse.bidderCode,
    adId: bidResponse.adId,
    mediaType: bidResponse.mediaType,
    creative_id: bidResponse.creative_id,
    width: bidResponse.width,
    height: bidResponse.height,
    cpm: bidResponse.cpm,
    timeToRespond: bidResponse.timeToRespond
  };
}

function send(data) {
  data.initOptions = initOptions;
  data.auctionTimestamp = auctionTimestamp;

  let location = utils.getTopWindowLocation();
  let secure = location.protocol == 'https:';

  let adxcgAnalyticsRequestUrl = url.format({
    protocol: secure ? 'https' : 'http',
    hostname: secure ? 'hbarxs.adxcg.net' : 'hbarx.adxcg.net',
    pathname: '/pbrx',
    search: {
      auctionTimestamp: auctionTimestamp,
      adxcgAnalyticsVersion: adxcgAnalyticsVersion,
      prebidVersion: $$PREBID_GLOBAL$$.version
    }
  });

  ajax(adxcgAnalyticsRequestUrl, undefined, JSON.stringify(data), {method: 'POST'});
}

adxcgAnalyticsAdapter.originEnableAnalytics = adxcgAnalyticsAdapter.enableAnalytics;
adxcgAnalyticsAdapter.enableAnalytics = function (config) {
  initOptions = config.options;
  adxcgAnalyticsAdapter.originEnableAnalytics(config);
};

adaptermanager.registerAnalyticsAdapter({
  adapter: adxcgAnalyticsAdapter,
  code: 'adxcg'
});

export default adxcgAnalyticsAdapter;
