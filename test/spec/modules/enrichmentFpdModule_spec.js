import { expect } from 'chai';
import { getRefererInfo } from 'src/refererDetection.js';
import {processFpd, coreStorage, resetEnrichments} from 'modules/enrichmentFpdModule.js';
import * as enrichmentModule from 'modules/enrichmentFpdModule.js';
import {GreedyPromise} from '../../../src/utils/promise.js';

describe('the first party data enrichment module', function() {
  let width;
  let widthStub;
  let height;
  let heightStub;
  let querySelectorStub;
  let coreStorageStub;
  let canonical;
  let keywords;
  let lowEntropySuaStub;
  let highEntropySuaStub;

  before(function() {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    keywords = document.createElement('meta');
    keywords.name = 'keywords';
  });

  beforeEach(function() {
    resetEnrichments();
    querySelectorStub = sinon.stub(window.top.document, 'querySelector');
    querySelectorStub.withArgs("link[rel='canonical']").returns(canonical);
    querySelectorStub.withArgs("meta[name='keywords']").returns(keywords);
    widthStub = sinon.stub(window.top, 'innerWidth').get(function() {
      return width;
    });
    heightStub = sinon.stub(window.top, 'innerHeight').get(function() {
      return height;
    });
    coreStorageStub = sinon.stub(coreStorage, 'getCookie');
    coreStorageStub
      .onFirstCall()
      .returns(null) // co.uk
      .onSecondCall()
      .returns('writeable'); // domain.co.uk
    lowEntropySuaStub = sinon.stub(enrichmentModule.sua, 'le').callsFake(() => null);
    highEntropySuaStub = sinon.stub(enrichmentModule.sua, 'he').callsFake(() => GreedyPromise.resolve());
  });

  afterEach(function() {
    widthStub.restore();
    heightStub.restore();
    querySelectorStub.restore();
    coreStorageStub.restore();
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    keywords = document.createElement('meta');
    keywords.name = 'keywords';
    lowEntropySuaStub.restore();
    highEntropySuaStub.restore();
  });

  function syncProcessFpd(fpdConf, ortb2Fragments) {
    let result;
    processFpd(fpdConf, ortb2Fragments).then((res) => { result = res; });
    return result;
  };

  it('adds ref and device values', function() {
    width = 800;
    height = 500;

    let validated = syncProcessFpd({}, {}).global;

    const {ref, page, domain} = getRefererInfo();
    expect(validated.site.ref).to.equal(ref || undefined);
    expect(validated.site.page).to.equal(page || undefined)
    expect(validated.site.domain).to.equal(domain || undefined)
    expect(validated.device).to.deep.equal({ w: 800, h: 500 });
    expect(validated.site.keywords).to.be.undefined;
  });

  it('adds page domain values if canonical url exists', function() {
    width = 800;
    height = 500;
    canonical.href = 'https://www.subdomain.domain.co.uk/path?query=12345';

    let validated = syncProcessFpd({}, {}).global;

    expect(validated.site.ref).to.equal(getRefererInfo().ref || undefined);
    expect(validated.site.page).to.equal('https://www.subdomain.domain.co.uk/path?query=12345');
    expect(validated.site.domain).to.equal('subdomain.domain.co.uk');
    expect(validated.site.publisher.domain).to.equal('domain.co.uk');
    expect(validated.device).to.deep.equal({ w: 800, h: 500 });
    expect(validated.site.keywords).to.be.undefined;
  });

  it('adds keyword value if keyword meta content exists', function() {
    width = 800;
    height = 500;
    keywords.content = 'value1,value2,value3';

    let validated = syncProcessFpd({}, {}).global;

    expect(validated.site.keywords).to.equal('value1,value2,value3');
  });

  it('does not overwrite existing data from getConfig ortb2', function() {
    width = 800;
    height = 500;

    let validated = syncProcessFpd({}, {global: {device: {w: 1200, h: 700}, site: {ref: 'https://someUrl.com', page: 'test.com'}}}).global;

    expect(validated.site.ref).to.equal('https://someUrl.com');
    expect(validated.site.page).to.equal('test.com');
    expect(validated.device).to.deep.equal({ w: 1200, h: 700 });
    expect(validated.site.keywords).to.be.undefined;
  });

  it('does not run enrichments again on the second call', () => {
    width = 1;
    height = 2;
    const first = syncProcessFpd({}, {}).global;
    width = 3;
    const second = syncProcessFpd({}, {}).global;
    expect(first).to.eql(second);
  });

  describe('device.sua', () => {
    it('does not set device.sua if resolved sua is null', () => {
      const sua = syncProcessFpd({}, {}).global.device?.sua;
      expect(sua).to.not.exist;
    });
    it('uses low entropy values if uaHints is []', () => {
      lowEntropySuaStub.callsFake(() => ({mock: 'sua'}));
      const sua = syncProcessFpd({uaHints: []}, {}).global.device.sua;
      expect(sua).to.eql({mock: 'sua'});
    });
    it('uses high entropy values otherwise', () => {
      highEntropySuaStub.callsFake((hints) => GreedyPromise.resolve({hints}));
      const sua = syncProcessFpd({uaHints: ['h1', 'h2']}, {}).global.device.sua;
      expect(sua).to.eql({hints: ['h1', 'h2']});
    })
  })

  it('should store a reference to gpc witin ortb2.regs.ext if it has been enabled', function() {
    let validated;
    width = 800;
    height = 500;

    validated = syncProcessFpd({}, {}).global;
    expect(validated.regs).to.equal(undefined);

    resetEnrichments();

    const globalPrivacyControlStub = sinon.stub(window, 'navigator').value({globalPrivacyControl: true});
    validated = syncProcessFpd({}, {}).global;
    expect(validated.regs.ext.gpc).to.equal(1);
    globalPrivacyControlStub.restore();
  });
});
