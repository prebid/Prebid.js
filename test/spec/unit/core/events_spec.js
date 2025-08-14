import {config} from 'src/config.js';
import {emit, clearEvents, getEvents, on, off} from '../../../../src/events.js';
import * as utils from '../../../../src/utils.js'

describe('events', () => {
  let clock;
  beforeEach(() => {
    clock = sinon.useFakeTimers();
    clearEvents();
  });
  afterEach(() => {
    clock.restore();
    config.resetConfig();
  });

  it('should clear event log using eventHistoryTTL config', async () => {
    emit('testEvent', {});
    expect(getEvents().length).to.eql(1);
    config.setConfig({eventHistoryTTL: 1});
    await clock.tick(500);
    expect(getEvents().length).to.eql(1);
    await clock.tick(6000);
    expect(getEvents().length).to.eql(0);
  });

  it('should take history TTL in seconds', async () => {
    emit('testEvent', {});
    config.setConfig({eventHistoryTTL: 1000});
    await clock.tick(10000);
    expect(getEvents().length).to.eql(1);
  });

  it('should include the eventString if a callback fails', () => {
    const logErrorStub = sinon.stub(utils, 'logError');
    const eventString = 'bidWon';
    let fn = function() { throw new Error('Test error'); };
    on(eventString, fn);

    emit(eventString, {});

    sinon.assert.calledWith(logErrorStub, 'Error executing handler:', 'events.js', sinon.match.instanceOf(Error), eventString);

    off(eventString, fn);
    logErrorStub.restore();
  });
})
