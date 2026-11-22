import { acxiomRealIdSubmodule, dep } from 'modules/acxiomRealIdSystem.ts';
import { gdprDataHandler, uspDataHandler, gppDataHandler } from 'src/adapterManager.js';
import { expect } from 'chai';

const PARTNER_ID = 'TEST_PARTNER_01';
const REAL_ID_TOKEN = 'acxiom-real-id-token-abc123';
const HEM = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const STORAGE_NAME = 'acxiomRealId';

function mockHandle() {
  return { get: sinon.spy(), manage: sinon.spy(), set: sinon.spy(), touch: sinon.spy(), remove: sinon.spy() };
}

function getId(config, consentData, storedId = undefined, handle = mockHandle()) {
  return acxiomRealIdSubmodule.getId(config, consentData, storedId, handle);
}

function makeEidResponse(token, atype) {
  return JSON.stringify({
    requestId: '4b61d73a-test',
    generatedAt: '2026-01-27T19:27:40Z',
    expiresAt: '2026-02-26T19:27:40Z',
    user: {
      eids: [{
        source: 'acxiom.id',
        uids: [{ id: token, atype: atype || 1 }]
      }]
    }
  });
}

function makeEmptyResponse() {
  return JSON.stringify({
    requestId: '4b61d73a-test',
    generatedAt: '2026-01-27T19:27:40Z',
    user: {
      eids: []
    }
  });
}

describe('acxiomRealIdSystem', () => {
  describe('name', () => {
    it('should expose the correct module name', () => {
      expect(acxiomRealIdSubmodule.name).to.equal('acxiomRealId');
    });
  });

  describe('decode', () => {
    it('should return acxiomRealId object when given an object with id and atype', () => {
      const stored = { id: REAL_ID_TOKEN, atype: 1 };
      const result = acxiomRealIdSubmodule.decode(stored);
      expect(result).to.deep.equal({ acxiomRealId: { id: REAL_ID_TOKEN, atype: 1 } });
    });

    it('should handle legacy string values with default atype', () => {
      const result = acxiomRealIdSubmodule.decode(REAL_ID_TOKEN);
      expect(result).to.deep.equal({ acxiomRealId: { id: REAL_ID_TOKEN, atype: 1 } });
    });

    it('should preserve atype from stored object', () => {
      const stored = { id: REAL_ID_TOKEN, atype: 3 };
      const result = acxiomRealIdSubmodule.decode(stored);
      expect(result).to.deep.equal({ acxiomRealId: { id: REAL_ID_TOKEN, atype: 3 } });
    });

    it('should return undefined for null', () => {
      expect(acxiomRealIdSubmodule.decode(null)).to.be.undefined;
    });

    it('should return undefined for empty string', () => {
      expect(acxiomRealIdSubmodule.decode('')).to.be.undefined;
    });

    it('should return undefined for object without id', () => {
      expect(acxiomRealIdSubmodule.decode({ atype: 1 })).to.be.undefined;
    });

    describe('post-load consent suppression', () => {
      let gdprStub, uspStub, gppStub;

      beforeEach(() => {
        gdprStub = sinon.stub(gdprDataHandler, 'getConsentData');
        uspStub = sinon.stub(uspDataHandler, 'getConsentData');
        gppStub = sinon.stub(gppDataHandler, 'getConsentData');
        gdprStub.returns(null);
        uspStub.returns(null);
        gppStub.returns(null);
      });

      afterEach(() => {
        sinon.restore();
      });

      it('should return EID when no consent signals block', () => {
        const result = acxiomRealIdSubmodule.decode(REAL_ID_TOKEN);
        expect(result).to.deep.equal({ acxiomRealId: { id: REAL_ID_TOKEN, atype: 1 } });
      });

      it('should suppress when GDPR handler reports gdprApplies', () => {
        gdprStub.returns({ gdprApplies: true, consentString: 'BOtest' });
        const result = acxiomRealIdSubmodule.decode(REAL_ID_TOKEN);
        expect(result).to.be.undefined;
      });

      it('should suppress when USP handler reports opt-out', () => {
        uspStub.returns('1YYN');
        const result = acxiomRealIdSubmodule.decode(REAL_ID_TOKEN);
        expect(result).to.be.undefined;
      });

      it('should suppress when GPP handler reports SaleOptOut', () => {
        gppStub.returns({
          applicableSections: [7],
          parsedSections: { usnat: { Version: 1, SaleOptOut: 1, SharingOptOut: 2 } }
        });
        const result = acxiomRealIdSubmodule.decode(REAL_ID_TOKEN);
        expect(result).to.be.undefined;
      });

      it('should suppress when GPP handler reports SharingOptOut', () => {
        gppStub.returns({
          applicableSections: [8],
          parsedSections: { usca: { Version: 1, SaleOptOut: 2, SharingOptOut: 1 } }
        });
        const result = acxiomRealIdSubmodule.decode(REAL_ID_TOKEN);
        expect(result).to.be.undefined;
      });
    });
  });

  describe('getId', () => {
    it('should return undefined when partnerId is missing', () => {
      const result = acxiomRealIdSubmodule.getId({ params: {} });
      expect(result).to.be.undefined;
    });

    it('should return undefined when params are missing', () => {
      const result = acxiomRealIdSubmodule.getId({});
      expect(result).to.be.undefined;
    });

    it('should return a callback function', () => {
      const result = acxiomRealIdSubmodule.getId(
        { params: { partnerId: PARTNER_ID } },
        {}
      );
      expect(result).to.have.property('callback');
      expect(result.callback).to.be.a('function');
    });

    describe('consent suppression', () => {
      describe('EU/UK — TCF passive suppression', () => {
        it('should suppress when gdprApplies is true and consentString is present', () => {
          const result = getId(
            { params: { partnerId: PARTNER_ID } },
            { gdpr: { gdprApplies: true, consentString: 'BOtest' } }
          );
          expect(result).to.be.undefined;
        });

        it('should suppress when gdprApplies is true even without consentString', () => {
          const result = getId(
            { params: { partnerId: PARTNER_ID } },
            { gdpr: { gdprApplies: true } }
          );
          expect(result).to.be.undefined;
        });

        it('should suppress when consentString is present even if gdprApplies is false', () => {
          const result = getId(
            { params: { partnerId: PARTNER_ID } },
            { gdpr: { gdprApplies: false, consentString: 'BOtest' } }
          );
          expect(result).to.be.undefined;
        });
      });

      describe('US — CCPA', () => {
        it('should suppress when us_privacy position 3 = Y (opted out of sale)', () => {
          const result = getId(
            { params: { partnerId: PARTNER_ID } },
            { usp: '1YYN' }
          );
          expect(result).to.be.undefined;
        });

        it('should not suppress when us_privacy position 3 = N (not opted out)', () => {
          const result = getId(
            { params: { partnerId: PARTNER_ID } },
            { usp: '1YNN' }
          );
          expect(result).to.have.property('callback');
        });

        it('should not suppress when us_privacy string is too short', () => {
          const result = getId(
            { params: { partnerId: PARTNER_ID } },
            { usp: '1Y' }
          );
          expect(result).to.have.property('callback');
        });
      });

      describe('US — GPP', () => {
        it('should suppress when GPP usnat SaleOptOut = 1', () => {
          const result = getId(
            { params: { partnerId: PARTNER_ID } },
            {
              gpp: {
                applicableSections: [7],
                parsedSections: { usnat: { Version: 1, SaleOptOut: 1, SharingOptOut: 2 } }
              }
            }
          );
          expect(result).to.be.undefined;
        });

        it('should suppress when GPP usnat SharingOptOut = 1', () => {
          const result = getId(
            { params: { partnerId: PARTNER_ID } },
            {
              gpp: {
                applicableSections: [7],
                parsedSections: { usnat: { Version: 1, SaleOptOut: 2, SharingOptOut: 1 } }
              }
            }
          );
          expect(result).to.be.undefined;
        });

        it('should suppress when GPP usca (California) SaleOptOut = 1', () => {
          const result = getId(
            { params: { partnerId: PARTNER_ID } },
            {
              gpp: {
                applicableSections: [8],
                parsedSections: { usca: { Version: 1, SaleOptOut: 1, SharingOptOut: 2 } }
              }
            }
          );
          expect(result).to.be.undefined;
        });

        it('should not suppress when GPP section has no opt-out', () => {
          const result = getId(
            { params: { partnerId: PARTNER_ID } },
            {
              gpp: {
                applicableSections: [7],
                parsedSections: { usnat: { Version: 1, SaleOptOut: 2, SharingOptOut: 2 } }
              }
            }
          );
          expect(result).to.have.property('callback');
        });

        it('should not suppress when applicable section is non-US', () => {
          const result = getId(
            { params: { partnerId: PARTNER_ID } },
            {
              gpp: {
                applicableSections: [2],
                parsedSections: {}
              }
            }
          );
          expect(result).to.have.property('callback');
        });

        it('should handle subsection arrays by flattening', () => {
          const result = getId(
            { params: { partnerId: PARTNER_ID } },
            {
              gpp: {
                applicableSections: [7],
                parsedSections: { usnat: [{ Version: 1, SaleOptOut: 2 }, { SaleOptOut: 1 }] }
              }
            }
          );
          expect(result).to.be.undefined;
        });
      });

      describe('token deletion on consent block', () => {
        it('should delete the stored token through the storage handle when consent is blocked', () => {
          const handle = mockHandle();
          getId({ params: { partnerId: PARTNER_ID }, storage: { name: STORAGE_NAME } }, { usp: '1YYN' }, 'stored', handle);
          sinon.assert.calledOnce(handle.remove);
        });

        it('should not delete the stored token when consent is not blocked', () => {
          const handle = mockHandle();
          getId({ params: { partnerId: PARTNER_ID }, storage: { name: STORAGE_NAME } }, { usp: '1YNN' }, 'stored', handle);
          sinon.assert.notCalled(handle.remove);
        });
      });

      it('should not suppress when no consent data is provided', () => {
        const result = getId(
          { params: { partnerId: PARTNER_ID } },
          {}
        );
        expect(result).to.have.property('callback');
      });
    });

    describe('API call', () => {
      let ajaxBuilderStub;

      afterEach(() => {
        if (ajaxBuilderStub) {
          ajaxBuilderStub.restore();
          ajaxBuilderStub = null;
        }
      });

      it('should POST to the default API URL with partnerId and default sourceId in body', (done) => {
        let capturedUrl, capturedBody, capturedOptions;
        ajaxBuilderStub = sinon.stub(dep, 'ajaxBuilder').returns(
          (url, callbacks, body, options) => {
            capturedUrl = url;
            capturedBody = body;
            capturedOptions = options;
            callbacks.success(makeEidResponse(REAL_ID_TOKEN, 1));
          }
        );

        const result = acxiomRealIdSubmodule.getId(
          { params: { partnerId: PARTNER_ID } },
          {}
        );

        result.callback((id) => {
          expect(capturedUrl).to.equal('https://ids.api.gcprivacy.id/v1/eid/l');
          const payload = JSON.parse(capturedBody);
          expect(payload.partnerId).to.equal(PARTNER_ID);
          expect(payload.sourceId).to.equal('acxiom.id');
          expect(payload.userAgent).to.be.a('string');
          expect(payload.ip).to.equal('');
          expect(capturedOptions.method).to.equal('POST');
          expect(capturedOptions.contentType).to.equal('application/json');
          expect(capturedOptions.withCredentials).to.be.true;
          expect(id).to.deep.equal({ id: REAL_ID_TOKEN, atype: 1 });
          done();
        });
      });

      it('should include HEM in POST body when provided', (done) => {
        let capturedBody;
        ajaxBuilderStub = sinon.stub(dep, 'ajaxBuilder').returns(
          (url, callbacks, body) => {
            capturedBody = body;
            callbacks.success(makeEidResponse(REAL_ID_TOKEN, 1));
          }
        );

        const result = acxiomRealIdSubmodule.getId(
          { params: { partnerId: PARTNER_ID, hem: HEM } },
          {}
        );

        result.callback((id) => {
          const payload = JSON.parse(capturedBody);
          expect(payload.hem).to.equal(HEM);
          expect(id).to.deep.equal({ id: REAL_ID_TOKEN, atype: 1 });
          done();
        });
      });

      it('should not include HEM in POST body when not provided', (done) => {
        let capturedBody;
        ajaxBuilderStub = sinon.stub(dep, 'ajaxBuilder').returns(
          (url, callbacks, body) => {
            capturedBody = body;
            callbacks.success(makeEidResponse(REAL_ID_TOKEN, 1));
          }
        );

        const result = acxiomRealIdSubmodule.getId(
          { params: { partnerId: PARTNER_ID } },
          {}
        );

        result.callback(() => {
          const payload = JSON.parse(capturedBody);
          expect(payload).to.not.have.property('hem');
          done();
        });
      });

      it('should use custom sourceId in POST body when provided', (done) => {
        let capturedBody;
        const customSourceId = 'custom.source';
        ajaxBuilderStub = sinon.stub(dep, 'ajaxBuilder').returns(
          (url, callbacks, body) => {
            capturedBody = body;
            callbacks.success(makeEidResponse(REAL_ID_TOKEN, 1));
          }
        );

        const result = acxiomRealIdSubmodule.getId(
          { params: { partnerId: PARTNER_ID, sourceId: customSourceId } },
          {}
        );

        result.callback((id) => {
          const payload = JSON.parse(capturedBody);
          expect(payload.sourceId).to.equal(customSourceId);
          expect(id).to.deep.equal({ id: REAL_ID_TOKEN, atype: 1 });
          done();
        });
      });

      it('should use custom API URL when provided', (done) => {
        let capturedUrl;
        const customUrl = 'https://custom.example.com/v1/eid/l';
        ajaxBuilderStub = sinon.stub(dep, 'ajaxBuilder').returns(
          (url, callbacks) => {
            capturedUrl = url;
            callbacks.success(makeEidResponse(REAL_ID_TOKEN, 1));
          }
        );

        const result = acxiomRealIdSubmodule.getId(
          { params: { partnerId: PARTNER_ID, apiUrl: customUrl } },
          {}
        );

        result.callback((id) => {
          expect(capturedUrl).to.equal(customUrl);
          expect(id).to.deep.equal({ id: REAL_ID_TOKEN, atype: 1 });
          done();
        });
      });

      it('should strip trailing slashes from custom API URL', (done) => {
        let capturedUrl;
        ajaxBuilderStub = sinon.stub(dep, 'ajaxBuilder').returns(
          (url, callbacks) => {
            capturedUrl = url;
            callbacks.success(makeEidResponse(REAL_ID_TOKEN, 1));
          }
        );

        const result = acxiomRealIdSubmodule.getId(
          { params: { partnerId: PARTNER_ID, apiUrl: 'https://custom.example.com/v1/eid/l///' } },
          {}
        );

        result.callback(() => {
          expect(capturedUrl).to.equal('https://custom.example.com/v1/eid/l');
          done();
        });
      });

      it('should preserve atype from API response', (done) => {
        ajaxBuilderStub = sinon.stub(dep, 'ajaxBuilder').returns(
          (url, callbacks) => {
            callbacks.success(makeEidResponse(REAL_ID_TOKEN, 3));
          }
        );

        const result = acxiomRealIdSubmodule.getId(
          { params: { partnerId: PARTNER_ID } },
          {}
        );

        result.callback((id) => {
          expect(id).to.deep.equal({ id: REAL_ID_TOKEN, atype: 3 });
          done();
        });
      });

      it('should call callback with undefined on no-match response', (done) => {
        ajaxBuilderStub = sinon.stub(dep, 'ajaxBuilder').returns(
          (url, callbacks) => {
            callbacks.success(JSON.stringify({ requestId: 'test', user: {} }));
          }
        );

        const result = acxiomRealIdSubmodule.getId(
          { params: { partnerId: PARTNER_ID } },
          {}
        );

        result.callback((id) => {
          expect(id).to.be.undefined;
          done();
        });
      });

      it('should call callback with undefined when eids array is empty', (done) => {
        ajaxBuilderStub = sinon.stub(dep, 'ajaxBuilder').returns(
          (url, callbacks) => {
            callbacks.success(makeEmptyResponse());
          }
        );

        const result = acxiomRealIdSubmodule.getId(
          { params: { partnerId: PARTNER_ID } },
          {}
        );

        result.callback((id) => {
          expect(id).to.be.undefined;
          done();
        });
      });

      it('should call callback with undefined on API error', (done) => {
        ajaxBuilderStub = sinon.stub(dep, 'ajaxBuilder').returns(
          (url, callbacks) => {
            callbacks.error('server error');
          }
        );

        const result = acxiomRealIdSubmodule.getId(
          { params: { partnerId: PARTNER_ID } },
          {}
        );

        result.callback((id) => {
          expect(id).to.be.undefined;
          done();
        });
      });

      it('should call callback with undefined on malformed JSON response', (done) => {
        ajaxBuilderStub = sinon.stub(dep, 'ajaxBuilder').returns(
          (url, callbacks) => {
            callbacks.success('not json');
          }
        );

        const result = acxiomRealIdSubmodule.getId(
          { params: { partnerId: PARTNER_ID } },
          {}
        );

        result.callback((id) => {
          expect(id).to.be.undefined;
          done();
        });
      });
    });
  });

  describe('extendId', () => {
    const config = { params: { partnerId: PARTNER_ID }, storage: { name: STORAGE_NAME } };

    [
      ['GDPR applies', { gdpr: { gdprApplies: true, consentString: 'BOtest' } }],
      ['USP opts out of sale', { usp: '1YYN' }],
      ['GPP opts out of sale', { gpp: { applicableSections: [7], parsedSections: { usnat: { SaleOptOut: 1 } } } }]
    ].forEach(([desc, consentData]) => {
      it(`should delete the stored token when ${desc}`, () => {
        const handle = mockHandle();
        expect(acxiomRealIdSubmodule.extendId(config, consentData, REAL_ID_TOKEN, handle)).to.be.undefined;
        sinon.assert.calledOnce(handle.remove);
      });
    });

    it('should leave storage and the ID untouched when consent is not blocked', () => {
      const handle = mockHandle();
      expect(acxiomRealIdSubmodule.extendId(config, { usp: '1YNN' }, REAL_ID_TOKEN, handle)).to.be.undefined;
      Object.values(handle).forEach(method => sinon.assert.notCalled(method));
    });
  });

  describe('eids', () => {
    it('should be a function that builds EID from decoded data', () => {
      const eidFn = acxiomRealIdSubmodule.eids.acxiomRealId;
      expect(eidFn).to.be.a('function');
    });

    it('should produce correct EID with atype from data', () => {
      const eidFn = acxiomRealIdSubmodule.eids.acxiomRealId;
      const result = eidFn([{ id: REAL_ID_TOKEN, atype: 1 }]);
      expect(result).to.deep.equal([{
        source: 'acxiom.id',
        uids: [{ id: REAL_ID_TOKEN, atype: 1 }]
      }]);
    });

    it('should preserve atype 3 from data', () => {
      const eidFn = acxiomRealIdSubmodule.eids.acxiomRealId;
      const result = eidFn([{ id: REAL_ID_TOKEN, atype: 3 }]);
      expect(result).to.deep.equal([{
        source: 'acxiom.id',
        uids: [{ id: REAL_ID_TOKEN, atype: 3 }]
      }]);
    });
  });
});
