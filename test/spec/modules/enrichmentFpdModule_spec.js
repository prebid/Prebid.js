import { expect } from 'chai';
import * as utils from 'src/utils.js';
import { getRefererInfo } from 'src/refererDetection.js';
import { initSubmodule } from 'modules/enrichmentFpdModule.js';

describe('the first party data enrichment module', function() {
  let width;
  let widthStub;
  let height;
  let heightStub;
  let querySelectorStub;
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
  });

  afterEach(function() {
    widthStub.restore();
    heightStub.restore();
    querySelectorStub.restore();
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    keywords = document.createElement('meta');
    keywords.name = 'keywords';
  });

  it('adds ref and device values', function() {
    width = 800;
    height = 500;

    let validated = initSubmodule({}, {});

    expect(validated.site.ref).to.equal(getRefererInfo().referer);
    expect(validated.site.page).to.be.undefined;
    expect(validated.site.domain).to.be.undefined;
    expect(validated.device).to.deep.equal({ w: 800, h: 500 });
    expect(validated.site.keywords).to.be.undefined;
  });

  it('adds page and domain values if canonical url exists', function() {
    width = 800;
    height = 500;
    canonical.href = 'https://www.domain.com/path?query=12345';

    let validated = initSubmodule({}, {});

    expect(validated.site.ref).to.equal(getRefererInfo().referer);
    expect(validated.site.page).to.equal('https://www.domain.com/path?query=12345');
    expect(validated.site.domain).to.equal('domain.com');
    expect(validated.device).to.deep.equal({ w: 800, h: 500 });
    expect(validated.site.keywords).to.be.undefined;
  });

  it('adds keyword value if keyword meta content exists', function() {
    width = 800;
    height = 500;
    keywords.content = 'value1,value2,value3';

    let validated = initSubmodule({}, {});

    expect(validated.site.ref).to.equal(getRefererInfo().referer);
    expect(validated.site.page).to.be.undefined;
    expect(validated.site.domain).to.be.undefined;
    expect(validated.device).to.deep.equal({ w: 800, h: 500 });
    expect(validated.site.keywords).to.equal('value1,value2,value3');
  });

  it('does not overwrite existing data from getConfig ortb2', function() {
    width = 800;
    height = 500;

    let validated = initSubmodule({}, {device: {w: 1200, h: 700}, site: {ref: 'https://someUrl.com', page: 'test.com'}});

    expect(validated.site.ref).to.equal('https://someUrl.com');
    expect(validated.site.page).to.equal('test.com');
    expect(validated.site.domain).to.be.undefined;
    expect(validated.device).to.deep.equal({ w: 1200, h: 700 });
    expect(validated.site.keywords).to.be.undefined;
  });
});
