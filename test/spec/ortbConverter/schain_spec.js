import {setOrtbSourceExtSchain} from '../../../modules/schain.js';

describe('pbjs - ortb source.ext.schain', () => {
  it('sets schain from request', () => {
    const req = {};
    setOrtbSourceExtSchain(req, {}, {
      bidRequests: [{schain: {s: 'chain'}}]
    });
    expect(req.source.ext.schain).to.eql({s: 'chain'});
  });

  it('does not set it if missing', () => {
    const req = {};
    setOrtbSourceExtSchain(req, {}, {bidRequests: [{}]});
    expect(req).to.eql({});
  })

  it('does not set it if already in request', () => {
    const req = {
      source: {
        ext: {
          schain: {s: 'chain'}
        }
      }
    }
    setOrtbSourceExtSchain(req, {}, {
      bidRequests: [{
        schain: {other: 'chain'}
      }]
    });
    expect(req.source.ext.schain).to.eql({s: 'chain'});
  })
});
