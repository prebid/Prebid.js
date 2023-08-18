import { expect } from 'chai';
import { getRefererInfo } from 'src/refererDetection.js';
import { processFpd, coreStorage } from 'modules/enrichmentFpdModule.js';

describe('the first party data enrichment module', function() {
  let width;
  let widthStub;
  let height;
  let heightStub;
  let querySelectorStub;
  let coreStorageStub;
  let canonical;
  let keywords;

  before(function() {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    keywords = document.createElement('meta');
    keywords.name = 'keywords';
  });

  beforeEach(function() {
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
  });

  it('adds ref and device values', function() {
    width = 800;
    height = 500;

    let validated = processFpd({}, {}).global;

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

    let validated = processFpd({}, {}).global;

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

    let validated = processFpd({}, {}).global;

    expect(validated.site.keywords).to.equal('value1,value2,value3');
  });

  it('does not overwrite existing data from getConfig ortb2', function() {
    width = 800;
    height = 500;

    let validated = processFpd({}, {global: {device: {w: 1200, h: 700}, site: {ref: 'https://someUrl.com', page: 'test.com'}}}).global;

    expect(validated.site.ref).to.equal('https://someUrl.com');
    expect(validated.site.page).to.equal('test.com');
    expect(validated.device).to.deep.equal({ w: 1200, h: 700 });
    expect(validated.site.keywords).to.be.undefined;
  });
});
