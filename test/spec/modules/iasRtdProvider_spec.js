import { iasSubModule, iasTargeting } from 'modules/iasRtdProvider.js';
import { expect } from 'chai';
import { server } from 'test/mocks/xhr.js';

const responseHeader = { 'Content-Type': 'application/json' };

describe('iasRtdProvider is a RTD provider that', function () {
  it('has the correct module name', function () {
    expect(iasSubModule.name).to.equal('ias');
  });
  describe('has a method `init` that', function () {
    it('exists', function () {
      expect(iasSubModule.init).to.be.a('function');
    });
    it('returns false missing config params', function () {
      const config = {
        name: 'ias',
        waitForIt: true,
      };
      const value = iasSubModule.init(config);
      expect(value).to.equal(false);
    });
    it('returns false missing pubId param', function () {
      const config = {
        name: 'ias',
        waitForIt: true,
        params: {}
      };
      const value = iasSubModule.init(config);
      expect(value).to.equal(false);
    });
    it('returns false missing pubId param', function () {
      const config = {
        name: 'ias',
        waitForIt: true,
        params: {
          pubId: '123456'
        }
      };
      const value = iasSubModule.init(config);
      expect(value).to.equal(true);
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
      request.respond(200, responseHeader, JSON.stringify(data));
      expect(request.url).to.be.include(`https://pixel.adsafeprotected.com/services/pub?anId=1234`);
      expect(adUnits).to.length(2);
      expect(adUnits[0]).to.be.eq(adUnitsOriginal[0]);
      const targetingKeys = Object.keys(iasTargeting);
      const dataKeys = Object.keys(data);
      expect(targetingKeys.length).to.equal(dataKeys.length);
      expect(targetingKeys['fr']).to.be.eq(dataKeys['fr']);
      expect(targetingKeys['brandSafety']).to.be.eq(dataKeys['brandSafety']);
      expect(targetingKeys['ias-kw']).to.be.eq(dataKeys['ias-kw']);
      expect(targetingKeys['slots']).to.be.eq(dataKeys['slots']);
    });
  });

  describe('has a method `getTargetingData` that', function () {
    it('exists', function () {
      expect(iasSubModule.getTargetingData).to.be.a('function');
    });
    it('invoke method', function () {
      const targeting = iasSubModule.getTargetingData(adUnitsCode, config);
      expect(adUnitsCode).to.length(2);
      expect(targeting).to.be.not.null;
      expect(targeting).to.be.not.empty;
      expect(targeting['one-div-id']).to.be.not.null;
      const targetingKeys = Object.keys(targeting['one-div-id']);
      expect(targetingKeys.length).to.equal(10);
      expect(targetingKeys['adt']).to.be.not.null;
      expect(targetingKeys['alc']).to.be.not.null;
      expect(targetingKeys['dlm']).to.be.not.null;
      expect(targetingKeys['drg']).to.be.not.null;
      expect(targetingKeys['hat']).to.be.not.null;
      expect(targetingKeys['off']).to.be.not.null;
      expect(targetingKeys['vio']).to.be.not.null;
      expect(targetingKeys['fr']).to.be.not.null;
      expect(targetingKeys['ias-kw']).to.be.not.null;
      expect(targetingKeys['id']).to.be.not.null;
      expect(targeting['one-div-id']['adt']).to.be.eq('veryLow');
      expect(targeting['one-div-id']['alc']).to.be.eq('veryLow');
      expect(targeting['one-div-id']['dlm']).to.be.eq('veryLow');
      expect(targeting['one-div-id']['drg']).to.be.eq('veryLow');
      expect(targeting['one-div-id']['hat']).to.be.eq('veryLow');
      expect(targeting['one-div-id']['off']).to.be.eq('veryLow');
      expect(targeting['one-div-id']['vio']).to.be.eq('veryLow');
      expect(targeting['one-div-id']['fr']).to.be.eq('false');
      expect(targeting['one-div-id']['id']).to.be.eq('4813f7a2-1f22-11ec-9bfd-0a1107f94461');
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

const adUnitsCode = ['one-div-id', 'two-div-id'];

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

const data = {
  brandSafety: { adt: 'veryLow', alc: 'veryLow', dlm: 'veryLow', drg: 'veryLow', hat: 'veryLow', off: 'veryLow', vio: 'veryLow' },
  custom: { 'ias-kw': ['IAS_5995_KW', 'IAS_7066_KW', 'IAS_7232_KW', 'IAS_7364_KW', 'IAS_3894_KW', 'IAS_6535_KW', 'IAS_6153_KW', 'IAS_5238_KW', 'IAS_7393_KW', 'IAS_1499_KW', 'IAS_7376_KW', 'IAS_1035_KW', 'IAS_6566_KW', 'IAS_1058_KW', 'IAS_11338_724_KW', 'IAS_7301_KW', 'IAS_15969_725_KW', 'IAS_6358_KW', 'IAS_710_KW', 'IAS_5445_KW', 'IAS_3822_KW', 'IAS_4901_KW', 'IAS_5806_KW', 'IAS_460_KW', 'IAS_11461_702_KW', 'IAS_5681_KW', 'IAS_17609_1240_KW', 'IAS_6634_KW', 'IAS_5597_KW'] },
  fr: 'false',
  slots: { 'one-div-id': { id: '4813f7a2-1f22-11ec-9bfd-0a1107f94461' } }
};
