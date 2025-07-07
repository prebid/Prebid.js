import liAnalytics from 'modules/liveIntentAnalyticsAdapter';
import { expect } from 'chai';
import { server } from 'test/mocks/xhr.js';
import { auctionManager } from 'src/auctionManager.js';
import { EVENTS } from 'src/constants.js';
import { config } from 'src/config.js';
import { BID_WON_EVENT, AUCTION_INIT_EVENT, BID_WON_EVENT_UNDEFINED, AUCTION_INIT_EVENT_NOT_LI } from '../../fixtures/liveIntentAuctionEvents';

let utils = require('src/utils');
let refererDetection = require('src/refererDetection');
let instanceId = '77abbc81-c1f1-41cd-8f25-f7149244c800';
let url = 'https://www.test.com'
let sandbox;
let clock;
let now = new Date();

let events = require('src/events');

const USERID_CONFIG = [
  {
    'name': 'liveIntentId',
    'params': {
      'liCollectConfig': {
        'appId': 'a123'
      }
    }
  }
];

const configWithSamplingAll = {
  provider: 'liveintent',
  options: {
    sampling: 1,
    sendAuctionInitEvents: true
  }
}

const configWithSamplingNone = {
  provider: 'liveintent',
  options: {
    sampling: 0,
    sendAuctionInitEvents: true
  }
}

const configWithNoAuctionInit = {
  provider: 'liveintent',
  options: {
    sampling: 1,
    sendAuctionInitEvents: false
  }
}

describe('LiveIntent Analytics Adapter ', () => {
  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(events, 'getEvents').returns([]);
    sandbox.stub(config, 'getConfig').withArgs('userSync.userIds').returns(USERID_CONFIG);
    sandbox.stub(utils, 'generateUUID').returns(instanceId);
    sandbox.stub(refererDetection, 'getRefererInfo').returns({page: url});
    sandbox.stub(auctionManager.index, 'getAuction').withArgs({auctionId: AUCTION_INIT_EVENT.auctionId}).returns({
      getBidRequests: () => AUCTION_INIT_EVENT.bidderRequests,
      getAuctionStart: () => AUCTION_INIT_EVENT.timestamp
    });
    clock = sandbox.useFakeTimers(now.getTime());
  });
  afterEach(function () {
    liAnalytics.disableAnalytics();
    sandbox?.restore();
    clock?.restore();
    window.liTreatmentRate = undefined
    window.liModuleEnabled = undefined
  });

  it('request is computed and sent correctly when sampling is 1', () => {
    liAnalytics.enableAnalytics(configWithSamplingAll);

    events.emit(EVENTS.AUCTION_INIT, AUCTION_INIT_EVENT);
    expect(server.requests.length).to.equal(1);
    expect(server.requests[0].url).to.equal('https://wba.liadm.com/analytic-events/auction-init?id=77abbc81-c1f1-41cd-8f25-f7149244c800&aid=87b4a93d-19ae-432a-96f0-8c2d4cc1c539&u=https%3A%2F%2Fwww.test.com&ats=1739969798557&pid=a123&iid=pbjs&liip=y&aun=2')

    events.emit(EVENTS.BID_WON, BID_WON_EVENT);
    expect(server.requests.length).to.equal(2);
    expect(server.requests[1].url).to.equal('https://wba.liadm.com/analytic-events/bid-won?id=77abbc81-c1f1-41cd-8f25-f7149244c800&aid=87b4a93d-19ae-432a-96f0-8c2d4cc1c539&u=https%3A%2F%2Fwww.test.com&ats=1739969798557&auc=test-div2&auid=afc6bc6a-3082-4940-b37f-d22e1b026e48&cpm=1.5&c=USD&b=appnexus&bc=appnexus&pid=a123&iid=pbjs&sts=1739971147744&rts=1739971147806&liip=y');
  });

  it('request is computed and sent correctly when sampling is 1 and liModule is enabled', () => {
    window.liModuleEnabled = true
    liAnalytics.enableAnalytics(configWithSamplingAll);

    events.emit(EVENTS.AUCTION_INIT, AUCTION_INIT_EVENT);
    expect(server.requests.length).to.equal(1);
    expect(server.requests[0].url).to.equal('https://wba.liadm.com/analytic-events/auction-init?id=77abbc81-c1f1-41cd-8f25-f7149244c800&aid=87b4a93d-19ae-432a-96f0-8c2d4cc1c539&u=https%3A%2F%2Fwww.test.com&ats=1739969798557&pid=a123&iid=pbjs&me=y&liip=y&aun=2')

    events.emit(EVENTS.BID_WON, BID_WON_EVENT);
    expect(server.requests.length).to.equal(2);
    expect(server.requests[1].url).to.equal('https://wba.liadm.com/analytic-events/bid-won?id=77abbc81-c1f1-41cd-8f25-f7149244c800&aid=87b4a93d-19ae-432a-96f0-8c2d4cc1c539&u=https%3A%2F%2Fwww.test.com&ats=1739969798557&auc=test-div2&auid=afc6bc6a-3082-4940-b37f-d22e1b026e48&cpm=1.5&c=USD&b=appnexus&bc=appnexus&pid=a123&iid=pbjs&sts=1739971147744&rts=1739971147806&me=y&liip=y');
  });

  it('request is computed and sent correctly when sampling is 1 and liModule is disabled', () => {
    window.liModuleEnabled = false
    liAnalytics.enableAnalytics(configWithSamplingAll);

    events.emit(EVENTS.AUCTION_INIT, AUCTION_INIT_EVENT);
    expect(server.requests.length).to.equal(1);
    expect(server.requests[0].url).to.equal('https://wba.liadm.com/analytic-events/auction-init?id=77abbc81-c1f1-41cd-8f25-f7149244c800&aid=87b4a93d-19ae-432a-96f0-8c2d4cc1c539&u=https%3A%2F%2Fwww.test.com&ats=1739969798557&pid=a123&iid=pbjs&me=n&liip=y&aun=2')

    events.emit(EVENTS.BID_WON, BID_WON_EVENT);
    expect(server.requests.length).to.equal(2);
    expect(server.requests[1].url).to.equal('https://wba.liadm.com/analytic-events/bid-won?id=77abbc81-c1f1-41cd-8f25-f7149244c800&aid=87b4a93d-19ae-432a-96f0-8c2d4cc1c539&u=https%3A%2F%2Fwww.test.com&ats=1739969798557&auc=test-div2&auid=afc6bc6a-3082-4940-b37f-d22e1b026e48&cpm=1.5&c=USD&b=appnexus&bc=appnexus&pid=a123&iid=pbjs&sts=1739971147744&rts=1739971147806&me=n&liip=y');
  });

  it('request is computed and sent correctly when sampling is 1 and should forward the correct liTreatmentRate', () => {
    window.liTreatmentRate = 0.95
    liAnalytics.enableAnalytics(configWithSamplingAll);

    events.emit(EVENTS.AUCTION_INIT, AUCTION_INIT_EVENT);
    expect(server.requests.length).to.equal(1);
    expect(server.requests[0].url).to.equal('https://wba.liadm.com/analytic-events/auction-init?id=77abbc81-c1f1-41cd-8f25-f7149244c800&aid=87b4a93d-19ae-432a-96f0-8c2d4cc1c539&u=https%3A%2F%2Fwww.test.com&ats=1739969798557&pid=a123&iid=pbjs&tr=0.95&liip=y&aun=2')

    events.emit(EVENTS.BID_WON, BID_WON_EVENT);
    expect(server.requests.length).to.equal(2);
    expect(server.requests[1].url).to.equal('https://wba.liadm.com/analytic-events/bid-won?id=77abbc81-c1f1-41cd-8f25-f7149244c800&aid=87b4a93d-19ae-432a-96f0-8c2d4cc1c539&u=https%3A%2F%2Fwww.test.com&ats=1739969798557&auc=test-div2&auid=afc6bc6a-3082-4940-b37f-d22e1b026e48&cpm=1.5&c=USD&b=appnexus&bc=appnexus&pid=a123&iid=pbjs&sts=1739971147744&rts=1739971147806&tr=0.95&liip=y');
  });

  it('not send any events on auction init if disabled in settings', () => {
    liAnalytics.enableAnalytics(configWithNoAuctionInit);

    events.emit(EVENTS.AUCTION_INIT, AUCTION_INIT_EVENT);
    expect(server.requests.length).to.equal(0);
  });

  it('not send fields that are undefined', () => {
    liAnalytics.enableAnalytics(configWithSamplingAll);

    events.emit(EVENTS.AUCTION_INIT, AUCTION_INIT_EVENT);
    events.emit(EVENTS.BID_WON, BID_WON_EVENT_UNDEFINED);

    expect(server.requests.length).to.equal(2);
    expect(server.requests[1].url).to.equal('https://wba.liadm.com/analytic-events/bid-won?id=77abbc81-c1f1-41cd-8f25-f7149244c800&aid=87b4a93d-19ae-432a-96f0-8c2d4cc1c539&u=https%3A%2F%2Fwww.test.com&ats=1739969798557&pid=a123&iid=pbjs&liip=y');
  });

  it('liip should be n if there is no source or provider in userIdAsEids have the value liveintent.com', () => {
    liAnalytics.enableAnalytics(configWithSamplingAll);

    events.emit(EVENTS.AUCTION_INIT, AUCTION_INIT_EVENT_NOT_LI);
    expect(server.requests.length).to.equal(1);
    expect(server.requests[0].url).to.equal('https://wba.liadm.com/analytic-events/auction-init?id=77abbc81-c1f1-41cd-8f25-f7149244c800&aid=87b4a93d-19ae-432a-96f0-8c2d4cc1c539&u=https%3A%2F%2Fwww.test.com&ats=1739969798557&pid=a123&iid=pbjs&liip=n&aun=2');
  });

  it('no request is computed when sampling is 0', () => {
    liAnalytics.enableAnalytics(configWithSamplingNone);

    events.emit(EVENTS.AUCTION_INIT, AUCTION_INIT_EVENT);
    events.emit(EVENTS.BID_WON, BID_WON_EVENT);

    expect(server.requests.length).to.equal(0);
  });
});
