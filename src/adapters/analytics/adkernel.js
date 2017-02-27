import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';
import adapter from './AnalyticsAdapter';

const LOAD_TIME_BUCKETS = [200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, Number.MAX_VALUE];
const LOAD_TIME_BUCKET_LABELS = ['0000-0200ms', '0200-0300ms', '0300-0400ms', '0400-0500ms', '0500-0600ms', '0600-0800ms',
  '0800-1000ms', '1000-1200ms', '1200-1500ms', '1500-2000ms', '>2000ms'];
const CPM_BUCKETS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 6, 8, Number.MAX_VALUE];
const CPM_BUCKET_LABELS = ['$0-0.5', '$0.5-1', '$1-1.5', '$1.5-2', '$2-2.5', '$2.5-3', '$3-4', '$4-6', '$6-8', '>$8'];

const analyticsType = 'bundle';
const requestId2zone = {};
let akaGlobal = 'aka';

export default utils.extend(adapter({analyticsType}), {
  getGlobal() {
    return akaGlobal;
  },
  track({ eventType, args }) {
    let handler = null;
    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_INIT:
        init(args.config);
        break;
      case CONSTANTS.EVENTS.BID_REQUESTED:
        handler = trackBidRequest;
        break;
      case CONSTANTS.EVENTS.BID_RESPONSE:
        handler = trackBidResponse;
        break;
      case CONSTANTS.EVENTS.BID_WON:
        handler = trackBidWon;
        break;
      case CONSTANTS.EVENTS.BID_TIMEOUT:
        handler = trackBidTimeout;
        break;
    }
    if (handler) {
      send(handler, args);
    }
  }
});

function init(config) {
  /*istanbul ignore else*/
  if (config && config.globalName) {
    akaGlobal = config.globalName;
  }
}

function trackBidRequest(args) {
  const bidderName = args.bidderCode;
  const storeZoneInfo = isAdkernelRequest(bidderName);
  const ret = [];

  utils._each(args.bids, (bid) => {
    let zoneId = 0;

    /*istanbul ignore else*/
    if (storeZoneInfo) {
      zoneId = bid.params.zoneId;
      requestId2zone[bid.bidId] = zoneId;
    }
    ret.push([buildLabel('Requests', bidderName, zoneId)]);
  });
  return ret;
}

function trackBidResponse(args) {
  const bidderName = args.bidderCode;
  const zoneId = isAdkernelRequest(bidderName) && requestId2zone[args.adId] ? requestId2zone[args.adId] : 0;
  const timeBucket = getLoadTimeBucket(args.timeToRespond);
  const cpmBucket = getCpmBucket(args.cpm);

  const ret = [
      [buildLabel('BidLoad', bidderName, zoneId), args.timeToRespond / 1000],
      [buildLabel(`BidLoadBucket${timeBucket}`, bidderName, zoneId), args.timeToRespond / 1000]
  ];
  /*istanbul ignore else*/
  if (args.cpm > 0.0) {
    ret.push([buildLabel('BidCpm', bidderName, zoneId), args.cpm]);
    ret.push([buildLabel(`BidCpmBucket${cpmBucket}`, bidderName, zoneId), args.cpm]);
  }
  return ret;
}

function trackBidWon(args) {
  const bidderName = args.bidderCode;
  const zoneId = isAdkernelRequest(bidderName) && requestId2zone[args.adId] ? requestId2zone[args.adId] : 0;
  const cpmBucket = getCpmBucket(args.cpm);

  return [[buildLabel('WonCpm', bidderName, zoneId), args.cpm],
    [buildLabel(`WonCpmBucket${cpmBucket}`, bidderName, zoneId), args.cpm]];
}

function trackBidTimeout(args) {
  const res = [];
  utils._each(args, (bidderName) => {
    res.push([buildLabel('Timeout', bidderName, 0)]);
  });
  return res;
}

function buildLabel(info, bidderName, pubPointId) {
  return `pb_${bidderName}_${pubPointId}_${info}`;
}

function isAdkernelRequest(bidderCode) {
  return (bidderCode === 'adkernel' || bidderCode === 'headbidding');
}

function send(handler, args) {
  /*istanbul ignore if*/
  if (!window[akaGlobal])
      return;
  utils._each(handler(args), (ev) => {
    let label = ev[0];
    let value = ev[1];
    if (value)
      window[akaGlobal]('send', 'event', label, value);
    else
      window[akaGlobal]('send', 'event', label);
  });
}

function getLoadTimeBucket(time) {
  return getBucketLable(time, LOAD_TIME_BUCKETS, LOAD_TIME_BUCKET_LABELS);
}

function getCpmBucket(cpm) {
  return getBucketLable(cpm, CPM_BUCKETS, CPM_BUCKET_LABELS);
}

function getBucketLable(value, buckets, labels) {
  for (let i = 0; i < buckets.length; i++) {
    if (value < buckets[i])
      return labels[i];
  }
}