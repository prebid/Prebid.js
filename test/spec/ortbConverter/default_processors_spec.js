import {onlyOneClientSection, setDevice, setSite} from '../../../libraries/ortbConverter/processors/default.js';

describe('setDevice', () => {
  it('sets device.w,  h, dnt, language, ua', () => {
    const req = {};
    setDevice(req);
    ['h', 'w', 'dnt', 'language', 'ua'].forEach(prop => expect(req.device[prop]).to.exist)
  });

  it('does not override FPD', () => {
    const req = {
      device: {
        w: 'w',
        h: 'h',
        ext: {}
      }
    };
    setDevice(req);
    sinon.assert.match(req.device, {
      w: 'w',
      h: 'h',
      ext: {}
    })
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

describe('onlyOneClientSection', () => {
  [
    [['app'], 'app'],
    [['site'], 'site'],
    [['dooh'], 'dooh'],
    [['app', 'site'], 'app'],
    [['dooh', 'app', 'site'], 'dooh'],
    [['dooh', 'site'], 'dooh']
  ].forEach(([sections, winner]) => {
    it(`should leave only ${winner} in request when it contains ${sections.join(', ')}`, () => {
      const req = Object.fromEntries(sections.map(s => [s, {foo: 'bar'}]));
      onlyOneClientSection(req);
      expect(Object.keys(req)).to.eql([winner]);
    })
  });
  it('should not choke if none of the sections are in the request', () => {
    const req = {};
    onlyOneClientSection(req);
    expect(req).to.eql({});
  });
});
