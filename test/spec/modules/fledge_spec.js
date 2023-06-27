import {
  expect
} from 'chai';
import * as fledge from 'modules/fledgeForGpt.js';
import {config} from '../../../src/config.js';
import adapterManager from '../../../src/adapterManager.js';
import * as utils from '../../../src/utils.js';
import {hook} from '../../../src/hook.js';
import 'modules/appnexusBidAdapter.js';
import 'modules/rubiconBidAdapter.js';
import {parseExtPrebidFledge, setImpExtAe, setResponseFledgeConfigs} from 'modules/fledgeForGpt.js';

const CODE = 'sampleBidder';
const AD_UNIT_CODE = 'mock/placement';

describe('fledgeForGpt module', function() {
  let nextFnSpy;
  fledge.init({enabled: true})

  const bidRequest = {
    adUnitCode: AD_UNIT_CODE,
    bids: [{
      bidId: '1',
      bidder: CODE,
      auctionId: 'first-bid-id',
      adUnitCode: AD_UNIT_CODE,
      transactionId: 'au',
    }]
  };
  const fledgeAuctionConfig = {
    bidId: '1',
  }

  describe('addComponentAuctionHook', function() {
    beforeEach(function() {
      nextFnSpy = sinon.spy();
    });

    it('should call next() when a proper adUnitCode and fledgeAuctionConfig are provided', function() {
      fledge.addComponentAuctionHook(nextFnSpy, bidRequest.adUnitCode, fledgeAuctionConfig);
      expect(nextFnSpy.called).to.be.true;
    });
  });
});

describe('fledgeEnabled', function () {
  const navProps = Object.fromEntries(['runAdAuction', 'joinAdInterestGroup'].map(p => [p, navigator[p]]))

  before(function () {
    // navigator.runAdAuction & co may not exist, so we can't stub it normally with
    // sinon.stub(navigator, 'runAdAuction') or something
    Object.keys(navProps).forEach(p => { navigator[p] = sinon.stub() });
    hook.ready();
  });

  after(function() {
    Object.entries(navProps).forEach(([p, orig]) => navigator[p] = orig);
  })

  afterEach(function () {
    config.resetConfig();
  });

  it('should set fledgeEnabled correctly per bidder', function () {
    config.setConfig({bidderSequence: 'fixed'})
    config.setBidderConfig({
      bidders: ['appnexus'],
      config: {
        fledgeEnabled: true,
      }
    });

    const adUnits = [{
      'code': '/19968336/header-bid-tag1',
      'mediaTypes': {
        'banner': {
          'sizes': [[728, 90]]
        },
      },
      'bids': [
        {
          'bidder': 'appnexus',
        },
        {
          'bidder': 'rubicon',
        },
      ]
    }];

    const bidRequests = adapterManager.makeBidRequests(
      adUnits,
      Date.now(),
      utils.getUniqueIdentifierStr(),
      function callback() {},
      []
    );

    expect(bidRequests[0].bids[0].bidder).equals('appnexus');
    expect(bidRequests[0].fledgeEnabled).to.be.true;

    expect(bidRequests[1].bids[0].bidder).equals('rubicon');
    expect(bidRequests[1].fledgeEnabled).to.be.undefined;
  });
});

describe('ortb processors for fledge', () => {
  describe('imp.ext.ae', () => {
    it('should be removed if fledge is not enabled', () => {
      const imp = {ext: {ae: 1}};
      setImpExtAe(imp, {}, {bidderRequest: {}});
      expect(imp.ext.ae).to.not.exist;
    })
    it('should be left intact if fledge is enabled', () => {
      const imp = {ext: {ae: false}};
      setImpExtAe(imp, {}, {bidderRequest: {fledgeEnabled: true}});
      expect(imp.ext.ae).to.equal(false);
    });
  });
  describe('parseExtPrebidFledge', () => {
    function packageConfigs(configs) {
      return {
        ext: {
          prebid: {
            fledge: {
              auctionconfigs: configs
            }
          }
        }
      }
    }

    function generateImpCtx(fledgeFlags) {
      return Object.fromEntries(Object.entries(fledgeFlags).map(([impid, fledgeEnabled]) => [impid, {imp: {ext: {ae: fledgeEnabled}}}]));
    }

    function generateCfg(impid, ...ids) {
      return ids.map((id) => ({impid, config: {id}}));
    }

    function extractResult(ctx) {
      return Object.fromEntries(
        Object.entries(ctx)
          .map(([impid, ctx]) => [impid, ctx.fledgeConfigs?.map(cfg => cfg.config.id)])
          .filter(([_, val]) => val != null)
      );
    }

    it('should collect fledge configs by imp', () => {
      const ctx = {
        impContext: generateImpCtx({e1: 1, e2: 1, d1: 0})
      };
      const resp = packageConfigs(
        generateCfg('e1', 1, 2, 3)
          .concat(generateCfg('e2', 4)
            .concat(generateCfg('d1', 5, 6)))
      );
      parseExtPrebidFledge({}, resp, ctx);
      expect(extractResult(ctx.impContext)).to.eql({
        e1: [1, 2, 3],
        e2: [4],
      });
    });
    it('should not choke if fledge config references unknown imp', () => {
      const ctx = {impContext: generateImpCtx({i: 1})};
      const resp = packageConfigs(generateCfg('unknown', 1));
      parseExtPrebidFledge({}, resp, ctx);
      expect(extractResult(ctx.impContext)).to.eql({});
    });
  });
  describe('setResponseFledgeConfigs', () => {
    it('should set fledgeAuctionConfigs paired with their corresponding bid id', () => {
      const ctx = {
        impContext: {
          1: {
            bidRequest: {bidId: 'bid1'},
            fledgeConfigs: [{config: {id: 1}}, {config: {id: 2}}]
          },
          2: {
            bidRequest: {bidId: 'bid2'},
            fledgeConfigs: [{config: {id: 3}}]
          },
          3: {
            bidRequest: {bidId: 'bid3'}
          }
        }
      };
      const resp = {};
      setResponseFledgeConfigs(resp, {}, ctx);
      expect(resp.fledgeAuctionConfigs).to.eql([
        {bidId: 'bid1', config: {id: 1}},
        {bidId: 'bid1', config: {id: 2}},
        {bidId: 'bid2', config: {id: 3}},
      ]);
    });
    it('should not set fledgeAuctionConfigs if none exist', () => {
      const resp = {};
      setResponseFledgeConfigs(resp, {}, {
        impContext: {
          1: {
            fledgeConfigs: []
          },
          2: {}
        }
      });
      expect(resp).to.eql({});
    });
  });
});
