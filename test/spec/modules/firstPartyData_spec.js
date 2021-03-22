import {expect} from 'chai';
import * as utils from 'src/utils.js';
import {config} from 'src/config.js';
import { getGlobal } from 'src/prebidGlobal.js';
import CONSTANTS from 'src/constants.json';
import { getRefererInfo } from 'src/refererDetection.js'
import {
  filterData,
  validateFpd,
  init,
  resetOrtb2
} from 'modules/firstPartyData/index.js';
import events from 'src/events.js';

describe('the first party data module', function () {
  let sandbox,
    logErrorSpy;

  let ortb2 = {
    device: {
      height: 911,
      width: 1733
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
      height: 500,
      width: 750
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

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    logErrorSpy = sinon.spy(utils, 'logError');
  });

  afterEach(function () {
    sandbox.restore();
    utils.logError.restore();
    config.resetConfig();
    resetOrtb2();
  });

  describe('filtering first party data', function () {
    it('returns null if empty data array should', function () {
      let validated;
      let duplicate = utils.deepClone(ortb2);
      duplicate.user.data = [];
      duplicate.site.content.data = [];

      validated = filterData(duplicate.user.data, 'user');
      expect(validated).to.equal(null);
      validated = filterData(duplicate.site.content.data, 'site');
      expect(validated).to.equal(null);
    });

    it('returns null if name does not exist', function () {
      let validated;
      let duplicate = utils.deepClone(ortb2);
      delete duplicate.user.data[0].name;
      delete duplicate.site.content.data[0].name;

      validated = filterData(duplicate.user.data, 'user');
      expect(validated).to.equal(null);
      validated = filterData(duplicate.site.content.data, 'site');
      expect(validated).to.equal(null);
    });

    it('returns null if segment does not exist', function () {
      let validated;
      let duplicate = utils.deepClone(ortb2);
      delete duplicate.user.data[0].segment;
      delete duplicate.site.content.data[0].segment;

      validated = filterData(duplicate.user.data, 'user');
      expect(validated).to.equal(null);
      validated = filterData(duplicate.site.content.data, 'site');
      expect(validated).to.equal(null);
    });

    it('returns unfiltered data', function () {
      let validated;
      let duplicate = utils.deepClone(ortb2);

      delete duplicate.user.data[0].ext;

      validated = filterData(duplicate.user.data, 'user');
      expect(validated).to.deep.equal(duplicate.user.data);
      validated = filterData(duplicate.site.content.data, 'site');
      expect(validated).to.deep.equal(duplicate.site.content.data);
    });

    it('returns data filtering data[0].ext for wrong type', function () {
      let validated;
      let duplicate = utils.deepClone(ortb2);
      let expected = {
        user: [{
          segment: [{
            id: 'foo'
          }],
          name: 'bar'
        }],
        site: [{
          segment: [{
            id: 'test'
          }],
          name: 'content',
        }]
      };

      duplicate.site.content.data[0].ext = [1, 3, 5];

      validated = filterData(duplicate.user.data, 'user');
      expect(validated).to.deep.equal(expected.user);
      validated = filterData(duplicate.site.content.data, 'user');
      expect(validated).to.deep.equal(expected.site);
    });

    it('returns user data filtering data[0].segment[1] for missing id', function () {
      let duplicate = utils.deepClone(ortb2);
      let expected = [{
        segment: [{
          id: 'foo'
        }],
        name: 'bar'
      }];
      duplicate.user.data[0].segment.push({foo: 'bar'});

      let validated = filterData(duplicate.user.data, 'user');
      expect(validated).to.deep.equal(expected);
    });

    it('returns undefined for data[0].segment[0] for missing id', function () {
      let duplicate = utils.deepClone(ortb2);
      duplicate.user.data[0].segment[0] = [{test: 1}];

      let validated = filterData(duplicate.user.data, 'user');
      expect(validated).to.equal(null);
    });

    it('returns data filtering data[0].segement[1] and data[0].ext', function () {
      let duplicate = utils.deepClone(ortb2);
      let expected = [{
        segment: [{
          id: 'foo'
        }],
        name: 'bar'
      }, {
        segment: [{
          id: '123'
        }],
        name: 'test-2',
        ext: {
          foo: 'bar'
        }
      }];

      duplicate.user.data[0].segment.push({test: 3});
      duplicate.user.data.push({segment: [{id: '123'}], name: 'test-2', ext: {foo: 'bar'}});

      let validated = filterData(duplicate.user.data, 'user');
      expect(validated).to.deep.equal(expected);
    });
  });

  describe('validating first party data', function () {
    it('filters user.data[0].ext for incorrect type', function () {
      let validated;
      let duplicate = utils.deepClone(ortb2);
      let expected = {
        device: {
          height: 911,
          width: 1733
        },
        user: {
          data: [{
            segment: [{
              id: 'foo'
            }],
            name: 'bar'
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

      validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });

    it('filters user and site for empty data', function () {
      let validated;
      let duplicate = utils.deepClone(ortb2);
      let expected = {
        device: {
          height: 911,
          width: 1733
        }
      };

      duplicate.user.data = [];
      duplicate.site.content.data = [];

      validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });

    it('filters user for empty valid segment values', function () {
      let validated;
      let duplicate = utils.deepClone(ortb2);
      let expected = {
        device: {
          height: 911,
          width: 1733
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

      duplicate.user.data[0].segment.push({test: 3});
      duplicate.user.data[0].segment[0] = {foo: 'bar'};

      validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });

    it('filters user.data[0].ext and site.content.data[0].segement[1] for invalid data', function () {
      let validated;
      let duplicate = utils.deepClone(ortb2);
      let expected = {
        device: {
          height: 911,
          width: 1733
        },
        user: {
          data: [{
            segment: [{
              id: 'foo'
            }],
            name: 'bar'
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

      duplicate.site.content.data[0].segment.push({test: 3});

      validated = validateFpd(duplicate);
      expect(validated).to.deep.equal(expected);
    });
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

    after(function() {
      widthStub.restore();
      heightStub.restore();
      querySelectorStub.restore();
    });

    it('sets default referer and dimension values to ortb2 data', function () {
      let validated;

      width = 1120;
      height = 750;

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal(getRefererInfo().referer);
      expect(validated.site.page).to.be.undefined;
      expect(validated.site.domain).to.be.undefined;
      expect(validated.device).to.deep.equal({width: 1120, height: 750});
      expect(validated.site.keywords).to.be.undefined;
    });

    it('sets page and domain values to ortb2 data if canonical link exists', function () {
      let validated;

      width = 800;
      height = 400;
      canonical.href = 'https://www.domain.com/path?query=12345';

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal(getRefererInfo().referer);
      expect(validated.site.page).to.equal('https://www.domain.com/path?query=12345');
      expect(validated.site.domain).to.equal('domain.com');
      expect(validated.device).to.deep.to.equal({width: 800, height: 400});
      expect(validated.site.keywords).to.be.undefined;
    });

    it('sets keyword values to ortb2 data if keywords meta exists', function () {
      let validated;

      width = 1120;
      height = 750;
      keywords.content = 'value1,value2,value3';

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal(getRefererInfo().referer);
      expect(validated.site.page).to.equal('https://www.domain.com/path?query=12345');
      expect(validated.site.domain).to.equal('domain.com');
      expect(validated.device).to.deep.to.equal({width: 1120, height: 750});
      expect(validated.site.keywords).to.equal('value1,value2,value3');
    });

    it('only sets values that do not exist in ortb2 config', function () {
      let validated;

      config.setConfig({ortb2: {site: {ref: 'https://testpage.com', domain: 'newDomain.com'}}});

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal('https://testpage.com');
      expect(validated.site.page).to.equal('https://www.domain.com/path?query=12345');
      expect(validated.site.domain).to.equal('newDomain.com');
      expect(validated.device).to.deep.to.equal({width: 1120, height: 750});
      expect(validated.site.keywords).to.equal('value1,value2,value3');
    });

    it('filters ortb2 data that is set prior to init firing', function () {
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
            width: 1,
            height: 1
          }
        }
      };

      config.setConfig(conf);

      init();

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal(getRefererInfo().referer);
      expect(validated.site.page).to.equal('https://www.domain.com/path?query=12345');
      expect(validated.site.domain).to.equal('domain.com');
      expect(validated.site.content.data).to.deep.equal([{segment: [{id: 'test'}], name: 'bar'}]);
      expect(validated.user.data).to.be.undefined;
      expect(validated.device).to.deep.to.equal({width: 1, height: 1});
      expect(validated.site.keywords).to.to.equal('value1,value2,value3');
    });

    it('filters ortb2 data that is set after init firing', function () {
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
            width: 1,
            height: 1
          }
        }
      };

      init();

      config.setConfig(conf);

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal(getRefererInfo().referer);
      expect(validated.site.page).to.equal('https://www.domain.com/path?query=12345');
      expect(validated.site.domain).to.equal('domain.com');
      expect(validated.site.content.data).to.deep.equal([{segment: [{id: 'test'}], name: 'bar'}]);
      expect(validated.user.data).to.be.undefined;
      expect(validated.device).to.deep.to.equal({width: 1, height: 1});
      expect(validated.site.keywords).to.to.equal('value1,value2,value3');
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

      init();

      config.setConfig(conf);

      validated = config.getConfig('ortb2');
      expect(validated.site.ref).to.equal('https://referer.com');
    });

    it('should add currency if currency config exists prior to init firing', function () {
      let validated;
      let conf = {
        currency: {
          adServerCurrency: 'USD'
        }
      };

      config.setConfig(conf);

      init();

      validated = config.getConfig('ortb2');
      expect(validated.cur).to.equal('USD');
    });

    it('should add currency if currency config exists after init firing', function () {
      let validated;
      let conf = {
        currency: {
          adServerCurrency: 'JAP'
        }
      };

      config.setConfig(conf);

      init();

      validated = config.getConfig('ortb2');
      expect(validated.cur).to.equal('JAP');
    });
  });
});
