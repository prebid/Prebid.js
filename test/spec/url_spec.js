import {format, parse} from '../../src/url';
import { expect } from 'chai';

describe('helpers.url', () => {
  describe('parse()', () => {
    let parsed;

    beforeEach(() => {
      parsed = parse('http://example.com:3000/pathname/?search=test&foo=bar&bar=foo%26foo%3Dxxx#hash');
    });

    it('extracts the protocol', () => {
      expect(parsed).to.have.property('protocol', 'http');
    });

    it('extracts the hostname', () => {
      expect(parsed).to.have.property('hostname', 'example.com');
    });

    it('extracts the port', () => {
      expect(parsed).to.have.property('port', 3000);
    });

    it('extracts the pathname', () => {
      expect(parsed).to.have.property('pathname', '/pathname/');
    });

    it('extracts the search query', () => {
      expect(parsed).to.have.property('search');
      expect(parsed.search).to.eql({
        foo: 'xxx',
        search: 'test',
        bar: 'foo',
      });
    });

    it('extracts the hash', () => {
      expect(parsed).to.have.property('hash', 'hash');
    });

    it('extracts the host', () => {
      expect(parsed).to.have.property('host', 'example.com:3000');
    });
  });

  describe('parse(url, {noDecodeWholeURL: true})', () => {
    let parsed;

    beforeEach(() => {
      parsed = parse('http://example.com:3000/pathname/?search=test&foo=bar&bar=foo%26foo%3Dxxx#hash', {noDecodeWholeURL: true});
    });

    it('extracts the search query', () => {
      expect(parsed).to.have.property('search');
      expect(parsed.search).to.eql({
        foo: 'bar',
        search: 'test',
        bar: 'foo%26foo%3Dxxx',
      });
    });
  });

  describe('format()', () => {
    it('formats an object in to a URL', () => {
      expect(format({
        protocol: 'http',
        hostname: 'example.com',
        port: 3000,
        pathname: '/pathname/',
        search: {foo: 'bar', search: 'test', bar: 'foo%26foo%3Dxxx'},
        hash: 'hash'
      })).to.equal('http://example.com:3000/pathname/?foo=bar&search=test&bar=foo%26foo%3Dxxx#hash');
    });

    it('will use defaults for missing properties', () => {
      expect(format({
        hostname: 'example.com'
      })).to.equal('http://example.com');
    });
  });
});
