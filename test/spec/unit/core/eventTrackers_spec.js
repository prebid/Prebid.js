import {
  EVENT_TYPE_IMPRESSION, EVENT_TYPE_WIN,
  parseEventTrackers,
  TRACKER_METHOD_IMG,
  TRACKER_METHOD_JS
} from '../../../../src/eventTrackers.js';

describe('event trackers', () => {
  describe('parseEventTrackers', () => {
    Object.entries({
      'null': {
        eventtrackers: null,
        expected: {}
      },
      'undef': {
        expected: {}
      },
      'empty array': {
        eventtrackers: [],
        expected: {}
      },
      'unsupported methods and events': {
        eventtrackers: [
          {event: EVENT_TYPE_IMPRESSION, method: TRACKER_METHOD_IMG, url: 'u1'},
          {event: 999, method: TRACKER_METHOD_IMG, url: 'u2'},
          {event: EVENT_TYPE_IMPRESSION, method: 999, url: 'u3'},
        ],
        expected: {
          [EVENT_TYPE_IMPRESSION]: {
            [TRACKER_METHOD_IMG]: ['u1'],
            999: ['u3']
          },
          999: {
            [TRACKER_METHOD_IMG]: ['u2']
          }
        }
      },
      'mixed methods and events': {
        eventtrackers: [
          {event: EVENT_TYPE_IMPRESSION, method: TRACKER_METHOD_JS, url: 'u1'},
          {event: EVENT_TYPE_IMPRESSION, method: TRACKER_METHOD_JS, url: 'u2'},
          {event: EVENT_TYPE_IMPRESSION, method: TRACKER_METHOD_IMG, url: 'u3'},
          {event: EVENT_TYPE_WIN, method: TRACKER_METHOD_IMG, url: 'u4'}
        ],
        expected: {
          [EVENT_TYPE_IMPRESSION]: {
            [TRACKER_METHOD_JS]: ['u1', 'u2'],
            [TRACKER_METHOD_IMG]: ['u3'],
          },
          [EVENT_TYPE_WIN]: {
            [TRACKER_METHOD_IMG]: ['u4']
          }
        }
      },
    }).forEach(([t, {eventtrackers, expected}]) => {
      it(`can parse ${t}`, () => {
        expect(parseEventTrackers(eventtrackers)).to.eql(expected);
      })
    })
  })
})
