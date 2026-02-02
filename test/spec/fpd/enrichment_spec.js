import {dep, enrichFPD, getJsonLdKeywords, getMetaTagKeywords} from '../../../src/fpd/enrichment.js';
import {hook} from '../../../src/hook.js';
import {expect} from 'chai/index.mjs';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import * as winDimensions from 'src/utils/winDimensions.js';
import * as activities from 'src/activities/rules.js'
import {CLIENT_SECTIONS} from '../../../src/fpd/oneClient.js';
import {ACTIVITY_ACCESS_DEVICE} from '../../../src/activities/activities.js';
import {ACTIVITY_PARAM_COMPONENT} from '../../../src/activities/params.js';

describe('FPD enrichment', () => {
  let sandbox;
  before(() => {
    hook.ready();
  });
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
    config.resetConfig();
  });

  function fpd(ortb2 = {}) {
    return enrichFPD(Promise.resolve(ortb2));
  }

  function mockWindow() {
    return {
      innerHeight: 1,
      innerWidth: 1,
      navigator: {
        language: ''
      },
      document: {
        querySelector: sinon.stub(),
        querySelectorAll: sinon.stub().callsFake((sel) => Array.from(document.querySelectorAll(sel))),
      },
      screen: {
        width: 1,
        height: 1,
      },
    };
  }

  function testWindows(getWindow, fn) {
    Object.entries({
      'top': ['getWindowTop', 'getWindowSelf'],
      'self': ['getWindowSelf', 'getWindowTop']
    }).forEach(([t, [winWorks, winThrows]]) => {
      describe(`using window.${t}`, () => {
        beforeEach(() => {
          sandbox.stub(dep, winWorks).callsFake(getWindow);
          sandbox.stub(dep, winThrows).throws(new Error());
        });
        fn();
      });
    });
  }

  CLIENT_SECTIONS.forEach(section => {
    describe(`${section}, when set`, () => {
      let ortb2;
      beforeEach(() => {
        ortb2 = {[section]: {ext: {}}}
      })

      it('sets domain and publisher.domain', () => {
        const refererInfo = {
          page: 'www.example.com',
        };
        sandbox.stub(dep, 'getRefererInfo').callsFake(() => refererInfo);
        sandbox.stub(dep, 'findRootDomain').callsFake((dom) => `publisher.${dom}`);
        return fpd(ortb2).then(ortb2 => {
          sinon.assert.match(ortb2[section], {
            domain: 'example.com',
            publisher: {
              domain: 'publisher.example.com'
            }
          });
        });
      })
      describe('keywords', () => {
        let tagsToRemove;
        beforeEach(() => {
          tagsToRemove = [];
          getMetaTagKeywords.clear();
          getJsonLdKeywords.clear();
        });

        afterEach(() => {
          tagsToRemove.forEach(tag => document.head.removeChild(tag));
        })

        function addMetaKeywords(keywords = ['kw1', 'kw2']) {
          const metaTag = document.createElement('meta');
          metaTag.name = 'keywords';
          metaTag.content = keywords.join(',')
          document.head.appendChild(metaTag);
          tagsToRemove.push(metaTag);
        }

        function addJsonKeywords(keywords) {
          // add a JSON-LD script that contains keywords
          const scriptTag = document.createElement('script');
          scriptTag.type = 'application/ld+json';
          scriptTag.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            keywords: keywords.join(',')
          });
          document.head.appendChild(scriptTag);
          tagsToRemove.push(scriptTag);
        }

        testWindows(() => window, () => {
          it('should not set keywords if meta and json tags are not present', () => {
            return fpd(ortb2).then(ortb2 => {
              expect(ortb2[section].hasOwnProperty('keywords')).to.be.false;
            });
          });

          it(`sets keywords from meta tag`, () => {
            addMetaKeywords(['kw1', 'kw2']);
            return fpd(ortb2).then(ortb2 => {
              expect(ortb2[section].keywords).to.eql('kw1,kw2');
            });
          });

          it('should not use meta tag if firstPartyData.keywords.meta is false', () => {
            config.setConfig({
              firstPartyData: {
                keywords: {
                  meta: false
                }
              }
            })
            addMetaKeywords(['kw1', 'kw2']);
            return fpd(ortb2).then(ortb2 => {
              expect(ortb2[section].keywords).to.not.exist;
            });
          });

          it('uses JSON-LD keywords when present', () => {
            addJsonKeywords(['json1', 'json2']);
            return fpd(ortb2).then(ortb2 => {
              // JSON-LD should be preferred; returned format is a comma-joined string (no spaces)
              expect(ortb2[section].keywords).to.eql('json1,json2');
            });
          });

          it('should not pick up JSON keywords if firstPartyData.keywords.json is false', () => {
            config.setConfig({
              firstPartyData: {
                keywords: {
                  json: false
                }
              }
            });
            addJsonKeywords(['json1', 'json2']);
            return fpd(ortb2).then(ortb2 => {
              expect(ortb2[section].keywords).to.not.exist;
            })
          });

          it('should avoid duplicates', () => {
            addMetaKeywords(['kw1', ' kw2']);
            addJsonKeywords(['kw2 ', 'kw3']);
            return fpd(ortb2).then(ortb2 => {
              expect(ortb2[section].keywords).to.eql('kw1,kw2,kw3');
            })
          })
        });
      });
    })
  })

  describe('site', () => {
    describe('when mixed with app/dooh', () => {
      beforeEach(() => {
        sinon.stub(utils, 'logWarn');
      });

      afterEach(() => {
        utils.logWarn.restore();
      });

      ['dooh', 'app'].forEach(prop => {
        it(`should not be set when ${prop} is set`, () => {
          return fpd({[prop]: {foo: 'bar'}}).then(ortb2 => {
            expect(ortb2.site).to.not.exist;
            sinon.assert.notCalled(utils.logWarn); // make sure we don't generate "both site and app are set" warnings
          })
        })
      })
    })

    it('sets page, ref', () => {
      const refererInfo = {
        page: 'www.example.com',
        ref: 'referrer.com'
      };
      sandbox.stub(dep, 'getRefererInfo').callsFake(() => refererInfo);
      return fpd().then(ortb2 => {
        sinon.assert.match(ortb2.site, {
          page: 'www.example.com',
          ref: 'referrer.com',
        });
      });
    });

    it('respects pub-provided fpd', () => {
      return fpd({
        site: {
          publisher: {
            domain: 'pub.com'
          }
        }
      }).then(ortb2 => {
        expect(ortb2.site.publisher.domain).to.eql('pub.com');
      });
    });

    it('should pass documentElement.lang into bid request params', function () {
      sandbox.stub(dep, 'getDocument').returns({
        documentElement: {
          lang: 'fr-FR'
        }
      });
      return fpd().then(ortb2 => {
        expect(ortb2.site.ext.data.documentLang).to.equal('fr-FR');
        expect(ortb2.site.content.language).to.equal('fr');
      });
    });
  });

  describe('device', () => {
    let win;
    beforeEach(() => {
      win = mockWindow();
    });
    testWindows(() => win, () => {
      it('sets w/h', () => {
        const getWinDimensionsStub = sandbox.stub(winDimensions, 'getWinDimensions');

        getWinDimensionsStub.returns({screen: {width: 321, height: 123}});
        return fpd().then(ortb2 => {
          sinon.assert.match(ortb2.device, {
            w: 321,
            h: 123,
          });
          getWinDimensionsStub.restore();
        });
      });

      it('sets ext.vpw/vph', () => {
        const getWinDimensionsStub = sandbox.stub(winDimensions, 'getWinDimensions');
        getWinDimensionsStub.returns({innerWidth: 12, innerHeight: 21, screen: {}});
        return fpd().then(ortb2 => {
          sinon.assert.match(ortb2.device.ext, {
            vpw: 12,
            vph: 21,
          });
          getWinDimensionsStub.restore();
        });
      });

      it('sets ua', () => {
        win.navigator.userAgent = 'mock-ua';
        return fpd().then(ortb2 => {
          expect(ortb2.device.ua).to.eql('mock-ua');
        })
      });

      it('sets language', () => {
        win.navigator.language = 'lang-ignored';
        return fpd().then(ortb2 => {
          expect(ortb2.device.language).to.eql('lang');
        })
      });
    });
  });

  describe('regs', () => {
    describe('gpc', () => {
      let win;
      beforeEach(() => {
        win = mockWindow();
      });
      testWindows(() => win, () => {
        it('is set if globalPrivacyControl is set', () => {
          win.navigator.globalPrivacyControl = true;
          return fpd().then(ortb2 => {
            expect(ortb2.regs.ext.gpc).to.eql('1');
          });
        });

        it('is not set otherwise', () => {
          return fpd().then(ortb2 => {
            expect(ortb2.regs?.ext?.gpc).to.not.exist;
          })
        })
      });
    })
    describe('coppa', () => {
      [[true, 1], [false, 0]].forEach(([cfgVal, regVal]) => {
        it(`is set to ${regVal} if config = ${cfgVal}`, () => {
          config.setConfig({coppa: cfgVal});
          return fpd().then(ortb2 => {
            expect(ortb2.regs.coppa).to.eql(regVal);
          })
        });
      })

      it('is not set if not configured', () => {
        return fpd().then(ortb2 => {
          expect(ortb2.regs?.coppa).to.not.exist;
        })
      })
    });
  });

  describe('sua', () => {
    it('does not set device.sua if resolved sua is null', () => {
      sandbox.stub(dep, 'getHighEntropySUA').returns(Promise.resolve());
      // Add hints so it will attempt to retrieve high entropy values
      config.setConfig({
        firstPartyData: {
          uaHints: ['bitness'],
        }
      });
      return fpd().then(ortb2 => {
        expect(ortb2.device.sua).to.not.exist;
      })
    });
    it('uses low entropy values if uaHints is []', () => {
      sandbox.stub(dep, 'getLowEntropySUA').callsFake(() => ({mock: 'sua'}));
      config.setConfig({
        firstPartyData: {
          uaHints: [],
        }
      })
      return fpd().then(ortb2 => {
        expect(ortb2.device.sua).to.eql({mock: 'sua'});
      })
    });
    it('uses high entropy values otherwise', () => {
      sandbox.stub(dep, 'getHighEntropySUA').callsFake((hints) => Promise.resolve({hints}));
      config.setConfig({
        firstPartyData: {
          uaHints: ['h1', 'h2']
        }
      });
      return fpd().then(ortb2 => {
        expect(ortb2.device.sua).to.eql({hints: ['h1', 'h2']})
      })
    });
  });

  describe('privacy sandbox cookieDeprecationLabel', () => {
    let isAllowed; let cdep; let shouldCleanupNav = false;

    before(() => {
      if (!navigator.cookieDeprecationLabel) {
        navigator.cookieDeprecationLabel = {};
        shouldCleanupNav = true;
      }
    });

    after(() => {
      if (shouldCleanupNav) {
        delete navigator.cookieDeprecationLabel;
      }
    });

    beforeEach(() => {
      isAllowed = true;
      sandbox.stub(activities, 'isActivityAllowed').callsFake((activity, params) => {
        if (activity === ACTIVITY_ACCESS_DEVICE && params[ACTIVITY_PARAM_COMPONENT] === 'prebid.cdep') {
          return isAllowed;
        } else {
          throw new Error('Unexpected activity check');
        }
      });
      sandbox.stub(window.navigator, 'cookieDeprecationLabel').value({
        getValue: sinon.stub().callsFake(() => cdep)
      })
    })

    it('enrichment sets device.ext.cdep when allowed and navigator.getCookieDeprecationLabel exists', () => {
      cdep = Promise.resolve('example-test-label');
      return fpd().then(ortb2 => {
        expect(ortb2.device.ext.cdep).to.eql('example-test-label');
      })
    });

    Object.entries({
      'not allowed'() {
        isAllowed = false;
      },
      'not supported'() {
        delete navigator.cookieDeprecationLabel
      }
    }).forEach(([t, setup]) => {
      it(`if ${t}, the navigator API is not called and no enrichment happens`, () => {
        setup();
        cdep = Promise.resolve('example-test-label');
        return fpd().then(ortb2 => {
          expect(ortb2.device.ext?.cdep).to.not.exist;
          if (navigator.cookieDeprecationLabel) {
            sinon.assert.notCalled(navigator.cookieDeprecationLabel.getValue);
          }
        })
      });
    })

    it('if the navigator API returns a promise that rejects, the enrichment does not halt forever', () => {
      cdep = Promise.reject(new Error('oops, something went wrong'));
      return fpd().then(ortb2 => {
        expect(ortb2.device.ext?.cdep).to.not.exist;
      })
    });
  });

  it('leaves only one of app, site, dooh', () => {
    return fpd({
      app: {p: 'val'},
      site: {p: 'val'},
      dooh: {p: 'val'}
    }).then(ortb2 => {
      expect(ortb2.app).to.not.exist;
      expect(ortb2.site).to.not.exist;
      sinon.assert.match(ortb2.dooh, {
        p: 'val'
      })
    });
  })
});
