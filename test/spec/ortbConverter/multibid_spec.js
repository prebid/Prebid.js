import {config} from 'src/config.js';
import {setOrtbExtPrebidMultibid} from '../../../modules/multibid/index.js';

describe('pbjs - ortb ext.prebid.multibid', () => {
  before(() => {
    config.resetConfig();
  });
  afterEach(() => {
    config.resetConfig();
  });

  it('sets ext.prebid.multibid according to config', () => {
    config.setConfig({
      multibid: [
        {
          bidder: 'A',
          maxBids: 2
        },
        {
          bidder: 'B',
          maxBids: 3
        }
      ]
    });
    const req = {};
    setOrtbExtPrebidMultibid(req);
    expect(req.ext.prebid.multibid).to.eql([{bidder: 'A', maxbids: 2}, {bidder: 'B', maxbids: 3}]);
  });

  it('does not set it if not configured', () => {
    const req = {};
    setOrtbExtPrebidMultibid(req);
    expect(req).to.eql({});
  })
});
