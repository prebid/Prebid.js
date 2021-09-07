import { iasSubModule } from 'modules/iasRtdProvider.js';
import { expect } from 'chai';
import { server } from 'test/mocks/xhr.js';

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
    it('exists', function () {
      expect(iasSubModule.getBidRequestData).to.be.a('function');
    });
    it('verify config params', function () {
      expect(config.name).to.not.be.undefined;
      expect(config.name).to.equal('ias');
      expect(config.params.pubId).to.not.be.undefined;
      expect(config.params).to.have.property('pubId');
    });
    it('invoke method', function () {
      const callback = sinon.spy();
      let request;
      const adUnitsOriginal = adUnits;
      iasSubModule.getBidRequestData({ adUnits: adUnits }, callback, config);
      request = server.requests[0];
      server.respond();
      expect(request.url).to.be.include(`https://pixel.adsafeprotected.com/services/pub?anId=1234`);
      expect(adUnits).to.length(2);
      expect(adUnits[0]).to.be.eq(adUnitsOriginal[0]);
    });
  });

  describe('has a method `getTargetingData` that', function () {
    it('exists', function () {
      expect(iasSubModule.getTargetingData).to.be.a('function');
    });
    it('invoke method', function () {
      const targeting = iasSubModule.getTargetingData(adUnits, config);
      expect(adUnits).to.length(2);
      expect(targeting).to.be.not.null;
      expect(targeting).to.be.not.empty;
    });
  });
});

const config = {
  name: 'ias',
  waitForIt: true,
  params: {
    pubId: 1234
  }
};

const adUnits = [
  {
    code: 'one-div-id',
    mediaTypes: {
      banner: {
        sizes: [970, 250]
      }
    },
    bids: [
      {
        bidder: 'appnexus',
        params: {
          placementId: 12345370,
        }
      }]
  },
  {
    code: 'two-div-id',
    mediaTypes: {
      banner: { sizes: [300, 250] }
    },
    bids: [
      {
        bidder: 'appnexus',
        params: {
          placementId: 12345370,
        }
      }]
  }];
