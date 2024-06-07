import {britepoolIdSubmodule} from 'modules/britepoolIdSystem.js';
import * as utils from '../../../src/utils.js';
import {attachIdSystem} from '../../../modules/userId/index.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {expect} from 'chai/index.mjs';

describe('BritePool Submodule', () => {
  const api_key = '1111';
  const aaid = '4421ea96-34a9-45df-a4ea-3c41a48a18b1';
  const idfa = '2d1c4fac-5507-4e28-991c-ca544e992dba';
  const bpid = '279c0161-5152-487f-809e-05d7f7e653fd';
  const url_override = 'https://override';
  const getter_override = function(params) {
    return JSON.stringify({ 'primaryBPID': bpid });
  };
  const getter_callback_override = function(params) {
    return callback => {
      callback(JSON.stringify({ 'primaryBPID': bpid }));
    };
  };

  let triggerPixelStub;

  beforeEach(function (done) {
    triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    done();
  });

  afterEach(function () {
    triggerPixelStub.restore();
  });

  it('trigger id resolution pixel when no identifiers set', () => {
    britepoolIdSubmodule.getId({ params: {} });
    expect(triggerPixelStub.called).to.be.true;
  });

  it('trigger id resolution pixel when no identifiers set with api_key param', () => {
    britepoolIdSubmodule.getId({ params: { api_key } });
    expect(triggerPixelStub.called).to.be.true;
  });

  it('does not trigger id resolution pixel when identifiers set', () => {
    britepoolIdSubmodule.getId({ params: { api_key, aaid } });
    expect(triggerPixelStub.called).to.be.false;
  });

  it('sends x-api-key in header and one identifier', () => {
    const { params, headers, url, errors } = britepoolIdSubmodule.createParams({ api_key, aaid });
    assert(errors.length === 0, errors);
    expect(headers['x-api-key']).to.equal(api_key);
    expect(params).to.eql({ aaid });
  });

  it('sends x-api-key in header and two identifiers', () => {
    const { params, headers, url, errors } = britepoolIdSubmodule.createParams({ api_key, aaid, idfa });
    assert(errors.length === 0, errors);
    expect(headers['x-api-key']).to.equal(api_key);
    expect(params).to.eql({ aaid, idfa });
  });

  it('allows call without api_key', () => {
    const { params, headers, url, errors } = britepoolIdSubmodule.createParams({ aaid, idfa });
    expect(params).to.eql({ aaid, idfa });
    expect(errors.length).to.equal(0);
  });

  it('test url override', () => {
    const { params, headers, url, errors } = britepoolIdSubmodule.createParams({ api_key, aaid, url: url_override });
    expect(url).to.equal(url_override);
    // Making sure it did not become part of params
    expect(params.url).to.be.undefined;
  });

  it('test gdpr consent string in url', () => {
    const { params, headers, url, errors } = britepoolIdSubmodule.createParams({ api_key, aaid }, { gdprApplies: true, consentString: 'expectedConsentString' });
    expect(url).to.equal('https://api.britepool.com/v1/britepool/id?gdprString=expectedConsentString');
  });

  it('test gdpr consent string not in url if gdprApplies false', () => {
    const { params, headers, url, errors } = britepoolIdSubmodule.createParams({ api_key, aaid }, { gdprApplies: false, consentString: 'expectedConsentString' });
    expect(url).to.equal('https://api.britepool.com/v1/britepool/id');
  });

  it('test gdpr consent string not in url if consent string undefined', () => {
    const { params, headers, url, errors } = britepoolIdSubmodule.createParams({ api_key, aaid }, { gdprApplies: true, consentString: undefined });
    expect(url).to.equal('https://api.britepool.com/v1/britepool/id');
  });

  it('dynamic pub params should be added to params', () => {
    window.britepool_pubparams = { ppid: '12345' };
    const { params, headers, url, errors } = britepoolIdSubmodule.createParams({ api_key, aaid });
    expect(params).to.eql({ aaid, ppid: '12345' });
    window.britepool_pubparams = undefined;
  });

  it('dynamic pub params should override submodule params', () => {
    window.britepool_pubparams = { ppid: '67890' };
    const { params, headers, url, errors } = britepoolIdSubmodule.createParams({ api_key, ppid: '12345' });
    expect(params).to.eql({ ppid: '67890' });
    window.britepool_pubparams = undefined;
  });

  it('if dynamic pub params undefined do nothing', () => {
    window.britepool_pubparams = undefined;
    const { params, headers, url, errors } = britepoolIdSubmodule.createParams({ api_key, aaid });
    expect(params).to.eql({ aaid });
    window.britepool_pubparams = undefined;
  });

  it('test getter override with value', () => {
    const { params, headers, url, getter, errors } = britepoolIdSubmodule.createParams({ api_key, aaid, url: url_override, getter: getter_override });
    expect(getter).to.equal(getter_override);
    // Making sure it did not become part of params
    expect(params.getter).to.be.undefined;
    const response = britepoolIdSubmodule.getId({ params: { api_key, aaid, url: url_override, getter: getter_override } });
    assert.deepEqual(response, { id: { 'primaryBPID': bpid } });
  });

  it('test getter override with callback', done => {
    const { params, headers, url, getter, errors } = britepoolIdSubmodule.createParams({ api_key, aaid, url: url_override, getter: getter_callback_override });
    expect(getter).to.equal(getter_callback_override);
    // Making sure it did not become part of params
    expect(params.getter).to.be.undefined;
    const response = britepoolIdSubmodule.getId({ params: { api_key, aaid, url: url_override, getter: getter_callback_override } });
    expect(response.callback).to.not.be.undefined;
    response.callback(result => {
      assert.deepEqual(result, { 'primaryBPID': bpid });
      done();
    });
  });
  describe('eid', () => {
    before(() => {
      attachIdSystem(britepoolIdSubmodule);
    });
    it('britepoolId', function() {
      const userId = {
        britepoolid: 'some-random-id-value'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'britepool.com',
        uids: [{id: 'some-random-id-value', atype: 3}]
      });
    });
  })
});
