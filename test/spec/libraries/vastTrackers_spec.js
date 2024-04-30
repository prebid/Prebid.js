import {addImpUrlToTrackers, getVastTrackers, insertVastTrackers, registerVastTrackers} from 'libraries/vastTrackers/vastTrackers.js';
import {MODULE_TYPE_ANALYTICS} from '../../../src/activities/modules.js';

describe('vast trackers', () => {
  it('insert into tracker list', function() {
    let trackers = getVastTrackers({'cpm': 1.0});
    if (!trackers || !trackers.get('impressions')) {
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'test', function(bidResponse) {
        return [
          {'event': 'impressions', 'url': `https://vasttracking.mydomain.com/vast?cpm=${bidResponse.cpm}`}
        ];
      });
    }
    trackers = getVastTrackers({'cpm': 1.0});
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
})
