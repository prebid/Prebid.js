import { justIdSubmodule, ConfigWrapper, jtUtils } from 'modules/justIdSystem.js';

const DEFAULT_URL = 'https://id.nsaudience.pl/getId.js';
const DEFAULT_PARTNER = 'pbjs-just-id-module';

describe('JustIdSystem', function () {
  describe('getUrl', function() {
    it('defaultUrl', function() {
      expect(new ConfigWrapper({}).getUrl().toString()).to.eq(expectedUrl(DEFAULT_URL, DEFAULT_PARTNER));
    })

    it('customPartner', function() {
      const partner = 'abc';
      expect(new ConfigWrapper({params: {partner: partner}}).getUrl()).to.eq(expectedUrl(DEFAULT_URL, partner));
    })

    it('customUrl', function() {
      const url = 'https://example.com/getId.js';
      expect(new ConfigWrapper({params: {url: url}}).getUrl()).to.eq(expectedUrl(url, DEFAULT_PARTNER));
    })

    it('customPartnerAndUrl', function() {
      const partner = 'abc';
      const url = 'https://example.com/getId.js';
      expect(new ConfigWrapper({params: {partner: partner, url: url}}).getUrl()).to.eq(expectedUrl(url, partner));
    })
  });

  describe('decode', function() {
    it('decode justId', function() {
      const justId = 'aaa';
      expect(justIdSubmodule.decode({uid: justId})).to.deep.eq({justId: justId});
    })
  });

  describe('getId atm', function() {
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

  describe('getId advanced', function() {
    const scriptTag = document.createElement('script');

    const onPrebidGetId = sinon.stub().callsFake(event => {
      var cacheIdObj = event.detail && event.detail.cacheIdObj;
      var justId = (cacheIdObj && cacheIdObj.uid && cacheIdObj.uid + '-x') || 'user123';
      scriptTag.dispatchEvent(new CustomEvent('justIdReady', { detail: { justId: justId } }));
    });

    scriptTag.addEventListener('prebidGetId', onPrebidGetId)

    sinon.stub(jtUtils, 'createScriptTag').returns(scriptTag);

    it('without cachedIdObj', function() {
      const callbackSpy = sinon.spy();
      justIdSubmodule.getId({ params: { mode: 'ADVANCED' } }).callback(callbackSpy);

      scriptTag.onload();

      expect(callbackSpy.lastCall.lastArg.uid).to.equal('user123');
    });

    it('with cachedIdObj', function() {
      const callbackSpy = sinon.spy();

      justIdSubmodule.getId({ params: { mode: 'ADVANCED' } }, undefined, { uid: 'userABC' }).callback(callbackSpy);

      scriptTag.onload();

      expect(callbackSpy.lastCall.lastArg.uid).to.equal('userABC-x');
    });

    it('check getId arguments are passed to prebidGetId event', function() {
      const callbackSpy = sinon.spy();

      const a = { params: { mode: 'ADVANCED' } }
      const b = { y: 'y' }
      const c = { z: 'z' }

      justIdSubmodule.getId(a, b, c).callback(callbackSpy);

      scriptTag.onload();

      expect(onPrebidGetId.lastCall.lastArg.detail).to.deep.eq({ config: a, consentData: b, cacheIdObj: c });
    });
  });
});

function expectedUrl(url, srcId) {
  return `${url}?sourceId=${srcId}`
}
