import { attachIdSystem } from '../../../modules/userId/index.js';
import { unifiedIdSubmodule } from '../../../modules/unifiedIdSystem.js';
import { createEidsArray } from '../../../modules/userId/eids.js';
import { expect } from 'chai/index.mjs';
import { server } from 'test/mocks/xhr.js';
import * as refererDetection from '../../../src/refererDetection.js';
import * as utils from '../../../src/utils.js';

describe('Unified ID', () => {
  describe('getId', () => {
    let refererStub;
    const config = { params: { partner: 'test-partner' } };
    const consentString = 'consent+/=&%?#';

    beforeEach(() => {
      refererStub = sinon.stub(refererDetection, 'getRefererInfo').returns({ domain: 'publisher.example' });
    });

    afterEach(() => {
      refererStub.restore();
    });

    function request(consentData, moduleConfig = config) {
      unifiedIdSubmodule.getId(moduleConfig, consentData).callback(sinon.spy());
      return server.requests[0];
    }

    it('should use provided URL verbatim even with consent and domain available', () => {
      const url = 'https://given-url/?gdpr=0&gdpr_consent=custom&domain=custom.example#fragment';
      const req = request({ gdpr: { gdprApplies: true, consentString } }, { params: { url } });
      expect(req.url).to.equal(url);
      expect(refererStub.called).to.be.false;
    });

    it('should use provided URL without consent data', () => {
      expect(request(null, { params: { url: 'https://given-url/' } }).url).to.equal('https://given-url/');
    });

    it('should use partner URL and the detected publisher domain', () => {
      const req = request();
      expect(req.url).to.equal('https://match.adsrvr.org/track/rid?ttd_pid=test-partner&fmt=json&domain=publisher.example');
      expect(req.method).to.equal('GET');
      expect(req.withCredentials).to.be.true;
    });

    it('should encode query values exactly once', () => {
      refererStub.returns({ domain: 'publisher.example&injected=1' });
      const req = request({ gdpr: { gdprApplies: true, consentString } }, { params: { partner: 'partner&value' } });
      const url = new URL(req.url);
      expect(url.searchParams.get('ttd_pid')).to.equal('partner&value');
      expect(url.searchParams.get('gdpr_consent')).to.equal(consentString);
      expect(url.searchParams.get('domain')).to.equal('publisher.example&injected=1');
      expect(url.searchParams.has('injected')).to.be.false;
      expect(req.url).to.include('gdpr_consent=' + encodeURIComponent(consentString));
    });

    [true, false].forEach(gdprApplies => {
      it(`should forward GDPR applicability ${gdprApplies} and the consent string`, () => {
        const query = new URL(request({ gdpr: { gdprApplies, consentString } }).url).searchParams;
        expect(query.get('gdpr')).to.equal(gdprApplies ? '1' : '0');
        expect(query.get('gdpr_consent')).to.equal(consentString);
        expect(query.get('domain')).to.equal('publisher.example');
      });
    });

    [undefined, null, {}, { gdpr: null }, { gdpr: {} }].forEach((consentData, index) => {
      it(`should omit unavailable GDPR signals and still send the domain (case ${index + 1})`, () => {
        const query = new URL(request(consentData).url).searchParams;
        expect(query.has('gdpr')).to.be.false;
        expect(query.has('gdpr_consent')).to.be.false;
        expect(query.get('domain')).to.equal('publisher.example');
      });
    });

    [undefined, null, 0, 1, '1', 'false'].forEach(gdprApplies => {
      it(`should not coerce unknown or nonboolean GDPR applicability ${String(gdprApplies)}`, () => {
        const query = new URL(request({ gdpr: { gdprApplies, consentString } }).url).searchParams;
        expect(query.has('gdpr')).to.be.false;
        expect(query.get('gdpr_consent')).to.equal(consentString);
      });
    });

    [undefined, null, '', 123, {}].forEach((consentString, index) => {
      it(`should omit missing, empty, or nonstring consent (case ${index + 1})`, () => {
        const query = new URL(request({ gdpr: { gdprApplies: true, consentString } }).url).searchParams;
        expect(query.get('gdpr')).to.equal('1');
        expect(query.has('gdpr_consent')).to.be.false;
        expect(query.get('domain')).to.equal('publisher.example');
      });
    });

    [undefined, null, ''].forEach(domain => {
      it(`should continue without a domain when it is ${String(domain)}`, () => {
        refererStub.returns({ domain });
        const query = new URL(request({ gdpr: { gdprApplies: true, consentString } }).url).searchParams;
        expect(query.has('domain')).to.be.false;
        expect(query.get('gdpr')).to.equal('1');
        expect(query.get('gdpr_consent')).to.equal(consentString);
      });
    });

    it('should keep the original partner URL when both consent and domain are unavailable', () => {
      refererStub.returns({ domain: null });
      expect(request().url).to.equal('https://match.adsrvr.org/track/rid?ttd_pid=test-partner&fmt=json');
    });

    [undefined, null, {}, { params: {} }].forEach((moduleConfig, index) => {
      it(`should not request an ID without a partner or URL (case ${index + 1})`, () => {
        const logStub = sinon.stub(utils, 'logError');
        try {
          expect(unifiedIdSubmodule.getId(moduleConfig)).to.be.undefined;
          expect(server.requests).to.have.length(0);
          expect(logStub.calledOnce).to.be.true;
        } finally {
          logStub.restore();
        }
      });
    });

    describe('response handling', () => {
      function fetchId() {
        const callback = sinon.spy();
        unifiedIdSubmodule.getId(config, null).callback(callback);
        return { callback, req: server.requests[0] };
      }

      it('should return and decode the RID response', () => {
        const { callback, req } = fetchId();
        const response = { TDID: 'test-tdid', TDID_LOOKUP: 'TRUE' };
        req.respond(200, {}, JSON.stringify(response));
        expect(callback.calledOnce).to.be.true;
        expect(callback.firstCall.args[0]).to.deep.equal(response);
        expect(unifiedIdSubmodule.decode(callback.firstCall.args[0])).to.deep.equal({ tdid: 'test-tdid' });
      });

      it('should not decode a lookup response without TDID', () => {
        const { callback, req } = fetchId();
        req.respond(200, {}, JSON.stringify({ TDID_LOOKUP: 'FALSE' }));
        expect(callback.calledOnce).to.be.true;
        expect(unifiedIdSubmodule.decode(callback.firstCall.args[0])).to.be.undefined;
      });

      it('should complete without an ID on an empty response', () => {
        const { callback, req } = fetchId();
        req.respond(200, {}, '');
        expect(callback.calledOnceWithExactly(undefined)).to.be.true;
      });

      it('should complete without an ID on invalid JSON', () => {
        const { callback, req } = fetchId();
        req.respond(200, {}, 'invalid JSON');
        expect(callback.calledOnceWithExactly(undefined)).to.be.true;
      });

      it('should complete without an ID on an HTTP error', () => {
        const { callback, req } = fetchId();
        req.respond(500, {}, 'Server error');
        expect(callback.calledOnceWithExactly()).to.be.true;
      });
    });
  });
  describe('eid', () => {
    before(() => {
      attachIdSystem(unifiedIdSubmodule);
    });
    it('unifiedId: ext generation', function () {
      const userId = {
        tdid: 'some-random-id-value'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'adserver.org',
        inserter: 'adserver.org',
        matcher: 'adserver.org',
        mm: 4,
        uids: [{ id: 'some-random-id-value', atype: 1, ext: { rtiPartner: 'TDID' } }]
      });
    });

    it('unifiedId: ext generation with provider', function () {
      const userId = {
        tdid: { 'id': 'some-sample_id', 'ext': { 'provider': 'some.provider.com' } }
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'adserver.org',
        inserter: 'adserver.org',
        matcher: 'adserver.org',
        mm: 4,
        uids: [{ id: 'some-sample_id', atype: 1, ext: { rtiPartner: 'TDID', provider: 'some.provider.com' } }]
      });
    });

    it('unifiedId: adds inserter and matcher', function () {
      const userId = {
        tdid: 'uid123'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.include({
        source: 'adserver.org',
        inserter: 'adserver.org',
        matcher: 'adserver.org',
        mm: 4
      });
    });
  });
});
