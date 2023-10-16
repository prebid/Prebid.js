import { tapadIdSubmodule, graphUrl } from 'modules/tapadIdSystem.js';
import * as utils from 'src/utils.js';

import { server } from 'test/mocks/xhr.js';

describe('TapadIdSystem', function () {
  describe('getId', function() {
    const config = { params: { companyId: 12345 } };
    it('should call to real time graph endpoint and handle valid response', function() {
      const callbackSpy = sinon.spy();
      const callback = tapadIdSubmodule.getId(config).callback;
      callback(callbackSpy);

      const request = server.requests[0];
      expect(request.url).to.eq(`${graphUrl}?company_id=12345&tapad_id_type=TAPAD_ID`);

      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ tapadId: 'your-tapad-id' }));
      expect(callbackSpy.lastCall.lastArg).to.eq('your-tapad-id');
    });

    it('should remove stored tapadId if not found', function() {
      const callbackSpy = sinon.spy();
      const callback = tapadIdSubmodule.getId(config).callback;
      callback(callbackSpy);

      const request = server.requests[0];

      request.respond(404);
      expect(callbackSpy.lastCall.lastArg).to.be.undefined;
    });

    it('should log message with invalid company id', function() {
      const logMessageSpy = sinon.spy(utils, 'logMessage');
      const callbackSpy = sinon.spy();
      const callback = tapadIdSubmodule.getId(config).callback;
      callback(callbackSpy);

      const request = server.requests[0];

      request.respond(403);
      expect(logMessageSpy.lastCall.lastArg).to.eq('Invalid Company Id. Contact prebid@tapad.com for assistance.');
      logMessageSpy.restore();
    });

    it('should log message if company id not given', function() {
      const logMessageSpy = sinon.spy(utils, 'logMessage');
      const callbackSpy = sinon.spy();
      const callback = tapadIdSubmodule.getId({}).callback;
      callback(callbackSpy);

      expect(logMessageSpy.lastCall.lastArg).to.eq('Please provide a valid Company Id. Contact prebid@tapad.com for assistance.');
      logMessageSpy.restore();
    });

    it('should log message if company id is incorrect format', function() {
      const logMessageSpy = sinon.spy(utils, 'logMessage');
      const callbackSpy = sinon.spy();
      const callback = tapadIdSubmodule.getId({ params: { companyId: 'notANumber' } }).callback;
      callback(callbackSpy);

      expect(logMessageSpy.lastCall.lastArg).to.eq('Please provide a valid Company Id. Contact prebid@tapad.com for assistance.');
      logMessageSpy.restore();
    });
  });
})
