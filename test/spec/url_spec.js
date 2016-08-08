import {format, parse} from '../../src/url';

describe('helpers.url', () => {

  describe('parse()', () => {

    let parsed;

    beforeEach(() => {
      parsed = parse('http://example.com:3000/pathname/?search=test&foo=bar#hash');
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
        foo: 'bar',
        search: 'test'
      });
    });

    it('extracts the hash', () => {
      expect(parsed).to.have.property('hash', 'hash');
    });

    it('extracts the host', () => {
      expect(parsed).to.have.property('host', 'example.com:3000');
    });

  });

  describe('format()', () => {

    it('formats an object in to a URL', () => {
      expect(format({
        protocol: 'http',
        hostname: 'example.com',
        port: 3000,
        pathname: '/pathname/',
        search: {foo: 'bar', search: 'test'},
        hash: 'hash'
      })).to.equal('http://example.com:3000/pathname/?foo=bar&search=test#hash');
    });

    it('will use defaults for missing properties', () => {
      expect(format({
        hostname: 'example.com'
      })).to.equal('http://example.com');
    });

  });

});
