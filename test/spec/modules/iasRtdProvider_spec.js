import { iasSubModule } from 'modules/iasRtdProvider.js';
import { expect } from 'chai';

describe('iasRtdProvider is a RTD provider that', function () {
  it('has the correct module name', function () {
    expect(iasSubModule.name).to.equal('ias');
  });
  describe('has a method `init` that', function () {
    it('exists', function () {
      expect(iasSubModule.init).to.be.a('function');
    });
    it('returns true', function () {
      expect(iasSubModule.init()).to.equal(true);
    });
  });
  describe('has a method `getBidRequestData` that', function () {
    const config = {
      name: 'ias',
      waitForIt: true,
      params: {
        pubId: 1234
      }
    };
    const userConsent = { gdpr: null, usp: null, coppa: false };
    it('verify config params', function () {
      expect(config.name).to.not.be.undefined;
      expect(config.name).to.equal('ias');
      expect(config.params.pubId).to.not.be.undefined;
      expect(config.params).to.have.property('pubId');
    });
    it('exists', function () {
      expect(iasSubModule.getBidRequestData).to.be.a('function');
    });
    it('process requestData validate bids', function () {
      iasSubModule.getBidRequestData({ adUnits: adUnits }, null, config, userConsent);
      expect(adUnits).to.length(2);
    });
  });
});

const adUnits = [
  {
    code: 'one-div-id',
    mediaTypes: {
      banner: {
        sizes: [[970, 250], [728, 90], [1000, 90]]
      }
    },
    sizes: [[970, 250], [728, 90], [1000, 90]],
    bids: [
      {
        bidder: 'ias',
        params: {
          pubId: '1234',
          adUnitPath: '/a/b/c'
        }
      }]
  },
  {
    code: 'two-div-id',
    mediaTypes: {
      banner: { sizes: [[300, 250], [300, 600]] }
    },
    sizes: [[300, 250], [300, 600]],
    bids: [
      {
        bidder: 'ias',
        params: {
          pubId: '1234',
          adUnitPath: '/d/e/f'
        }
      }]
  }];
