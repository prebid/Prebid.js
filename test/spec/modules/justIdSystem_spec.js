import { justIdSubmodule, jtUtils } from 'modules/justIdSystem.js';

const DEFAULT_URL = 'https://id.nsaudience.pl/getId.js';
const DEFAULT_PARTNER = 'pbjs-just-id-module';

describe('JustIdSystem', function () {
  describe('getUrl', function() {
    it('defaultUrl', function() {
      expect(jtUtils.getUrl({}).toString()).to.eq(expectedUrl(DEFAULT_URL, DEFAULT_PARTNER));
    })

    it('customPartner', function() {
      const partner = 'abc';
      expect(jtUtils.getUrl({params: {partner: partner}}).toString()).to.eq(expectedUrl(DEFAULT_URL, partner));
    })

    it('customUrl', function() {
      const url = 'https://example.com/getId.js';
      expect(jtUtils.getUrl({params: {url: url}}).toString()).to.eq(expectedUrl(url, DEFAULT_PARTNER));
    })

    it('customPartnerAndUrl', function() {
      const partner = 'abc';
      const url = 'https://example.com/getId.js';
      expect(jtUtils.getUrl({params: {partner: partner, url: url}}).toString()).to.eq(expectedUrl(url, partner));
    })
  });

  describe('decode', function() {
    it('decode justId', function() {
      const justId = 'aaa';
      expect(justIdSubmodule.decode({uid: justId})).to.deep.eq({justId: justId});
    })
  });

  describe('getId', function() {
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

      justIdSubmodule.getId().callback(callbackSpy);

      scriptTag.onload();

      expect(callbackSpy.lastCall.lastArg.uid).to.equal('user123');
    });

    it('with cachedIdObj', function() {
      const callbackSpy = sinon.spy();

      justIdSubmodule.getId(undefined, undefined, { uid: 'userABC' }).callback(callbackSpy);

      scriptTag.onload();

      expect(callbackSpy.lastCall.lastArg.uid).to.equal('userABC-x');
    });

    it('check getId arguments are passed to prebidGetId event', function() {
      const callbackSpy = sinon.spy();

      const a = { x: 'x' }
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
