import { expect } from 'chai';
import { spec } from 'modules/nexverseBidAdapter.js';

describe('nexverseBidAdapterTests', () => {
  describe('isBidRequestValid', function () {
    let sbid = {
      'adUnitCode': 'div',
      'bidder': 'nexverse',
      'params': {
        'uid': '77d4a2eb3d209ce6c7691dc79fcab358',
        'pubId': '24051'
      },
    };

    it('should not accept bid without required params', function () {
      let isValid = spec.isBidRequestValid(sbid);
      expect(isValid).to.equal(false);
    });

    it('should return false when params are not passed', function () {
      let bid = Object.assign({}, sbid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when valid params are not passed', function () {
      let bid = Object.assign({}, sbid);
      delete bid.params;
      bid.params = {uid: '', pubId: '', pubEpid: ''};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when valid params are not passed', function () {
      let bid = Object.assign({}, sbid);
      delete bid.params;
      bid.adUnitCode = '';
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      bid.params = {uid: '77d4a2eb3d209ce6c7691dc79fcab358', pubId: '24051'};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return true when valid params are passed as nums', function () {
      let bid = Object.assign({}, sbid);
      delete bid.params;
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      bid.params = {uid: '77d4a2eb3d209ce6c7691dc79fcab358', pubId: '24051', pubEpid: '34561'};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });
});
