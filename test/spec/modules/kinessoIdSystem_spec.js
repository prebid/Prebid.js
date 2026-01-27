import sinon from 'sinon';
import {attachIdSystem} from '../../../modules/userId/index.js';
import {kinessoIdSubmodule} from '../../../modules/kinessoIdSystem.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import * as utils from '../../../src/utils.js';
import * as ajaxLib from '../../../src/ajax.js';
import {expect} from 'chai/index.mjs';

describe('kinesso ID', () => {
  describe('eid', () => {
    before(() => {
      attachIdSystem(kinessoIdSubmodule);
    });
    it('kpuid', function() {
      const userId = {
        kpuid: 'Sample_Token'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'kpuid.com',
        uids: [{
          id: 'Sample_Token',
          atype: 3
        }]
      });
    });
  });

  describe('submodule properties', () => {
    it('should expose the correct name', function() {
      expect(kinessoIdSubmodule.name).to.equal('kpuid');
    });
  });

  describe('decode', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(utils, 'logInfo');
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('returns undefined when value is not provided', function() {
      expect(kinessoIdSubmodule.decode()).to.be.undefined;
      expect(utils.logInfo.called).to.be.false;
    });

    it('decodes a string id', function() {
      const val = 'abc';
      const result = kinessoIdSubmodule.decode(val);
      expect(result).to.deep.equal({kpuid: val});
      expect(utils.logInfo.calledOnce).to.be.true;
    });
  });

  describe('getId', () => {
    let sandbox;
    let ajaxStub;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(utils, 'logError');
      sandbox.stub(utils, 'logInfo');
      ajaxStub = sandbox.stub(ajaxLib, 'ajax');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('requires numeric accountid', function() {
      const res = kinessoIdSubmodule.getId({params: {accountid: 'bad'}});
      expect(res).to.be.undefined;
      expect(utils.logError.calledOnce).to.be.true;
      expect(ajaxStub.called).to.be.false;
    });

    it('skips on coppa requests', function() {
      const res = kinessoIdSubmodule.getId({params: {accountid: 7}}, {coppa: true});
      expect(res).to.be.undefined;
      expect(utils.logInfo.calledOnce).to.be.true;
      expect(ajaxStub.called).to.be.false;
    });

    it('generates an id and posts to the endpoint', function() {
      const consent = {gdpr: {gdprApplies: true, consentString: 'CONSENT'}, usp: '1NNN'};
      const result = kinessoIdSubmodule.getId({params: {accountid: 10}}, consent);

      expect(result).to.have.property('id').that.is.a('string').with.length(26);
      expect(ajaxStub.calledOnce).to.be.true;
      const [url,, payload, options] = ajaxStub.firstCall.args;
      expect(url).to.equal('https://id.knsso.com/id?accountid=10&us_privacy=1NNN&gdpr=1&gdpr_consent=CONSENT');
      expect(options).to.deep.equal({method: 'POST', withCredentials: true});
      expect(JSON.parse(payload)).to.have.property('id', result.id);
    });
  });
});
