import { novatiqIdSubmodule } from 'modules/novatiqIdSystem.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';

describe('novatiqIdSystem', function () {
  describe('getSrcId', function() {
    it('getSrcId should set srcId value to 000 due to undefined parameter in config section', function() {
      const config = { params: { } };
      const configParams = config.params || {};
      const response = novatiqIdSubmodule.getSrcId(configParams);
      expect(response).to.eq('000');
    });

    it('getSrcId should set srcId value to 000 due to missing value in config section', function() {
      const config = { params: { sourceid: '' } };
      const configParams = config.params || {};
      const response = novatiqIdSubmodule.getSrcId(configParams);
      expect(response).to.eq('000');
    });

    it('getSrcId should set value to 000 due to null value in config section', function() {
      const config = { params: { sourceid: null } };
      const configParams = config.params || {};
      const response = novatiqIdSubmodule.getSrcId(configParams);
      expect(response).to.eq('000');
    });

    it('getSrcId should set value to 001 due to wrong length in config section max 3 chars', function() {
      const config = { params: { sourceid: '1234' } };
      const configParams = config.params || {};
      const response = novatiqIdSubmodule.getSrcId(configParams);
      expect(response).to.eq('001');
    });

    it('getSrcId should set value to 002 due to wrong format in config section', function() {
      const config = { params: { sourceid: '1xc' } };
      const configParams = config.params || {};
      const response = novatiqIdSubmodule.getSrcId(configParams);
      expect(response).to.eq('002');
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
