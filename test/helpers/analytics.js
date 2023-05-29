import * as pbEvents from 'src/events.js';
import constants from '../../src/constants.json';

export function fireEvents(events = [
  constants.EVENTS.AUCTION_INIT,
  constants.EVENTS.AUCTION_END,
  constants.EVENTS.BID_REQUESTED,
  constants.EVENTS.BID_RESPONSE,
  constants.EVENTS.BID_WON
]) {
  return events.map((ev, i) => {
    ev = Array.isArray(ev) ? ev : [ev, {i: i}];
    pbEvents.emit.apply(null, ev)
    return ev;
  });
}

export function expectEvents(events) {
  events = fireEvents(events);
  return {
    to: {
      beTrackedBy(trackFn) {
        events.forEach(([eventType, args]) => {
          sinon.assert.calledWithMatch(trackFn, sinon.match({eventType, args}));
        });
      },
      beBundledTo(bundleFn) {
        events.forEach(([eventType, args]) => {
          sinon.assert.calledWithMatch(bundleFn, sinon.match.any, eventType, sinon.match(args))
        });
      },
    },
  };
}
