import {config} from 'src/config.js';
import {setData, getBidRequestData, pafDataSubmodule} from 'modules/pafRtdProvider.js';
import {getAdUnits} from '../../fixtures/fixtures.js';

describe('pafRtdProvider', function() {
  beforeEach(function() {
    config.resetConfig();
  });

  describe('pafDataSubmodule', function() {
    it('successfully instantiates', function () {
		  expect(pafDataSubmodule.init()).to.equal(true);
    });
  });

  describe('setData', function() {
    it('merges global ortb2 data', function() {
      let rtdConfig = {params: {proxyHostName: 'host'}};
      let seed = 'seed_placeholder';

      const setConfigUserObj1 = {
        name: 'www.dataprovider1.com',
        ext: { taxonomyname: 'iab_audience_taxonomy' },
        segment: [{
          id: '1776'
        }]
      };

      config.setConfig({
        ortb2: {
          user: {
            data: [setConfigUserObj1],
            ext: {other: 'data'}
          }
        }
      });

      setData(seed, rtdConfig, () => {});

      let ortb2Config = config.getConfig().ortb2;

      expect(ortb2Config.user.data).to.deep.include.members([setConfigUserObj1]);
      expect(ortb2Config.user.ext.paf.transmission.seed).to.equal(seed);
      expect(ortb2Config.user.ext.other).to.equal('data');
    });

    it('merges bidder-specific ortb2 data', function() {
      let rtdConfig = {params: {proxyHostName: 'host', bidders: ['openx']}};
      let seed = 'seed_placeholder';

      const setConfigUserObj1 = {
        name: 'www.dataprovider1.com',
        ext: { taxonomyname: 'iab_audience_taxonomy' },
        segment: [{
          id: '1776'
        }]
      };

      config.setBidderConfig({
        bidders: ['bidder1'],
        config: {
          ortb2: {
            user: {
              data: [setConfigUserObj1],
              ext: {other: 'data'}
            }
          }
        }
      });

      config.setBidderConfig({
        bidders: ['openx'],
        config: {
          ortb2: {
            user: {
              data: [setConfigUserObj1],
              ext: {other: 'data'}
            }
          }
        }
      });

      setData(seed, rtdConfig, () => {});

      let ortb2Config = config.getBidderConfig().bidder1.ortb2;

      expect(ortb2Config.user.data).to.deep.include.members([setConfigUserObj1]);
      expect(ortb2Config.user.ext.paf).to.be.undefined;
      expect(ortb2Config.user.ext.other).to.equal('data');

      ortb2Config = config.getBidderConfig().openx.ortb2;

      expect(ortb2Config.user.data).to.deep.include.members([setConfigUserObj1]);
      expect(ortb2Config.user.ext.paf.transmission.seed).to.equal(seed);
      expect(ortb2Config.user.ext.other).to.equal('data');
    });
  });

  describe('getBidRequestData', function() {
    it('gets seed from paf-lib and sets data and transaction_ids', function() {
      const adUnits = getAdUnits();
      window.PAF = {
        getIdsAndPreferences() {
          return true;
        },
        generateSeed(options, ids) {
          options.callback({
            transaction_ids: ids
          })
        }
      }
      let bidConfig = {adUnits};
      let rtdConfig = {params: {proxyHostName: 'host'}};

      const setConfigUserObj1 = {
        name: 'www.dataprovider1.com',
        ext: { taxonomyname: 'iab_audience_taxonomy' },
        segment: [{
          id: '1776'
        }]
      };

      config.setConfig({
        ortb2: {
          user: {
            data: [setConfigUserObj1],
            ext: {other: 'data'}
          }
        }
      });

      getBidRequestData(bidConfig, () => {}, rtdConfig, {});
      let ortb2Config = config.getConfig().ortb2;

      adUnits.forEach(adUnit => {
        const transaction_id = adUnit.ortb2Imp.ext.data.paf.transaction_id;
        expect(transaction_id).to.not.be.undefined;
        expect(ortb2Config.user.ext.paf.transmission.seed.transaction_ids).contain(transaction_id)
      });

      expect(ortb2Config.user.data).to.deep.include.members([setConfigUserObj1]);
      expect(ortb2Config.user.ext.paf.transmission.seed).to.have.property('transaction_ids');
      expect(ortb2Config.user.ext.other).to.equal('data');
    });
  });

  it('does nothing if paf-lib doesnt exist', function() {
    const adUnits = getAdUnits();
    window.PAF = undefined;
    let bidConfig = {adUnits};
    let rtdConfig = {params: {proxyHostName: 'host'}};

    const setConfigUserObj1 = {
      name: 'www.dataprovider1.com',
      ext: { taxonomyname: 'iab_audience_taxonomy' },
      segment: [{
        id: '1776'
      }]
    };

    config.setConfig({
      ortb2: {
        user: {
          data: [setConfigUserObj1],
          ext: {other: 'data'}
        }
      }
    });

    getBidRequestData(bidConfig, () => {}, rtdConfig, {});
    let ortb2Config = config.getConfig().ortb2;
    expect(ortb2Config.user.data).to.deep.include.members([setConfigUserObj1]);
    expect(ortb2Config.user.ext.other).to.equal('data');
  });

  it('requires proxyHostName', function() {
    const adUnits = getAdUnits();
    window.PAF = {
      getIdsAndPreferences() {
        return true;
      },
      generateSeed(options, ids) {
        options.callback({
          transaction_ids: ids
        })
      }
    }
    let bidConfig = {adUnits};
    let rtdConfig = {params: {}};

    const setConfigUserObj1 = {
      name: 'www.dataprovider1.com',
      ext: { taxonomyname: 'iab_audience_taxonomy' },
      segment: [{
        id: '1776'
      }]
    };

    config.setConfig({
      ortb2: {
        user: {
          data: [setConfigUserObj1],
          ext: {other: 'data'}
        }
      }
    });

    getBidRequestData(bidConfig, () => {}, rtdConfig, {});
    let ortb2Config = config.getConfig().ortb2;
    expect(ortb2Config.user.data).to.deep.include.members([setConfigUserObj1]);
    expect(ortb2Config.user.ext.other).to.equal('data');
  });
});
