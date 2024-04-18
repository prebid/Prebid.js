import * as pbEvents from 'src/events.js';
import { EVENTS } from '../../src/constants.js';

export function fireEvents(events = [
  EVENTS.AUCTION_INIT,
  EVENTS.AUCTION_END,
  EVENTS.BID_REQUESTED,
  EVENTS.BID_RESPONSE,
  EVENTS.BID_WON
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
