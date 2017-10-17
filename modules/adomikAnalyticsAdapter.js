import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import adaptermanager from 'src/adaptermanager';
// import utils from 'src/utils';

// Events used in adomik analytics adapter
const auctionInit = CONSTANTS.EVENTS.AUCTION_INIT;
const auctionEnd = CONSTANTS.EVENTS.AUCTION_END;
const bidRequested = CONSTANTS.EVENTS.BID_REQUESTED;
const bidResponse = CONSTANTS.EVENTS.BID_RESPONSE;
const bidWon = CONSTANTS.EVENTS.BID_WON;
const bidTimeout = CONSTANTS.EVENTS.BID_TIMEOUT;

let bidwonTimeout = 1000;

let adomikAdapter = Object.assign(adapter({}),
  {
    // Track every event needed
    track({ eventType, args }) {
      switch (eventType) {
        case auctionInit:
          adomikAdapter.currentContext.id = args.requestId
          adomikAdapter.currentContext.timeout = args.timeout
          if (args.config.bidwonTimeout !== undefined && typeof args.config.bidwonTimeout === 'number') {
            bidwonTimeout = args.config.bidwonTimeout;
          }
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
          adomikAdapter.bucketEvents.push({
            type: 'winner',
            event: {
              id: args.adId,
              placementCode: args.adUnitCode
            }
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
          setTimeout(() => {
            if (adomikAdapter.bucketEvents.length > 0) {
              adomikAdapter.sendTypedEvent();
            }
          }, bidwonTimeout);
          break;
      }
    }
  }
);

adomikAdapter.sendTypedEvent = function() {
  const groupedTypedEvents = adomikAdapter.buildTypedEvents();

  const bulkEvents = {
    uid: adomikAdapter.currentContext.uid,
    ahbaid: adomikAdapter.currentContext.id,
    timeout: adomikAdapter.currentContext.timeout,
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

  // Encode object in base64
  const encodedBuf = window.btoa(JSON.stringify(bulkEvents));

  // Create final url and split it in 1600 characters max (+endpoint length)
  const encodedUri = encodeURIComponent(encodedBuf);
  const splittedUrl = encodedUri.match(/.{1,1600}/g);

  splittedUrl.forEach((split, i) => {
    const partUrl = `${split}&id=${adomikAdapter.currentContext.id}&part=${i}&on=${splittedUrl.length - 1}`;
    const img = new Image(1, 1);
    img.src = 'https://' + adomikAdapter.currentContext.url + '/?q=' + partUrl;
  })
};

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
    return sizes.find((size) => size.height === typedEventSize.height && size.width === typedEventSize.width);
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
    let existTypedEvent = groupedTypedEvents.findIndex((groupedTypedEvent) => groupedTypedEvent.placementCode === placementCode);

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

// Initialize adomik object
adomikAdapter.currentContext = {};
adomikAdapter.bucketEvents = [];

adomikAdapter.adapterEnableAnalytics = adomikAdapter.enableAnalytics;

adomikAdapter.enableAnalytics = function (config) {
  const initOptions = config.options;
  if (initOptions) {
    adomikAdapter.currentContext = {
      uid: initOptions.id,
      url: initOptions.url,
      debug: initOptions.debug,
      id: '',
      timeouted: false,
      timeout: 0,
    }
    adomikAdapter.adapterEnableAnalytics(config);
  }
};

adaptermanager.registerAnalyticsAdapter({
  adapter: adomikAdapter,
  code: 'adomik'
});

export default adomikAdapter;
