import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import { ajax } from '../src/ajax.js';
import {
  logInfo,
  logWarn,
  logError,
  _each,
  pick,
  triggerPixel,
  debugTurnedOn,
  mergeDeep,
  isEmpty
} from '../src/utils.js';

const BIDDER_CODE = 'mobkoi';
const analyticsType = 'endpoint';
const GVL_ID = 898;

/**
 * Order by events lifecycle
 */
const {
  AUCTION_INIT,
  BID_RESPONSE,
  AUCTION_END,
  AD_RENDER_SUCCEEDED,
  BID_WON,
  BIDDER_DONE,

  // Error events
  AUCTION_TIMEOUT,
  BID_TIMEOUT,
  NO_BID,
  BID_REJECTED,
  SEAT_NON_BID,
  BIDDER_ERROR,
  AD_RENDER_FAILED,
} = EVENTS;

const CUSTOM_EVENTS = {
  BID_LOSS: 'bidLoss',
};

/**
 * The options that are passed in from the page
 */
let initOptions = {};

const DEBUG_EVENT_LEVELS = {
  info: 'info',
  warn: 'warn',
  error: 'error',
};

class LocalContext {
  /**
   * A map of impression ID (ORTB terms) to BidContext object
   */
  bidContexts = {};

  /**
   * Shouldn't be accessed directly. Use the getter and mergePayload method instead.
   */
  _commonPayload = {};
  /**
   * The payload that is common to all bid contexts. The payload will be
   * submitted to the server along with the debug events.
   */
  get payload() {
    return this._commonPayload;
  }
  /**
   * To avoid overriding the payload object, we merge the new values to
   * the existing payload object.
   * @param {*} newValues Object containing new values to be merged
   */
  mergePayload(newValues) {
    mergeDeep(this._commonPayload, newValues);
  }

  /**
   * The Prebid auction object but only contains the key fields that we
   * interested in.
   */
  auction = null;

  /**
   * Auction.bidderRequests object
   */
  bidderRequests = null;

  /**
   * Cache the debug events that are common to all bid contexts.
   * When a new bid context is created, the events will be pushed to the new
   * context.
   */
  commonBidContextEvents = [];

  initialise(auction) {
    this.auction = pick(auction, ['auctionId', 'auctionEnd']);
    this.bidderRequests = auction.bidderRequests;
  }

  /**
   * Retrieve the BidContext object by the bid object. If the bid context is not
   * available, it will create a new one. The new bid context will returned.
   * @param {*} bid can be a prebid bid response or ortb bid response
   * @returns BidContext object
   */
  retrieveBidContext(bid) {
    const ortbId = (() => {
      try {
        getOrtbId(bid);
      } catch (error) {
        throw new Error(
          'Failed to retrieve ORTB ID from bid object. Please ensure the given object contains an ORTB ID field.\n' +
          `Sub Error: ${error}`
        );
      }
    })();
    const bidContext = this.bidContexts[ortbId];

    if (bidContext) {
      return bidContext;
    }

    /**
     * Create a new context object and return it.
     */
    const bidType = determineObjType(bid);

    if (![COMMON_OBJECT_TYPES.ORTB_BID, COMMON_OBJECT_TYPES.PREBID_RESPONSE_INTERPRETED].includes(bidType)) {
      throw new Error(
        'Unable to create a new Bid Context as the given object is not a bid object. Expect a Prebid Bid Object or ORTB Bid Object. Given object:' +
        JSON.stringify(bid, null, 2)
      );
    }

    let newBidContext = null;

    if (bidType === COMMON_OBJECT_TYPES.ORTB_BID) {
      newBidContext = new BidContext({
        localContext: this,
        ortbBidResponse: bid,
        prebidBidResponse: null,
      });
    } else if (bidType === COMMON_OBJECT_TYPES.PREBID_RESPONSE_INTERPRETED) {
      newBidContext = new BidContext({
        localContext: this,
        ortbBidResponse: bid.ortbBidResponse,
        prebidBidResponse: bid,
      });
    } else {
      throw new Error(`Unknown bid object type. Given object:\n${JSON.stringify(bid, null, 2)}`);
    }

    // Push common events to the new bid context.
    _each(
      this.commonBidContextEvents,
      event => newBidContext.pushEvent(event)
    );
    // Merge common payload to the new bid context
    newBidContext.mergePayload(this.payload);

    this.bidContexts[ortbId] = newBidContext;
    return newBidContext;
  }

  /**
   * Immediately trigger the loss beacon for all bids (bid contexts) that haven't won the auction.
   */
  triggerAllLossBidLossBeacon() {
    _each(this.bidContexts, (bidContext) => {
      const { ortbBidResponse, bidWin, lurlTriggered } = bidContext;
      if (ortbBidResponse.lurl && !bidWin && !lurlTriggered) {
        logInfo('TriggerLossBeacon. impid:', ortbBidResponse.impid);
        sendGetRequest(ortbBidResponse.lurl);
        // Don't wait for the response to continue to avoid race conditions
        bidContext.lurlTriggered = true;
        bidContext.pushEvent(
          new DebugEvent({
            eventType: CUSTOM_EVENTS.BID_LOSS,
            level: DEBUG_EVENT_LEVELS.info,
          }),
          {
            impid: ortbBidResponse.impid,
            ortbId: ortbBidResponse.id,
            cpm: ortbBidResponse.cpm,
            lurl: ortbBidResponse.lurl,
          }
        );
      }
    });
  }

  /**
   * Push an debug event to all bid contexts. This is useful for events that are
   * related to all bids in the auction.
   * @param {*} debugEvent
   * @param {*} payload
   */
  pushCommonEventToAllBidContexts(debugEvent, payload) {
    this.commonBidContextEvents.push(debugEvent);
    this.mergePayload(payload);

    if (isEmpty(this.bidContexts)) {
      return;
    }

    _each(this.bidContexts, (bidContext) => {
      bidContext.pushEvent(debugEvent, this.payload);
    });
  }

  /**
   * Flush all debug events in all bid contexts as well as the common events (in
   * Local Context) to the server.
   */
  async flushAllDebugEvents() {
    if (this.commonBidContextEvents.length < 0 && isEmpty(this.bidContexts)) {
      logInfo('No debug events to flush');
      return;
    }

    const flushPromises = [];

    // If there are no bid contexts, and there are error events, submit the
    // common events to the server
    if (
      isEmpty(this.bidContexts) &&
      this.commonBidContextEvents.some(
        event => event.level === DEBUG_EVENT_LEVELS.error ||
          event.level === DEBUG_EVENT_LEVELS.warn
      )
    ) {
      logInfo('Flush common events to the server');
      flushPromises.push(postAjax(
        `${initOptions.endpoint}/debug`,
        {
          impid: getImpId(this.payload),
          ortbId: safeGetOrtbId(this.payload),
          events: this.commonBidContextEvents,
          payload: this.payload,
        }
      ));
    }

    flushPromises.push(
      ...Object.values(this.bidContexts)
        .map(async (bidContext) => {
          logInfo('Flush bid context events to the server', bidContext);
          return postAjax(
            `${initOptions.endpoint}/debug`,
            {
              impid: bidContext.impid,
              ortbId: bidContext.ortbId,
              events: bidContext.events,
              payload: bidContext.payload,
            }
          );
        }));

    await Promise.all(flushPromises);
  }
}

let mobkoiAnalytics = Object.assign(adapter({analyticsType}), {
  localContext: new LocalContext(),
  async track({
    eventType,
    args
  }) {
    switch (eventType) {
      case AUCTION_INIT: {
        const auction = args;
        logTrackEvent(eventType, auction)
        this.localContext.initialise(auction);
        this.localContext.pushCommonEventToAllBidContexts(
          new DebugEvent({
            eventType,
            level: DEBUG_EVENT_LEVELS.info,
            timestamp: auction.timestamp,
          },
          ),
          pick(auction, [
            'auctionId',
            'adUnitCodes',
            'adUnits',
            'auctionStart',
            'auctionStatus',
            'timeout',
            'timestamp',
          ])
        );
        break;
      }
      case BID_RESPONSE: {
        logTrackEvent(eventType, args)
        const prebidBid = args;
        const bidContext = this.localContext.retrieveBidContext(prebidBid);
        bidContext.pushEvent(
          new DebugEvent({
            eventType,
            level: DEBUG_EVENT_LEVELS.info,
          }),
          pick(prebidBid, [
            'requestId',
            'creativeId',
            'cpm',
            'currency',
            'bidderCode',
            'adUnitCode',
            'ttl',
            'adId',
            'width',
            'height',
            'requestTimestamp',
            'responseTimestamp',
            'seatBidId',
            'statusMessage',
            'timeToRespond'
          ]),
        );
        break;
      }
      case BID_WON: {
        logTrackEvent(eventType, args)
        const prebidBid = args;
        if (isMobkoiBid(prebidBid)) {
          this.localContext.retrieveBidContext(prebidBid).bidWin = true;
        }
        this.localContext.triggerAllLossBidLossBeacon();

        const bidContext = this.localContext.retrieveBidContext(prebidBid);
        bidContext.pushEvent(
          new DebugEvent({
            eventType,
            level: DEBUG_EVENT_LEVELS.info,
          }),
          {
            ...pick(args, [
              'adId',
              'bidderCode',
              'requestId',
              'status',
              'statusMessage',
              'cpm',
              'currency',
              'creativeId',
              'adUnitCode',
              'addUnitId',
              'adId',
              'ttl',
              'width',
              'height',
              'requestTimestamp',
              'responseTimestamp',
              'timeToRespond',
            ]),
            bidWin: bidContext.bidWin,
          }
        );
        break;
      }
      case AUCTION_END: {
        logTrackEvent(eventType, args)
        const auction = args;
        this.localContext.pushCommonEventToAllBidContexts(
          new DebugEvent({
            eventType,
            level: DEBUG_EVENT_LEVELS.info,
            timestamp: auction.timestamp,
          }),
          pick(auction, [
            'auctionId',
            'auctionStatus',
            'auctionStart',
            'auctionEnd',
            'auctionStatus',
            'bidderCode',
            'bidderRequestId',
            'timestamp',
          ])
        );
        break;
      }
      case AUCTION_TIMEOUT:
        logTrackEvent(eventType, args)
        const auction = args;
        this.localContext.pushCommonEventToAllBidContexts(
          new DebugEvent({
            eventType,
            level: DEBUG_EVENT_LEVELS.error,
            timestamp: auction.timestamp,
          }),
          pick(auction, [
            'auctionId',
            'auctionStatus',
            'auctionStart',
            'auctionEnd',
            'auctionStatus',
            'bidderCode',
            'bidderRequestId',
            'timestamp',
          ])
        );
        break;
      case NO_BID: {
        logTrackEvent(eventType, args)
        const prebidBidRequest = args;
        const debugEvent = new DebugEvent({
          eventType,
          level: DEBUG_EVENT_LEVELS.warn,
        });
        this.localContext.pushCommonEventToAllBidContexts(
          debugEvent,
          pick(prebidBidRequest, [
            'auctionId',
            'bidId',
            'bidderCode',
            'bidderRequestId',
            'timeout',
          ])
        );
        break;
      }
      case BID_REJECTED: {
        logTrackEvent(eventType, args)
        const prebidBid = args;
        const bidContext = this.localContext.retrieveBidContext(prebidBid);
        bidContext.pushEvent(
          new DebugEvent({
            eventType,
            level: DEBUG_EVENT_LEVELS.warn,
          }),
          pick(prebidBid, [
            'rejectionReason',
            'ortbId',
            'requestId',
            'auctionId',
            'bidderCode',
            'bidderRequestId',
            'ortbBidResponse',
          ])
        );
        break;
      };
      case BID_TIMEOUT:
        break;
      case SEAT_NON_BID:
      case BIDDER_ERROR: {
        logTrackEvent(eventType, args)
        try {
          // Submit entire args object for debugging
          const debugEvent = new DebugEvent({
            eventType,
            level: DEBUG_EVENT_LEVELS.error,
          });

          // If args is an auction object
          if (args.auctionId) {
            this.localContext.pushCommonEventToAllBidContexts(debugEvent);
            break;
          }

          // Assuming args is a prebid bid object
          const prebidBid = args;
          const bidContext = this.localContext.retrieveBidContext(prebidBid);
          bidContext.pushEvent(debugEvent, { args });
        } catch (error) {
          this.localContext.pushCommonEventToAllBidContexts(
            new DebugEvent({
              eventType,
              level: DEBUG_EVENT_LEVELS.error,
            }),
            {
              args: args,
              warn: 'Unexpected error occurred. Please investigate.',
              error: JSON.stringify(error)
            }
          );
          this.localContext.flushAllDebugEvents();
        }
        break;
      }
      case AD_RENDER_FAILED: {
        logTrackEvent(eventType, args)
        const prebidBid = args.bid;
        const bidContext = this.localContext.retrieveBidContext(prebidBid);
        bidContext.pushEvent(
          new DebugEvent({
            eventType,
            level: DEBUG_EVENT_LEVELS.error,
          }),
          pick(prebidBid, [
            'ad',
            'adId',
            'adUnitCode',
            'creativeId',
            'width',
            'height',
          ])
        );
        break;
      }
      case AD_RENDER_SUCCEEDED: {
        logTrackEvent(eventType, args);
        const prebidBid = args.bid;
        const bidContext = this.localContext.retrieveBidContext(prebidBid);
        bidContext.pushEvent(
          new DebugEvent({
            eventType,
            level: DEBUG_EVENT_LEVELS.info,
          }),
          pick(prebidBid, [
            'adId',
            'adUnitCode',
            'creativeId',
            'width',
            'height',
          ])
        );
        break;
      }
      case BIDDER_DONE: {
        logTrackEvent(eventType, args)
        const auction = args;
        this.localContext.pushCommonEventToAllBidContexts(
          new DebugEvent({
            eventType,
            level: DEBUG_EVENT_LEVELS.info,
            timestamp: auction.timestamp,
          }),
          pick(auction, [
            'auctionId',
            'bidderCode',
            'bidderRequestId',
            'timeout',
          ])
        );
        this.localContext.triggerAllLossBidLossBeacon();
        await this.localContext.flushAllDebugEvents();
        break;
      }
      default:
        // Do nothing
        break;
    }
  }
});

// save the base class function
mobkoiAnalytics.originEnableAnalytics = mobkoiAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
mobkoiAnalytics.enableAnalytics = function (config) {
  initOptions = config.options;
  if (!config.options.publisherId) {
    logError('PublisherId option is not defined. Analytics won\'t work');
    return;
  }

  if (!config.options.endpoint) {
    logError('Endpoint option is not defined. Analytics won\'t work');
    return;
  }

  logInfo('mobkoiAnalytics.enableAnalytics', initOptions);
  mobkoiAnalytics.originEnableAnalytics(config); // call the base class function
};

adapterManager.registerAnalyticsAdapter({
  adapter: mobkoiAnalytics,
  code: BIDDER_CODE,
  gvlid: GVL_ID
});

export default mobkoiAnalytics;

class BidContext {
  /**
   * The impression ID (ORTB term) of the bid. This ID is initialised in Prebid
   * bid requests. The ID is reserved in requests and responses but have
   * different names from object to object.
   */
  get impid() {
    if (this.ortbBidResponse) {
      return this.ortbBidResponse.impid;
    } else if (this.prebidBidResponse) {
      return this.prebidBidResponse.requestId;
    } else if (this.prebidBidRequest) {
      return this.prebidBidRequest.bidId;
    } else if (
      this.payload &&
      getImpId(this.payload)
    ) {
      return getImpId(this.payload);
    } else {
      throw new Error('ORTB bid response and Prebid bid response are not available');
    }
  }

  /**
   * ORTB ID generated by Ad Server
   */
  get ortbId() {
    if (this.ortbBidResponse) {
      return getOrtbId(this.ortbBidResponse);
    } else if (this.prebidBidResponse) {
      return getOrtbId(this.prebidBidResponse);
    } else if (this.payload) {
      return getOrtbId(this.payload);
    } else {
      throw new Error('ORTB bid response and Prebid bid response are not available');
    }
  };

  /**
   * The prebid bid request object before converted to ORTB request in our
   * custom adapter.
   */
  get prebidBidRequest() {
    if (!this.prebidBidResponse) {
      throw new Error('Prebid bid response is not available');
    }

    return this.localContext.bidderRequests.flatMap(br => br.bids)
      .find(bidRequest => bidRequest.bidId === this.prebidBidResponse.requestId);
  }

  _payload = null;
  get payload() {
    return this._payload;
  }
  /**
   * To avoid overriding the payload object, we merge the new values to the
   * existing payload object.
   * @param {*} newValues Object containing new values to be merged
   */
  mergePayload(newValues) {
    mergeDeep(this._payload, newValues);
  }

  /**
   * The prebid bid response object after converted from ORTB response in our
   * custom adapter.
   */
  prebidBidResponse = null;

  /**
   * The raw ORTB bid response object from the server.
   */
  ortbBidResponse = null;

  /**
   * A flag to indicate if the bid has won the auction. It only updated to true
   * if the winning bid is from Mobkoi in the BID_WON event.
   */
  bidWin = false;

  /**
   * A flag to indicate if the loss beacon has been triggered.
   */
  lurlTriggered = false;

  /**
   * A list of DebugEvent objects
   */
  events = [];

  /**
   * Keep the reference of LocalContext object for easy accessing data.
   */
  localContext = null;

  /**
   * A object to store related data of a bid for easy access.
   * i.e. bid request and bid response.
   * @param {*} param0
   */
  constructor({
    localContext,
    prebidOrOrtbBidResponse: bidResponse,
  }) {
    this.localContext = localContext;
    this._payload = {};

    const objType = determineObjType(bidResponse);
    if (![COMMON_OBJECT_TYPES.ORTB_BID, COMMON_OBJECT_TYPES.PREBID_RESPONSE_INTERPRETED].includes(objType)) {
      throw new Error(
        'Unable to create a new Bid Context as the given object is not a bid object. Expect a Prebid Bid Object or ORTB Bid Object. Given object:' +
        JSON.stringify(bidResponse, null, 2)
      );
    }

    if (objType === COMMON_OBJECT_TYPES.ORTB_BID) {
      this.ortbBidResponse = bidResponse;
      this.prebidBidResponse = null;
    } else if (objType === COMMON_OBJECT_TYPES.PREBID_RESPONSE_INTERPRETED) {
      this.ortbBidResponse = bidResponse.ortbBidResponse;
      this.prebidBidResponse = bidResponse;
    } else {
      throw new Error(`Expect a Prebid Bid Object or ORTB Bid Object. Given object:\n${JSON.stringify(bidResponse, null, 2)}`);
    }
  }

  /**
   * Push a debug event to the context which will submitted to server for debugging.
   * @param {*} bugEvent DebugEvent object
   * @param {*} payload Additional data to be submitted to the server
   */
  pushEvent(bugEvent, payload = undefined) {
    if (!(bugEvent instanceof DebugEvent)) {
      throw new Error('Event must be an instance of DebugEvent');
    }
    this.events.push(bugEvent);

    if (payload) {
      this.mergePayload(payload);
    }
  }
}

/**
 * A class defines the uniform structure of a debug event object.
 */
class DebugEvent {
  constructor({eventType, level, timestamp = undefined}) {
    if (!eventType) {
      throw new Error('Event type is required');
    }
    if (!DEBUG_EVENT_LEVELS[level]) {
      throw new Error(`Event level must be one of ${Object.keys(DEBUG_EVENT_LEVELS).join(', ')}. Given: "${level}"`);
    }
    if (timestamp && typeof timestamp !== 'number') {
      throw new Error('Timestamp must be a number');
    }
    this.eventType = eventType;
    this.level = level;
    this.timestamp = timestamp || Date.now();

    if (
      debugTurnedOn() &&
      (
        level === DEBUG_EVENT_LEVELS.error ||
        level === DEBUG_EVENT_LEVELS.warn
      )) {
      logWarn(`New Debug Event - Type: ${eventType} Level: ${level}.`);
    }
  }
}

/**
 * Make a POST request to the given URL with the given data.
 * @param {*} url
 * @param {*} data JSON data
 * @returns
 */
async function postAjax(url, data) {
  return new Promise((resolve, reject) => {
    try {
      logInfo('postAjax:', url, data);
      ajax(url, resolve, JSON.stringify(data), {
        contentType: 'application/json',
        method: 'POST',
        withCredentials: false, // No user-specific data is tied to the request
        referrerPolicy: 'unsafe-url',
        crossOrigin: true
      });
    } catch (error) {
      reject(new Error(
        `Failed to make post request to endpoint "${url}". With data: ${JSON.stringify(data, null, 2)}.\nError: ${error}`,
        { cause: error }
      ));
    }
  });
}

/**
 * Make a GET request to the given URL. If the request fails, it will fall back
 * to AJAX request.
 * @param {*} url URL with the query string
 * @returns
 */
async function sendGetRequest(url) {
  return new Promise((resolve, reject) => {
    try {
      logInfo('triggerPixel', url);
      triggerPixel(url, resolve);
    } catch (error) {
      try {
        logWarn(`triggerPixel failed. URL: (${url}) Falling back to ajax. Error: `, error);
        ajax(url, resolve, null, {
          contentType: 'application/json',
          method: 'GET',
          withCredentials: false, // No user-specific data is tied to the request
          referrerPolicy: 'unsafe-url',
          crossOrigin: true
        });
      } catch (error) {
        // If failed with both methods, reject the promise
        reject(error);
      }
    }
  });
}

function isMobkoiBid(prebidBid) {
  return prebidBid && prebidBid.bidderCode === BIDDER_CODE;
}

/**
 * The primary ID we use for identifying bid requests and responses.
 * Get ORTB ID from Prebid Bid response or ORTB bid response object.
 */
function getOrtbId(bid) {
  if (bid.id) {
    if (debugTurnedOn()) {
      const objType = determineObjType(bid);
      if (!objType === COMMON_OBJECT_TYPES.ORTB_BID) {
        logWarn(
          `Given object is not an ORTB bid response. Given object type: ${objType}.`,
          bid
        );
      }
    }
    // If it's an ORTB bid response
    return bid.id;
  } else if (bid.ortbId) {
    // If it's a Prebid bid response
    return bid.ortbId;
  } else if (bid.ortbBidResponse && bid.ortbBidResponse.id) {
    // If it's a Prebid bid response with ORTB response. i.e. interpreted response
    return bid.ortbBidResponse.id;
  } else {
    throw new Error(`Not a valid bid object. Given object:\n${JSON.stringify(bid, null, 2)}`);
  }
}

/**
 * Safely get ORTB ID from a bid object. If the ID is not available, it will
 * return null.
 * @param {*} obj
 * @returns string | null
 */
function safeGetOrtbId(obj) {
  try {
    return getOrtbId(obj);
  } catch (error) {
    return null;
  }
}

/**
 * Impression ID is named differently in different objects. This function will
 * return the impression ID from the given bid object.
 * @param {*} bid ORTB bid response or Prebid bid response or Prebid bid request
 * @returns string | null
 */
function getImpId(bid) {
  return (bid && (bid.impid || bid.requestId || bid.bidId)) || null;
}

function logTrackEvent(eventType, args) {
  if (!debugTurnedOn()) {
    return;
  }
  const argsType = (() => {
    try {
      return determineObjType(args);
    } catch (error) {
      logError(`Error when logging track event: ${eventType}\n`, error);
      return 'Unknown';
    }
  })();
  logInfo(`Track event: ${eventType}. Args Object Type: ${argsType}`, args);
}

const COMMON_OBJECT_TYPES = {
  AUCTION: 'prebid_auction',
  BIDDER_REQUEST: 'bidder_request',
  ORTB_BID: 'ortb_bid',
  PREBID_RESPONSE_INTERPRETED: 'prebid_bid_interpreted',
  PREBID_BID_REQUEST: 'prebid_bid_request',
  AD_DOC_AND_PREBID_BID: 'ad_doc_and_prebid_bid',
};

/**
 * Fields that are united to objects used to identify the object type.
 */
const COMMON_OBJECT_UNIT_FIELDS = {
  [COMMON_OBJECT_TYPES.AUCTION]: ['bidderRequests'],
  [COMMON_OBJECT_TYPES.BIDDER_REQUEST]: ['bidderRequestId'],
  [COMMON_OBJECT_TYPES.ORTB_BID]: ['adm', 'impid'],
  [COMMON_OBJECT_TYPES.PREBID_RESPONSE_INTERPRETED]: ['requestId'],
  [COMMON_OBJECT_TYPES.PREBID_BID_REQUEST]: ['bidId'],
  [COMMON_OBJECT_TYPES.AD_DOC_AND_PREBID_BID]: ['doc', 'bid'],
};

function determineObjType(trackArgs) {
  if (typeof trackArgs !== 'object' || trackArgs === null) {
    throw new Error('Expect an object. Given object is not an object or null');
  }

  let objType = null;
  for (const type of Object.values(COMMON_OBJECT_TYPES)) {
    const identifyFields = COMMON_OBJECT_UNIT_FIELDS[type];
    if (!identifyFields) {
      throw new Error(
        `Identify fields for type "${type}" is not defined in COMMON_OBJECT_UNIT_FIELDS.`
      );
    }
    // If all fields are available in the object, then it's the type we are looking for
    if (identifyFields.every(field => trackArgs.hasOwnProperty(field))) {
      objType = type;
      break;
    }
  }

  if (!objType) {
    throw new Error(
      `Unable to determine track args type. Given object:${JSON.stringify(trackArgs, null, 2)}`
    );
  }

  return objType;
}
