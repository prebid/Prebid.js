import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import adaptermanager from 'src/adaptermanager';

// Events used in adomik analytics adapter
const auctionInit = CONSTANTS.EVENTS.AUCTION_INIT;
const auctionEnd = CONSTANTS.EVENTS.AUCTION_END;
const bidRequested = CONSTANTS.EVENTS.BID_REQUESTED;
const bidResponse = CONSTANTS.EVENTS.BID_RESPONSE;
const bidWon = CONSTANTS.EVENTS.BID_WON;
const bidTimeout = CONSTANTS.EVENTS.BID_TIMEOUT;

// Initialize adomik object
let currentContext = {
  uid: '',
  id: '',
  timeouted: false,
  url: '',
  timeout: 0
};

function buildBidResponse(bid) {
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
    afterTimeout: currentContext.timeouted
  };
}

const sizeUtils = {
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
    if (sizeUtils.sizeAlreadyExists(sizes, typedEventSize) === undefined) {
      formattedSize = sizeUtils.formatSize(typedEventSize);
    }
    return formattedSize;
  }
};

const bucketEvents = [];

function buildTypedEvents() {
  const groupedTypedEvents = [];
  bucketEvents.forEach(function(typedEvent, i) {
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

function sendTypedEvent() {
  const groupedTypedEvents = buildTypedEvents();

  const bulkEvents = {
    uid: currentContext.uid,
    ahbaid: currentContext.id,
    timeout: currentContext.timeout,
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
              const size = sizeUtils.handleSize(sizes, typedEvent.event.size);
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
    const partUrl = `${split}&id=${currentContext.id}&part=${i}&on=${splittedUrl.length - 1}`;
    const img = new Image(1, 1);
    img.src = 'http://' + currentContext.url + '/?q=' + partUrl;
  })
};

let bidwonTimeout = 1000;

let adomikAdapter = Object.assign(adapter({}),
  {
    // Track every event needed
    track({ eventType, args }) {
      switch (eventType) {
        case auctionInit:
          currentContext = {
            uid: args.config.id,
            id: args.requestId,
            url: args.config.url,
            timeouted: false,
            timeout: args.timeout
          };
          if (args.config.bidwonTimeout !== undefined && typeof args.config.bidwonTimeout === 'number') {
            bidwonTimeout = args.config.bidwonTimeout;
          }
          break;

        case bidTimeout:
          currentContext.timeouted = true;
          break;

        case bidResponse:
          bucketEvents.push({
            type: 'response',
            event: buildBidResponse(args)
          });
          break;

        case bidWon:
          bucketEvents.push({
            type: 'winner',
            event: {
              id: args.adId,
              placementCode: args.adUnitCode
            }
          });
          break;

        case bidRequested:
          args.bids.forEach(function(bid) {
            bucketEvents.push({
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
            if (bucketEvents.length > 0) {
              sendTypedEvent();
            }
          }, bidwonTimeout);
          break;
      }
    }
  }
);

adaptermanager.registerAnalyticsAdapter({
  adapter: adomikAdapter,
  code: 'adomik'
});

export default adomikAdapter;
