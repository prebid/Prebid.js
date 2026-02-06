import { scrubIPv4, scrubIPv6 } from '../../../../src/utils/ipUtils.js'

describe('ipUtils', () => {
  describe('ipv4', () => {
    it('should mask ip v4', () => {
      let input = '192.168.1.1';
      let output = scrubIPv4(input);
      expect(output).to.deep.equal('192.168.1.0');
      input = '192.168.255.255';
      output = scrubIPv4(input);
      expect(output).to.deep.equal('192.168.255.0');
    });

    it('should return null for null input', () => {
      const input = null;
      const output = scrubIPv4(input);
      expect(output).to.deep.equal(null);
    });

    it('should convert invalid format to null', () => {
      const invalidIp = '192.130.2';
      const output = scrubIPv4(invalidIp);
      expect(output).to.deep.equal(null);
    });

    it('should convert invalid format to null', () => {
      const invalidIp = '2001:db8:3333:4444:CCCC:DDDD:EEEE:FFFF';
      const output = scrubIPv4(invalidIp);
      expect(output).to.deep.equal(null);
    });
  });

  describe('ipv6', () => {
    it('should mask ip v6', () => {
      const input = '2001:db8:3333:4444:CCCC:DDDD:EEEE:FFFF';
      const output = scrubIPv6(input);
      expect(output).to.deep.equal('2001:db8:3333:4444:0:0:0:0');
    });

    it('should return null for null input', () => {
      const input = null;
      const output = scrubIPv6(input);
      expect(output).to.deep.equal(null);
    });

    it('should convert invalid format to null', () => {
      const invalidIp = '2001:db8:3333:4444:CCCC:DDDD:EEEE';
      const output = scrubIPv4(invalidIp);
      expect(output).to.deep.equal(null);
    });

    it('should convert invalid format to null', () => {
      const invalidIp = 'invalid';
      const output = scrubIPv4(invalidIp);
      expect(output).to.deep.equal(null);
    });
  });
})
