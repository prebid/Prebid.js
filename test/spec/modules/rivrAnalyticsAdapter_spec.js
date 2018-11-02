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
  createNewAuctionObject,
  concatAllUnits,
  trackAuctionEnd,
} from 'modules/rivrAnalyticsAdapter';
import {expect} from 'chai';
import adaptermanager from 'src/adaptermanager';
import * as ajax from 'src/ajax';
import CONSTANTS from 'src/constants.json';

const events = require('../../../src/events');

describe('RIVR Analytics adapter', () => {
  const EXPIRING_QUEUE_TIMEOUT = 4000;
  const EXPIRING_QUEUE_TIMEOUT_MOCK = 100;
  const RVR_CLIENT_ID_MOCK = 'aCliendId';
  const SITE_CATEGORIES_MOCK = ['cat1', 'cat2'];
  const EMITTED_AUCTION_ID = 1;
  const TRACKER_BASE_URL_MOCK = 'tracker.rivr.simplaex.com';
  const UUID_REG_EXP = new RegExp('[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'i');
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
        clientID: RVR_CLIENT_ID_MOCK,
        adUnits: [utils.deepClone(BANNER_AD_UNITS_MOCK)],
        siteCategories: SITE_CATEGORIES_MOCK,
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

  it('enableAnalytics - should configure host and clientID in adapter context', () => {
    // adaptermanager.enableAnalytics() is called in beforeEach. If only called here it doesn't seem to work.

    expect(analyticsAdapter.context).to.have.property('host', TRACKER_BASE_URL_MOCK);
    expect(analyticsAdapter.context).to.have.property('clientID', RVR_CLIENT_ID_MOCK);
  });

  it('enableAnalytics - should set a cookie containing a user id', () => {
    expect(UUID_REG_EXP.test(analyticsAdapter.context.userId)).to.equal(true);
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

  it('Firing AUCTION_END it sets auction time end to current time', () => {
    analyticsAdapter.context = utils.deepClone(CONTEXT_AFTER_AUCTION_INIT);

    const MILLIS_FROM_EPOCH_TO_NOW_MOCK = 477;
    timer.tick(MILLIS_FROM_EPOCH_TO_NOW_MOCK);

    events.emit(CONSTANTS.EVENTS.AUCTION_END, BID_RESPONSE_MOCK);

    const endTime = analyticsAdapter.context.auctionTimeEnd;
    expect(endTime).to.be.eql(MILLIS_FROM_EPOCH_TO_NOW_MOCK);
  });

  it('Firing AUCTION_END populates impressions array in auction object', () => {
    analyticsAdapter.context = utils.deepClone(CONTEXT_AFTER_AUCTION_INIT);

    events.emit(CONSTANTS.EVENTS.AUCTION_END, AUCTION_END_EVENT_WITH_AD_UNITS_AND_BID_RESPONSES_MOCK);

    const impressions = analyticsAdapter.context.auctionObject.impressions;
    expect(impressions.length).to.be.eql(3);
  });

  it('Firing BID_WON should set to 1 the status of the corresponding bid', () => {
    analyticsAdapter.context.auctionObject = utils.deepClone(AUCTION_OBJECT_AFTER_AUCTION_END_MOCK);

    events.emit(CONSTANTS.EVENTS.BID_WON, BID_WON_MOCK);

    expect(analyticsAdapter.context.auctionObject.bidders.length).to.be.equal(3);

    expect(analyticsAdapter.context.auctionObject.bidders[0].bids[0].status).to.be.equal(0);

    expect(analyticsAdapter.context.auctionObject.bidders[1].bids[0].status).to.be.equal(0);

    expect(analyticsAdapter.context.auctionObject.bidders[2].bids[0].status).to.be.equal(1);
    expect(analyticsAdapter.context.auctionObject.bidders[2].bids[1].status).to.be.equal(0);
  });

  it('when auction is initialized and authToken is defined and ExpiringQueue ttl expires, it sends the auction', () => {
    events.emit(CONSTANTS.EVENTS.AUCTION_INIT, {auctionId: EMITTED_AUCTION_ID, config: {}, timeout: 3000});
    analyticsAdapter.context.authToken = 'anAuthToken';

    expect(ajaxStub.notCalled).to.be.equal(true);

    timer.tick(EXPIRING_QUEUE_TIMEOUT + 500);

    expect(ajaxStub.calledOnce).to.be.equal(true);
  });

  it('when auction is initialized and authToken is defined and ExpiringQueue ttl expires, it resets auctionObject', () => {
    events.emit(CONSTANTS.EVENTS.AUCTION_INIT, {auctionId: EMITTED_AUCTION_ID, config: {}, timeout: 3000});

    analyticsAdapter.context.authToken = 'anAuthToken';
    events.emit(CONSTANTS.EVENTS.AUCTION_END, AUCTION_END_EVENT_WITH_AD_UNITS_AND_BID_RESPONSES_MOCK);

    let impressions = analyticsAdapter.context.auctionObject.impressions;

    expect(impressions.length).to.be.eql(3);

    timer.tick(EXPIRING_QUEUE_TIMEOUT + 500);

    let impressionsAfterSend = analyticsAdapter.context.auctionObject.impressions;
    let biddersAfterSend = analyticsAdapter.context.auctionObject.bidders;

    expect(impressionsAfterSend.length).to.be.eql(0);
    expect(biddersAfterSend.length).to.be.eql(0);
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
    const CLIENT_ID_MOCK = 'aClientID';
    analyticsAdapter.context = utils.deepClone(CONTEXT_AFTER_AUCTION_INIT);
    analyticsAdapter.context.authToken = 'anAuthToken';
    analyticsAdapter.context.clientID = CLIENT_ID_MOCK;
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
    expect(ajaxStub.getCall(0).args[0]).to.match(/http:\/\/tracker.rivr.simplaex.com\/aClientID\/impressions/);
    expect(payload.impressions[0].anImpressionProperty).to.be.equal(aMockString);
  });

  it('reportClickEvent() calls endpoint', () => {
    const CLIENT_ID_MOCK = 'aClientId';
    const AUTH_TOKEN_MOCK = 'aToken';
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
    analyticsAdapter.context.authToken = AUTH_TOKEN_MOCK;
    analyticsAdapter.context.clientID = CLIENT_ID_MOCK;
    analyticsAdapter.context.auctionObject.nullProperty = null;
    analyticsAdapter.context.auctionObject.notNullProperty = 'aValue';

    expect(ajaxStub.callCount).to.be.equal(0);

    reportClickEvent(EVENT_MOCK);

    const payload = JSON.parse(ajaxStub.getCall(0).args[2]);
    const options = ajaxStub.getCall(0).args[3];

    expect(ajaxStub.callCount).to.be.equal(1);
    expect(ajaxStub.getCall(0).args[0]).to.match(/http:\/\/tracker.rivr.simplaex.com\/aClientId\/clicks/);
    expect(options.customHeaders.Authorization).to.equal('Basic aToken');
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

  it('createNewAuctionObject(), it creates a new auction object', () => {
    const MILLIS_FROM_EPOCH_TO_NOW_MOCK = 123456;
    timer.tick(MILLIS_FROM_EPOCH_TO_NOW_MOCK);

    const result = createNewAuctionObject();

    expect(result.device.deviceType).to.be.equal(2);
    expect(result.publisher).to.be.equal(RVR_CLIENT_ID_MOCK);
    expect(result.device.userAgent).to.be.equal(navigator.userAgent);
    expect(result.timestamp).to.be.equal(MILLIS_FROM_EPOCH_TO_NOW_MOCK);
    expect(result.site.domain.substring(0, 9)).to.be.equal('localhost');
    expect(result.site.page).to.be.equal('/context.html');
    expect(result.site.categories).to.be.equal(SITE_CATEGORIES_MOCK);
  });

  it('concatAllUnits(), returns a flattened array with all banner and video adunits', () => {
    const allAdUnits = [BANNER_AD_UNITS_MOCK, VIDEO_AD_UNITS_MOCK];

    const result = concatAllUnits(allAdUnits);

    expect(result.length).to.be.eql(2);
    expect(result[0].code).to.be.eql('banner-container1');
    expect(result[1].code).to.be.eql('video');
  });

  it('trackAuctionEnd(), populates the bidders array from bidderRequests and bidsReceived', () => {
    trackAuctionEnd(AUCTION_END_EVENT_WITH_BID_REQUESTS_AND_BID_RESPONSES_MOCK);

    const result = analyticsAdapter.context.auctionObject.bidders;

    expect(result.length).to.be.eql(3);

    expect(result[0].id).to.be.eql('vuble');
    expect(result[0].bids[0].price).to.be.eql(0);

    expect(result[1].id).to.be.eql('vertamedia');
    expect(result[1].bids[0].price).to.be.eql(0);

    expect(result[2].id).to.be.eql('appnexus');
    expect(result[2].bids[0].price).to.be.eql(0.5);
    expect(result[2].bids[0].impId).to.be.eql('/19968336/header-bid-tag-0');
    expect(result[2].bids[1].price).to.be.eql(0.7);
    expect(result[2].bids[1].impId).to.be.eql('/19968336/header-bid-tag-1');
  });

  it('trackAuctionEnd(), populates the impressions array from adUnits', () => {
    trackAuctionEnd(AUCTION_END_EVENT_WITH_AD_UNITS_AND_BID_RESPONSES_MOCK);

    const result = analyticsAdapter.context.auctionObject.impressions;

    expect(result.length).to.be.eql(3);

    expect(result[0].id).to.be.eql('/19968336/header-bid-tag-0');
    expect(result[0].adType).to.be.eql('banner');

    expect(result[1].id).to.be.eql('/19968336/header-bid-tag-1');
    expect(result[1].adType).to.be.eql('banner');
    expect(result[1].acceptedSizes).to.be.eql([{w: 728, h: 90}, {w: 970, h: 250}]);
    expect(result[1].banner).to.be.eql({w: 300, h: 250});

    expect(result[2].id).to.be.eql('video');
    expect(result[2].adType).to.be.eql('video');
    expect(result[2].acceptedSizes).to.be.eql([{w: 640, h: 360}, {w: 640, h: 480}]);
  });

  const BANNER_AD_UNITS_MOCK = [
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

  const VIDEO_AD_UNITS_MOCK = [
    {
      code: 'video',
      mediaTypes: {
        video: {
          context: 'outstream',
          sizes: [[640, 360], [640, 480]]
        }
      },
      bids: [
        {
          bidder: 'vuble',
          params: {
            env: 'net',
            pubId: '18',
            zoneId: '12345',
            referrer: 'http://www.vuble.tv/', // optional
            floorPrice: 5.00 // optional
          }
        },
        {
          bidder: 'vertamedia',
          params: {
            aid: 331133
          }
        }
      ]
    }];

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

  const BID_WON_MOCK = {
    bidderCode: 'appnexus',
    width: 300,
    height: 600,
    statusMessage: 'Bid available',
    adId: '63301dc59deb3b',
    mediaType: 'banner',
    source: 'client',
    requestId: '63301dc59deb3b',
    cpm: 0.5,
    creativeId: 98493581,
    currency: 'USD',
    netRevenue: true,
    ttl: 300,
    appnexus: {
      buyerMemberId: 9325
    },
    ad: '...HTML CONTAINING THE AD...',
    auctionId: '1825871c-b4c2-401a-b219-64549d412495',
    responseTimestamp: 1540560447955,
    requestTimestamp: 1540560447622,
    bidder: 'appnexus',
    adUnitCode: '/19968336/header-bid-tag-0',
    timeToRespond: 333,
    pbLg: '0.50',
    pbMg: '0.50',
    pbHg: '0.50',
    pbAg: '0.50',
    pbDg: '0.50',
    pbCg: '',
    size: '300x600',
    adserverTargeting: {
      hb_bidder: 'appnexus',
      hb_adid: '63301dc59deb3b',
      hb_pb: '0.50',
      hb_size: '300x600',
      hb_source: 'client',
      hb_format: 'banner'
    },
    status: 'rendered',
    params: [
      {
        placementId: 13144370
      }
    ]
  };

  const CONTEXT_AFTER_AUCTION_INIT = {
    host: TRACKER_BASE_URL_MOCK,
    clientID: RVR_CLIENT_ID_MOCK,
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

  const AUCTION_END_EVENT_WITH_AD_UNITS_AND_BID_RESPONSES_MOCK = {
    auctionId: 'f6c1d093-14a3-4ade-bc7d-1de37e7cbdb2',
    auctionStart: 1540560217395,
    auctionEnd: 1540560217703,
    auctionStatus: 'completed',
    adUnits: [
      {
        code: '/19968336/header-bid-tag-0',
        mediaTypes: {
          banner: {
            sizes: [
              [
                300,
                250
              ],
              [
                300,
                600
              ]
            ]
          }
        },
        bids: [
          {
            bidder: 'appnexus',
            params: {
              placementId: 13144370
            },
            crumbs: {
              pubcid: '87eb6b0e-e1a8-42a9-b58d-e93a382e2d9b'
            }
          }
        ],
        transactionId: 'aee9bf8d-6d8f-425b-a42a-52c875371ebc',
        sizes: [
          [
            300,
            250
          ],
          [
            300,
            600
          ]
        ]
      },
      {
        code: '/19968336/header-bid-tag-1',
        mediaTypes: {
          banner: {
            sizes: [
              [
                728,
                90
              ],
              [
                970,
                250
              ]
            ]
          }
        },
        bids: [
          {
            bidder: 'appnexus',
            params: {
              placementId: 13144370
            },
            crumbs: {
              pubcid: '87eb6b0e-e1a8-42a9-b58d-e93a382e2d9b'
            }
          }
        ],
        transactionId: '3d5f0f89-e9cd-4714-b314-3f0fb7fcf8e3',
        sizes: [
          [
            728,
            90
          ],
          [
            970,
            250
          ]
        ]
      },
      {
        code: 'video',
        mediaTypes: {
          video: {
            context: 'outstream',
            sizes: [
              [
                640,
                360
              ],
              [
                640,
                480
              ]
            ]
          }
        },
        bids: [
          {
            bidder: 'vuble',
            params: {
              env: 'net',
              pubId: '18',
              zoneId: '12345',
              referrer: 'http: //www.vuble.tv/',
              floorPrice: 5
            },
            crumbs: {
              pubcid: '87eb6b0e-e1a8-42a9-b58d-e93a382e2d9b'
            }
          },
          {
            bidder: 'vertamedia',
            params: {
              aid: 331133
            },
            crumbs: {
              pubcid: '87eb6b0e-e1a8-42a9-b58d-e93a382e2d9b'
            }
          }
        ],
        transactionId: 'df11a105-4eef-4ceb-bbc3-a49224f7c49d'
      }
    ],
    adUnitCodes: [
      '/19968336/header-bid-tag-0',
      '/19968336/header-bid-tag-1',
      'video'
    ],
    bidderRequests: [],
    bidsReceived: [
      {
        bidderCode: 'appnexus',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        adId: '6de82e80757293',
        mediaType: 'banner',
        source: 'client',
        requestId: '6de82e80757293',
        cpm: 0.5,
        creativeId: 96846035,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        appnexus: {
          buyerMemberId: 9325
        },
        ad: '...HTML CONTAINING THE AD...',
        auctionId: 'f6c1d093-14a3-4ade-bc7d-1de37e7cbdb2',
        responseTimestamp: 1540560217636,
        requestTimestamp: 1540560217403,
        bidder: 'appnexus',
        adUnitCode: '/19968336/header-bid-tag-1',
        timeToRespond: 233,
        pbLg: '0.50',
        pbMg: '0.50',
        pbHg: '0.50',
        pbAg: '0.50',
        pbDg: '0.50',
        pbCg: '',
        size: '728x90',
        adserverTargeting: {
          hb_bidder: 'appnexus',
          hb_adid: '7e1a45d85bd57c',
          hb_pb: '0.50',
          hb_size: '728x90',
          hb_source: 'client',
          hb_format: 'banner'
        }
      }
    ],
    winningBids: [],
    timeout: 3000
  };

  const AUCTION_OBJECT_AFTER_AUCTION_END_MOCK = {
    bidders: [
      {
        id: 'vuble',
        bids: [
          {
            adomain: [
              ''
            ],
            clearPrice: 0,
            impId: 'video',
            price: 0,
            status: 0
          }
        ]
      },
      {
        id: 'vertamedia',
        bids: [
          {
            adomain: [
              ''
            ],
            clearPrice: 0,
            impId: 'video',
            price: 0,
            status: 0
          }
        ]
      },
      {
        id: 'appnexus',
        bids: [
          {
            adomain: [
              ''
            ],
            clearPrice: 0,
            impId: '/19968336/header-bid-tag-0',
            price: 0.5,
            status: 0
          },
          {
            adomain: [
              ''
            ],
            clearPrice: 0,
            impId: '/19968336/header-bid-tag-1',
            price: 0.7,
            status: 0
          }
        ]
      }
    ],
    impressions: []
  };

  const AUCTION_END_EVENT_WITH_BID_REQUESTS_AND_BID_RESPONSES_MOCK = {
    auctionId: 'f6c1d093-14a3-4ade-bc7d-1de37e7cbdb2',
    auctionStart: 1540560217395,
    auctionEnd: 1540560217703,
    auctionStatus: 'completed',
    adUnits: [],
    adUnitCodes: [
      '/19968336/header-bid-tag-0',
      '/19968336/header-bid-tag-1',
      'video'
    ],
    bidderRequests: [
      {
        bidderCode: 'vuble',
        auctionId: 'f6c1d093-14a3-4ade-bc7d-1de37e7cbdb2',
        bidderRequestId: '1bb11e055665bc',
        bids: [
          {
            bidder: 'vuble',
            crumbs: {
              pubcid: '87eb6b0e-e1a8-42a9-b58d-e93a382e2d9b'
            },
            adUnitCode: 'video',
            transactionId: 'df11a105-4eef-4ceb-bbc3-a49224f7c49d',
            bidId: '2859b890da7418',
            bidderRequestId: '1bb11e055665bc',
            auctionId: 'f6c1d093-14a3-4ade-bc7d-1de37e7cbdb2',
            src: 'client',
            bidRequestsCount: 1
          }
        ],
        auctionStart: 1540560217395,
        timeout: 3000,
        refererInfo: {
          referer: 'http: //localhost: 8080/',
          reachedTop: true,
          numIframes: 0,
          stack: [
            'http://localhost:8080/'
          ]
        },
        start: 1540560217401,
        doneCbCallCount: 0
      },
      {
        bidderCode: 'vertamedia',
        auctionId: 'f6c1d093-14a3-4ade-bc7d-1de37e7cbdb2',
        bidderRequestId: '3c2cbf7f1466cb',
        bids: [
          {
            bidder: 'vertamedia',
            params: {
              aid: 331133
            },
            crumbs: {
              pubcid: '87eb6b0e-e1a8-42a9-b58d-e93a382e2d9b'
            },
            adUnitCode: 'video',
            transactionId: 'df11a105-4eef-4ceb-bbc3-a49224f7c49d',
            bidId: '45b3ad5c2dc794',
            bidderRequestId: '3c2cbf7f1466cb',
            auctionId: 'f6c1d093-14a3-4ade-bc7d-1de37e7cbdb2',
            bidRequestsCount: 1
          }
        ],
        auctionStart: 1540560217395,
        timeout: 3000,
        start: 1540560217401
      },
      {
        bidderCode: 'appnexus',
        auctionId: 'f6c1d093-14a3-4ade-bc7d-1de37e7cbdb2',
        bidderRequestId: '5312eef4418cd7',
        bids: [
          {
            bidder: 'appnexus',
            params: {
              placementId: 13144370
            },
            crumbs: {
              pubcid: '87eb6b0e-e1a8-42a9-b58d-e93a382e2d9b'
            },
            adUnitCode: '/19968336/header-bid-tag-0',
            transactionId: 'aee9bf8d-6d8f-425b-a42a-52c875371ebc',
            bidId: '6de82e80757293',
            bidderRequestId: '5312eef4418cd7',
            auctionId: 'f6c1d093-14a3-4ade-bc7d-1de37e7cbdb2',
            src: 'client',
            bidRequestsCount: 1
          },
          {
            bidder: 'appnexus',
            params: {
              placementId: 13144370
            },
            crumbs: {
              pubcid: '87eb6b0e-e1a8-42a9-b58d-e93a382e2d9b'
            },
            adUnitCode: '/19968336/header-bid-tag-1',
            transactionId: '3d5f0f89-e9cd-4714-b314-3f0fb7fcf8e3',
            bidId: '7e1a45d85bd57c',
            bidderRequestId: '5312eef4418cd7',
            auctionId: 'f6c1d093-14a3-4ade-bc7d-1de37e7cbdb2',
            src: 'client',
            bidRequestsCount: 1
          }
        ],
        auctionStart: 1540560217395,
        timeout: 3000,
        start: 1540560217403,
        doneCbCallCount: 0
      }
    ],
    bidsReceived: [
      {
        bidderCode: 'appnexus',
        adId: '6de82e80757293',
        mediaType: 'banner',
        source: 'client',
        requestId: '6de82e80757293',
        cpm: 0.5,
        creativeId: 96846035,
        appnexus: {
          buyerMemberId: 9325
        },
        auctionId: 'f6c1d093-14a3-4ade-bc7d-1de37e7cbdb2',
        bidder: 'appnexus',
        adUnitCode: '/19968336/header-bid-tag-0',
      },
      {
        bidderCode: 'appnexus',
        adId: '7e1a45d85bd57c',
        mediaType: 'banner',
        source: 'client',
        requestId: '7e1a45d85bd57c',
        cpm: 0.7,
        creativeId: 96846035,
        appnexus: {
          buyerMemberId: 9325
        },
        auctionId: 'f6c1d093-14a3-4ade-bc7d-1de37e7cbdb2',
        bidder: 'appnexus',
        adUnitCode: '/19968336/header-bid-tag-1',
      }
    ],
    winningBids: [],
    timeout: 3000
  };
});
