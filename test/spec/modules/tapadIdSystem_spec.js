import { tapadIdSubmodule, graphUrl, storage, tapadCookieKey, pastDateString, defaultExpirationString } from 'modules/tapadIdSystem.js';
import * as utils from 'src/utils.js';

import { server } from 'test/mocks/xhr.js';

describe('TapadIdSystem', function () {
  describe('getId', function() {
    let setCookieSpy;
    beforeEach(() => {
      setCookieSpy = sinon.spy(storage, 'setCookie');
    })
    afterEach(() => {
      setCookieSpy.restore()
    })

    it('should call to real time graph endpoint and handle valid response', function() {
      const callbackSpy = sinon.spy()
      const callback = tapadIdSubmodule.getId({
        params: { companyId: 12345 }
      }).callback
      callback(callbackSpy);

      const request = server.requests[0]
      expect(request.url).to.eq(`${graphUrl}?company_id=12345&tapad_id_type=TAPAD_ID`)

      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ tapadId: 'your-tapad-id' }))
      expect(callbackSpy.lastCall.lastArg).to.eq('your-tapad-id');
      expect(setCookieSpy.lastCall.calledWith(tapadCookieKey, 'your-tapad-id', defaultExpirationString)).to.be.true
    })

    it('should remove stored tapadId if not found', function() {
      const callbackSpy = sinon.spy()
      const callback = tapadIdSubmodule.getId({}).callback
      callback(callbackSpy);

      const request = server.requests[0]

      request.respond(404)
      expect(callbackSpy.lastCall.lastArg).to.be.undefined;
      expect(setCookieSpy.lastCall.calledWith(tapadCookieKey, undefined, pastDateString)).to.be.true
    })
    it('should log message with invalid company id', function() {
      const logMessageSpy = sinon.spy(utils, 'logMessage');
      const callbackSpy = sinon.spy()
      const callback = tapadIdSubmodule.getId({}).callback
      callback(callbackSpy);

      const request = server.requests[0]

      request.respond(403)
      expect(logMessageSpy.lastCall.lastArg).to.eq('Invalid Company Id. Contact prebid@tapad.com for assistance.')
      logMessageSpy.restore()
    })
  })
})
