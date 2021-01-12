import adapter from '../src/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager.js';
import { logInfo } from '../src/utils.js';
import find from 'core-js-pure/features/array/find.js';
import findIndex from 'core-js-pure/features/array/find-index.js';

// Events used in adomik analytics adapter
const auctionInit = CONSTANTS.EVENTS.AUCTION_INIT;
const auctionEnd = CONSTANTS.EVENTS.AUCTION_END;
const bidRequested = CONSTANTS.EVENTS.BID_REQUESTED;
const bidResponse = CONSTANTS.EVENTS.BID_RESPONSE;
const bidWon = CONSTANTS.EVENTS.BID_WON;
const bidTimeout = CONSTANTS.EVENTS.BID_TIMEOUT;

let adomikAdapter = Object.assign(adapter({}),
  {
    // Track every event needed
    track({ eventType, args }) {
      switch (eventType) {
        case auctionInit:
          adomikAdapter.initializeBucketEvents()
          adomikAdapter.currentContext.id = args.auctionId
          break;

        case bidTimeout:
          adomikAdapter.currentContext.timeouted = true;
          break;

        case bidResponse:
          adomikAdapter.bucketEvents.push({
            type: 'response',
            event: adomikAdapter.buildBidResponse(args)
          });
          break;

        case bidWon:
          adomikAdapter.sendWonEvent({
            id: args.adId,
            placementCode: args.adUnitCode
          });
          break;

        case bidRequested:
          args.bids.forEach(function(bid) {
            adomikAdapter.bucketEvents.push({
              type: 'request',
              event: {
                bidder: bid.bidder.toUpperCase(),
                placementCode: bid.placementCode
              }
            });
          });
          break;

        case auctionEnd:
          if (adomikAdapter.bucketEvents.length > 0) {
            adomikAdapter.sendTypedEvent();
          }
          break;
      }
    }
  }
);

adomikAdapter.initializeBucketEvents = function() {
  adomikAdapter.bucketEvents = [];
}

adomikAdapter.sendTypedEvent = function() {
  const groupedTypedEvents = adomikAdapter.buildTypedEvents();

  const bulkEvents = {
    uid: adomikAdapter.currentContext.uid,
    ahbaid: adomikAdapter.currentContext.id,
    hostname: window.location.hostname,
    eventsByPlacementCode: groupedTypedEvents.map(function(typedEventsByType) {
      let sizes = [];
      const eventKeys = ['request', 'response', 'winner'];
      let events = {};

      eventKeys.forEach((eventKey) => {
        events[`${eventKey}s`] = [];
        if (typedEventsByType[eventKey] !== undefined) {
          typedEventsByType[eventKey].forEach((typedEvent) => {
            if (typedEvent.event.size !== undefined) {
              const size = adomikAdapter.sizeUtils.handleSize(sizes, typedEvent.event.size);
              if (size !== null) {
                sizes = [...sizes, size];
              }
            }
            events[`${eventKey}s`] = [...events[`${eventKey}s`], typedEvent.event];
          });
        }
      });

      return {
        placementCode: typedEventsByType.placementCode,
        sizes,
        events
      };
    })
  };

  const stringBulkEvents = JSON.stringify(bulkEvents)
  logInfo('Events sent to adomik prebid analytic ' + stringBulkEvents);

  // Encode object in base64
  const encodedBuf = window.btoa(stringBulkEvents);

  // Create final url and split it in 1600 characters max (+endpoint length)
  const encodedUri = encodeURIComponent(encodedBuf);
  const splittedUrl = encodedUri.match(/.{1,1600}/g);

  splittedUrl.forEach((split, i) => {
    const partUrl = `${split}&id=${adomikAdapter.currentContext.id}&part=${i}&on=${splittedUrl.length - 1}`;
    const img = new Image(1, 1);
    img.src = 'https://' + adomikAdapter.currentContext.url + '/?q=' + partUrl;
  })
};

adomikAdapter.sendWonEvent = function (wonEvent) {
  const stringWonEvent = JSON.stringify(wonEvent)
  logInfo('Won event sent to adomik prebid analytic ' + wonEvent);

  // Encode object in base64
  const encodedBuf = window.btoa(stringWonEvent);
  const encodedUri = encodeURIComponent(encodedBuf);
  const img = new Image(1, 1);
  img.src = `https://${adomikAdapter.currentContext.url}/?q=${encodedUri}&id=${adomikAdapter.currentContext.id}&won=true`
}

adomikAdapter.buildBidResponse = function (bid) {
  return {
    bidder: bid.bidderCode.toUpperCase(),
    placementCode: bid.adUnitCode,
    id: bid.adId,
    status: (bid.statusMessage === 'Bid available') ? 'VALID' : 'EMPTY_OR_ERROR',
    cpm: parseFloat(bid.cpm),
    size: {
      width: Number(bid.width),
      height: Number(bid.height)
    },
    timeToRespond: bid.timeToRespond,
    afterTimeout: adomikAdapter.currentContext.timeouted
  };
}

adomikAdapter.sizeUtils = {
  sizeAlreadyExists: (sizes, typedEventSize) => {
    return find(sizes, (size) => size.height === typedEventSize.height && size.width === typedEventSize.width);
  },
  formatSize: (typedEventSize) => {
    return {
      width: Number(typedEventSize.width),
      height: Number(typedEventSize.height)
    };
  },
  handleSize: (sizes, typedEventSize) => {
    let formattedSize = null;
    if (adomikAdapter.sizeUtils.sizeAlreadyExists(sizes, typedEventSize) === undefined) {
      formattedSize = adomikAdapter.sizeUtils.formatSize(typedEventSize);
    }
    return formattedSize;
  }
};

adomikAdapter.buildTypedEvents = function () {
  const groupedTypedEvents = [];
  adomikAdapter.bucketEvents.forEach(function(typedEvent, i) {
    const [placementCode, type] = [typedEvent.event.placementCode, typedEvent.type];
    let existTypedEvent = findIndex(groupedTypedEvents, (groupedTypedEvent) => groupedTypedEvent.placementCode === placementCode);

    if (existTypedEvent === -1) {
      groupedTypedEvents.push({
        placementCode: placementCode,
        [type]: [typedEvent]
      });
      existTypedEvent = groupedTypedEvents.length - 1;
    }

    if (groupedTypedEvents[existTypedEvent][type]) {
      groupedTypedEvents[existTypedEvent][type] = [...groupedTypedEvents[existTypedEvent][type], typedEvent];
    } else {
      groupedTypedEvents[existTypedEvent][type] = [typedEvent];
    }
  });

  return groupedTypedEvents;
}

adomikAdapter.adapterEnableAnalytics = adomikAdapter.enableAnalytics;

adomikAdapter.enableAnalytics = function (config) {
  adomikAdapter.currentContext = {};

  const initOptions = config.options;
  if (initOptions) {
    adomikAdapter.currentContext = {
      uid: initOptions.id,
      url: initOptions.url,
      id: '',
      timeouted: false,
    }
    logInfo('Adomik Analytics enabled with config', initOptions);
    adomikAdapter.adapterEnableAnalytics(config);
  }
};

adapterManager.registerAnalyticsAdapter({
  adapter: adomikAdapter,
  code: 'adomik'
});

export default adomikAdapter;
