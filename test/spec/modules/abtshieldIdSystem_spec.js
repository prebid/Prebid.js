import { abtshieldIdSubmodule, parseMcrResponse } from 'modules/abtshieldIdSystem.js';
import { server } from 'test/mocks/xhr.js';
import { createEidsArray } from '../../../modules/userId/eids.js';
import { attachIdSystem } from '../../../modules/userId/index.js';
import { config } from '../../../src/config.js';
import { expect } from 'chai';
import '../../../modules/allowActivities.js';

const MODULE_NAME = 'abtshieldId';
const STORAGE = { type: 'html5', name: 'abtshield_id', expires: 1 };

describe('abtshieldIdSystem', function () {
  describe('name', function () {
    it('should expose the module name', function () {
      expect(abtshieldIdSubmodule.name).to.equal(MODULE_NAME);
    });
  });

  describe('gvlid', function () {
    it('should expose vendor id 825', function () {
      expect(abtshieldIdSubmodule.gvlid).to.equal(825);
    });
  });

  // parseMcrResponse

  describe('parseMcrResponse', function () {
    it('returns null for empty input', function () {
      expect(parseMcrResponse(null)).to.be.null;
      expect(parseMcrResponse('')).to.be.null;
      expect(parseMcrResponse(undefined)).to.be.null;
    });

    it('returns null when uuid is missing', function () {
      expect(parseMcrResponse('{"t":["seg1"]}')).to.be.null;
    });

    it('returns null when uuid is empty string', function () {
      expect(parseMcrResponse('{"uuid":""}')).to.be.null;
    });

    it('returns null for malformed JSON', function () {
      expect(parseMcrResponse('not json')).to.be.null;
    });

    it('returns object with uuid from iuid field (actual API response field)', function () {
      const result = parseMcrResponse('{"scr":10000,"iuid":"abc-123","b":-1,"t":-1}');
      expect(result).to.deep.equal({ uuid: 'abc-123' });
    });

    it('returns object with uuid from uuid field (fallback)', function () {
      const result = parseMcrResponse('{"uuid":"abc-123"}');
      expect(result).to.deep.equal({ uuid: 'abc-123' });
    });

    it('prefers iuid over uuid when both present', function () {
      const result = parseMcrResponse('{"iuid":"from-iuid","uuid":"from-uuid"}');
      expect(result).to.deep.equal({ uuid: 'from-iuid' });
    });

    it('returns object with uuid and segments when present', function () {
      const result = parseMcrResponse('{"uuid":"abc-123","t":["seg1","seg2"]}');
      expect(result).to.deep.equal({ uuid: 'abc-123', segments: ['seg1', 'seg2'] });
    });

    it('adds sivt segment when b is 1', function () {
      const result = parseMcrResponse('{"uuid":"abc-123","b":1}');
      expect(result).to.deep.equal({ uuid: 'abc-123', segments: ['sivt'] });
    });

    it('adds sivt segment to t segments when b is 1', function () {
      const result = parseMcrResponse('{"uuid":"abc-123","b":1,"t":["foo"]}');
      expect(result).to.deep.equal({ uuid: 'abc-123', segments: ['foo', 'sivt'] });
    });

    it('does not duplicate sivt when already present in t segments', function () {
      const result = parseMcrResponse('{"uuid":"abc-123","b":1,"t":["foo","sivt"]}');
      expect(result).to.deep.equal({ uuid: 'abc-123', segments: ['foo', 'sivt'] });
    });

    it('omits segments when the t array is empty', function () {
      const result = parseMcrResponse('{"uuid":"abc-123","t":[]}');
      expect(result).to.deep.equal({ uuid: 'abc-123' });
      expect(result).to.not.have.property('segments');
    });

    it('filters non-string entries from the t array', function () {
      const result = parseMcrResponse('{"uuid":"abc-123","t":[1,"seg1",null,"seg2"]}');
      expect(result.segments).to.deep.equal(['seg1', 'seg2']);
    });

    it('accepts an already-parsed object', function () {
      const result = parseMcrResponse({ uuid: 'abc-123', t: ['seg1'] });
      expect(result).to.deep.equal({ uuid: 'abc-123', segments: ['seg1'] });
    });
  });

  // getId

  describe('getId', function () {
    beforeEach(function () {
      server.requests.length = 0;
    });

    afterEach(function () {
      sinon.restore();
      config.resetConfig();
    });

    it('returns undefined when storage.expires is below the 1-day floor', function () {
      const result = abtshieldIdSubmodule.getId({
        params: { sid: 'pb.publisher-x' },
        storage: { type: 'html5', name: 'abtshield_id', expires: 0.5 }
      });
      expect(result).to.be.undefined;
      expect(server.requests).to.have.length(0);
    });

    it('returns undefined when storage.expires is not a number', function () {
      const result = abtshieldIdSubmodule.getId({
        params: { sid: 'pb.publisher-x' },
        storage: { type: 'html5', name: 'abtshield_id', expires: '1' }
      });
      expect(result).to.be.undefined;
      expect(server.requests).to.have.length(0);
    });

    it('returns undefined when storage.refreshInSeconds is below the 1-day floor', function () {
      const result = abtshieldIdSubmodule.getId({
        params: { sid: 'pb.publisher-x' },
        storage: { type: 'html5', name: 'abtshield_id', expires: 1, refreshInSeconds: 1 }
      });
      expect(result).to.be.undefined;
      expect(server.requests).to.have.length(0);
    });

    it('returns undefined and skips the request when params.sid is absent', function () {
      const result = abtshieldIdSubmodule.getId({ storage: STORAGE });
      expect(result).to.be.undefined;
      expect(server.requests).to.have.length(0);
    });

    it('returns undefined and skips the request when params.sid is blank', function () {
      const result = abtshieldIdSubmodule.getId({ storage: STORAGE, params: { sid: '   ' } });
      expect(result).to.be.undefined;
      expect(server.requests).to.have.length(0);
    });

    it('calls the default MCR endpoint with the provided sid', function () {
      const cb = sinon.spy();
      const { callback } = abtshieldIdSubmodule.getId({ storage: STORAGE, params: { sid: 'pb.publisher-x' } });
      callback(cb);

      const [req] = server.requests;
      expect(req.method).to.equal('GET');
      expect(req.url).to.equal('https://d1.abtshield.com/mcr?sid=pb.publisher-x');
      expect(req.withCredentials).to.be.true;
    });

    it('scopes credential access to the abtshieldId component', function () {
      config.setConfig({
        allowActivities: {
          accessRequestCredentials: {
            rules: [{
              condition({ componentType, componentName }) {
                return componentType === 'userId' && componentName === MODULE_NAME;
              },
              allow: false
            }]
          }
        }
      });

      const cb = sinon.spy();
      const { callback } = abtshieldIdSubmodule.getId({ storage: STORAGE, params: { sid: 'pb.publisher-x' } });
      callback(cb);

      const [req] = server.requests;
      expect(req.withCredentials).to.be.false;
    });

    it('trims whitespace from sid before using it in the URL', function () {
      const cb = sinon.spy();
      const { callback } = abtshieldIdSubmodule.getId({ storage: STORAGE, params: { sid: '  pb.publisher-x  ' } });
      callback(cb);

      const [req] = server.requests;
      expect(req.url).to.equal('https://d1.abtshield.com/mcr?sid=pb.publisher-x');
    });

    it('invokes callback with the parsed value on success', function () {
      const cb = sinon.spy();
      const { callback } = abtshieldIdSubmodule.getId({ storage: STORAGE, params: { sid: 'pb.publisher-x' } });
      callback(cb);

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({ scr: 10000, iuid: 'test-uuid', b: -1, t: -1 })
      );

      expect(cb.calledOnce).to.be.true;
      expect(cb.firstCall.args[0]).to.deep.equal({ uuid: 'test-uuid' });
    });

    it('invokes callback with sivt segment when b is 1', function () {
      const cb = sinon.spy();
      const { callback } = abtshieldIdSubmodule.getId({ storage: STORAGE, params: { sid: 'pb.publisher-x' } });
      callback(cb);

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({ scr: 8000, iuid: 'test-uuid', b: 1, t: ['foo'] })
      );

      expect(cb.calledOnce).to.be.true;
      expect(cb.firstCall.args[0]).to.deep.equal({ uuid: 'test-uuid', segments: ['foo', 'sivt'] });
    });

    it('invokes callback with undefined when response has no uuid', function () {
      const cb = sinon.spy();
      const { callback } = abtshieldIdSubmodule.getId({ storage: STORAGE, params: { sid: 'pb.publisher-x' } });
      callback(cb);

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({ foo: 'bar' })
      );

      expect(cb.calledOnce).to.be.true;
      expect(cb.firstCall.args[0]).to.be.undefined;
    });

    it('invokes callback with undefined on request error', function () {
      const cb = sinon.spy();
      const { callback } = abtshieldIdSubmodule.getId({ storage: STORAGE, params: { sid: 'pb.publisher-x' } });
      callback(cb);

      server.requests[0].error();

      expect(cb.calledOnce).to.be.true;
      expect(cb.firstCall.args[0]).to.be.undefined;
    });
  });

  // decode

  describe('decode', function () {
    it('returns undefined for falsy input', function () {
      expect(abtshieldIdSubmodule.decode(null)).to.be.undefined;
      expect(abtshieldIdSubmodule.decode(undefined)).to.be.undefined;
      expect(abtshieldIdSubmodule.decode('')).to.be.undefined;
    });

    it('returns undefined when object has no uuid', function () {
      expect(abtshieldIdSubmodule.decode({ segments: ['seg1'] })).to.be.undefined;
    });

    it('decodes a uuid-only object', function () {
      const result = abtshieldIdSubmodule.decode({ uuid: 'abc-123' });
      expect(result).to.deep.equal({ [MODULE_NAME]: { uuid: 'abc-123' } });
    });

    it('decodes an object with uuid and segments', function () {
      const result = abtshieldIdSubmodule.decode({ uuid: 'abc-123', segments: ['s1', 's2'] });
      expect(result).to.deep.equal({ [MODULE_NAME]: { uuid: 'abc-123', segments: ['s1', 's2'] } });
    });

    it('returns a deep clone so callers cannot mutate cached state', function () {
      const value = { uuid: 'abc-123', segments: ['s1'] };
      const result = abtshieldIdSubmodule.decode(value);
      result[MODULE_NAME].segments.push('mutated');
      expect(value.segments).to.deep.equal(['s1']);
    });
  });

  // EID output

  describe('eid', function () {
    before(function () {
      attachIdSystem(abtshieldIdSubmodule);
    });

    it('produces a valid EID without segments', function () {
      const userId = { [MODULE_NAME]: { uuid: 'some-uuid' } };
      const eids = createEidsArray(userId);
      expect(eids).to.have.length(1);
      expect(eids[0]).to.deep.equal({
        source: 'abtshield.com',
        uids: [{ id: 'some-uuid', atype: 1 }]
      });
    });

    it('produces a valid EID with segments in uid ext', function () {
      const userId = { [MODULE_NAME]: { uuid: 'some-uuid', segments: ['seg1', 'seg2'] } };
      const eids = createEidsArray(userId);
      expect(eids).to.have.length(1);
      expect(eids[0]).to.deep.equal({
        source: 'abtshield.com',
        uids: [{ id: 'some-uuid', atype: 1, ext: { segments: ['seg1', 'seg2'] } }]
      });
    });

    it('omits uid ext when segments array is empty', function () {
      const userId = { [MODULE_NAME]: { uuid: 'some-uuid', segments: [] } };
      const eids = createEidsArray(userId);
      expect(eids[0].uids[0]).to.not.have.property('ext');
    });
  });
});
