import { expect } from 'chai';
import {britepoolIdSubmodule} from 'modules/userId/britepoolIdSystem';

describe('BritePool Submodule', () => {
  const api_key = '1111';
  const aaid = '4421ea96-34a9-45df-a4ea-3c41a48a18b1';
  const idfa = '2d1c4fac-5507-4e28-991c-ca544e992dba';
  const bpid = '279c0161-5152-487f-809e-05d7f7e653fd';
  const url_override = 'https://override';
  const getter_override = function(params) {
    return Promise.resolve(JSON.stringify({ 'primaryBPID': bpid }));
  };

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

  it('fails without api_key', () => {
    const { params, headers, url, errors } = britepoolIdSubmodule.createParams({ aaid, idfa });
    expect(errors.length).to.equal(1);
  });

  it('test url override', () => {
    const { params, headers, url, errors } = britepoolIdSubmodule.createParams({ api_key, aaid, url: url_override });
    expect(url).to.equal(url_override);
    // Making sure it did not become part of params
    expect(params.url).to.be.undefined;
  });

  it('test getter override', done => {
    const { params, headers, url, getter, errors } = britepoolIdSubmodule.createParams({ api_key, aaid, url: url_override, getter: getter_override });
    expect(getter).to.equal(getter_override);
    // Making sure it did not become part of params
    expect(params.getter).to.be.undefined;
    const getId = britepoolIdSubmodule.getId({ api_key, aaid, url: url_override, getter: getter_override });
    getId(result => {
      assert.deepEqual(result, { 'primaryBPID': bpid });
      done();
    });
  });
});
