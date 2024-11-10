import {
  addImpUrlToTrackers,
  addTrackersToResponse,
  getVastTrackers,
  insertVastTrackers,
  registerVastTrackers,
  reset
} from 'libraries/vastTrackers/vastTrackers.js';
import {MODULE_TYPE_ANALYTICS} from '../../../src/activities/modules.js';

describe('vast trackers', () => {
  beforeEach(() => {
    registerVastTrackers(MODULE_TYPE_ANALYTICS, 'test', function(bidResponse) {
      return [
        {'event': 'impressions', 'url': `https://vasttracking.mydomain.com/vast?cpm=${bidResponse.cpm}`}
      ];
    });
  })
  afterEach(() => {
    reset();
  });

  it('insert into tracker list', function() {
    const trackers = getVastTrackers({'cpm': 1.0});
    expect(trackers).to.be.a('map');
    expect(trackers.get('impressions')).to.exists;
    expect(trackers.get('impressions').has('https://vasttracking.mydomain.com/vast?cpm=1')).to.be.true;
  });

  it('insert trackers in vastXml', function() {
    const trackers = getVastTrackers({'cpm': 1.0});
    let vastXml = '<VAST><Ad><Wrapper></Wrapper></Ad></VAST>';
    vastXml = insertVastTrackers(trackers, vastXml);
    expect(vastXml).to.equal('<VAST><Ad><Wrapper><Impression><![CDATA[https://vasttracking.mydomain.com/vast?cpm=1]]></Impression></Wrapper></Ad></VAST>');
  });

  it('test addImpUrlToTrackers', function() {
    const trackers = addImpUrlToTrackers({'vastImpUrl': 'imptracker.com'}, getVastTrackers({'cpm': 1.0}));
    expect(trackers).to.be.a('map');
    expect(trackers.get('impressions')).to.exists;
    expect(trackers.get('impressions').has('imptracker.com')).to.be.true;
  });

  if (FEATURES.VIDEO) {
    it('should add trackers to bid response', () => {
      const bidResponse = {
        mediaType: 'video',
        cpm: 1
      }
      addTrackersToResponse(sinon.stub(), 'au', bidResponse);
      expect(bidResponse.vastImpUrl).to.eql([
        'https://vasttracking.mydomain.com/vast?cpm=1'
      ])
    });
  }
})
