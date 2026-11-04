import { utf8ToBytes } from 'libraries/utf8Utils/utf8Utils.js';

describe('utf8Utils', () => {
  describe('utf8ToBytes', () => {
    [
      '',
      'test@test.com',
      "unreserved -_.!~*'()",
      'reserved ;/?:@&=+$,#%',
      'ünï@cödé.com',
      '日本語@例え.jp',
      'https://a.example/ü?x=😀'
    ].forEach((str) => {
      it(`matches TextEncoder for ${JSON.stringify(str)}`, () => {
        const bytes = utf8ToBytes(str);
        expect(bytes).to.be.an.instanceOf(Uint8Array);
        expect(Array.from(bytes)).to.eql(Array.from(new TextEncoder().encode(str)));
      });
    });

    it('rejects non-strings', () => {
      expect(() => utf8ToBytes(undefined)).to.throw(TypeError);
      expect(() => utf8ToBytes(42)).to.throw(TypeError);
    });

    it('throws on a lone surrogate, like the previous crypto-js encoder', () => {
      expect(() => utf8ToBytes('\ud800')).to.throw(URIError);
    });
  });
});
