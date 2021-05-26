import {expect} from 'chai';
import * as utils from 'src/utils.js';
import {config} from 'src/config.js';
import {getRefererInfo} from 'src/refererDetection.js';
import {init, registerSubmodules} from 'modules/fpdModule/index.js';
import * as enrichmentModule from 'modules/enrichmentFpdModule.js';
import * as validationModule from 'modules/validationFpdModule/index.js';

let enrichments = {
  name: 'enrichments',
  queue: 2,
  init: enrichmentModule.initSubmodule
};
let validations = {
  name: 'validations',
  queue: 1,
  init: validationModule.initSubmodule
};

describe('the first party data module', function () {
  let ortb2 = {
    device: {
      h: 911,
      w: 1733
    },
    user: {
      data: [{
        segment: [{
          id: 'foo'
        }],
        name: 'bar',
        ext: 'string'
      }]
    },
    site: {
      content: {
        data: [{
          segment: [{
            id: 'test'
          }],
          name: 'content',
          ext: {
            foo: 'bar'
          }
        }]
      }
    }
  };

  let conf = {
    device: {
      h: 500,
      w: 750
    },
    user: {
      keywords: 'test1, test2',
      gender: 'f',
      data: [{
        segment: [{
          id: 'test'
        }],
        name: 'alt'
      }]
    },
    site: {
      ref: 'domain.com',
      page: 'www.domain.com/test',
      ext: {
        data: {
          inventory: ['first']
        }
      }
    }
  };

  afterEach(function () {
    config.resetConfig();
  });

  describe('first party data intitializing', function () {
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
      widthStub = sinon.stub(window.top, 'innerWidth').get(function () {
        return width;
      });
      heightStub = sinon.stub(window.top, 'innerHeight').get(function () {
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

    it('sets default referer and dimension values to ortb2 data', function () {
      registerSubmodules(enrichments);
      registerSubmodules(validations);

      let validated;

      width = 1120;
      height = 750;

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal(getRefererInfo().referer);
      expect(validated.site.page).to.be.undefined;
      expect(validated.site.domain).to.be.undefined;
      expect(validated.device).to.deep.equal({w: 1120, h: 750});
      expect(validated.site.keywords).to.be.undefined;
    });

    it('sets page and domain values to ortb2 data if canonical link exists', function () {
      let validated;

      canonical.href = 'https://www.domain.com/path?query=12345';

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal(getRefererInfo().referer);
      expect(validated.site.page).to.equal('https://www.domain.com/path?query=12345');
      expect(validated.site.domain).to.equal('domain.com');
      expect(validated.device).to.deep.to.equal({w: 1120, h: 750});
      expect(validated.site.keywords).to.be.undefined;
    });

    it('sets keyword values to ortb2 data if keywords meta exists', function () {
      let validated;

      keywords.content = 'value1,value2,value3';

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal(getRefererInfo().referer);
      expect(validated.site.page).to.be.undefined;
      expect(validated.site.domain).to.be.undefined;
      expect(validated.device).to.deep.to.equal({w: 1120, h: 750});
      expect(validated.site.keywords).to.equal('value1,value2,value3');
    });

    it('only sets values that do not exist in ortb2 config', function () {
      let validated;

      config.setConfig({ortb2: {site: {ref: 'https://testpage.com', domain: 'newDomain.com'}}});

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal('https://testpage.com');
      expect(validated.site.page).to.be.undefined;
      expect(validated.site.domain).to.equal('newDomain.com');
      expect(validated.device).to.deep.to.equal({w: 1120, h: 750});
      expect(validated.site.keywords).to.be.undefined;
    });

    it('filters ortb2 data that is set', function () {
      let validated;
      let conf = {
        ortb2: {
          user: {
            data: {},
            gender: 'f',
            age: 45
          },
          site: {
            content: {
              data: [{
                segment: {
                  test: 1
                },
                name: 'foo'
              }, {
                segment: [{
                  id: 'test'
                }, {
                  id: 3
                }],
                name: 'bar'
              }]
            }
          },
          device: {
            w: 1,
            h: 1
          }
        }
      };

      config.setConfig(conf);
      canonical.href = 'https://www.domain.com/path?query=12345';
      width = 1120;
      height = 750;

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal(getRefererInfo().referer);
      expect(validated.site.page).to.equal('https://www.domain.com/path?query=12345');
      expect(validated.site.domain).to.equal('domain.com');
      expect(validated.site.content.data).to.deep.equal([{segment: [{id: 'test'}], name: 'bar'}]);
      expect(validated.user.data).to.be.undefined;
      expect(validated.device).to.deep.to.equal({w: 1, h: 1});
      expect(validated.site.keywords).to.be.undefined;
    });

    it('should not overwrite existing data with default settings', function () {
      let validated;
      let conf = {
        ortb2: {
          site: {
            ref: 'https://referer.com'
          }
        }
      };

      config.setConfig(conf);

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal('https://referer.com');
    });

    it('should allow overwrite default data with setConfig', function () {
      let validated;
      let conf = {
        ortb2: {
          site: {
            ref: 'https://referer.com'
          }
        }
      };

      config.setConfig(conf);

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal('https://referer.com');
    });

    it('should filter all data', function () {
      let validated;
      let conf = {
        imp: [],
        site: {
          name: 123,
          domain: 456,
          page: 789,
          ref: 987,
          keywords: ['keywords'],
          search: 654,
          cat: 'cat',
          sectioncat: 'sectioncat',
          pagecat: 'pagecat',
          content: {
            data: [{
              name: 1,
              segment: []
            }]
          }
        },
        user: {
          yob: 'twenty',
          gender: 0,
          keywords: ['foobar'],
          data: ['test']
        },
        device: [800, 450],
        cur: {
          adServerCurrency: 'USD'
        }
      };

      config.setConfig({'firstPartyData': {skipEnrichments: true}});

      config.setConfig({ortb2: conf});

      init();

      validated = config.getConfig('ortb2');
      expect(validated).to.deep.equal({});
    });

    it('should add enrichments but not alter any arbitrary ortb2 data', function () {
      let validated;
      let conf = {
        site: {
          ext: {
            data: {
              inventory: ['value1']
            }
          }
        },
        user: {
          ext: {
            data: {
              visitor: ['value2']
            }
          }
        },
        cur: ['USD']
      };

      config.setConfig({ortb2: conf});

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal(getRefererInfo().referer);
      expect(validated.site.ext.data).to.deep.equal({inventory: ['value1']});
      expect(validated.user.ext.data).to.deep.equal({visitor: ['value2']});
      expect(validated.cur).to.deep.equal(['USD']);
    });

    it('should filter bidderConfig data', function () {
      let validated;
      let conf = {
        bidders: ['bidderA', 'bidderB'],
        config: {
          ortb2: {
            site: {
              keywords: 'other',
              ref: 'https://domain.com'
            },
            user: {
              keywords: 'test',
              data: [{
                segment: [{id: 4}],
                name: 't'
              }]
            }
          }
        }
      };

      config.setBidderConfig(conf);

      init();

      validated = config.getBidderConfig();
      expect(validated.bidderA.ortb2).to.not.be.undefined;
      expect(validated.bidderA.ortb2.user.data).to.be.undefined;
      expect(validated.bidderA.ortb2.user.keywords).to.equal('test');
      expect(validated.bidderA.ortb2.site.keywords).to.equal('other');
      expect(validated.bidderA.ortb2.site.ref).to.equal('https://domain.com');
    });

    it('should not filter bidderConfig data as it is valid', function () {
      let validated;
      let conf = {
        bidders: ['bidderA', 'bidderB'],
        config: {
          ortb2: {
            site: {
              keywords: 'other',
              ref: 'https://domain.com'
            },
            user: {
              keywords: 'test',
              data: [{
                segment: [{id: 'data1_id'}],
                name: 'data1'
              }]
            }
          }
        }
      };

      config.setBidderConfig(conf);

      init();

      validated = config.getBidderConfig();
      expect(validated.bidderA.ortb2).to.not.be.undefined;
      expect(validated.bidderA.ortb2.user.data).to.deep.equal([{segment: [{id: 'data1_id'}], name: 'data1'}]);
      expect(validated.bidderA.ortb2.user.keywords).to.equal('test');
      expect(validated.bidderA.ortb2.site.keywords).to.equal('other');
      expect(validated.bidderA.ortb2.site.ref).to.equal('https://domain.com');
    });

    it('should not set default values if skipEnrichments is turned on', function () {
      let validated;
      config.setConfig({'firstPartyData': {skipEnrichments: true}});

      let conf = {
        site: {
          keywords: 'other'
        },
        user: {
          keywords: 'test',
          data: [{
            segment: [{id: 'data1_id'}],
            name: 'data1'
          }]
        }
      }
      ;

      config.setConfig({ortb2: conf});

      init();

      validated = config.getConfig();
      expect(validated.ortb2).to.not.be.undefined;
      expect(validated.ortb2.device).to.be.undefined;
      expect(validated.ortb2.site.ref).to.be.undefined;
      expect(validated.ortb2.site.page).to.be.undefined;
      expect(validated.ortb2.site.domain).to.be.undefined;
    });

    it('should not validate ortb2 data if skipValidations is turned on', function () {
      let validated;
      config.setConfig({'firstPartyData': {skipValidations: true}});

      let conf = {
        site: {
          keywords: 'other'
        },
        user: {
          keywords: 'test',
          data: [{
            segment: [{id: 'nonfiltered'}]
          }]
        }
      }
      ;

      config.setConfig({ortb2: conf});

      init();

      validated = config.getConfig();
      expect(validated.ortb2).to.not.be.undefined;
      expect(validated.ortb2.user.data).to.deep.equal([{segment: [{id: 'nonfiltered'}]}]);
    });
  });
});
