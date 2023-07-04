import { getExternalVideoEventName, getExternalVideoEventPayload } from 'libraries/video/shared/helpers.js';
import { expect } from 'chai';

describe('Helpers', function () {
  describe('getExternalVideoEventName', function () {
    it('should append video prefix and stay camelcase', function () {
      expect(getExternalVideoEventName('eventName')).to.equal('videoEventName');
      expect(getExternalVideoEventName(null)).to.equal('');
    });
  });

  describe('getExternalVideoEventPayload', function () {
    it('should include type in payload when absent', function () {
      const testType = 'testType';
      const payloadWithType = { datum: 'datum', type: 'existingType' };
      expect(getExternalVideoEventPayload(testType, payloadWithType).type).to.equal('existingType');

      const payloadWithoutType = { datum: 'datum' };
      expect(getExternalVideoEventPayload(testType, payloadWithoutType).type).to.equal(testType);
    });
  });
});
