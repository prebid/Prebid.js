import ProtoBuf from 'protobufjs';
//const protoSpec = require('./log-prebid-events.json');
const protoSpecNewsIQ = require('./log-prebid-events-newsiq.json');
import { ajax, debounce } from './utils';
import { detectDeviceType } from './device-detection'

//const Builder = ProtoBuf.loadJson(protoSpec);
//const Analytics = Builder.build('LogPrebidEvents');
//const Auction = Analytics.Auction;

const BuilderNewsIQ = ProtoBuf.loadJson(protoSpecNewsIQ);
const AnalyticsNewsIQ = BuilderNewsIQ.build('LogPrebidEventsNewsIQ');
const AuctionNewsIQ = AnalyticsNewsIQ.Auction;

//const url = 'https://rb.adnxs.com/pack?log=log_prebid_events&format=protobuf';
let NewsIQUrlProduction = 'https://log.ncaudienceexchange.com/pb/';  // production analytics end point
let NewsIQUrlTest = 'https://newscorp-newsiq-dev.appspot.com/pb/'; // test analytics end point
let memberId = undefined;
const LIMIT = 100;
export const sendBatch = debounce(send, LIMIT);

export function setEndPoint(config) {
  if (config && config.options && config.options.endpoint) {
    NewsIQUrlProduction = config.options.endpoint;
    NewsIQUrlTest = config.options.endpoint;    
  }
  if (config && config.options &&  config.options.memberId) {
    memberId = config.options.memberId;
  }  
};

const STATUS = {
  BID_RECEIVED: 9,
  BID_WON: 10,
  BID_LOST: 11,
  NO_BID: 12,
  BID_TIMEOUT: 13
};

const MSG_TYPE = {
  Auction_Init: 101,
  Bid_Requested: 102,
  Bid_Response: 103,
  Bid_Timeout: 104,
  Bid_Won: 105,
  Bid_Lost: 106
};

let _topLevel = {};
let _queue = [];
let _sent = [];

function logMessage() {
  if (pbjs.getConfig('debug')) {
    window.console.log.apply(null, arguments);
  }
}

function isDebugDetail() {
	var search = window.location.search.toLowerCase();
	return (search.indexOf('pbjs_debug=details') !== -1);
}

/**
 * Construct analytics payload and send to endpoint
 */
function send() {
/*
  const analytics = Object.assign({}, _topLevel, {
    timestamp: Math.floor(Date.now() / 1000),
    auctions: _queue.map(log => new Auction(log))
  });

  const payload = new Analytics(analytics).toArrayBuffer();
  */
  if (_queue.length === 0) return;

  const analytics = Object.assign({}, _topLevel, {
    timestamp: Math.floor(Date.now() / 1000),
    auctions: _queue.map(log => new AuctionNewsIQ(log))
  });

  //const payload = new AnalyticsNewsIQ(analytics).toArrayBuffer();

  const analyticsNewsIQ = Object.assign({}, _topLevel, {
    timestamp: Date.now(),
    auctions: _queue.map(log => new AuctionNewsIQ(log))
  });

  const payloadNewsIQ = new AnalyticsNewsIQ(analyticsNewsIQ).toArrayBuffer();

  let NewsIQUrl = NewsIQUrlProduction;
  if (isDebugDetail()) {
    NewsIQUrl = NewsIQUrlTest;
  }
  
  logMessage('NewsCorp analytics message:', analyticsNewsIQ, 'endpoint', NewsIQUrl);

  //ajax(url, payload, result => logMessage('Sent Prebid Analytics:', result));
  ajax(NewsIQUrl, payloadNewsIQ, result => logMessage('Sent NewsCorp Prebid Analytics:', result));

  // TODO: reconcile _sent queue with results from ajax request
  _sent = _sent.concat(_queue);
  _queue = [];
}

/**
 * Dispatch event to correct handler
 */
export function logEvent({ eventType }) {
  switch (eventType) {
    case 'auctionInit':
      auctionInit(...arguments);
      break;

    case 'bidRequested':
      bidRequested(...arguments);
      break;

    case 'bidResponse':
      bidResponse(...arguments);
      break;

    case 'bidWon':
      bidWon(...arguments);
      break;

    case 'bidTimeout':
      bidTimeout(...arguments);
      break;
  }
}

function getDecive() {
  try {
    return detectDeviceType(window.navigator.userAgent);
  }
  catch {
    return 'unknown';
  }
}

window.ProgrammaticBidding = window.ProgrammaticBidding || {};
window.ProgrammaticBidding.device = getDecive();

function auctionInit({ data }) {
  _topLevel = {
    referer_url: document.URL,
    domain: window.ProgrammaticBidding.pageDomain || 'unknown',
    device: window.ProgrammaticBidding.device,
    platform: 'Prebid Web',
    seller_member_id: data.config ? data.config.memberId : memberId,
  };

  _queue.push({
    auction_init_timestamp: data.timestamp,
    prebid_auction_id: data.auctionId,
    configured_timeout_ms: data.timeout,
    version: pbjs.version,
    msg_type: MSG_TYPE.Auction_Init
  });
}

function getAdUnit(adUnitId) {
  const adSlot = window.googletag.pubads().getSlots()
    .find(function (slot) {
      return (adUnitId === slot.getSlotElementId());
    });
  if (adSlot) return adSlot.getAdUnitPath();
  else return '';
}

function getBidParms(bid) {
  return [
    {key: 'ad unit', value: getAdUnit(bid.adUnitCode)}
  ];
}

function isString (value) {
  return typeof value === 'string' || value instanceof String;
}

function addParam(params, key, value) {
  if (value) {
    var stringVal;
    if (isString(value)) {
      stringVal = value;
    }
    else {
      stringVal = JSON.stringify(value);
    }
    params.push({key: key, value: stringVal})
  }
}

function getRequestParams(bid) {
  const params = getBidParms(bid);
  if (bid.params) {
    Object.keys(bid.params).map(key => {
      addParam(params, key, bid.params[key]);
    })
  }
  addParam(params, 'requestId', bid.bidId);
  return params;
}

const responseExcludeParam = ['ad', 'adId', 'adUnitCode', 'adserverTargeting', 'auctionId',
  'bidder', 'bidderCode', 'cpm', 'creativeId', 'currency', 'height', 'pbAg', 'pbCg', 'pbDg',
  'pbHg', 'pbLg', 'pbMg', 'requestTimestamp', 'responseTimestamp', 'size', 'source',
  'statusMessage', 'width', 'getStatusCode', 'getSize', 'native'];

function getResponseParams(bid) {
  const params = getBidParms(bid);
  Object.keys(bid).map(key => {
    if (!responseExcludeParam.includes(key)) {
      addParam(params, key, bid[key]);
    }
  });
  if (bid.adserverTargeting) {
    addParam(params, 'hb_pb', bid.adserverTargeting.hb_pb);
  }
  return params;
}

function bidRequested({ data }) {
  _queue.push({
    msg_type: MSG_TYPE.Bid_Requested,
    prebid_auction_id: data.auctionId,
    ad_units: data.bids
      .map(bid => {
        return {
          ad_unit_code: bid.adUnitCode,
          bids: [
            {
              bid_id: bid.bidId,
              bidder_code: bid.bidder,
              request_timestamp: data.start
            }
          ],
          params: getRequestParams(bid)
        };
      })
  });
}

function fillResponsePayload(responsePayload, data, statusCode) {
  responsePayload.prebid_auction_id = data.auctionId;
  responsePayload.ad_units = [
    {
      ad_unit_code: data.adUnitCode,
      bids: [
        {
          bid_id: data.adId,
          bidder_code: data.bidder,
          price: data.cpm,
          status_code: statusCode,
          bidder_ad_unit_id: data.adUnitCode,
          request_timestamp: data.requestTimestamp,
          response_timestamp: data.responseTimestamp,
          creative: {
            creative_id: data.creativeId && String(data.creativeId),
            height: data.height && +data.height,
            width: data.width && +data.width,
            brand: data.brand // we don't currently support this
          }
        }
      ],
      params: getResponseParams(data)
    }
  ];

  if (data.cpm === 0) {
    responsePayload.ad_units[0].bids[0].status_code = STATUS.NO_BID;
  }

  if (data.source) {
    responsePayload.ad_units[0].bids[0].source = data.source;
  }
}

function bidResponse({ data }) {
  if (!data.adUnitCode) {return;}
  if (!data.requestTimestamp) {return;}
  if (data.cpm === Infinity) {return;}

  if (isDebugDetail()) {
    logMessage('Bid Response for ' + data.bidder + ':', data);
  }

  const responsePayload = {
    msg_type: MSG_TYPE.Bid_Response
  };
  fillResponsePayload(responsePayload, data, STATUS.BID_RECEIVED);

  _queue.push(responsePayload);
}

function bidWon({ data }) {
  if (!data.adUnitCode) {return;}
  if (data.cpm === Infinity) {return;}

  if (isDebugDetail()) {
    logMessage('Bid Won for ' + data.bidder + ':', data);
  }

  const bidWonPayload = {
    msg_type: MSG_TYPE.Bid_Won
  };
  fillResponsePayload(bidWonPayload, data, STATUS.BID_WON);

  // log "bid won" for the winning bid of a placement
  _queue.push(bidWonPayload);

  // get other bids in the auction for the placement and log "bid lost" status code
  _queue = _queue.concat(pbjs.getBidResponsesForAdUnitCode(data.adUnitCode).bids
    .filter(bid => bid !== data && bid.adUnitCode === data.adUnitCode)
    .map(bid => {
      return {
        prebid_auction_id: bid.auctionId,
        msg_type: MSG_TYPE.Bid_Lost,
        ad_units: [
          {
            ad_unit_code: bid.adUnitCode,
            bids: [
              {
                bid_id: bid.adId,
                bidder_code: bid.bidder,
                status_code: STATUS.BID_LOST // Bid lost auction
              }
            ],
            params: getBidParms(bid)
          }
        ]
      };
    }));
}

function bidTimeout({ data = [] }) {
  _queue = _queue.concat(data.map(bid => {
    return {
        prebid_auction_id: bid.auctionId,
        msg_type: MSG_TYPE.Bid_Timeout,
        ad_units: [
          {
            ad_unit_code: bid.adUnitCode,
            bids: [
              {
                bid_id: bid.bidId,
                bidder_code: bid.bidder,
                status_code: STATUS.BID_TIMEOUT // Bid received after timeout reached
              }
            ],
            params: getBidParms(bid)
          }
        ]
      };
  }));
}
