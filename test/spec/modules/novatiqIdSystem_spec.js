import { novatiqIdSubmodule } from 'modules/novatiqIdSystem.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';

describe('novatiqIdSystem', function () {
  let urlParams = {
    novatiqId: 'snowflake',
    useStandardUuid: false,
    useSspId: true,
    useSspHost: true
  }

  describe('getSrcId', function() {
    it('getSrcId should set srcId value to 000 due to undefined parameter in config section', function() {
      const config = { params: { } };
      const configParams = config.params || {};
      const response = novatiqIdSubmodule.getSrcId(configParams, urlParams);
      expect(response).to.eq('000');
    });

    it('getSrcId should set srcId value to 000 due to missing value in config section', function() {
      const config = { params: { sourceid: '' } };
      const configParams = config.params || {};
      const response = novatiqIdSubmodule.getSrcId(configParams, urlParams);
      expect(response).to.eq('000');
    });

    it('getSrcId should set value to 000 due to null value in config section', function() {
      const config = { params: { sourceid: null } };
      const configParams = config.params || {};
      const response = novatiqIdSubmodule.getSrcId(configParams, urlParams);
      expect(response).to.eq('000');
    });

    it('getSrcId should set value to 001 due to wrong length in config section max 3 chars', function() {
      const config = { params: { sourceid: '1234' } };
      const configParams = config.params || {};
      const response = novatiqIdSubmodule.getSrcId(configParams, urlParams);
      expect(response).to.eq('001');
    });
  });

  describe('getId', function() {
    it('should log message if novatiqId has wrong format', function() {
      const config = { params: { sourceid: '123' } };
      const response = novatiqIdSubmodule.getId(config);
      expect(response.id).to.have.length(40);
    });

    it('should log message if novatiqId not provided', function() {
      const config = { params: { sourceid: '123' } };
      const response = novatiqIdSubmodule.getId(config);
      expect(response.id).should.be.not.empty;
    });

    it('should set sharedStatus if sharedID is configured but returned null', function() {
      const config = { params: { sourceid: '123', useSharedId: true } };
      const response = novatiqIdSubmodule.getId(config);
      expect(response.sharedStatus).to.equal('Not Found');
    });

    it('should set sharedStatus if sharedID is configured and is valid', function() {
      const config = { params: { sourceid: '123', useSharedId: true } };

      let stub = sinon.stub(novatiqIdSubmodule, 'getSharedId').returns('fakeId');

      const response = novatiqIdSubmodule.getId(config);

      stub.restore();

      expect(response.sharedStatus).to.equal('Found');
    });

    it('should set sharedStatus if sharedID is configured and is valid when making an async call', function() {
      const config = { params: { sourceid: '123', useSharedId: true, useCallbacks: true } };

      let stub = sinon.stub(novatiqIdSubmodule, 'getSharedId').returns('fakeId');

      const response = novatiqIdSubmodule.getId(config);

      stub.restore();

      expect(response.sharedStatus).to.equal('Found');
    });
  });

  describe('getUrlParams', function() {
    it('should return default url parameters when none set', function() {
      const defaultUrlParams = {
        novatiqId: 'snowflake',
        useStandardUuid: false,
        useSspId: true,
        useSspHost: true
      }

      const config = { params: { sourceid: '123' } };
      const response = novatiqIdSubmodule.getUrlParams(config);

      expect(response).to.deep.equal(defaultUrlParams);
    });

    it('should return custom url parameters when set', function() {
      let customUrlParams = {
        novatiqId: 'hyperid',
        useStandardUuid: true,
        useSspId: false,
        useSspHost: false
      }

      const config = {
        sourceid: '123',
        urlParams: {
          novatiqId: 'hyperid',
          useStandardUuid: true,
          useSspId: false,
          useSspHost: false
        }
      };
      const response = novatiqIdSubmodule.getUrlParams(config);

      expect(response).to.deep.equal(customUrlParams);
    });
  });

  describe('sendAsyncSyncRequest', function() {
    it('should return an async function when called asynchronously', function() {
      const defaultUrlParams = {
        novatiqId: 'snowflake',
        useStandardUuid: false,
        useSspId: true,
        useSspHost: true
      }

      const url = novatiqIdSubmodule.getSyncUrl(false, '', defaultUrlParams);
      const response = novatiqIdSubmodule.sendAsyncSyncRequest('testuuid', url);
      expect(response.callback).should.not.be.empty;
    });
  });

  describe('decode', function() {
    it('should log message if novatiqId has wrong format', function() {
      const novatiqId = '81b001ec-8914-488c-a96e-8c220d4ee08895ef';
      const response = novatiqIdSubmodule.decode(novatiqId);
      expect(response.novatiq.snowflake).to.have.length(40);
    });

    it('should log message if novatiqId has wrong format', function() {
      const novatiqId = '81b001ec-8914-488c-a96e-8c220d4ee08895ef';
      const response = novatiqIdSubmodule.decode(novatiqId);
      expect(response.novatiq.snowflake).should.be.not.empty;
    });
  });
})
