import { justIdSubmodule, ConfigWrapper, jtUtils, EX_URL_REQUIRED, EX_INVALID_MODE } from 'modules/justIdSystem.js';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';
import * as utils from 'src/utils.js';

const DEFAULT_PARTNER = 'pbjs-just-id-module';

const url = 'https://example.com/getId.js';

describe('JustIdSystem', function () {
  describe('configWrapper', function() {
    it('invalid mode', function() {
      expect(() => new ConfigWrapper({ params: { mode: 'invalidmode' } })).to.throw(EX_INVALID_MODE);
    })

    it('url is required', function() {
      expect(() => new ConfigWrapper(configModeCombined())).to.throw(EX_URL_REQUIRED);
    })

    it('defaultPartner', function() {
      expect(new ConfigWrapper(configModeCombined(url)).getUrl()).to.eq(expectedUrl(url, DEFAULT_PARTNER));
    })

    it('customPartner', function() {
      const partner = 'abc';
      expect(new ConfigWrapper(configModeCombined(url, partner)).getUrl()).to.eq(expectedUrl(url, partner));
    })
  });

  describe('decode', function() {
    it('decode justId', function() {
      const justId = 'aaa';
      expect(justIdSubmodule.decode({uid: justId})).to.deep.eq({justId: justId});
    })
  });

  describe('getId basic', function() {
    var atmMock = (cmd, param) => {
      switch (cmd) {
        case 'getReadyState':
          param('ready')
          return;
        case 'getVersion':
          return Promise.resolve('1.0');
        case 'getUid':
          param('user123');
      }
    }

    var currentAtm;

    var getAtmStub = sinon.stub(jtUtils, 'getAtm').callsFake(() => currentAtm);

    var logErrorStub;

    beforeEach(function() {
      logErrorStub = sinon.spy(utils, 'logError');
    });

    afterEach(function() {
      logErrorStub.restore();
    });

    it('all ok', function(done) {
      currentAtm = atmMock;
      const callbackSpy = sinon.stub();

      callbackSpy.callsFake(idObj => {
        try {
          expect(idObj.uid).to.equal('user123');
          done();
        } catch (err) {
          done(err);
        }
      })

      const atmVarName = '__fakeAtm';

      justIdSubmodule.getId({params: {atmVarName: atmVarName}}).callback(callbackSpy);

      expect(getAtmStub.lastCall.lastArg).to.equal(atmVarName);
    });

    it('unsuported version', function(done) {
      currentAtm = (cmd, param) => {
        switch (cmd) {
          case 'getReadyState':
            param('ready')
        }
      }

      const callbackSpy = sinon.stub();

      callbackSpy.callsFake(idObj => {
        try {
          expect(logErrorStub.calledOnce).to.be.true;
          expect(idObj).to.be.undefined
          done();
        } catch (err) {
          done(err);
        }
      })

      justIdSubmodule.getId({}).callback(callbackSpy);
    });

    it('work with stub', function(done) {
      var calls = [];
      currentAtm = (cmd, param) => {
        calls.push({cmd: cmd, param: param});
      }

      const callbackSpy = sinon.stub();

      callbackSpy.callsFake(idObj => {
        try {
          expect(idObj.uid).to.equal('user123');
          done();
        } catch (err) {
          done(err);
        }
      })

      justIdSubmodule.getId({}).callback(callbackSpy);

      currentAtm = atmMock;
      expect(calls.length).to.equal(1);
      expect(calls[0].cmd).to.equal('getReadyState');
      calls[0].param('ready')
    });
  });

  describe('getId combined', function() {
    const scriptTag = document.createElement('script');

    const onPrebidGetId = sinon.stub().callsFake(event => {
      var cacheIdObj = event.detail && event.detail.cacheIdObj;
      var justId = (cacheIdObj && cacheIdObj.uid && cacheIdObj.uid + '-x') || 'user123';
      scriptTag.dispatchEvent(new CustomEvent('justIdReady', { detail: { justId: justId } }));
    });

    scriptTag.addEventListener('prebidGetId', onPrebidGetId)

    var scriptTagCallback;

    beforeEach(() => {
      loadExternalScriptStub.callsFake((url, moduleCode, callback) => {
        scriptTagCallback = callback;
        return scriptTag;
      });
    })

    var logErrorStub;

    beforeEach(() => {
      logErrorStub = sinon.spy(utils, 'logError');
    });

    afterEach(() => {
      logErrorStub.restore();
    });

    it('url is required', function() {
      expect(justIdSubmodule.getId(configModeCombined())).to.be.undefined;
      expect(logErrorStub.calledOnce).to.be.true;
    });

    it('without cachedIdObj', function() {
      const callbackSpy = sinon.spy();
      justIdSubmodule.getId(configModeCombined(url)).callback(callbackSpy);

      scriptTagCallback();

      expect(callbackSpy.lastCall.lastArg.uid).to.equal('user123');
    });

    it('with cachedIdObj', function() {
      const callbackSpy = sinon.spy();

      justIdSubmodule.getId(configModeCombined(url), undefined, { uid: 'userABC' }).callback(callbackSpy);

      scriptTagCallback();

      expect(callbackSpy.lastCall.lastArg.uid).to.equal('userABC-x');
    });

    it('check if getId arguments are passed to prebidGetId event', function() {
      const callbackSpy = sinon.spy();

      const a = configModeCombined(url);
      const b = { y: 'y' }
      const c = { z: 'z' }

      justIdSubmodule.getId(a, b, c).callback(callbackSpy);

      scriptTagCallback();

      expect(onPrebidGetId.lastCall.lastArg.detail).to.deep.eq({ config: a, consentData: b, cacheIdObj: c });
    });
  });
});

function expectedUrl(url, srcId) {
  return `${url}?sourceId=${srcId}`
}

function configModeCombined(url, partner) {
  var conf = {
    params: {
      mode: 'COMBINED'
    }
  }
  url && (conf.params.url = url);
  partner && (conf.params.partner = partner);

  return conf;
}
