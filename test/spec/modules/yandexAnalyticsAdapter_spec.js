import * as sinon from 'sinon';
import yandexAnalytics, { EVENTS_TO_TRACK } from 'modules/yandexAnalyticsAdapter.js';
import * as log from '../../../src/utils.js'
import * as events from '../../../src/events.js';

describe('Yandex analytics adapter testing', () => {
  const sandbox = sinon.createSandbox();
  let clock;
  let logError;
  let getEvents;
  let onEvent;
  const counterId = 123;
  const counterWindowKey = 'yaCounter123';

  beforeEach(() => {
    yandexAnalytics.counters = {};
    yandexAnalytics.counterInitTimeouts = {};
    yandexAnalytics.bufferedEvents = [];
    yandexAnalytics.oneCounterInited = false;
    clock = sinon.useFakeTimers();
    logError = sandbox.stub(log, 'logError');
    sandbox.stub(log, 'logInfo');
    getEvents = sandbox.stub(events, 'getEvents').returns([]);
    onEvent = sandbox.stub(events, 'on');
    sandbox.stub(window.document, 'createElement').callsFake((tag) => {
      const element = {
        tag,
        events: {},
        attributes: {},
        addEventListener: (event, cb) => {
          element.events[event] = cb;
        },
        removeEventListener: (event, cb) => {
          chai.expect(element.events[event]).to.equal(cb);
        },
        setAttribute: (attr, val) => {
          element.attributes[attr] = val;
        },
      };
      return element;
    });
  });

  afterEach(() => {
    window.Ya = null;
    window[counterWindowKey] = null;
    sandbox.restore();
    clock.restore();
  });

  it('fails if timeout for counter insertion is exceeded', () => {
    yandexAnalytics.enableAnalytics({
      options: {
        counters: [
          123,
        ],
      },
    });
    clock.tick(25001);
    chai.expect(yandexAnalytics.bufferedEvents).to.deep.equal([]);
    sinon.assert.calledWith(logError, `Can't find metrika counter after 25 seconds.`);
    sinon.assert.calledWith(logError, `Aborting yandex analytics provider initialization.`);
  });

  it('fails if no valid counters provided', () => {
    yandexAnalytics.enableAnalytics({
      options: {
        counters: [
          'abc',
        ],
      },
    });
    sinon.assert.calledWith(logError, 'options.counters contains no valid counter ids');
  });

  it('subscribes to events if counter is already present', () => {
    window[counterWindowKey] = {
      pbjs: sandbox.stub(),
    };

    getEvents.returns([
      {
        eventType: EVENTS_TO_TRACK[0],
      },
      {
        eventType: 'Some_untracked_event',
      }
    ]);
    const eventsToSend = [{
      event: EVENTS_TO_TRACK[0],
      data: {
        eventType: EVENTS_TO_TRACK[0],
      }
    }];

    yandexAnalytics.enableAnalytics({
      options: {
        counters: [
          counterId,
        ],
      },
    });

    EVENTS_TO_TRACK.forEach((eventName, i) => {
      const [event, callback] = onEvent.getCall(i).args;
      chai.expect(event).to.equal(eventName);
      callback(i);
      eventsToSend.push({
        event: eventName,
        data: i,
      });
    });

    clock.tick(1501);

    const [ sentEvents ] = window[counterWindowKey].pbjs.getCall(0).args;
    chai.expect(sentEvents).to.deep.equal(eventsToSend);
  });

  it('waits for counter initialization', () => {
    window.Ya = {};
    // Simulatin metrika script initialization
    yandexAnalytics.enableAnalytics({
      options: {
        counters: [
          counterId,
        ],
      },
    });

    // Sending event
    const [event, eventCallback] = onEvent.getCall(0).args;
    eventCallback({});

    const counterPbjsMethod = sandbox.stub();
    window[`yaCounter${counterId}`] = {
      pbjs: counterPbjsMethod,
    };
    clock.tick(2001);

    const [ sentEvents ] = counterPbjsMethod.getCall(0).args;
    chai.expect(sentEvents).to.deep.equal([{
      event,
      data: {},
    }]);
  });
});
