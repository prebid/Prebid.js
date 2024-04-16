import * as utils from 'src/utils.js';
import analyticsAdapter from 'modules/rivrAnalyticsAdapter.js';
import {
  sendImpressions,
  handleClickEventWithClosureScope,
  createUnOptimisedParamsField,
  dataLoaderForHandler,
  pinHandlerToHTMLElement,
  setAuctionAbjectPosition,
  createNewAuctionObject,
  concatAllUnits,
  trackAuctionEnd,
  handleImpression,
  getCookie,
  storeAndReturnRivrUsrIdCookie,
  arrayDifference,
  activelyWaitForBannersToRender,
} from 'modules/rivrAnalyticsAdapter.js';
import {expect} from 'chai';
import adapterManager from 'src/adapterManager.js';
import * as ajax from 'src/ajax.js';
import { EVENTS } from 'src/constants.js';

const events = require('../../../src/events');

describe('RIVR Analytics adapter', () => {
  const EXPIRING_QUEUE_TIMEOUT = 4000;
  const EXPIRING_QUEUE_TIMEOUT_MOCK = 100;
  const RVR_CLIENT_ID_MOCK = 'aCliendId';
  const SITE_CATEGORIES_MOCK = ['cat1', 'cat2'];
  const EMITTED_AUCTION_ID = 1;
  const TRACKER_BASE_URL_MOCK = 'tracker.rivr.simplaex.com';
  const UUID_REG_EXP = new RegExp('[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'i');
  const MOCK_RIVRADDON_CONTEXT = {};
  let sandbox;
  let ajaxStub;
  let rivraddonsEnableAnalyticsStub;
  let rivraddonsTrackPbjsEventStub;
  let timer;

  before(() => {
    sandbox = sinon.sandbox.create();
    window.rivraddon = {
      analytics: {
        enableAnalytics: () => {},
        getContext: () => { return MOCK_RIVRADDON_CONTEXT; },
        trackPbjsEvent: () => {},
      }
    };
    rivraddonsEnableAnalyticsStub = sandbox.stub(window.rivraddon.analytics, 'enableAnalytics');
  });

  beforeEach(() => {
    timer = sandbox.useFakeTimers(0);
    ajaxStub = sandbox.stub(ajax, 'ajax');
    sinon.stub(events, 'getEvents').returns([]);

    adapterManager.registerAnalyticsAdapter({
      code: 'rivr',
      adapter: analyticsAdapter
    });
    adapterManager.enableAnalytics({
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
    delete window.rivraddon;
  });

  it('enableAnalytics - should call rivraddon enableAnalytics with the correct arguments', () => {
    // adapterManager.enableAnalytics() is called in beforeEach. If just called here it doesn't seem to work.
    const firstArgument = rivraddonsEnableAnalyticsStub.getCall(0).args[0];
    const secondArgument = rivraddonsEnableAnalyticsStub.getCall(0).args[1];

    expect(firstArgument.provider).to.be.equal('rivr');

    expect(secondArgument).to.have.property('utils');
    expect(secondArgument).to.have.property('ajax');
  });

  it('Firing an event when rivraddon context is not defined it should do nothing', () => {
    let rivraddonsGetContextStub = sandbox.stub(window.rivraddon.analytics, 'getContext');
    rivraddonsTrackPbjsEventStub = sandbox.stub(window.rivraddon.analytics, 'trackPbjsEvent');

    expect(rivraddonsTrackPbjsEventStub.callCount).to.be.equal(0);

    events.emit(EVENTS.AUCTION_INIT, { auctionId: EMITTED_AUCTION_ID, config: {}, timeout: 3000 });

    expect(rivraddonsTrackPbjsEventStub.callCount).to.be.equal(0);

    window.rivraddon.analytics.getContext.restore();
    window.rivraddon.analytics.trackPbjsEvent.restore();
  });

  it('Firing AUCTION_INIT should call rivraddon trackPbjsEvent passing the parameters', () => {
    rivraddonsTrackPbjsEventStub = sandbox.stub(window.rivraddon.analytics, 'trackPbjsEvent');

    expect(rivraddonsTrackPbjsEventStub.callCount).to.be.equal(0);

    events.emit(EVENTS.AUCTION_INIT, { auctionId: EMITTED_AUCTION_ID, config: {}, timeout: 3000 });

    expect(rivraddonsTrackPbjsEventStub.callCount).to.be.equal(1);

    const firstArgument = rivraddonsTrackPbjsEventStub.getCall(0).args[0];
    expect(firstArgument.eventType).to.be.equal(EVENTS.AUCTION_INIT);
    expect(firstArgument.args.auctionId).to.be.equal(EMITTED_AUCTION_ID);

    window.rivraddon.analytics.trackPbjsEvent.restore();
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
});
