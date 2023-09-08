import {config} from 'src/config.js';
import {emit, clearEvents, getEvents} from '../../../../src/events.js';

describe('events', () => {
  let clock;
  beforeEach(() => {
    clock = sinon.useFakeTimers();
    clearEvents();
  });
  afterEach(() => {
    clock.restore();
  });

  it('should clear event log using eventHistoryTTL config', () => {
    emit('testEvent', {});
    expect(getEvents().length).to.eql(1);
    config.setConfig({eventHistoryTTL: 1});
    clock.tick(500);
    expect(getEvents().length).to.eql(1);
    clock.tick(6000);
    expect(getEvents().length).to.eql(0);
  });

  it('should take history TTL in seconds', () => {
    emit('testEvent', {});
    config.setConfig({eventHistoryTTL: 1000});
    clock.tick(10000);
    expect(getEvents().length).to.eql(1);
  })
})
