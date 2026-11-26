import { expect } from 'chai';
import { toOrigin } from '../../../libraries/getOrigin/index.js';

describe('getOrigin library', function () {
  describe('toOrigin', function () {
    it('should reduce URLs to origins', function () {
      expect(toOrigin('https://www.example.com:8443/path?q=1#frag')).to.eq('https://www.example.com:8443');
      expect(toOrigin('https://www.example.com:443/path')).to.eq('https://www.example.com');
      expect(toOrigin('http://example.com')).to.eq('http://example.com');
    });

    it('should return null for opaque, invalid or missing URLs', function () {
      expect(toOrigin('about:blank')).to.be.null;
      expect(toOrigin('data:text/html,secret')).to.be.null;
      expect(toOrigin('not a url')).to.be.null;
      expect(toOrigin('')).to.be.null;
      expect(toOrigin(null)).to.be.null;
      expect(toOrigin(undefined)).to.be.null;
      expect(toOrigin(123)).to.be.null;
    });
  });
});
