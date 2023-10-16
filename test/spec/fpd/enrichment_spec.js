import {dep, enrichFPD} from '../../../src/fpd/enrichment.js';
import {hook} from '../../../src/hook.js';
import {expect} from 'chai/index.mjs';
import {config} from 'src/config.js';

describe('FPD enrichment', () => {
  let sandbox;
  before(() => {
    hook.ready();
  });
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
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
        querySelector: sinon.stub()
      }
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

  describe('site', () => {
    it('sets page, ref, domain, and publisher.domain', () => {
      const refererInfo = {
        page: 'www.example.com',
        ref: 'referrer.com'
      };
      sandbox.stub(dep, 'getRefererInfo').callsFake(() => refererInfo);
      sandbox.stub(dep, 'findRootDomain').callsFake((dom) => `publisher.${dom}`);
      return fpd().then(ortb2 => {
        sinon.assert.match(ortb2.site, {
          page: 'www.example.com',
          domain: 'example.com',
          ref: 'referrer.com',
          publisher: {
            domain: 'publisher.example.com'
          }
        });
      });
    });

    describe('keywords', () => {
      let metaTag;
      beforeEach(() => {
        metaTag = document.createElement('meta');
        metaTag.name = 'keywords';
        metaTag.content = 'kw1, kw2';
        document.head.appendChild(metaTag);
      });
      afterEach(() => {
        document.head.removeChild(metaTag);
      });

      testWindows(() => window, () => {
        it(`sets kewwords from meta tag`, () => {
          return fpd().then(ortb2 => {
            expect(ortb2.site.keywords).to.eql('kw1,kw2');
          });
        });
      });
    });

    it('should not set keywords if meta tag is not present', () => {
      return fpd().then(ortb2 => {
        expect(ortb2.site.hasOwnProperty('keywords')).to.be.false;
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
  });

  describe('device', () => {
    let win;
    beforeEach(() => {
      win = mockWindow();
    });
    testWindows(() => win, () => {
      it('sets w/h', () => {
        win.innerHeight = 123;
        win.innerWidth = 321;
        return fpd().then(ortb2 => {
          sinon.assert.match(ortb2.device, {
            w: 321,
            h: 123,
          });
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
            expect(ortb2.regs.ext.gpc).to.eql(1);
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
      sandbox.stub(dep, 'getHighEntropySUA').returns(Promise.resolve())
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
});
