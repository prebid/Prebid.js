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
  isEmpty,
  deepClone,
  deepAccess,
} from '../src/utils.js';

const BIDDER_CODE = 'mobkoi';
const analyticsType = 'endpoint';
const GVL_ID = 898;
/**
 * !IMPORTANT: Must match the value in the mobkoiBidAdapter.js
 * The name of the parameter that the publisher can use to specify the integration endpoint.
 */
const PARAM_NAME_PREBID_JS_INTEGRATION_ENDPOINT = 'integrationEndpoint';
export const PROD_PREBID_JS_INTEGRATION_ENDPOINT = 'https://pbjs.mobkoi.com';

/**
 * Order by events lifecycle
 */
const {
  // Order events
  AUCTION_INIT,
  BID_RESPONSE,
  AUCTION_END,
  AD_RENDER_SUCCEEDED,
  BID_WON,
  BIDDER_DONE,

  // Error events (Not in order)
  AUCTION_TIMEOUT,
  NO_BID,
  BID_REJECTED,
  BIDDER_ERROR,
  AD_RENDER_FAILED,
} = EVENTS;

const CUSTOM_EVENTS = {
  BID_LOSS: 'bidLoss',
};

export const DEBUG_EVENT_LEVELS = {
  info: 'info',
  warn: 'warn',
  error: 'error',
};

/**
 * Some fields contain large data that are not useful for debugging. This
 * constant contains the fields that should be omitted from the payload and in
 * error messages.
 */
const COMMON_FIELDS_TO_OMIT = ['ad', 'adm'];

export class LocalContext {
  /**
   * A map of impression ID (ORTB terms) to BidContext object
   */
  bidContexts = {};

  /**
   * Shouldn't be accessed directly. Use getPayloadByImpId method instead.
   * Payload are indexed by impression ID.
   */
  _impressionPayloadCache = {
    // [impid]: { ... }
  };
  /**
   * The payload that is common to all bid contexts. The payload will be
   * submitted to the server along with the debug events.
   */
  getImpressionPayload(impid) {
    if (!impid) {
      throw new Error(`Impression ID is required. Given: "${impid}".`);
    }

    return this._impressionPayloadCache[impid] || {};
  }
  /**
   * Update the payload for all impressions. The new values will be merged to
   * the existing payload.
   * @param {*} subPayloads Object containing new values to be merged indexed by SUB_PAYLOAD_TYPES
   */
  mergeToAllImpressionsPayload(subPayloads) {
    // Create clone for each impression ID and update the payload cache
    _each(this.getAllBidderRequestImpIds(), currentImpid => {
      // Avoid modifying the original object
      const cloneSubPayloads = deepClone(subPayloads);

      // Initialise the payload cache if it doesn't exist
      if (!this._impressionPayloadCache[currentImpid]) {
        this._impressionPayloadCache[currentImpid] = {};
      }

      // Merge the new values to the existing payload
      utils.mergePayloadAndAddCustomFields(
        this._impressionPayloadCache[currentImpid],
        cloneSubPayloads,
        // Add the identity fields to all sub payloads
        {
          impid: currentImpid,
          publisherId: this.publisherId,
        }
      );
    });
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

  get publisherId() {
    if (!this.bidderRequests) {
      throw new Error('Bidder requests are not available. Accessing before assigning.');
    }
    return utils.getPublisherId(this.bidderRequests[0]);
  }

  get integrationBaseUrl() {
    if (
      !Array.isArray(this.bidderRequests) &&
      this.bidderRequests.length > 0
    ) {
      throw new Error('Bidder requests are not available. Accessing before assigning.' +
        JSON.stringify(this.bidderRequests, null, 2)
      );
    }

    return utils.getIntegrationEndpoint(this.bidderRequests[0]);
  }

  /**
   * Extract all impression IDs from all bid requests.
   */
  getAllBidderRequestImpIds() {
    if (!Array.isArray(this.bidderRequests)) {
      return [];
    }
    return this.bidderRequests.flatMap(br => br.bids.map(bid => utils.getImpId(bid)));
  }

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
        const id = utils.getOrtbId(bid);
        if (!id) {
          throw new Error(
            'ORTB ID is not available in the given bid object:' +
            JSON.stringify(utils.omitRecursive(bid, COMMON_FIELDS_TO_OMIT), null, 2));
        }
        return id;
      } catch (error) {
        throw new Error(
          'Failed to retrieve ORTB ID from bid object. Please ensure the given object contains an ORTB ID field.\n' +
          `Sub Error: ${error.message}`
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
    const newBidContext = new BidContext({
      localContext: this,
      prebidOrOrtbBidResponse: bid,
    });

    /**
     * Add the data that store in local context to the new bid context.
     */
    _each(
      this.commonBidContextEvents,
      event => newBidContext.pushEvent(
        {
          eventInstance: event,
          subPayloads: null, // Merge the payload later
        })
    );
    // Merge cached payloads to the new bid context
    newBidContext.mergePayload(this.getImpressionPayload(newBidContext.impid));

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
        utils.sendGetRequest(ortbBidResponse.lurl);
        // Update the flog. Don't wait for the response to continue to avoid race conditions
        bidContext.lurlTriggered = true;
      }
    });
  }

  /**
   * Push an debug event to all bid contexts. This is useful for events that are
   * related to all bids in the auction.
   * @param {Object} params Object containing the event details
   * @param {*} params.eventType Prebid event type or custom event type
   * @param {*} params.level Debug level of the event. It can be one of the following:
   * - info
   * - warn
   * - error
   * @param {*} params.timestamp Default to current timestamp if not provided.
   * @param {*} params.note Optional field. Additional information about the event.
   * @param {*} params.subPayloads Objects containing additional data that are
   * obtain from to the Prebid events indexed by SUB_PAYLOAD_TYPES.
   */
  pushEventToAllBidContexts({eventType, level, timestamp, note, subPayloads}) {
    // Create one event for each impression ID
    _each(this.getAllBidderRequestImpIds(), impid => {
      const eventClone = new Event({
        eventType,
        impid,
        publisherId: this.publisherId,
        level,
        timestamp,
        note,
      });
      // Save to the LocalContext
      this.commonBidContextEvents.push(eventClone);
      this.mergeToAllImpressionsPayload(subPayloads);
    });

    // If there are no bid contexts, push the event to the common events list
    if (isEmpty(this.bidContexts)) {
      this._commonBidContextEventsFlushed = false;
      return;
    }

    // Once the bid contexts are available, push the event to all bid contexts
    _each(this.bidContexts, (bidContext) => {
      bidContext.pushEvent({
        eventInstance: new Event({
          eventType,
          impid: bidContext.impid,
          publisherId: this.publisherId,
          level,
          timestamp,
          note,
        }),
        subPayloads: this.getImpressionPayload(bidContext.impid),
      });
    });
  }

  /**
   * A flag to indicate if the common events have been flushed to the server.
   * This is useful to avoid submitting the same events multiple times.
   */
  _commonBidContextEventsFlushed = false;

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
    const debugEndpoint = `${this.integrationBaseUrl}/debug`;

    // If there are no bid contexts, and there are error events, submit the
    // common events to the server
    if (
      isEmpty(this.bidContexts) &&
      !this._commonBidContextEventsFlushed &&
      this.commonBidContextEvents.some(
        event => event.level === DEBUG_EVENT_LEVELS.error ||
          event.level === DEBUG_EVENT_LEVELS.warn
      )
    ) {
      logInfo('Flush common events to the server');
      const debugReports = this.bidderRequests.flatMap(currentBidderRequest => {
        return currentBidderRequest.bids.map(bid => {
          const impid = utils.getImpId(bid);
          return {
            impid: impid,
            events: this.commonBidContextEvents,
            bidWin: null,
            // Unroll the payload object to the top level to make it easier for
            // Grafana to process the data.
            ...this.getImpressionPayload(impid),
          };
        });
      });

      _each(debugReports, debugReport => {
        flushPromises.push(utils.postAjax(
          debugEndpoint,
          debugReport
        ));
      });

      this._commonBidContextEventsFlushed = true;
    }

    flushPromises.push(
      ...Object.values(this.bidContexts)
        .map(async (currentBidContext) => {
          logInfo('Flush bid context events to the server', currentBidContext);
          return utils.postAjax(
            debugEndpoint,
            {
              impid: currentBidContext.impid,
              bidWin: currentBidContext.bidWin,
              events: currentBidContext.events,
              // Unroll the payload object to the top level to make it easier for
              // Grafana to process the data.
              ...currentBidContext.subPayloads,
            }
          );
        }));

    await Promise.all(flushPromises);
  }
}

/**
 * Select key fields from the given object based on the object type. This is
 * useful for debugging to reduce the size of the API call payload.
 * @param {*} objType The custom type of the object. Return by determineObjType function.
 * @param {*} eventArgs The args object that is passed in to the event handler
 * or any supported object.
 * @returns the clone of the given object but only contains the key fields
 */
function pickKeyFields(objType, eventArgs) {
  switch (objType) {
    case SUB_PAYLOAD_TYPES.AUCTION: {
      return pick(eventArgs, [
        'auctionId',
        'adUnitCodes',
        'auctionStart',
        'auctionEnd',
        'auctionStatus',
        'bidderRequestId',
        'timeout',
        'timestamp',
      ]);
    }
    case SUB_PAYLOAD_TYPES.BIDDER_REQUEST: {
      return pick(eventArgs, [
        'auctionId',
        'bidId',
        'bidderCode',
        'bidderRequestId',
        'timeout'
      ]);
    }
    case SUB_PAYLOAD_TYPES.ORTB_BID: {
      return pick(eventArgs, [
        'impid', 'id', 'price', 'cur', 'crid', 'cid', 'lurl', 'cpm'
      ]);
    }
    case SUB_PAYLOAD_TYPES.PREBID_RESPONSE_INTERPRETED: {
      return {
        ...pick(eventArgs, [
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
          'timeToRespond',
          'rejectionReason',
          'ortbId',
          'auctionId',
          'mediaType',
          'bidderRequestId',
        ]),
      };
    }
    case SUB_PAYLOAD_TYPES.PREBID_BID_REQUEST: {
      return {
        ...pick(eventArgs, [
          'bidderRequestId'
        ]),
        bids: eventArgs.bids.map(
          bid => pickKeyFields(SUB_PAYLOAD_TYPES.PREBID_RESPONSE_NOT_INTERPRETED, bid)
        ),
      };
    }
    case SUB_PAYLOAD_TYPES.AD_DOC_AND_PREBID_BID: {
      return {
        // bid: 'Not included to reduce payload size',
        doc: pick(eventArgs.doc, ['visibilityState', 'readyState', 'hidden']),
      };
    }
    case SUB_PAYLOAD_TYPES.AD_DOC_AND_PREBID_BID_WITH_ERROR: {
      return {
        // bid: 'Not included to reduce payload size',
        reason: eventArgs.reason,
        message: eventArgs.message,
        doc: pick(eventArgs.doc, ['visibilityState', 'readyState', 'hidden']),
      }
    }
    case SUB_PAYLOAD_TYPES.BIDDER_ERROR_ARGS: {
      return {
        bidderRequest: pickKeyFields(SUB_PAYLOAD_TYPES.BIDDER_REQUEST, eventArgs.bidderRequest),
        error: eventArgs.error?.toJSON ? eventArgs.error?.toJSON()
          : (eventArgs.error || 'Failed to convert error object to JSON'),
      };
    }
    default: {
      // Include the entire object for debugging
      return { eventArgs };
    }
  }
}

const mobkoiAnalytics = Object.assign(adapter({analyticsType}), {
  localContext: new LocalContext(),
  async track({
    eventType,
    args: prebidEventArgs
  }) {
    try {
      switch (eventType) {
        case AUCTION_INIT: {
          utils.logTrackEvent(eventType, prebidEventArgs);
          const argsType = utils.determineObjType(prebidEventArgs);
          const auction = prebidEventArgs;
          this.localContext.initialise(auction);
          this.localContext.pushEventToAllBidContexts({
            eventType,
            level: DEBUG_EVENT_LEVELS.info,
            timestamp: auction.timestamp,
            subPayloads: {
              [argsType]: pickKeyFields(argsType, prebidEventArgs)
            }
          });
          break;
        }
        case BID_RESPONSE: {
          utils.logTrackEvent(eventType, prebidEventArgs);
          const argsType = utils.determineObjType(prebidEventArgs);
          const prebidBid = prebidEventArgs;
          const bidContext = this.localContext.retrieveBidContext(prebidBid);
          bidContext.pushEvent({
            eventInstance: new Event({
              eventType,
              impid: bidContext.impid,
              publisherId: this.localContext.publisherId,
              level: DEBUG_EVENT_LEVELS.info,
              timestamp: prebidEventArgs.timestamp || Date.now(),
            }),
            subPayloads: {
              [argsType]: pickKeyFields(argsType, prebidEventArgs),
              [SUB_PAYLOAD_TYPES.ORTB_BID]: pickKeyFields(SUB_PAYLOAD_TYPES.ORTB_BID, prebidEventArgs.ortbBidResponse),
            }
          });
          break;
        }
        case BID_WON: {
          utils.logTrackEvent(eventType, prebidEventArgs);
          const argsType = utils.determineObjType(prebidEventArgs);
          const prebidBid = prebidEventArgs;
          if (utils.isMobkoiBid(prebidBid)) {
            this.localContext.retrieveBidContext(prebidBid).bidWin = true;
          }
          // Notify the server that the bidding results.
          this.localContext.triggerAllLossBidLossBeacon();
          // Append the bid win/loss event to all bid contexts
          _each(this.localContext.bidContexts, (currentBidContext) => {
            currentBidContext.pushEvent({
              eventInstance: new Event({
                eventType: currentBidContext.bidWin ? eventType : CUSTOM_EVENTS.BID_LOSS,
                impid: currentBidContext.impid,
                publisherId: this.localContext.publisherId,
                level: DEBUG_EVENT_LEVELS.info,
                timestamp: prebidEventArgs.timestamp || Date.now(),
              }),
              subPayloads: {
                [argsType]: pickKeyFields(argsType, prebidEventArgs),
              }
            });
          });
          break;
        }
        case AUCTION_TIMEOUT:
          utils.logTrackEvent(eventType, prebidEventArgs);
          const argsType = utils.determineObjType(prebidEventArgs);
          const auction = prebidEventArgs;
          this.localContext.pushEventToAllBidContexts({
            eventType,
            level: DEBUG_EVENT_LEVELS.error,
            timestamp: auction.timestamp,
            subPayloads: {
              [argsType]: pickKeyFields(argsType, prebidEventArgs)
            }
          });
          break;
        case NO_BID: {
          utils.logTrackEvent(eventType, prebidEventArgs);
          const argsType = utils.determineObjType(prebidEventArgs);
          this.localContext.pushEventToAllBidContexts({
            eventType,
            level: DEBUG_EVENT_LEVELS.warn,
            timestamp: prebidEventArgs.timestamp || Date.now(),
            subPayloads: {
              [argsType]: pickKeyFields(argsType, prebidEventArgs)
            }
          });
          break;
        }
        case BID_REJECTED: {
          utils.logTrackEvent(eventType, prebidEventArgs);
          const argsType = utils.determineObjType(prebidEventArgs);
          const prebidBid = prebidEventArgs;
          const bidContext = this.localContext.retrieveBidContext(prebidBid);
          bidContext.pushEvent({
            eventInstance: new Event({
              eventType,
              impid: bidContext.impid,
              publisherId: this.localContext.publisherId,
              level: DEBUG_EVENT_LEVELS.error,
              timestamp: prebidEventArgs.timestamp || Date.now(),
              note: prebidEventArgs.rejectionReason,
            }),
            subPayloads: {
              [argsType]: pickKeyFields(argsType, prebidEventArgs)
            }
          });
          break;
        };
        case BIDDER_ERROR: {
          utils.logTrackEvent(eventType, prebidEventArgs)
          const argsType = utils.determineObjType(prebidEventArgs);
          this.localContext.pushEventToAllBidContexts({
            eventType,
            level: DEBUG_EVENT_LEVELS.warn,
            timestamp: prebidEventArgs.timestamp || Date.now(),
            subPayloads: {
              [argsType]: pickKeyFields(argsType, prebidEventArgs)
            }
          });
          break;
        }
        case AD_RENDER_FAILED: {
          utils.logTrackEvent(eventType, prebidEventArgs);
          const argsType = utils.determineObjType(prebidEventArgs);
          const {bid: prebidBid} = prebidEventArgs;
          const bidContext = this.localContext.retrieveBidContext(prebidBid);
          bidContext.pushEvent({
            eventInstance: new Event({
              eventType,
              impid: bidContext.impid,
              publisherId: this.localContext.publisherId,
              level: DEBUG_EVENT_LEVELS.error,
              timestamp: prebidEventArgs.timestamp || Date.now(),
            }),
            subPayloads: {
              [argsType]: pickKeyFields(argsType, prebidEventArgs)
            }
          });
          break;
        }
        case AD_RENDER_SUCCEEDED: {
          utils.logTrackEvent(eventType, prebidEventArgs);
          const argsType = utils.determineObjType(prebidEventArgs);
          const prebidBid = prebidEventArgs.bid;
          const bidContext = this.localContext.retrieveBidContext(prebidBid);
          bidContext.pushEvent({
            eventInstance: new Event({
              eventType,
              impid: bidContext.impid,
              publisherId: this.localContext.publisherId,
              level: DEBUG_EVENT_LEVELS.info,
              timestamp: prebidEventArgs.timestamp || Date.now(),
            }),
            subPayloads: {
              [argsType]: pickKeyFields(argsType, prebidEventArgs)
            }
          });
          break;
        }
        case AUCTION_END: {
          utils.logTrackEvent(eventType, prebidEventArgs);
          const argsType = utils.determineObjType(prebidEventArgs);
          const auction = prebidEventArgs;
          this.localContext.pushEventToAllBidContexts({
            eventType,
            level: DEBUG_EVENT_LEVELS.info,
            timestamp: auction.timestamp,
            subPayloads: {
              [argsType]: pickKeyFields(argsType, prebidEventArgs)
            }
          });
          break;
        }
        case BIDDER_DONE: {
          utils.logTrackEvent(eventType, prebidEventArgs)
          const argsType = utils.determineObjType(prebidEventArgs);
          this.localContext.pushEventToAllBidContexts({
            eventType,
            level: DEBUG_EVENT_LEVELS.info,
            timestamp: prebidEventArgs.timestamp || Date.now(),
            subPayloads: {
              [argsType]: pickKeyFields(argsType, prebidEventArgs)
            }
          });
          this.localContext.triggerAllLossBidLossBeacon();
          await this.localContext.flushAllDebugEvents();
          break;
        }
        default:
          // Do nothing in other events
          break;
      }
    } catch (error) {
      // If there is an unexpected error, such as a syntax error, we log
      // log the error and submit the error to the server for debugging.
      this.localContext.pushEventToAllBidContexts({
        eventType,
        level: DEBUG_EVENT_LEVELS.error,
        timestamp: prebidEventArgs.timestamp || Date.now(),
        note: 'Error occurred when processing this event.',
        subPayloads: {
          // Include the entire object for debugging
          [`errorInEvent_${eventType}`]: {
            // Some fields contain large data. Omits them to reduce API call payload size
            eventArgs: utils.omitRecursive(prebidEventArgs, COMMON_FIELDS_TO_OMIT),
            error: error.message,
          }
        }
      });
      // Throw the error to skip the current Prebid event
      throw error;
    }
  }
});

// save the base class function
mobkoiAnalytics.originEnableAnalytics = mobkoiAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
mobkoiAnalytics.enableAnalytics = function (config) {
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
      this.subPayloads &&
      utils.getImpId(this.subPayloads)
    ) {
      return utils.getImpId(this.subPayloads);
    } else {
      throw new Error('ORTB bid response and Prebid bid response are not available for extracting Impression ID');
    }
  }

  /**
   * ORTB ID generated by the Prebid.js integration endpoint
   */
  get ortbId() {
    if (this.ortbBidResponse) {
      return utils.getOrtbId(this.ortbBidResponse);
    } else if (this.prebidBidResponse) {
      return utils.getOrtbId(this.prebidBidResponse);
    } else if (this.subPayloads) {
      return utils.getOrtbId(this.subPayloads);
    } else {
      throw new Error('ORTB bid response and Prebid bid response are not available for extracting ORTB ID');
    }
  };

  get publisherId() {
    if (this.prebidBidRequest) {
      return utils.getPublisherId(this.prebidBidRequest);
    } else {
      throw new Error('ORTB bid response and Prebid bid response are not available for extracting Publisher ID');
    }
  }

  /**
   * The prebid bid request object before converted to ORTB request in our
   * custom adapter.
   */
  get prebidBidRequest() {
    if (!this.prebidBidResponse) {
      throw new Error('Prebid bid response is not available. Accessing before assigning.');
    }

    return this.localContext.bidderRequests.flatMap(br => br.bids)
      .find(bidRequest => bidRequest.bidId === this.prebidBidResponse.requestId);
  }

  /**
   * To avoid overriding the subPayloads object, we merge the new values to the
   * existing subPayloads object.
   */
  _subPayloads = null;
  /**
   * A group of payloads that are useful for debugging. The payloads are indexed
   * by SUB_PAYLOAD_TYPES.
   */
  get subPayloads() {
    return this._subPayloads;
  }
  /**
   * To avoid overriding the subPayloads object, we merge the new values to the
   * existing subPayloads object. Identity fields will automatically added to the
   * new values.
   * @param {*} newSubPayloads Object containing new values to be merged
   */
  mergePayload(newSubPayloads) {
    utils.mergePayloadAndAddCustomFields(
      this._subPayloads,
      newSubPayloads,
      // Add the identity fields to all sub payloads
      {
        impid: this.impid,
        publisherId: this.publisherId,
      }
    );
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
    this._subPayloads = {};

    if (!bidResponse) {
      throw new Error('prebidOrOrtbBidResponse field is required');
    }

    const objType = utils.determineObjType(bidResponse);
    if (![SUB_PAYLOAD_TYPES.ORTB_BID, SUB_PAYLOAD_TYPES.PREBID_RESPONSE_INTERPRETED].includes(objType)) {
      throw new Error(
        'Unable to create a new Bid Context as the given object is not a bid response object. ' +
        'Expect a Prebid Bid Object or ORTB Bid Object. Given object:\n' +
        JSON.stringify(utils.omitRecursive(bidResponse, COMMON_FIELDS_TO_OMIT), null, 2)
      );
    }

    if (objType === SUB_PAYLOAD_TYPES.ORTB_BID) {
      this.ortbBidResponse = bidResponse;
      this.prebidBidResponse = null;
    } else if (objType === SUB_PAYLOAD_TYPES.PREBID_RESPONSE_INTERPRETED) {
      this.ortbBidResponse = bidResponse.ortbBidResponse;
      this.prebidBidResponse = bidResponse;
    } else {
      throw new Error('Expect a Prebid Bid Object or ORTB Bid Object. Given object:\n' +
        JSON.stringify(utils.omitRecursive(bidResponse, COMMON_FIELDS_TO_OMIT), null, 2));
    }
  }

  /**
   * Push a debug event to the context which will be submitted to the server for debugging.
   * @param {Object} params Object containing the following properties:
   * @param {Event} params.eventInstance - DebugEvent object. If it does not contain the same impid as the BidContext, the event will be ignored.
   * @param {Object|null} params.subPayloads - Object containing various payloads obtained from the Prebid Event args. The payloads will be merged into the existing subPayloads.
   */
  pushEvent({eventInstance, subPayloads}) {
    if (!(eventInstance instanceof Event)) {
      throw new Error('bugEvent must be an instance of DebugEvent');
    }
    if (eventInstance.impid !== this.impid) {
      // Ignore the event if the impression ID is not matched.
      return;
    }
    // Accept only object or null
    if (subPayloads !== null && typeof subPayloads !== 'object') {
      throw new Error('subPayloads must be an object or null');
    }

    this.events.push(eventInstance);

    if (subPayloads !== null) {
      this.mergePayload(subPayloads);
    }
  }
}

/**
 * A class to represent an event happened in the bid processing lifecycle.
 */
class Event {
  /**
   * Impression ID must set before appending to event lists.
   */
  impid = null;

  /**
   * Publisher ID. It is a unique identifier for the publisher.
   */
  publisherId = null;

  /**
   * Prebid Event Type or Custom Event Type
   */
  eventType = null;
  /**
   * Debug level of the event. It can be one of the following:
   * - info
   * - warn
   * - error
   */
  level = null;
  /**
   * Timestamp of the event. It represents the time when the event occurred.
   */
  timestamp = null;

  constructor({eventType, impid, publisherId, level, timestamp, note = undefined}) {
    if (!eventType) {
      throw new Error('eventType is required');
    }
    if (!impid) {
      throw new Error(`Impression ID is required. Given: "${impid}"`);
    }

    if (typeof publisherId !== 'string') {
      throw new Error(`Publisher ID must be a string. Given: "${publisherId}"`);
    }

    if (!DEBUG_EVENT_LEVELS[level]) {
      throw new Error(`Event level must be one of ${Object.keys(DEBUG_EVENT_LEVELS).join(', ')}. Given: "${level}"`);
    }
    if (typeof timestamp !== 'number') {
      throw new Error('Timestamp must be a number');
    }
    this.eventType = eventType;
    this.impid = impid;
    this.publisherId = publisherId;
    this.level = level;
    this.timestamp = timestamp;
    if (note) {
      this.note = note;
    }

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
 * Various types of payloads that are submitted to the server for debugging.
 * Mostly they are obtain from the Prebid event args.
 */
export const SUB_PAYLOAD_TYPES = {
  AUCTION: 'prebid_auction',
  BIDDER_REQUEST: 'bidder_request',
  ORTB_BID: 'ortb_bid',
  PREBID_RESPONSE_INTERPRETED: 'prebid_bid_interpreted',
  PREBID_RESPONSE_NOT_INTERPRETED: 'prebid_bid_not_interpreted',
  PREBID_BID_REQUEST: 'prebid_bid_request',
  AD_DOC_AND_PREBID_BID: 'ad_doc_and_prebid_bid',
  AD_DOC_AND_PREBID_BID_WITH_ERROR: 'ad_doc_and_prebid_bid_with_error',
  BIDDER_ERROR_ARGS: 'bidder_error_args',
};

/**
 * Fields that are unique to objects used to identify the sub-payload type.
 */
export const SUB_PAYLOAD_UNIQUE_FIELDS_LOOKUP = {
  [SUB_PAYLOAD_TYPES.AUCTION]: ['auctionStatus'],
  [SUB_PAYLOAD_TYPES.BIDDER_REQUEST]: ['bidderRequestId'],
  [SUB_PAYLOAD_TYPES.ORTB_BID]: ['adm', 'impid'],
  [SUB_PAYLOAD_TYPES.PREBID_RESPONSE_INTERPRETED]: ['requestId', 'ortbBidResponse'],
  [SUB_PAYLOAD_TYPES.PREBID_RESPONSE_NOT_INTERPRETED]: ['requestId'], // This must be paste under PREBID_RESPONSE_INTERPRETED
  [SUB_PAYLOAD_TYPES.PREBID_BID_REQUEST]: ['bidId'],
  [SUB_PAYLOAD_TYPES.AD_DOC_AND_PREBID_BID]: ['doc', 'bid'],
  [SUB_PAYLOAD_TYPES.AD_DOC_AND_PREBID_BID_WITH_ERROR]: ['bid', 'reason', 'message'],
  [SUB_PAYLOAD_TYPES.BIDDER_ERROR_ARGS]: ['error', 'bidderRequest'],
};

/**
 * Required fields for the sub payloads. The property value defines the type of the required field.
 */
const PAYLOAD_REQUIRED_FIELDS = {
  impid: 'string',
  publisherId: 'string',
}

export const utils = {
  /**
   * Make a POST request to the given URL with the given data.
   * @param {*} url
   * @param {*} data JSON data
   * @returns
   */
  postAjax: async function (url, data) {
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
          `Failed to make post request to endpoint "${url}". With data: ` +
          JSON.stringify(utils.omitRecursive(data, COMMON_FIELDS_TO_OMIT), null, 2),
          { error: error.message }
        ));
      }
    });
  },

  /**
   * Make a GET request to the given URL. If the request fails, it will fall back
   * to AJAX request.
   * @param {*} url URL with the query string
   * @returns
   */
  sendGetRequest: async function(url) {
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
  },

  /**
   * Check if the given Prebid bid is from Mobkoi.
   * @param {*} prebidBid
   * @returns
   */
  isMobkoiBid: function (prebidBid) {
    return prebidBid && prebidBid.bidderCode === BIDDER_CODE;
  },

  /**
   * !IMPORTANT: Make sure the implementation of this function matches utils.getOrtbId in
   * mobkoiAnalyticsAdapter.js.
   * We use the bidderRequestId as the ortbId. We could do so because we only
   * make one ORTB request per Prebid Bidder Request.
   * The ID field named differently when the value passed on to different contexts.
   * @param {*} bid Prebid Bidder Request Object or Prebid Bid Response/Request
   * or ORTB Request/Response Object
   * @returns {string} The ORTB ID
   * @throws {Error} If the ORTB ID cannot be found in the given object.
   */
  getOrtbId(bid) {
    const ortbId =
      // called bidderRequestId in Prebid Request
      bid.bidderRequestId ||
      // called seatBidId in Prebid Bid Response Object
      bid.seatBidId ||
      // called ortbId in Interpreted Prebid Response Object
      bid.ortbId ||
      // called id in ORTB object
      (Object.hasOwn(bid, 'imp') && bid.id);

    if (!ortbId) {
      throw new Error(
        'Failed to obtain ORTB ID from the given object. Given object:\n' +
        JSON.stringify(utils.omitRecursive(bid, COMMON_FIELDS_TO_OMIT), null, 2)
      );
    }

    return ortbId;
  },

  /**
   * Impression ID is named differently in different objects. This function will
   * return the impression ID from the given bid object.
   * @param {*} bid ORTB bid response or Prebid bid response or Prebid bid request
   * @returns string | null
   */
  getImpId: function (bid) {
    return (bid && (bid.impid || bid.requestId || bid.bidId)) || null;
  },

  /**
   * !IMPORTANT: Make sure the implementation of this function matches utils.getPublisherId in
   * both adapters.
   * Extract the publisher ID from the given object.
   * @param {*} bid Prebid Bidder Request Object or Prebid Bid Response/Request
   * or ORTB Request/Response Object
   * @returns string
   * @throws {Error} If the publisher ID is not found in the given object.
   */
  getPublisherId: function (bid) {
    const ortbPath = 'site.publisher.id';
    const prebidPath = `ortb2.${ortbPath}`;

    const publisherId =
      deepAccess(bid, prebidPath) ||
      deepAccess(bid, ortbPath);

    if (!publisherId) {
      throw new Error(
        'Failed to obtain publisher ID from the given object. ' +
        `Please set it via the "${prebidPath}" field with pbjs.setBidderConfig.\n` +
        'Given object:\n' +
        JSON.stringify(bid, null, 2)
      );
    }

    return publisherId;
  },

  /**
   * !IMPORTANT: Make sure the implementation of this function matches getIntegrationEndpoint
   * in both adapters.
   * Obtain the Integration Base URL from the given Prebid object.
   * @param {*} bid Prebid Bidder Request Object or Prebid Bid Response/Request
   * or ORTB Request/Response Object
   * @returns {string} The Integration Base URL
   * @throws {Error} If the ORTB ID cannot be found in the given
   */
  getIntegrationEndpoint (bid) {
    const path = `site.publisher.ext.${PARAM_NAME_PREBID_JS_INTEGRATION_ENDPOINT}`;
    const preBidPath = `ortb2.${path}`;

    const integrationBaseUrl =
      // For Prebid Bid objects
      deepAccess(bid, preBidPath) ||
      // For ORTB objects
      deepAccess(bid, path) ||
      // Fallback to default if not found
      PROD_PREBID_JS_INTEGRATION_ENDPOINT;

    return integrationBaseUrl;
  },

  logTrackEvent: function (eventType, eventArgs) {
    if (!debugTurnedOn()) {
      return;
    }
    const argsType = (() => {
      try {
        return utils.determineObjType(eventArgs);
      } catch (error) {
        logError(`Error when logging track event: [${eventType}]\n`, error);
        return 'Unknown';
      }
    })();
    logInfo(`Track event: [${eventType}]. Args Type Determination: ${argsType}`, eventArgs);
  },

  /**
   * Determine the type of the given object based on the object's fields.
   * This is useful for identifying the type of object that is passed in to the
   * handler functions.
   * @param {*} eventArgs
   * @returns string
   */
  determineObjType: function (eventArgs) {
    if (typeof eventArgs !== 'object' || eventArgs === null) {
      throw new Error(
        'determineObjType: Expect an object. Given object is not an object or null. Given object:' +
        JSON.stringify(utils.omitRecursive(eventArgs, COMMON_FIELDS_TO_OMIT), null, 2)
      );
    }

    let objType = null;
    for (const type of Object.values(SUB_PAYLOAD_TYPES)) {
      const identifyFields = SUB_PAYLOAD_UNIQUE_FIELDS_LOOKUP[type];
      if (!identifyFields) {
        throw new Error(
          `Identify fields for type "${type}" is not defined in COMMON_OBJECT_UNIT_FIELDS.`
        );
      }

      // If all fields are available in the object, then it's the type we are looking for
      if (identifyFields.every(field => eventArgs.hasOwnProperty(field))) {
        objType = type;
        break;
      }
    }

    if (!objType) {
      throw new Error(
        'Unable to determine track args type. Please update COMMON_OBJECT_UNIT_FIELDS for the new object type.\n' +
        'Given object:\n' +
        JSON.stringify(utils.omitRecursive(eventArgs, COMMON_FIELDS_TO_OMIT), null, 2)
      );
    }

    return objType;
  },

  /**
   * Merge a Payload object with new values. The payload object must be in
   * specific format where root level keys are SUB_PAYLOAD_TYPES values and the
   * property values must be an object of the given type.
   * @param {*} targetPayload
   * @param {*} newSubPayloads
   * @param {*} customFields Custom fields that are required for the sub payloads.
   */
  mergePayloadAndAddCustomFields: function (targetPayload, newSubPayloads, customFields = undefined) {
    if (typeof targetPayload !== 'object') {
      throw new Error('Target must be an object');
    }

    if (typeof newSubPayloads !== 'object') {
      throw new Error('New values must be an object');
    }

    // Ensure all the required custom fields are available
    if (customFields) {
      _each(customFields, (fieldType, fieldName) => {
        if (fieldType === 'string' && typeof newSubPayloads[fieldName] !== 'string') {
          throw new Error(
            `Field "${fieldName}" must be a string. Given: ${newSubPayloads[fieldName]}`
          );
        }
      });
    }

    mergeDeep(targetPayload, newSubPayloads);

    // Add the custom fields to the sub-payloads just added to the target payload
    if (customFields) {
      utils.addCustomFieldsToSubPayloads(targetPayload, customFields);
    }
  },

  /**
   * Should not use this function directly. Use mergePayloadAndCustomFields
   * instead. This function add custom fields to the sub-payloads. The provided
   * custom fields will be validated.
   * @param {*} subPayloads A group of payloads that are useful for debugging. Indexed by SUB_PAYLOAD_TYPES.
   * @param {*} customFields Custom fields that are required for the sub
   * payloads. Fields are defined in PAYLOAD_REQUIRED_FIELDS.
   */
  addCustomFieldsToSubPayloads: function (subPayloads, customFields) {
    _each(subPayloads, (currentSubPayload, subPayloadType) => {
      if (!Object.values(SUB_PAYLOAD_TYPES).includes(subPayloadType)) {
        return;
      }

      // Add the custom fields to the sub-payloads
      mergeDeep(currentSubPayload, customFields);
    });

    // Before leaving the function, validate the payload to ensure all
    // required fields are available.
    utils.validateSubPayloads(subPayloads);
  },

  /**
   * Recursively omit the given keys from the object.
   * @param {*} subPayloads - The payload objects index by their payload types.
   * @throws {Error} - If the given object is not valid.
   */
  validateSubPayloads: function (subPayloads) {
    _each(subPayloads, (currentSubPayload, subPayloadType) => {
      if (!Object.values(SUB_PAYLOAD_TYPES).includes(subPayloadType)) {
        return;
      }

      const validationErrors = [];
      // Validate the required fields
      _each(PAYLOAD_REQUIRED_FIELDS, (requiredFieldType, requiredFieldName) => {
        // eslint-disable-next-line valid-typeof
        if (typeof currentSubPayload[requiredFieldName] !== requiredFieldType) {
          validationErrors.push(new Error(
            `Field "${requiredFieldName}" in "${subPayloadType}" must be a ${requiredFieldType}. Given: ${currentSubPayload[requiredFieldName]}`
          ));
        }
      });

      if (validationErrors.length > 0) {
        throw new Error(
          `Validation failed for "${subPayloadType}".\n` +
          `Object: ${JSON.stringify(utils.omitRecursive(currentSubPayload, COMMON_FIELDS_TO_OMIT), null, 2)}\n` +
          validationErrors.map(error => `Error: ${error.message}`).join('\n')
        );
      }
    });
  },

  /**
   * Recursively omit the given keys from the object.
   * @param {*} obj - The object to process.
   * @param {Array} keysToOmit - The keys to omit from the object.
   * @param {*} [placeholder='OMITTED'] - The placeholder value to use for omitted keys.
   * @returns {Object} - A clone of the given object with the specified keys omitted.
   */
  omitRecursive: function (obj, keysToOmit, placeholder = 'OMITTED') {
    return Object.keys(obj).reduce((acc, currentKey) => {
      // If the current key is in the keys to omit, replace the value with the placeholder
      if (keysToOmit.includes(currentKey)) {
        acc[currentKey] = placeholder;
        return acc;
      }

      // If the current value is an object and not null, recursively omit keys
      if (typeof obj[currentKey] === 'object' && obj[currentKey] !== null) {
        acc[currentKey] = utils.omitRecursive(obj[currentKey], keysToOmit, placeholder);
      } else {
        // Otherwise, directly assign the value to the accumulator object
        acc[currentKey] = obj[currentKey];
      }
      return acc;
    }, {});
  }
};
