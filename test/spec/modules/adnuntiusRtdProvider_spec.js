import { adnuntiusSubmodule } from 'modules/adnuntiusRtdProvider.js';
import { expect } from 'chai';
import { server } from 'test/mocks/xhr.js';
import { config as _config } from 'src/config.js';

const responseHeader = { 'Content-Type': 'application/json' };

describe('adnuntiusRtdProvider is a RTD provider that', function () {
  describe('has a method `init` that', function () {
    it('exists', function () {
      expect(adnuntiusSubmodule.init).to.be.a('function');
    });
    it('returns false missing config params', function () {
      const config = {
        name: 'adnuntius',
        waitForIt: true,
      };
      const value = adnuntiusSubmodule.init(config);
      expect(value).to.equal(false);
    });
    it('returns false if missing providers param', function () {
      const config = {
        name: 'adnuntius',
        waitForIt: true,
        params: {}
      };
      const value = adnuntiusSubmodule.init(config);
      expect(value).to.equal(false);
    });
    it('returns true if providers param included', function () {
      const config = {
        name: 'adnuntius',
        waitForIt: true,
        params: {
          providers: []
        }
      };
      const value = adnuntiusSubmodule.init(config);
      expect(value).to.equal(true);
    });
  });

  describe('has a method `getBidRequestData` that', function () {
    it('exists', function () {
      expect(adnuntiusSubmodule.getBidRequestData).to.be.a('function');
    });
    it('verify config params', function () {
      expect(config.name).to.not.be.undefined;
      expect(config.name).to.equal('adnuntius');
      expect(config.params.providers).to.not.be.undefined;
      expect(config.params).to.have.property('providers');
      expect(config.params.providers[0]).to.have.property('siteId')
      expect(config.params.providers[0]).to.have.property('userId')
    });

    it('send correct request', function () {
      const callback = sinon.spy();
      let request;
      const adUnitsOriginal = adUnits;
      adnuntiusSubmodule.getBidRequestData({ adUnits: adUnits }, callback, config);
      request = server.requests[0];
      request.respond(200, responseHeader, JSON.stringify(data));
      expect(request.url).to.be.include(`&s=site123&browserId=mike`);
      expect(adUnits).to.length(2);
      expect(adUnits[0]).to.be.eq(adUnitsOriginal[0]);
    });
  });

  describe('has a method `setGlobalConfig` that', function () {
    it('exists', function () {
      expect(adnuntiusSubmodule.setGlobalConfig).to.be.a('function');
    });

    it('sets global config', function () {
      adnuntiusSubmodule.setGlobalConfig(config, concatSegments);
      const globalConfig = _config.getBidderConfig()
      expect(globalConfig).to.have.property('adnuntius')
      expect(globalConfig.adnuntius).to.have.property('ortb2')
      expect(globalConfig.adnuntius.ortb2).to.have.property('user')
      expect(globalConfig.adnuntius.ortb2.user).to.have.property('data')
      expect(globalConfig.adnuntius.ortb2.user.data).to.be.a('array')
      expect(globalConfig.adnuntius.ortb2.user.data[0]).to.have.property('name')
      expect(globalConfig.adnuntius.ortb2.user.data[0].name).to.equal('adnuntius')
      expect(globalConfig.adnuntius.ortb2.user.data[0]).to.have.property('segment')
      expect(globalConfig.adnuntius.ortb2.user.data[0].segment).to.be.a('array')
      expect(globalConfig.adnuntius.ortb2.user.data[0].segment[0]).to.have.property('id')
      expect(globalConfig.adnuntius.ortb2.user.data[0].segment[0].id).to.equal('segment2')
    });
  });
});

const config = {
  name: 'adnuntius',
  waitForIt: true,
  params: {
    bidders: ['adnuntius'],
    providers: [{
      siteId: 'site123',
      userId: 'mike'
    }]
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

const data = {
  'expiryEpochMillis': 1640165064285,
  'segments': [
    'segment2',
    'segment1'
  ]
};

const concatSegments = [
  { id: 'segment2' },
  { id: 'segment1' },
]
