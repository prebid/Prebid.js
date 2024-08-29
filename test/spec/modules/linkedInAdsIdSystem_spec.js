import {
  linkedInAdsIdSubmodule,
  BrowserStorage
} from 'modules/linkedInAdsIdSystem.js';
import * as Utils from '../../../src/utils.js';
import { uspDataHandler, coppaDataHandler, gdprDataHandler } from 'src/adapterManager.js';

describe('LinkedIn Ads ID module', () => {
  const LI_FAT_COOKIE = 'li_fat';
  const LI_GIANT_COOKIE = 'li_giant';
  const dummyLiFat = '12345abc';
  const dummyLiGiant = '67890xyz';

  describe('getCookieIds', () => {
    it('should return li_fat and li_giant cookies', () => {
      const storageStub = sinon.stub(BrowserStorage, 'getCookie');

      storageStub.withArgs(LI_FAT_COOKIE).returns(dummyLiFat);
      storageStub.withArgs(LI_GIANT_COOKIE).returns(dummyLiGiant);

      const cookies = linkedInAdsIdSubmodule.getCookieIds();

      expect(cookies.li_fat).to.equal(dummyLiFat);
      expect(cookies.li_giant).to.equal(dummyLiGiant);
      storageStub.restore();
    });
  });

  describe('decode', () => {
    it('should return linkedInAdsId and legacy cookies if available', () => {
      const storageStub = sinon.stub(BrowserStorage, 'getCookie');
      storageStub.withArgs(LI_FAT_COOKIE).returns(dummyLiFat);
      storageStub.withArgs(LI_GIANT_COOKIE).returns(dummyLiGiant);

      const id = '12345abcde';
      const decoded = linkedInAdsIdSubmodule.decode(id);

      expect(decoded.linkedInAdsId).to.deep.equal({
        li_adsId: id,
        ext: {
          li_fat: dummyLiFat,
          li_giant: dummyLiGiant
        }
      });
      storageStub.restore();
    });
  });

  describe('getId', () => {
    it('should generate and save a new ID', () => {
      const genUuidStub = sinon.stub().returns('dummyId123');
      Utils.generateUUID = genUuidStub;

      const hasConsentStub = sinon.stub(linkedInAdsIdSubmodule, 'hasConsent');
      hasConsentStub.returns(true);

      const id = linkedInAdsIdSubmodule.getId();
      expect(id).to.deep.equal({
        id: 'dummyId123'
      });

      expect(genUuidStub.calledOnce).to.be.true;
      hasConsentStub.restore();
    });
  });

  describe('Consent checks `hasConsent`', () => {
    let gdprStub, ccpaStub, coppaStub;

    beforeEach(() => {
      gdprStub = sinon.stub(gdprDataHandler, 'getConsentData');
      ccpaStub = sinon.stub(uspDataHandler, 'getConsentData');
      coppaStub = sinon.stub(coppaDataHandler, 'getCoppa');
    });

    afterEach(() => {
      gdprStub.restore();
      ccpaStub.restore();
      coppaStub.restore();
    });

    it('should return false if GDPR consent missing', () => {
      ccpaStub.returns('1YNN');
      gdprStub.returns({gdprApplies: true});
      expect(linkedInAdsIdSubmodule.hasConsent()).to.be.false;
    });

    it('should return false if CCPA opt-out', () => {
      ccpaStub.returns('1YYN');
      expect(linkedInAdsIdSubmodule.hasConsent()).to.be.false;
    });

    it('should return false if COPPA applicable', () => {
      ccpaStub.returns('1YNN');
      coppaStub.returns(true);
      expect(linkedInAdsIdSubmodule.hasConsent()).to.be.false;
    });

    it('should return true if all consents present', () => {
      gdprStub.returns({gdprApplies: false});
      ccpaStub.returns('1YNN');
      coppaStub.returns(false);
      expect(linkedInAdsIdSubmodule.hasConsent()).to.be.true;
    });
  });
});
