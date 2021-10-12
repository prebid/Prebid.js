import { weboramaSubmodule } from 'modules/weboramaRtdProvider.js';
import { server } from 'test/mocks/xhr.js';
import {config} from 'src/config.js';
import { getStorageManager } from '../../../src/storageManager.js';

const responseHeader = {'Content-Type': 'application/json'};

describe('weboramaRtdProvider', function() {
  describe('weboramaSubmodule', function() {
    it('successfully instantiates and call contextual api', function () {
      const moduleConfig = {
        params: {
          weboCtxConf: {
            token: 'foo',
            targetURL: 'https://prebid.org',
          }
        }
      };

		  expect(weboramaSubmodule.init(moduleConfig)).to.equal(true);

      let request = server.requests[0];

      expect(request.url).to.equal('https://ctx.weborama.com/api/profile?token=foo&url=https%3A%2F%2Fprebid.org&');
      expect(request.method).to.equal('GET')
    });
    it('instantiate without contextual token should fail', function () {
      const moduleConfig = {
        params: {
          weboCtxConf: {}
        }
      };
		  expect(weboramaSubmodule.init(moduleConfig)).to.equal(false);
    });
    it('instantiate with empty wam2gam conf should return true', function () {
      const moduleConfig = {
        params: {
          wam2gamConf: {}
        }
      };
      expect(weboramaSubmodule.init(moduleConfig)).to.equal(true);
    });
  });

  describe('Handle Set Targeting', function() {
    beforeEach(function() {
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

      const storage = getStorageManager();
      storage.removeDataFromLocalStorage('webo_wam2gam_entry');
    });

    describe('Add Contextual Data', function() {
      it('should set targeting and ortb2 if omit setTargeting', function() {
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              targetURL: 'https://prebid.org',
              setOrtb2: true,
            }
          }
        };
        const data = {
          webo_ctx: ['foo', 'bar'],
          webo_ds: ['baz'],
        };
        const adUnitsCodes = ['adunit1', 'adunit2'];
        weboramaSubmodule.init(moduleConfig);

        let request = server.requests[0];
        request.respond(200, responseHeader, JSON.stringify(data));

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
          'adunit2': data,
        });

        const ortb2 = config.getConfig('ortb2');

        expect(ortb2.site.ext.data.webo_ctx).to.deep.equal(data.webo_ctx);
        expect(ortb2.site.ext.data.webo_ds).to.deep.equal(data.webo_ds);
      });

      it('should set targeting and ortb2 with setTargeting=true', function() {
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              targetURL: 'https://prebid.org',
              setTargeting: true,
              setOrtb2: true,
            }
          }
        };
        const data = {
          webo_ctx: ['foo', 'bar'],
          webo_ds: ['baz'],
        };
        const adUnitsCodes = ['adunit1', 'adunit2'];
        weboramaSubmodule.init(moduleConfig);

        let request = server.requests[0];
        request.respond(200, responseHeader, JSON.stringify(data));

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
          'adunit2': data,
        });

        const ortb2 = config.getConfig('ortb2');

        expect(ortb2.site.ext.data.webo_ctx).to.deep.equal(data.webo_ctx);
        expect(ortb2.site.ext.data.webo_ds).to.deep.equal(data.webo_ds);
      });

      it('should set targeting and ortb2 only webo_ctx with setTargeting=true', function() {
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              targetURL: 'https://prebid.org',
              setTargeting: true,
              setOrtb2: true,
            }
          }
        };
        const data = {
          webo_ctx: ['foo', 'bar'],
        };

        const adUnitsCodes = ['adunit1', 'adunit2'];
        weboramaSubmodule.init(moduleConfig);

        let request = server.requests[0];
        request.respond(200, responseHeader, JSON.stringify(data));

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
          'adunit2': data,
        });

        const ortb2 = config.getConfig('ortb2');

        expect(ortb2.site.ext.data.webo_ctx).to.deep.equal(data.webo_ctx);
        expect(ortb2.site.ext.data).to.not.have.property('webo_ds');
      });

      it('should set only targeting and not ortb2 with setTargeting=true and setOrtb2=false', function() {
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              targetURL: 'https://prebid.org',
              setTargeting: true,
              setOrtb2: false,
            }
          }
        };
        const data = {
          webo_ctx: ['foo', 'bar'],
        };

        const adUnitsCodes = ['adunit1', 'adunit2'];
        weboramaSubmodule.init(moduleConfig);

        let request = server.requests[0];
        request.respond(200, responseHeader, JSON.stringify(data));

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
          'adunit2': data,
        });

        const ortb2 = config.getConfig('ortb2');

        expect(ortb2.site.ext.data).to.not.have.property('webo_ctx');
        expect(ortb2.site.ext.data).to.not.have.property('webo_ds');
      });

      it('should set only targeting and not ortb2 with setTargeting=true and omit setOrtb2', function() {
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              targetURL: 'https://prebid.org',
              setTargeting: true,
            }
          }
        };
        const data = {
          webo_ctx: ['foo', 'bar'],
        };

        const adUnitsCodes = ['adunit1', 'adunit2'];
        weboramaSubmodule.init(moduleConfig);

        let request = server.requests[0];
        request.respond(200, responseHeader, JSON.stringify(data));

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
          'adunit2': data,
        });

        const ortb2 = config.getConfig('ortb2');

        expect(ortb2.site.ext.data).to.not.have.property('webo_ctx');
        expect(ortb2.site.ext.data).to.not.have.property('webo_ds');
      });

      it('should set only ortb2 with setTargeting=false', function() {
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              targetURL: 'https://prebid.org',
              setTargeting: false,
              setOrtb2: true,
            }
          }
        };
        const data = {
          webo_ctx: ['foo', 'bar'],
        };
        const adUnitsCodes = ['adunit1', 'adunit2'];
        weboramaSubmodule.init(moduleConfig);

        let request = server.requests[0];
        request.respond(200, responseHeader, JSON.stringify(data));

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({});

        const ortb2 = config.getConfig('ortb2');

        expect(ortb2.site.ext.data.webo_ctx).to.deep.equal(data.webo_ctx);
        expect(ortb2.site.ext.data).to.not.have.property('webo_ds');
      });

      it('should use default profile in case of api error', function() {
        const defaultProfile = {
          webo_ctx: ['baz'],
        };
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              targetURL: 'https://prebid.org',
              setTargeting: true,
              defaultProfile: defaultProfile,
            }
          }
        };

        const adUnitsCodes = ['adunit1', 'adunit2'];
        weboramaSubmodule.init(moduleConfig);

        let request = server.requests[0];
        request.respond(500, responseHeader);

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': defaultProfile,
          'adunit2': defaultProfile,
        });

        const ortb2 = config.getConfig('ortb2');

        expect(ortb2.site.ext.data).to.not.have.property('webo_ctx');
        expect(ortb2.site.ext.data).to.not.have.property('webo_ds');
      });
    });

    describe('Add WAM2GAM Data', function() {
      it('should set targeting and ortb2 if omit setTargeting', function() {
        const moduleConfig = {
          params: {
            wam2gamConf: {
              setOrtb2: true,
            }
          }
        };
        const data = {
          webo_cs: ['foo', 'bar'],
          webo_audiences: ['baz'],
        };

        const entry = {
          targeting: data,
        };

        const storage = getStorageManager();
        storage.setDataInLocalStorage('webo_wam2gam_entry', JSON.stringify(entry));

        const adUnitsCodes = ['adunit1', 'adunit2'];
        weboramaSubmodule.init(moduleConfig);

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
          'adunit2': data,
        });

        const ortb2 = config.getConfig('ortb2');

        expect(ortb2.user.ext.data.webo_cs).to.deep.equal(data.webo_cs);
        expect(ortb2.user.ext.data.webo_audiences).to.deep.equal(data.webo_audiences);
      });

      it('should set targeting and ortb2 with setTargeting=true', function() {
        const moduleConfig = {
          params: {
            wam2gamConf: {
              setTargeting: true,
              setOrtb2: true,
            }
          }
        };
        const data = {
          webo_cs: ['foo', 'bar'],
          webo_audiences: ['baz'],
        };

        const entry = {
          targeting: data,
        };

        const storage = getStorageManager();
        storage.setDataInLocalStorage('webo_wam2gam_entry', JSON.stringify(entry));

        const adUnitsCodes = ['adunit1', 'adunit2'];
        weboramaSubmodule.init(moduleConfig);

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
          'adunit2': data,
        });

        const ortb2 = config.getConfig('ortb2');

        expect(ortb2.user.ext.data.webo_cs).to.deep.equal(data.webo_cs);
        expect(ortb2.user.ext.data.webo_audiences).to.deep.equal(data.webo_audiences);
      });

      it('should set targeting and ortb2 only webo_cs with setTargeting=true', function() {
        const moduleConfig = {
          params: {
            wam2gamConf: {
              setTargeting: true,
              setOrtb2: true,
            }
          }
        };
        const data = {
          webo_cs: ['foo', 'bar'],
        };

        const entry = {
          targeting: data,
        };

        const storage = getStorageManager();
        storage.setDataInLocalStorage('webo_wam2gam_entry', JSON.stringify(entry));

        const adUnitsCodes = ['adunit1', 'adunit2'];
        weboramaSubmodule.init(moduleConfig);

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
          'adunit2': data,
        });

        const ortb2 = config.getConfig('ortb2');

        expect(ortb2.user.ext.data.webo_cs).to.deep.equal(data.webo_cs);
        expect(ortb2.user.ext.data).to.not.have.property('webo_audiences');
      });

      it('should set only targeting and not ortb2 with setTargeting=true and setOrtb2=false', function() {
        const moduleConfig = {
          params: {
            wam2gamConf: {
              setTargeting: true,
              setOrtb2: false,
            }
          }
        };
        const data = {
          webo_cs: ['foo', 'bar'],
        };

        const entry = {
          targeting: data,
        };

        const storage = getStorageManager();
        storage.setDataInLocalStorage('webo_wam2gam_entry', JSON.stringify(entry));

        const adUnitsCodes = ['adunit1', 'adunit2'];
        weboramaSubmodule.init(moduleConfig);

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
          'adunit2': data,
        });

        const ortb2 = config.getConfig('ortb2');

        expect(ortb2.user.ext.data).to.not.have.property('webo_cs');
        expect(ortb2.user.ext.data).to.not.have.property('webo_audiences');
      });

      it('should set only targeting and not ortb2 with setTargeting=true and omit setOrtb2', function() {
        const moduleConfig = {
          params: {
            wam2gamConf: {
              setTargeting: true,
            }
          }
        };
        const data = {
          webo_cs: ['foo', 'bar'],
        };

        const entry = {
          targeting: data,
        };

        const storage = getStorageManager();
        storage.setDataInLocalStorage('webo_wam2gam_entry', JSON.stringify(entry));

        const adUnitsCodes = ['adunit1', 'adunit2'];
        weboramaSubmodule.init(moduleConfig);

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
          'adunit2': data,
        });

        const ortb2 = config.getConfig('ortb2');

        expect(ortb2.user.ext.data).to.not.have.property('webo_cs');
        expect(ortb2.user.ext.data).to.not.have.property('webo_audiences');
      });

      it('should set only ortb2 with setTargeting=false', function() {
        const moduleConfig = {
          params: {
            wam2gamConf: {
              setTargeting: false,
              setOrtb2: true,
            }
          }
        };
        const data = {
          webo_cs: ['foo', 'bar'],
        };

        const entry = {
          targeting: data,
        };

        const storage = getStorageManager();
        storage.setDataInLocalStorage('webo_wam2gam_entry', JSON.stringify(entry));

        const adUnitsCodes = ['adunit1', 'adunit2'];
        weboramaSubmodule.init(moduleConfig);

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({});

        const ortb2 = config.getConfig('ortb2');

        expect(ortb2.user.ext.data.webo_cs).to.deep.equal(data.webo_cs);
        expect(ortb2.user.ext.data).to.not.have.property('webo_audiences');
      });

      it('should use default profile in case of nothing on local storage', function() {
        const defaultProfile = {
          webo_audiences: ['baz']
        };
        const moduleConfig = {
          params: {
            wam2gamConf: {
              setTargeting: true,
              setOrtb2: true,
              defaultProfile: defaultProfile,
            }
          }
        };

        const adUnitsCodes = ['adunit1', 'adunit2'];
        weboramaSubmodule.init(moduleConfig);

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': defaultProfile,
          'adunit2': defaultProfile,
        });

        const ortb2 = config.getConfig('ortb2');

        expect(ortb2.user.ext.data).to.not.have.property('webo_cs');
        expect(ortb2.user.ext.data.webo_audiences).to.deep.equal(defaultProfile.webo_audiences);
      });
    });
  });
});
