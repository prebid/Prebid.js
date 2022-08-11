import { adriverIdSubmodule, storage } from 'modules/adriverIdSystem.js';
import { server } from 'test/mocks/xhr.js';
import * as utils from '../../../src/utils.js';

describe('AdriverIdSystem', function () {
  describe('getId', function() {
    let setCookieStub, setLocalStorageStub, removeFromLocalStorageStub, logErrorStub;

    beforeEach(function() {
      setCookieStub = sinon.stub(storage, 'setCookie');
      setLocalStorageStub = sinon.stub(storage, 'setDataInLocalStorage');
      removeFromLocalStorageStub = sinon.stub(storage, 'removeDataFromLocalStorage');
      logErrorStub = sinon.stub(utils, 'logError');
    });

    afterEach(function () {
      setCookieStub.restore();
      setLocalStorageStub.restore();
      removeFromLocalStorageStub.restore();
      logErrorStub.restore();
    });

    it('should log an error and continue to callback if request errors', function () {
      const config = {
        params: {}
      };

      const callbackSpy = sinon.spy();
      const callback = adriverIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.include('https://ad.adriver.ru/cgi-bin/json.cgi');
      request.respond(503, null, 'Unavailable');
      expect(logErrorStub.calledOnce).to.be.true;
      expect(callbackSpy.calledOnce).to.be.true;
    });

    it('test call user sync url with the right params', function() {
      const config = {
        params: {}
      };

      const callbackSpy = sinon.spy();
      const callback = adriverIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.include('https://ad.adriver.ru/cgi-bin/json.cgi');
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ adrcid: 'testAdriverId' }));
      expect(callbackSpy.lastCall.lastArg).to.deep.equal('testAdriverId');
    });

    const responses = [
      { adrcid: 'adrcidValue' },
      { adrcid: undefined }
    ]

    responses.forEach(response => describe('test user sync response behavior', function () {
      const config = {
        params: {}
      };
      it('should save adrcid if it exists', function () {
        const result = adriverIdSubmodule.getId(config);
        result.callback((id) => {
          expect(id).to.be.deep.equal(response.adrcid ? response.adrcid : undefined);
        });

        let request = server.requests[0];
        request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ adrcid: response.adrcid }));

        let expectedExpiration = new Date();
        expectedExpiration.setTime(expectedExpiration.getTime() + 86400 * 1825 * 1000);
        const minimalDate = new Date(0).toString();

        function dateStringFor(date, maxDeltaMs = 2000) {
          return sinon.match((val) => Math.abs(date.getTime() - new Date(val).getTime()) <= maxDeltaMs)
        }

        if (response.adrcid) {
          expect(setCookieStub.calledWith('adrcid', response.adrcid, dateStringFor(expectedExpiration))).to.be.true;
          expect(setLocalStorageStub.calledWith('adrcid', response.adrcid)).to.be.true;
        } else {
          expect(setCookieStub.calledWith('adrcid', '', minimalDate)).to.be.false;
          expect(removeFromLocalStorageStub.calledWith('adrcid')).to.be.false;
        }
      });
    }));
  });
});
