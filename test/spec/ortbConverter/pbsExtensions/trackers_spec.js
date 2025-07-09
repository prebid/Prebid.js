import {EVENT_TYPE_IMPRESSION, EVENT_TYPE_WIN, TRACKER_METHOD_IMG} from '../../../../src/eventTrackers.js';
import {addEventTrackers} from '../../../../libraries/pbsExtensions/processors/eventTrackers.js';

describe('PBS event trackers', () => {
  let bidResponse;
  beforeEach(() => {
    bidResponse = {};
  });

  Object.entries({
    'burl': {
      bid: {
        burl: 'tracker'
      },
      type: EVENT_TYPE_IMPRESSION
    },
    'ext.prebid.events.win': {
      bid: {
        ext: {
          prebid: {
            events: {
              win: 'tracker'
            }
          }
        }
      },
      type: EVENT_TYPE_WIN
    }
  }).forEach(([t, {type, bid}]) => {
    function getTracker() {
      return bidResponse.eventtrackers?.find(({event, method, url}) => url === 'tracker' && method === TRACKER_METHOD_IMG && event === type)
    }

    it(`should add ${t}`, () => {
      addEventTrackers(bidResponse, bid);
      expect(getTracker()).to.exist;
    });
    it(`should append ${t}`, () => {
      bidResponse.eventtrackers = [{method: 123, event: 321, url: 'other-tracker'}];
      addEventTrackers(bidResponse, bid);
      expect(getTracker()).to.exist;
      expect(bidResponse.eventtrackers.length).to.eql(2);
    });
    it('should NOT add a duplicate tracker', () => {
      bidResponse.eventtrackers = [{method: TRACKER_METHOD_IMG, event: type, url: 'tracker'}];
      addEventTrackers(bidResponse, bid);
      expect(getTracker()).to.exist;
      expect(bidResponse.eventtrackers.length).to.eql(1);
    })
  })
})
