import * as utils from 'src/utils';
import analyticsAdapter from 'modules/rivrAnalyticsAdapter';
import {
  ExpiringQueue,
  sendAuction,
  sendImpressions,
  reportClickEvent,
  createUnOptimisedParamsField,
  dataLoaderForHandler,
  pinHandlerToHTMLElement,
  setAuctionAbjectPosition,
} from 'modules/rivrAnalyticsAdapter';
import {expect} from 'chai';
import adaptermanager from 'src/adaptermanager';
import * as ajax from 'src/ajax';
import CONSTANTS from 'src/constants.json';

const events = require('../../../src/events');

describe('RIVR Analytics adapter', () => {
  const EXPIRING_QUEUE_TIMEOUT = 4000;
  const EXPIRING_QUEUE_TIMEOUT_MOCK = 100;
  const PUBLISHER_ID_MOCK = 777;
  const EMITTED_AUCTION_ID = 1;
  const TRACKER_BASE_URL_MOCK = 'tracker.rivr.simplaex.com';
  let sandbox;
  let ajaxStub;
  let timer;

  before(() => {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(() => {
    timer = sandbox.useFakeTimers(0);
    ajaxStub = sandbox.stub(ajax, 'ajax');
    sinon.stub(events, 'getEvents').returns([]);

    adaptermanager.registerAnalyticsAdapter({
      code: 'rivr',
      adapter: analyticsAdapter
    });
    adaptermanager.enableAnalytics({
      provider: 'rivr',
      options: {
        pubId: PUBLISHER_ID_MOCK,
        adUnits: [utils.deepClone(AD_UNITS_MOCK)]
      }
    });
  });

  afterEach(() => {
    analyticsAdapter.disableAnalytics();
    events.getEvents.restore();
    ajaxStub.restore();
    timer.restore();
  });

  after(() => {
    sandbox.restore();
  });

  it('ExpiringQueue should call sendImpression callback after expiring queue timeout is elapsed', (done) => {
    const sendImpressionMock = () => {
      let elements = queue.popAll();
      expect(elements).to.be.eql([1, 2, 3, 4]);
      elements = queue.popAll();
      expect(elements).to.have.lengthOf(0);
      expect(Date.now()).to.be.equal(200);
      done();
    };
    const sendAuctionMock = () => {};

    let queue = new ExpiringQueue(
      sendImpressionMock,
      sendAuctionMock,
      EXPIRING_QUEUE_TIMEOUT_MOCK);

    queue.push(1);

    setTimeout(() => {
      queue.push([2, 3]);
      timer.tick(50);
    }, 50);
    setTimeout(() => {
      queue.push([4]);
      timer.tick(100);
    }, 100);
    timer.tick(50);
  });

  it('enableAnalytics - should configure host and pubId in adapter context', () => {
    // adaptermanager.enableAnalytics() is called in beforeEach. If only called here it doesn't seem to work.

    expect(analyticsAdapter.context).to.have.property('host', TRACKER_BASE_URL_MOCK);
    expect(analyticsAdapter.context).to.have.property('pubId', PUBLISHER_ID_MOCK);
  });

  it('Firing AUCTION_INIT should set auction id of context when AUCTION_INIT event is fired', () => {
    events.emit(CONSTANTS.EVENTS.AUCTION_INIT, {auctionId: EMITTED_AUCTION_ID, config: {}, timeout: 3000});
    const auctionId = analyticsAdapter.context.auctionObject.id;
    expect(auctionId).to.be.eql(EMITTED_AUCTION_ID);
  });

  it('Firing AUCTION_INIT when rivr_should_optimise and rivr_model_version are in local storage, sets ext.rivr.optimiser and modelVersion of in auction context', () => {
    const RIVR_SHOULD_OPTIMISE_VALUE_MOCK = 'optimise';
    const RIVR_MODEL_VERSION_VALUE_MOCK = 'some model version';

    localStorage.setItem('rivr_should_optimise', RIVR_SHOULD_OPTIMISE_VALUE_MOCK);
    localStorage.setItem('rivr_model_version', RIVR_MODEL_VERSION_VALUE_MOCK);

    events.emit(CONSTANTS.EVENTS.AUCTION_INIT, {auctionId: 2, config: {}, timeout: 3000});

    let auctionObject2 = analyticsAdapter.context.auctionObject;

    expect(auctionObject2['ext.rivr.optimiser']).to.be.eql(RIVR_SHOULD_OPTIMISE_VALUE_MOCK);
    expect(auctionObject2['modelVersion']).to.be.eql(RIVR_MODEL_VERSION_VALUE_MOCK);

    localStorage.removeItem('rivr_should_optimise');
    localStorage.removeItem('rivr_model_version');
  });

  it('Firing AUCTION_INIT , when auction object is already there and rivr_config_string is not in local storage, it does not save unoptimized params in rivr original values', () => {
    events.emit(CONSTANTS.EVENTS.AUCTION_INIT, {auctionId: 3, config: {}, timeout: 3000});

    expect(analyticsAdapter.context.auctionObject['ext.rivr.originalvalues']).to.be.eql([]);
  });

  it('Firing AUCTION_INIT when rivr_should_optimise and rivr_model_version are NOT in local storage, does not set ext.rivr.optimiser and modelVersion of in auction context', () => {
    localStorage.removeItem('rivr_should_optimise');
    localStorage.removeItem('rivr_model_version');

    events.emit(CONSTANTS.EVENTS.AUCTION_INIT, {auctionId: 3, config: {}, timeout: 3000});

    let auctionObject3 = analyticsAdapter.context.auctionObject;

    expect(auctionObject3['ext.rivr.optimiser']).to.be.eql('unoptimised');
    expect(auctionObject3['modelVersion']).to.be.eql(null);
  });

  it('Firing BID_REQUESTED it sets app and site publisher id in auction object', () => {
    analyticsAdapter.context = utils.deepClone(CONTEXT_AFTER_AUCTION_INIT);

    events.emit(CONSTANTS.EVENTS.BID_REQUESTED, REQUEST);

    const sitePubcid = analyticsAdapter.context.auctionObject.site.publisher.id;
    const appPubcid = analyticsAdapter.context.auctionObject.app.publisher.id;
    expect(sitePubcid).to.be.eql(PUBLISHER_ID_MOCK);
    expect(appPubcid).to.be.eql(PUBLISHER_ID_MOCK);
  });

  it('Firing BID_REQUESTED it adds bid request in bid requests array', () => {
    analyticsAdapter.context = utils.deepClone(CONTEXT_AFTER_AUCTION_INIT);

    events.emit(CONSTANTS.EVENTS.BID_REQUESTED, REQUEST);

    const requestEvent = analyticsAdapter.context.auctionObject.bidRequests;
    expect(requestEvent).to.have.length(1);
    expect(requestEvent[0]).to.be.eql({
      bidderCode: 'adapter',
      auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
      bidderRequestId: '1a6fc81528d0f6',
      bids: [{
        bidder: 'adapter',
        params: {},
        adUnitCode: 'container-1',
        transactionId: 'de90df62-7fd0-4fbc-8787-92d133a7dc06',
        sizes: [[300, 250]],
        bidId: '208750227436c1',
        bidderRequestId: '1a6fc81528d0f6',
        auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f'
      }],
      auctionStart: 1509369418387,
      timeout: 3000,
      start: 1509369418389
    });
  });

  it('Firing BID_RESPONSE it inserts bid response object in auctionObject', () => {
    analyticsAdapter.context = utils.deepClone(CONTEXT_AFTER_AUCTION_INIT);

    events.emit(CONSTANTS.EVENTS.BID_RESPONSE, BID_RESPONSE_MOCK);
    const bidResponses = analyticsAdapter.context.auctionObject.bidResponses;

    expect(bidResponses).to.have.length(1);
    expect(bidResponses[0]).to.be.eql({
      timestamp: 1509369418832,
      status: 1,
      'total_duration': 443,
      bidderId: null,
      'bidder_name': 'adapter',
      cur: 'EU',
      seatbid: [
        {
          seat: null,
          bid: [
            {
              status: 2,
              'clear_price': 0.015,
              attr: [],
              crid: 999,
              cid: null,
              id: null,
              adid: '208750227436c1',
              adomain: [],
              iurl: null
            }
          ]
        }
      ]
    });
  });

  it('Firing AUCTION_END it sets auction time end to current time', () => {
    analyticsAdapter.context = utils.deepClone(CONTEXT_AFTER_AUCTION_INIT);

    const MILLIS_FROM_EPOCH_TO_NOW_MOCK = 477;
    timer.tick(MILLIS_FROM_EPOCH_TO_NOW_MOCK);

    events.emit(CONSTANTS.EVENTS.AUCTION_END, BID_RESPONSE_MOCK);

    const endTime = analyticsAdapter.context.auctionTimeEnd;
    expect(endTime).to.be.eql(MILLIS_FROM_EPOCH_TO_NOW_MOCK);
  });

  it('Firing AUCTION_END when there are unresponded bid requests should insert then to bidResponses in auctionObject with null duration', () => {
    analyticsAdapter.context = utils.deepClone(CONTEXT_AFTER_AUCTION_INIT);

    events.emit(CONSTANTS.EVENTS.BID_REQUESTED, REQUEST2);
    events.emit(CONSTANTS.EVENTS.BID_REQUESTED, REQUEST3);
    events.emit(CONSTANTS.EVENTS.AUCTION_END, BID_RESPONSE_MOCK);

    const responses = analyticsAdapter.context.auctionObject.bidResponses;
    expect(responses.length).to.be.eql(2);
    expect(responses[0].total_duration).to.be.eql(null);
    expect(responses[1].total_duration).to.be.eql(null);
  });

  it('Firing BID_WON when it happens after BID_RESPONSE should add won event as auction impression to imp array', () => {
    analyticsAdapter.context = utils.deepClone(CONTEXT_AFTER_AUCTION_INIT);

    events.emit(CONSTANTS.EVENTS.BID_RESPONSE, BID_RESPONSE_MOCK);
    events.emit(CONSTANTS.EVENTS.BID_WON, BID_RESPONSE_MOCK);

    const wonEvent = analyticsAdapter.context.auctionObject.imp;

    expect(wonEvent.length).to.be.eql(1);
    expect(wonEvent[0]).to.be.eql({
      tagid: 'container-1',
      displaymanager: null,
      displaymanagerver: null,
      secure: null,
      bidfloor: null,
      banner: {
        w: 300,
        h: 250,
        pos: null,
        expandable: [],
        api: []
      }
    });
  });

  it('Firing BID_WON when it happens after BID_RESPONSE should change the status of winning bidResponse to 1', () => {
    const BID_STATUS_WON = 1;
    analyticsAdapter.context = utils.deepClone(CONTEXT_AFTER_AUCTION_INIT);

    events.emit(CONSTANTS.EVENTS.BID_RESPONSE, BID_RESPONSE_MOCK);
    events.emit(CONSTANTS.EVENTS.BID_WON, BID_RESPONSE_MOCK);

    const responseWhichIsWonAlso = analyticsAdapter.context.auctionObject.bidResponses[0];

    expect(responseWhichIsWonAlso.seatbid[0].bid[0].status).to.be.eql(BID_STATUS_WON);
  });

  it('when auction is initialized and authToken is defined and ExpiringQueue ttl expires, it sends the auction', () => {
    events.emit(CONSTANTS.EVENTS.AUCTION_INIT, {auctionId: EMITTED_AUCTION_ID, config: {}, timeout: 3000});
    analyticsAdapter.context.authToken = 'anAuthToken';

    expect(ajaxStub.notCalled).to.be.equal(true);

    timer.tick(EXPIRING_QUEUE_TIMEOUT + 500);

    expect(ajaxStub.calledOnce).to.be.equal(true);
  });

  it('when auction is initialized and authToken is defined and ExpiringQueue ttl expires, it clears imp, bidResponses and bidRequests', () => {
    events.emit(CONSTANTS.EVENTS.AUCTION_INIT, {auctionId: EMITTED_AUCTION_ID, config: {}, timeout: 3000});

    analyticsAdapter.context.authToken = 'anAuthToken';
    events.emit(CONSTANTS.EVENTS.BID_REQUESTED, REQUEST);
    events.emit(CONSTANTS.EVENTS.BID_RESPONSE, BID_RESPONSE_MOCK);
    events.emit(CONSTANTS.EVENTS.BID_WON, BID_RESPONSE_MOCK);

    let impressions = analyticsAdapter.context.auctionObject.imp;
    let responses = analyticsAdapter.context.auctionObject.bidResponses;
    let requests = analyticsAdapter.context.auctionObject.bidRequests;

    expect(impressions.length).to.be.eql(1);
    expect(responses.length).to.be.eql(1);
    expect(requests.length).to.be.eql(1);

    timer.tick(EXPIRING_QUEUE_TIMEOUT + 500);

    let impressionsAfterSend = analyticsAdapter.context.auctionObject.imp;
    let responsesAfterSend = analyticsAdapter.context.auctionObject.bidResponses;
    let requestsAfterSend = analyticsAdapter.context.auctionObject.bidRequests;

    expect(impressionsAfterSend.length).to.be.eql(0);
    expect(responsesAfterSend.length).to.be.eql(0);
    expect(requestsAfterSend.length).to.be.eql(0);
  });

  it('sendAuction(), when authToken is defined, it fires call clearing empty payload properties', () => {
    analyticsAdapter.context = utils.deepClone(CONTEXT_AFTER_AUCTION_INIT);
    analyticsAdapter.context.authToken = 'anAuthToken';
    analyticsAdapter.context.auctionObject.nullProperty = null;
    analyticsAdapter.context.auctionObject.notNullProperty = 'aValue';

    sendAuction();

    expect(ajaxStub.getCall(0).args[0]).to.match(/http:\/\/tracker.rivr.simplaex.com\/(\w+)\/auctions/);

    const payload = JSON.parse(ajaxStub.getCall(0).args[2]);

    expect(payload.Auction.notNullProperty).to.be.equal('aValue');
    expect(payload.nullProperty).to.be.equal(undefined);

    analyticsAdapter.context.authToken = undefined;
  });

  it('sendAuction(), when authToken is not defined, it does not fire call', () => {
    analyticsAdapter.context = utils.deepClone(CONTEXT_AFTER_AUCTION_INIT);
    analyticsAdapter.context.authToken = undefined;
    analyticsAdapter.context.auctionObject.nullProperty = null;
    analyticsAdapter.context.auctionObject.notNullProperty = 'aValue';

    expect(ajaxStub.callCount).to.be.equal(0);

    sendAuction();

    expect(ajaxStub.callCount).to.be.equal(0);
  });

  it('sendImpressions(), when authToken is not defined, it does not fire call', () => {
    analyticsAdapter.context = utils.deepClone(CONTEXT_AFTER_AUCTION_INIT);
    analyticsAdapter.context.authToken = undefined;
    analyticsAdapter.context.auctionObject.nullProperty = null;
    analyticsAdapter.context.auctionObject.notNullProperty = 'aValue';

    expect(ajaxStub.callCount).to.be.equal(0);

    sendImpressions();

    expect(ajaxStub.callCount).to.be.equal(0);
  });

  it('sendImpressions(), when authToken is defined and there are impressions, it sends impressions to the tracker', () => {
    const aMockString = 'anImpressionPropertyValue';
    const IMPRESSION_MOCK = { anImpressionProperty: aMockString };
    analyticsAdapter.context = utils.deepClone(CONTEXT_AFTER_AUCTION_INIT);
    analyticsAdapter.context.authToken = 'anAuthToken';
    analyticsAdapter.context.queue = new ExpiringQueue(
      () => {},
      () => {},
      EXPIRING_QUEUE_TIMEOUT_MOCK
    );

    analyticsAdapter.context.queue.push(IMPRESSION_MOCK);

    expect(ajaxStub.callCount).to.be.equal(0);

    sendImpressions();

    const payload = JSON.parse(ajaxStub.getCall(0).args[2]);

    expect(ajaxStub.callCount).to.be.equal(1);
    expect(payload.impressions.length).to.be.equal(1);
    expect(ajaxStub.getCall(0).args[0]).to.match(/http:\/\/tracker.rivr.simplaex.com\/impressions/);
    expect(payload.impressions[0].anImpressionProperty).to.be.equal(aMockString);
  });

  it('reportClickEvent(), when authToken is not defined, it calls endpoint', () => {
    const CLIENT_ID_MOCK = 'aClientId';
    const CLICK_URL_MOCK = 'clickURLMock';
    const EVENT_MOCK = {
      currentTarget: {
        getElementsByTagName: () => {
          return [
            {
              getAttribute: (attributeName) => {
                return CLICK_URL_MOCK;
              }
            }
          ]
        }
      }
    };
    analyticsAdapter.context = utils.deepClone(CONTEXT_AFTER_AUCTION_INIT);
    analyticsAdapter.context.authToken = undefined;
    analyticsAdapter.context.clientID = CLIENT_ID_MOCK;
    analyticsAdapter.context.auctionObject.nullProperty = null;
    analyticsAdapter.context.auctionObject.notNullProperty = 'aValue';

    expect(ajaxStub.callCount).to.be.equal(0);

    reportClickEvent(EVENT_MOCK);

    const payload = JSON.parse(ajaxStub.getCall(0).args[2]);

    expect(ajaxStub.callCount).to.be.equal(1);
    expect(ajaxStub.getCall(0).args[0]).to.match(/http:\/\/tracker.rivr.simplaex.com\/aClientId\/clicks/);
    expect(payload.timestamp).to.be.equal('1970-01-01T00:00:00.000Z');
    expect(payload.request_id).to.be.a('string');
    expect(payload.click_url).to.be.equal(CLICK_URL_MOCK);
  });

  it('createUnOptimisedParamsField(), creates object with unoptimized properties', () => {
    const CONFIG_FOR_BIDDER_MOCK = {
      floorPriceLabel: 'floorPriceLabelForTestBidder',
      currencyLabel: 'currencyLabelForTestBidder',
      pmpLabel: 'pmpLabelForTestBidder',
    };
    const BID_MOCK = {
      bidder: 'aBidder',
      params: {
        floorPriceLabelForTestBidder: 'theOriginalBidFloor',
        currencyLabelForTestBidder: 'theOriginalCurrency',
        pmpLabelForTestBidder: 'theOriginalPmp',
      },
    };

    const result = createUnOptimisedParamsField(BID_MOCK, CONFIG_FOR_BIDDER_MOCK);

    expect(result['ext.rivr.demand_source_original']).to.be.equal('aBidder');
    expect(result['ext.rivr.bidfloor_original']).to.be.equal('theOriginalBidFloor');
    expect(result['ext.rivr.currency_original']).to.be.equal('theOriginalCurrency');
    expect(result['ext.rivr.pmp_original']).to.be.equal('theOriginalPmp');
  });

  it('dataLoaderForHandler(), when iframe and the ad image contained in it are there, it calls the specialized handler', () => {
    const MOCK_ELEMENT = {
      getElementsByTagName: () => {
        return [
          {
            contentDocument: {
              getElementsByTagName: () => {
                return ['displayedImpressionMock']
              }
            },
            aDummyProperty: 'aDummyPropertyValue'
          }
        ]
      }
    };

    var specializedHandlerSpy = sinon.spy();

    expect(specializedHandlerSpy.callCount).to.be.equal(0);

    dataLoaderForHandler(MOCK_ELEMENT, specializedHandlerSpy);

    expect(specializedHandlerSpy.callCount).to.be.equal(1);
    expect(specializedHandlerSpy.firstCall.args[0].aDummyProperty).to.be.equal('aDummyPropertyValue');
    expect(specializedHandlerSpy.firstCall.args[0].contentDocument.getElementsByTagName()[0]).to.be.equal('displayedImpressionMock');
  });

  it('dataLoaderForHandler(), when iframe is not there, it requests animation frame', () => {
    const MOCK_ELEMENT = {
      getElementsByTagName: () => {
        return [
          {
            contentDocument: {
              getElementsByTagName: () => {
                return []
              }
            },
          }
        ]
      }
    };

    const specializedHandlerSpy = sinon.spy();
    const requestAnimationFrameStub = sinon.stub(window, 'requestAnimationFrame');
    expect(requestAnimationFrameStub.callCount).to.be.equal(0);

    dataLoaderForHandler(MOCK_ELEMENT, specializedHandlerSpy);

    expect(requestAnimationFrameStub.callCount).to.be.equal(1);

    requestAnimationFrameStub.restore();
  });

  it('pinHandlerToHTMLElement(), when element is there, it calls dataLoaderForHandler', () => {
    const ELEMENT_MOCK = {
      anElementProperty: 'aValue'
    }
    const dataLoaderForHandlerSpy = sinon.spy();
    sinon.stub(window, 'requestAnimationFrame');

    sinon.stub(document, 'getElementById').returns(ELEMENT_MOCK);

    expect(dataLoaderForHandlerSpy.callCount).to.be.equal(0);

    pinHandlerToHTMLElement('', dataLoaderForHandlerSpy, () => {});

    expect(dataLoaderForHandlerSpy.callCount).to.be.equal(1);
    expect(dataLoaderForHandlerSpy.firstCall.args[0].anElementProperty).to.be.equal('aValue');

    window.requestAnimationFrame.restore();
    document.getElementById.restore();
  });

  it('pinHandlerToHTMLElement(), when element is not there, it requests animation frame', () => {
    const dataLoaderForHandlerSpy = sinon.spy();
    const requestAnimationFrameStub = sinon.stub(window, 'requestAnimationFrame');

    sinon.stub(document, 'getElementById').returns(undefined);

    expect(requestAnimationFrameStub.callCount).to.be.equal(0);

    pinHandlerToHTMLElement('', dataLoaderForHandlerSpy, () => {});

    expect(dataLoaderForHandlerSpy.callCount).to.be.equal(0);
    expect(requestAnimationFrameStub.callCount).to.be.equal(1);

    requestAnimationFrameStub.restore();
    document.getElementById.restore();
  });

  it('setAuctionAbjectPosition(), it sets latitude and longitude in auction object', () => {
    const POSITION_MOCK = {
      coords: {
        latitude: 'aLatitude',
        longitude: 'aLongitude',
      }
    }
    analyticsAdapter.context = utils.deepClone(CONTEXT_AFTER_AUCTION_INIT);

    setAuctionAbjectPosition(POSITION_MOCK);

    expect(analyticsAdapter.context.auctionObject.device.geo.lat).to.be.equal('aLatitude');
  });

  const AD_UNITS_MOCK = [
    {
      code: 'banner-container1',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 200], [300, 600]]
        }
      },
      bids: [
        {
          bidder: 'appnexus',
          params: {
            placementId: '10433394',
            reserve: 0.5
          }
        },
        {
          bidder: 'huddledmasses',
          params: {
            placement_id: 0
          }
        },
      ]
    }
  ];

  const REQUEST = {
    bidderCode: 'adapter',
    auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
    bidderRequestId: '1a6fc81528d0f6',
    bids: [{
      bidder: 'adapter',
      params: {},
      adUnitCode: 'container-1',
      transactionId: 'de90df62-7fd0-4fbc-8787-92d133a7dc06',
      sizes: [[300, 250]],
      bidId: '208750227436c1',
      bidderRequestId: '1a6fc81528d0f6',
      auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f'
    }],
    auctionStart: 1509369418387,
    timeout: 3000,
    start: 1509369418389
  };

  const REQUEST2 = {
    bidderCode: 'adapter',
    auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
    bidderRequestId: '1a6fc81528d0f6',
    bids: [{
      bidder: 'adapter',
      params: {},
      adUnitCode: 'container-1',
      transactionId: 'de90df62-7fd0-4fbc-8787-92d133a7dc06',
      sizes: [[300, 250]],
      bidId: 'request2id',
      bidderRequestId: '1a6fc81528d0f6',
      auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f'
    }],
    auctionStart: 1509369418387,
    timeout: 3000,
    start: 1509369418389
  };

  const REQUEST3 = {
    bidderCode: 'adapter',
    auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
    bidderRequestId: '1a6fc81528d0f6',
    bids: [{
      bidder: 'adapter',
      params: {},
      adUnitCode: 'container-1',
      transactionId: 'de90df62-7fd0-4fbc-8787-92d133a7dc06',
      sizes: [[300, 250]],
      bidId: 'request3id',
      bidderRequestId: '1a6fc81528d0f6',
      auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f'
    }],
    auctionStart: 1509369418387,
    timeout: 3000,
    start: 1509369418389
  };

  const BID_RESPONSE_MOCK = {
    bidderCode: 'adapter',
    width: 300,
    height: 250,
    statusMessage: 'Bid available',
    getStatusCode: () => 1,
    adId: '208750227436c1',
    mediaType: 'banner',
    cpm: 0.015,
    creativeId: 999,
    ad: '<!-- tag goes here -->',
    auctionId: '5018eb39-f900-4370-b71e-3bb5b48d324f',
    responseTimestamp: 1509369418832,
    requestTimestamp: 1509369418389,
    bidder: 'adapter',
    adUnitCode: 'container-1',
    timeToRespond: 443,
    currency: 'EU',
    size: '300x250'
  };

  const CONTEXT_AFTER_AUCTION_INIT = {
    host: TRACKER_BASE_URL_MOCK,
    pubId: PUBLISHER_ID_MOCK,
    queue: {
      mockProp: 'mockValue'
    },
    auctionObject: {
      id: null,
      timestamp: null,
      at: null,
      bcat: [],
      imp: [],
      app: {
        id: null,
        name: null,
        domain: window.location.href,
        bundle: null,
        cat: [],
        publisher: {
          id: null,
          name: null
        }
      },
      site: {
        id: null,
        name: null,
        domain: window.location.href,
        cat: [],
        publisher: {
          id: null,
          name: null
        }
      },
      device: {
        geo: {}
      },
      user: {
        id: null,
        yob: null,
        gender: null,
      },
      bidResponses: [],
      bidRequests: [],
      'ext.rivr.optimiser': 'unoptimised',
      modelVersion: null,
      'ext.rivr.originalvalues': []
    }
  };
});
