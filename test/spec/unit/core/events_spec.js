import { config } from 'src/config.js';
import { listen, emit, clearEvents, getEvents, on, off } from '../../../../src/events.js';
import * as utils from '../../../../src/utils.js';

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
    config.setConfig({ eventHistoryTTL: 1 });
    await clock.tick(500);
    expect(getEvents().length).to.eql(1);
    await clock.tick(6000);
    expect(getEvents().length).to.eql(0);
  });

  it('should take history TTL in seconds', async () => {
    emit('testEvent', {});
    config.setConfig({ eventHistoryTTL: 1000 });
    await clock.tick(10000);
    expect(getEvents().length).to.eql(1);
  });

  it('should include the eventString if a callback fails', () => {
    const logErrorStub = sinon.stub(utils, 'logError');
    const eventString = 'bidWon';
    const fn = function() { throw new Error('Test error'); };
    on(eventString, fn);

    emit(eventString, {});

    sinon.assert.calledWith(logErrorStub, 'Error executing handler:', 'events.js', sinon.match.instanceOf(Error), eventString);

    off(eventString, fn);
    logErrorStub.restore();
  });

  Object.entries({
    on,
    listen
  }).forEach(([name, fn]) => {
    describe(name, () => {
      it(`can be undone with off`, () => {
        const handler = sinon.stub();
        fn('bidWon', handler);
        off('bidWon', handler);
        emit('bidWon', {});
        sinon.assert.notCalled(handler);
      });

      it('off only unregisters the handler it is passed', () => {
        const handler = sinon.stub();
        const other = sinon.stub();
        fn('bidWon', handler);
        fn('bidWon', other);
        off('bidWon', other);
        emit('bidWon', {});
        sinon.assert.calledOnce(handler);
      });

      it(`can still be undone if the same handler is reused`, () => {
        const handler = sinon.stub();
        fn('bidWon', handler);
        fn('bidWon', handler);
        fn('bidResponse', handler);
        off('bidWon', handler);
        emit('bidWon', { event: 'bidWon' });
        emit('bidResponse', { event: 'bidResponse' });
        sinon.assert.calledOnce(handler);
        expect(handler.args[0][handler.args[0].length - 1]).to.eql({ event: 'bidResponse' });
      });
    });
  });

  it('can get event record using listen', () => {
    const handler = sinon.stub();
    listen('bidWon', handler);
    emit('bidWon', {});
    sinon.assert.calledWith(handler, sinon.match({
      eventType: 'bidWon',
      args: {}
    }), {});
  });
});
