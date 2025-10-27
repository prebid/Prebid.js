import { operaIdSubmodule } from 'modules/operaadsIdSystem'
import * as ajaxLib from 'src/ajax.js'
import {attachIdSystem} from '../../../modules/userId/index.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {expect} from 'chai/index.mjs';

const TEST_ID = 'opera-test-id';
const operaIdRemoteResponse = { uid: TEST_ID };
describe('operaads ID', () => {
  describe('operaId submodule properties', () => {
    it('should expose a "name" property equal to "operaId"', () => {
      expect(operaIdSubmodule.name).to.equal('operaId');
    });
  });

  function fakeRequest(fn) {
    const ajaxBuilderStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(() => {
      return (url, cbObj) => {
        cbObj.success(JSON.stringify(operaIdRemoteResponse));
      }
    });
    fn();
    ajaxBuilderStub.restore();
  }

  describe('operaId submodule getId', function() {
    it('request to the fake server to correctly extract test ID', function() {
      fakeRequest(() => {
        const moduleIdCallbackResponse = operaIdSubmodule.getId({ params: { pid: 'pub123' } });
        moduleIdCallbackResponse.callback((id) => {
          expect(id).to.equal(operaIdRemoteResponse.operaId);
        });
      });
    });

    it('request to the fake server without publiser ID', function() {
      fakeRequest(() => {
        const moduleIdCallbackResponse = operaIdSubmodule.getId({ params: {} });
        expect(moduleIdCallbackResponse).to.equal(undefined);
      });
    });
  });

  describe('operaId submodule decode', function() {
    it('should respond with an object containing "operaId" as key with the value', () => {
      expect(operaIdSubmodule.decode(TEST_ID)).to.deep.equal({
        operaId: TEST_ID
      });
    });

    it('should respond with undefined if the value is not a string or an empty string', () => {
      [1, 2.0, null, undefined, NaN, [], {}].forEach((value) => {
        expect(operaIdSubmodule.decode(value)).to.equal(undefined);
      });
    });
  });
  describe('eid', () => {
    before(() => {
      attachIdSystem(operaIdSubmodule);
    });
    it('operaId', function() {
      const userId = {
        operaId: 'some-random-id-value'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 't.adx.opera.com',
        uids: [{
          id: 'some-random-id-value',
          atype: 1
        }]
      });
    });
  })
})
