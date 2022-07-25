import {setDeviceDimensions, setSite} from '../../../libraries/ortbConverter/processors/default.js';

describe('setDeviceDimensions', () => {
  it('sets device.w and h', () => {
    const req = {
      ext: {}
    };
    setDeviceDimensions(req);
    expect(req.device.h).to.exist;
    expect(req.device.w).to.exist;
    expect(req.ext).to.eql({});
  });

  it('does not override FPD', () => {
    const req = {
      device: {
        w: 'w',
        h: 'h',
        ext: {}
      }
    };
    setDeviceDimensions(req);
    expect(req.device).to.eql({
      w: 'w',
      h: 'h',
      ext: {}
    });
  });
});

describe('setSite', () => {
  const refererInfo = {
    page: 'page.com',
    ref: 'ref.com',
    domain: 'domain.com'
  };

  it('sets site, domain, ref from refererInfo', () => {
    const req = {
      site: {
        ext: {}
      }
    };
    setSite(req, {refererInfo});
    sinon.assert.match(req.site, refererInfo);
    expect(req.site.ext).to.eql({});
  });

  it('does not override FPD', () => {
    const req = {
      site: {
        ref: 'other ref'
      }
    }
    setSite(req, {refererInfo});
    expect(req.site.ref).to.eql('other ref');
    ['domain', 'page'].forEach(prop => expect(req.site[prop]).to.eql(refererInfo[prop]));
  });

  it('does not set null properties from refererInfo', () => {
    const req = {};
    setSite(req, {refererInfo: {...refererInfo, ref: null}});
    expect(req.site.ref).to.not.exist;
  });
});
