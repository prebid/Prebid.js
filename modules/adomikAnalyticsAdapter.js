import adapter from '../src/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager.js';
import {logInfo} from '../src/utils.js';
import {find, findIndex} from '../src/polyfill.js';

// Events used in adomik analytics adapter.
const auctionInit = CONSTANTS.EVENTS.AUCTION_INIT;
const auctionEnd = CONSTANTS.EVENTS.AUCTION_END;
const bidRequested = CONSTANTS.EVENTS.BID_REQUESTED;
const bidResponse = CONSTANTS.EVENTS.BID_RESPONSE;
const bidWon = CONSTANTS.EVENTS.BID_WON;
const bidTimeout = CONSTANTS.EVENTS.BID_TIMEOUT;
const ua = navigator.userAgent;

var _sampled = true;

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
          adomikAdapter.saveBidResponse(args);
          break;

        case bidWon:
          args.id = args.adId;
          args.placementCode = args.adUnitCode;
          adomikAdapter.sendWonEvent(args);
          break;

        case bidRequested:
          args.bids.forEach(function(bid) {
            adomikAdapter.bucketEvents.push({
              type: 'request',
              event: {
                bidder: bid.bidder.toUpperCase(),
                placementCode: bid.adUnitCode
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

adomikAdapter.saveBidResponse = function(args) {
  let responseSaved = adomikAdapter.bucketEvents.find((bucketEvent) =>
    bucketEvent.type == 'response' && bucketEvent.event.id == args.id
  );
  if (responseSaved) { return true; }
  adomikAdapter.bucketEvents.push({
    type: 'response',
    event: adomikAdapter.buildBidResponse(args)
  });
}

adomikAdapter.maxPartLength = function () {
  return (ua.includes(' MSIE ')) ? 1600 : 60000;
};

adomikAdapter.sendTypedEvent = function() {
  let [testId, testValue] = adomikAdapter.getKeyValues();
  const groupedTypedEvents = adomikAdapter.buildTypedEvents();

  const bulkEvents = {
    testId: testId,
    testValue: testValue,
    uid: adomikAdapter.currentContext.uid,
    ahbaid: adomikAdapter.currentContext.id,
    hostname: window.location.hostname,
    sampling: adomikAdapter.currentContext.sampling,
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

  const encodedBuf = window.btoa(stringBulkEvents);

  const encodedUri = encodeURIComponent(encodedBuf);
  const maxLength = adomikAdapter.maxPartLength();
  const splittedUrl = encodedUri.match(new RegExp(`.{1,${maxLength}}`, 'g'));

  splittedUrl.forEach((split, i) => {
    const partUrl = `${split}&id=${adomikAdapter.currentContext.id}&part=${i}&on=${splittedUrl.length - 1}`;
    const img = new Image(1, 1);
    img.src = 'https://' + adomikAdapter.currentContext.url + '/?q=' + partUrl;
  })
};

adomikAdapter.sendWonEvent = function (wonEvent) {
  let [testId, testValue] = adomikAdapter.getKeyValues();
  let keyValues = { testId: testId, testValue: testValue };
  let samplingInfo = { sampling: adomikAdapter.currentContext.sampling };
  wonEvent = { ...adomikAdapter.buildBidResponse(wonEvent), ...keyValues, ...samplingInfo };

  const stringWonEvent = JSON.stringify(wonEvent);
  logInfo('Won event sent to adomik prebid analytic ' + stringWonEvent);

  const encodedBuf = window.btoa(stringWonEvent);
  const encodedUri = encodeURIComponent(encodedBuf);
  const img = new Image(1, 1);
  img.src = `https://${adomikAdapter.currentContext.url}/?q=${encodedUri}&id=${adomikAdapter.currentContext.id}&won=true`;
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

adomikAdapter.getKeyValues = function () {
  let preventTest = sessionStorage.getItem(window.location.hostname + '_NoAdomikTest')
  let inScope = sessionStorage.getItem(window.location.hostname + '_AdomikTestInScope')
  let keyValues = JSON.parse(sessionStorage.getItem(window.location.hostname + '_AdomikTest'))
  let testId;
  let testValue;
  if (typeof (keyValues) === 'object' && keyValues != undefined && !preventTest && inScope) {
    testId = keyValues.testId
    testValue = keyValues.testOptionLabel
  }
  return [testId, testValue]
}

adomikAdapter.enable = function(options) {
  adomikAdapter.currentContext = {
    uid: options.id,
    url: options.url,
    id: '',
    timeouted: false,
    sampling: options.sampling
  }
  logInfo('Adomik Analytics enabled with config', options);
  adomikAdapter.adapterEnableAnalytics(options);
};

adomikAdapter.checkOptions = function(options) {
  if (typeof options !== 'undefined') {
    if (options.id && options.url) { adomikAdapter.enable(options); } else { logInfo('Adomik Analytics disabled because id and/or url is missing from config', options); }
  } else { logInfo('Adomik Analytics disabled because config is missing'); }
};

adomikAdapter.checkSampling = function(options) {
  _sampled = typeof options === 'undefined' ||
  typeof options.sampling === 'undefined' ||
  (options.sampling > 0 && Math.random() < parseFloat(options.sampling));
  if (_sampled) { adomikAdapter.checkOptions(options) } else { logInfo('Adomik Analytics ignored for sampling', options.sampling); }
};

adomikAdapter.adapterEnableAnalytics = adomikAdapter.enableAnalytics;

adomikAdapter.enableAnalytics = function ({ provider, options }) {
  logInfo('Adomik Analytics enableAnalytics', provider);
  adomikAdapter.checkSampling(options);
};

adapterManager.registerAnalyticsAdapter({
  adapter: adomikAdapter,
  code: 'adomik'
});

export default adomikAdapter;
