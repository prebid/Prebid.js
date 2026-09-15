import { expect } from 'chai';
import { parseUntrustedJSON } from 'src/utils/untrustedJson.js';

describe('parseUntrustedJSON', () => {
  // How an adapter folds a response into an object of its own. Assignment key by key is what
  // turns an own `__proto__` or `constructor` key in the text into a prototype write.
  function naiveMerge(target, source) {
    Object.keys(source).forEach(key => {
      const value = source[key];
      if (value && typeof value === 'object') {
        target[key] = target[key] || {};
        naiveMerge(target[key], value);
      } else {
        target[key] = value;
      }
    });
    return target;
  }

  afterEach(() => {
    // Pollution that escapes surfaces as unrelated failures in every later spec of the chunk
    // rather than as a failure of the test that caused it.
    delete Object.prototype.polluted;
    delete Object.prototype.isMobile;
    delete Object.prototype.legacyHelper;
    delete Object.prototype.hasOwnProperty.call;
  });

  describe('removes the keys a recursive merge can follow', () => {
    it('drops a __proto__ key', () => {
      const parsed = parseUntrustedJSON('{"impid":"imp0","__proto__":{"polluted":true}}');

      expect(Object.keys(parsed)).to.deep.equal(['impid']);
      naiveMerge({}, parsed);
      expect({}.polluted).to.equal(undefined);
    });

    it('drops a unicode-escaped __proto__ key', () => {
      const parsed = parseUntrustedJSON('{"impid":"imp0","\\u005f\\u005fproto\\u005f\\u005f":{"polluted":true}}');

      expect(Object.keys(parsed)).to.deep.equal(['impid']);
      naiveMerge({}, parsed);
      expect({}.polluted).to.equal(undefined);
    });

    it('drops a constructor key carrying a prototype', () => {
      const parsed = parseUntrustedJSON('{"impid":"imp0","constructor":{"prototype":{"polluted":true}}}');

      expect(Object.keys(parsed)).to.deep.equal(['impid']);
      naiveMerge({}, parsed);
      expect({}.polluted).to.equal(undefined);
    });

    it('drops them at any depth, and inside arrays', () => {
      const parsed = parseUntrustedJSON('{"seatbid":[{"bid":[{"impid":"imp0","__proto__":{"polluted":true}}]}]}');

      expect(Object.keys(parsed.seatbid[0].bid[0])).to.deep.equal(['impid']);
      naiveMerge({}, parsed.seatbid[0].bid[0]);
      expect({}.polluted).to.equal(undefined);
    });
  });

  describe('leaves everything else as JSON.parse produced it', () => {
    it('keeps a constructor field that is ordinary data', () => {
      const text = '{"ext":{"constructor":"acme-v2","keep":true}}';

      expect(parseUntrustedJSON(text)).to.deep.equal(JSON.parse(text));
    });

    it('keeps fields whose names collide with Object.prototype members', () => {
      const text = '{"ext":{"toString":"t","valueOf":1,"hasOwnProperty":"h","isPrototypeOf":[1],"keep":true}}';

      // Compared against an independently parsed copy: comparing against the returned object
      // would pass even if every key had been stripped.
      expect(parseUntrustedJSON(text)).to.deep.equal(JSON.parse(text));
    });

    it('keeps fields whose names another script on the page added to Object.prototype', () => {
      // eslint-disable-next-line no-extend-native -- the page script this stands in for does exactly this
      Object.prototype.isMobile = true;
      const text = '{"ext":{"isMobile":false,"constructor":"acme-v2"}}';

      const ext = parseUntrustedJSON(text).ext;
      expect(Object.prototype.hasOwnProperty.call(ext, 'isMobile')).to.equal(true);
      expect(ext.isMobile).to.equal(false);
    });

    it('returns values that are not objects unchanged', () => {
      expect(parseUntrustedJSON('null')).to.equal(null);
      expect(parseUntrustedJSON('42')).to.equal(42);
      expect(parseUntrustedJSON('"__proto__"')).to.equal('__proto__');
    });

    it('throws what JSON.parse throws when the text is not JSON', () => {
      expect(() => parseUntrustedJSON('not json at all')).to.throw(SyntaxError);
    });
  });

  describe('terminates', () => {
    it('when the page has put an enumerable object on Object.prototype', () => {
      // An inherited-key walk would visit this object as a child of every node - including as a
      // child of itself - and never finish. The test hangs rather than fails if that regresses.
      // eslint-disable-next-line no-extend-native -- reproduces a page that extends Object.prototype
      Object.prototype.legacyHelper = {};

      const parsed = parseUntrustedJSON('{"ext":{"constructor":"acme-v2"},"impid":"imp0"}');

      expect(parsed.impid).to.equal('imp0');
    });

    it('when the page has replaced Object.prototype.hasOwnProperty', () => {
      // Reachable precisely because the inherited-name class above is not stopped here: a merge
      // that follows one can write onto Object.prototype.hasOwnProperty. Reading it per call
      // would make this throw, and both callers read a throw as "that body was not JSON" - so one
      // such response would leave every later one unparsed.
      Object.prototype.hasOwnProperty.call = false;
      let parsed, threw;
      try {
        parsed = parseUntrustedJSON('{"impid":"imp0","__proto__":{"polluted":true}}');
      } catch (e) {
        threw = e;
      }
      // Restored before any assertion, because chai reads it too.
      delete Object.prototype.hasOwnProperty.call;

      expect(threw).to.equal(undefined);
      expect(Object.keys(parsed)).to.deep.equal(['impid']);
      expect({}.polluted).to.equal(undefined);
    });

    it('on nesting deep enough to overflow a recursive walk', () => {
      const depth = 20000;
      const text = '{"ext":'.repeat(depth) + '{"__proto__":{"polluted":true}}' + '}'.repeat(depth);

      let node = parseUntrustedJSON(text);
      for (let i = 0; i < depth; i++) node = node.ext;
      expect(Object.keys(node)).to.deep.equal([]);
      expect({}.polluted).to.equal(undefined);
    });
  });
});
