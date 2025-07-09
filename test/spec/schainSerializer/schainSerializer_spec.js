import {serializeSupplyChain} from '../../../libraries/schainSerializer/schainSerializer.js'
describe('serializeSupplyChain', () => {
  describe('Single Hop - Chain Complete', () => {
    it('should serialize a single hop chain with complete information', () => {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'exchange1.com',
            sid: '1234',
            hp: 1,
            rid: 'bid-request-1',
            name: 'publisher',
            domain: 'publisher.com'
          }
        ]
      };
      const nodesProperties = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];
      const expectedResult = '1.0,1!exchange1.com,1234,1,bid-request-1,publisher,publisher.com';
      expect(serializeSupplyChain(schain, nodesProperties)).to.equal(expectedResult);
    });
  });

  describe('Single Hop - Chain Complete, optional fields missing', () => {
    it('should serialize a single hop chain with missing optional fields', () => {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'exchange1.com',
            sid: '1234',
            hp: 1
          }
        ]
      };
      const nodesProperties = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];
      const expectedResult = '1.0,1!exchange1.com,1234,1,,,';
      expect(serializeSupplyChain(schain, nodesProperties)).to.equal(expectedResult);
    });
  });

  describe('Multiple Hops - With all properties supplied', () => {
    it('should serialize multiple hops with all properties supplied', () => {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'exchange1.com',
            sid: '1234',
            hp: 1,
            rid: 'bid-request-1',
            name: 'publisher',
            domain: 'publisher.com'
          },
          {
            asi: 'exchange2.com',
            sid: 'abcd',
            hp: 1,
            rid: 'bid-request-2',
            name: 'intermediary',
            domain: 'intermediary.com'
          }
        ]
      };
      const nodesProperties = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];
      const expectedResult = '1.0,1!exchange1.com,1234,1,bid-request-1,publisher,publisher.com!exchange2.com,abcd,1,bid-request-2,intermediary,intermediary.com';
      expect(serializeSupplyChain(schain, nodesProperties)).to.equal(expectedResult);
    });
  });

  describe('Multiple Hops - Chain Complete, optional fields missing', () => {
    it('should serialize multiple hops with missing optional fields', () => {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'exchange1.com',
            sid: '1234',
            hp: 1
          },
          {
            asi: 'exchange2.com',
            sid: 'abcd',
            hp: 1
          }
        ]
      };
      const nodesProperties = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];
      const expectedResult = '1.0,1!exchange1.com,1234,1,,,!exchange2.com,abcd,1,,,';
      expect(serializeSupplyChain(schain, nodesProperties)).to.equal(expectedResult);
    });
  });

  describe('Multiple Hops Expected - Chain Incomplete', () => {
    it('should serialize multiple hops with chain incomplete', () => {
      const schain = {
        ver: '1.0',
        complete: 0,
        nodes: [
          {
            asi: 'exchange2.com',
            sid: 'abcd',
            hp: 1
          }
        ]
      };
      const nodesProperties = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];
      const expectedResult = '1.0,0!exchange2.com,abcd,1,,,';
      expect(serializeSupplyChain(schain, nodesProperties)).to.equal(expectedResult);
    });
  });

  describe('Single Hop - Chain Complete, encoded values', () => {
    it('should serialize a single hop chain with encoded values', () => {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'exchange1.com',
            sid: '1234!abcd',
            hp: 1,
            rid: 'bid-request-1',
            name: 'publisher, Inc.',
            domain: 'publisher.com'
          }
        ]
      };
      const nodesProperties = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];
      const expectedResult = '1.0,1!exchange1.com,1234%21abcd,1,bid-request-1,publisher%2C%20Inc.,publisher.com';
      expect(serializeSupplyChain(schain, nodesProperties)).to.equal(expectedResult);
    });
  });
});
