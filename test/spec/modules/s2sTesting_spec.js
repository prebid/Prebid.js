import { getSourceBidderMap, calculateBidSources, getSource } from 'modules/s2sTesting';
import { config } from 'src/config';
import find from 'core-js/library/fn/array/find';

var events = require('src/events');
var CONSTANTS = require('src/constants.json');
const BID_ADJUSTMENT = CONSTANTS.EVENTS.BID_ADJUSTMENT;

var expect = require('chai').expect;

describe('s2sTesting', function () {
  let mathRandomStub;
  let randomNumber = 0;

  beforeEach(() => {
    mathRandomStub = sinon.stub(Math, 'random', () => { return randomNumber; });
  });

  afterEach(() => {
    mathRandomStub.restore();
  });

  describe('getSource', () => {
    // helper function to set random number and get the source
    function getExpectedSource(randNumber, sourceWeights, sources) {
      // set random number for testing
      randomNumber = randNumber;
      return getSource(sourceWeights, sources);
    }

    it('returns undefined if no sources', () => {
      expect(getExpectedSource(0, {})).to.be.undefined;
      expect(getExpectedSource(0.5, {})).to.be.undefined;
      expect(getExpectedSource(0.9999, {})).to.be.undefined;
    });

    it('returns undefined if no weights', () => {
      expect(getExpectedSource(0, {server: 0, client: 0})).to.be.undefined;
      expect(getExpectedSource(0.5, {client: 0})).to.be.undefined;
    });

    it('gets the expected source from 3 sources', () => {
      var sources = ['server', 'client', 'both'];
      expect(getExpectedSource(0, {server: 1, client: 1, both: 2}, sources)).to.equal('server');
      expect(getExpectedSource(0.2499999, {server: 1, client: 1, both: 2}, sources)).to.equal('server');
      expect(getExpectedSource(0.25, {server: 1, client: 1, both: 2}, sources)).to.equal('client');
      expect(getExpectedSource(0.49999, {server: 1, client: 1, both: 2}, sources)).to.equal('client');
      expect(getExpectedSource(0.5, {server: 1, client: 1, both: 2}, sources)).to.equal('both');
      expect(getExpectedSource(0.99999, {server: 1, client: 1, both: 2}, sources)).to.equal('both');
    });

    it('gets the expected source from 2 sources', () => {
      expect(getExpectedSource(0, {server: 2, client: 3})).to.equal('server');
      expect(getExpectedSource(0.39999, {server: 2, client: 3})).to.equal('server');
      expect(getExpectedSource(0.4, {server: 2, client: 3})).to.equal('client');
      expect(getExpectedSource(0.9, {server: 2, client: 3})).to.equal('client');
      var sources = ['server', 'client', 'both'];
      expect(getExpectedSource(0, {server: 2, client: 3}, sources)).to.equal('server');
      expect(getExpectedSource(0.39999, {server: 2, client: 3}, sources)).to.equal('server');
      expect(getExpectedSource(0.4, {server: 2, client: 3}, sources)).to.equal('client');
      expect(getExpectedSource(0.9, {server: 2, client: 3}, sources)).to.equal('client');
    });

    it('gets the expected source from 1 source', () => {
      expect(getExpectedSource(0, {client: 2})).to.equal('client');
      expect(getExpectedSource(0.5, {client: 2})).to.equal('client');
      expect(getExpectedSource(0.99999, {client: 2})).to.equal('client');
    });

    it('ignores an invalid source', () => {
      expect(getExpectedSource(0, {client: 2, cache: 2})).to.equal('client');
      expect(getExpectedSource(0.3333, {server: 1, cache: 1, client: 2})).to.equal('server');
      expect(getExpectedSource(0.34, {server: 1, cache: 1, client: 2})).to.equal('client');
    });

    it('ignores order of sources', () => {
      var sources = ['server', 'client', 'both'];
      expect(getExpectedSource(0, {client: 1, server: 1, both: 2}, sources)).to.equal('server');
      expect(getExpectedSource(0.2499999, {both: 2, client: 1, server: 1}, sources)).to.equal('server');
      expect(getExpectedSource(0.25, {client: 1, both: 2, server: 1}, sources)).to.equal('client');
      expect(getExpectedSource(0.49999, {server: 1, both: 2, client: 1}, sources)).to.equal('client');
      expect(getExpectedSource(0.5, {both: 2, server: 1, client: 1}, sources)).to.equal('both');
    });

    it('accepts an array of sources', () => {
      expect(getExpectedSource(0.3333, {second: 2, first: 1}, ['first', 'second'])).to.equal('first');
      expect(getExpectedSource(0.34, {second: 2, first: 1}, ['first', 'second'])).to.equal('second');
      expect(getExpectedSource(0.9999, {second: 2, first: 1}, ['first', 'second'])).to.equal('second');
    });
  });

  describe('getSourceBidderMap', () => {
    describe('setting source through s2sConfig', () => {
      beforeEach(() => {
        // set random number for testing
        randomNumber = 0.7;
      });

      it('does not work if testing is "false"', () => {
        config.setConfig({s2sConfig: {
          bidders: ['rubicon'],
          testing: false,
          bidderControl: {rubicon: {bidSource: {server: 1, client: 1}}}
        }});
        expect(getSourceBidderMap()).to.eql({
          server: [],
          client: []
        });
      });

      it('sets one client bidder', () => {
        config.setConfig({s2sConfig: {
          bidders: ['rubicon'],
          testing: true,
          bidderControl: {rubicon: {bidSource: {server: 1, client: 1}}}
        }});
        expect(getSourceBidderMap()).to.eql({
          server: [],
          client: ['rubicon']
        });
      });

      it('sets one server bidder', () => {
        config.setConfig({s2sConfig: {
          bidders: ['rubicon'],
          testing: true,
          bidderControl: {rubicon: {bidSource: {server: 4, client: 1}}}
        }});
        expect(getSourceBidderMap()).to.eql({
          server: ['rubicon'],
          client: []
        });
      });

      it('defaults to server', () => {
        config.setConfig({s2sConfig: {
          bidders: ['rubicon'],
          testing: true
        }});
        expect(getSourceBidderMap()).to.eql({
          server: ['rubicon'],
          client: []
        });
      });

      it('sets two bidders', () => {
        config.setConfig({s2sConfig: {
          bidders: ['rubicon', 'appnexus'],
          testing: true,
          bidderControl: {
            rubicon: {bidSource: {server: 3, client: 1}},
            appnexus: {bidSource: {server: 1, client: 1}}
          }}});
        var serverClientBidders = getSourceBidderMap();
        expect(serverClientBidders.server).to.eql(['rubicon']);
        expect(serverClientBidders.client).to.have.members(['appnexus']);
      });
    });

    describe('setting source through adUnits', () => {
      beforeEach(() => {
        // reset s2sconfig bid sources
        config.setConfig({s2sConfig: {testing: true}});
        // set random number for testing
        randomNumber = 0.7;
      });

      it('sets one bidder source from one adUnit', () => {
        var adUnits = [
          {bids: [
            {bidder: 'rubicon', bidSource: {server: 4, client: 1}}
          ]}
        ];
        expect(getSourceBidderMap(adUnits)).to.eql({
          server: ['rubicon'],
          client: []
        });
        // should have saved the source on the bid
        expect(adUnits[0].bids[0].calcSource).to.equal('server');
        expect(adUnits[0].bids[0].finalSource).to.equal('server');

        adUnits = [
          {bids: [
            {bidder: 'rubicon', bidSource: {server: 1, client: 1}}
          ]}
        ];
        expect(getSourceBidderMap(adUnits)).to.eql({
          server: [],
          client: ['rubicon']
        });
        // should have saved the source on the bid
        expect(adUnits[0].bids[0].calcSource).to.equal('client');
        expect(adUnits[0].bids[0].finalSource).to.equal('client');
      });

      it('defaults to client if no bidSource', () => {
        var adUnits = [
          {bids: [
            {bidder: 'rubicon', bidSource: {}}
          ]}
        ];
        expect(getSourceBidderMap(adUnits)).to.eql({
          server: [],
          client: ['rubicon']
        });
        // should have saved the source on the bid
        expect(adUnits[0].bids[0].calcSource).to.be.undefined;
        expect(adUnits[0].bids[0].finalSource).to.equal('client');
      });

      it('sets multiple bidders sources from one adUnit', () => {
        var adUnits = [
          {bids: [
            {bidder: 'rubicon', bidSource: {server: 2, client: 1}},
            {bidder: 'appnexus', bidSource: {server: 3, client: 1}}
          ]}
        ];
        var serverClientBidders = getSourceBidderMap(adUnits);
        expect(serverClientBidders.server).to.eql(['appnexus']);
        expect(serverClientBidders.client).to.have.members(['rubicon']);
        // should have saved the source on the bid
        expect(adUnits[0].bids[0].calcSource).to.equal('client');
        expect(adUnits[0].bids[0].finalSource).to.equal('client');
        expect(adUnits[0].bids[1].calcSource).to.equal('server');
        expect(adUnits[0].bids[1].finalSource).to.equal('server');
      });

      it('sets multiple bidders sources from multiple adUnits', () => {
        var adUnits = [
          {bids: [
            {bidder: 'rubicon', bidSource: {server: 2, client: 1}},
            {bidder: 'appnexus', bidSource: {server: 1, client: 1}}
          ]},
          {bids: [
            {bidder: 'rubicon', bidSource: {server: 4, client: 1}},
            {bidder: 'bidder3', bidSource: {client: 1}}
          ]}
        ];
        var serverClientBidders = getSourceBidderMap(adUnits);
        expect(serverClientBidders.server).to.have.members(['rubicon']);
        expect(serverClientBidders.server).to.not.have.members(['appnexus', 'bidder3']);
        expect(serverClientBidders.client).to.have.members(['rubicon', 'appnexus', 'bidder3']);
        // should have saved the source on the bid
        expect(adUnits[0].bids[0].calcSource).to.equal('client');
        expect(adUnits[0].bids[0].finalSource).to.equal('client');
        expect(adUnits[0].bids[1].calcSource).to.equal('client');
        expect(adUnits[0].bids[1].finalSource).to.equal('client');
        expect(adUnits[1].bids[0].calcSource).to.equal('server');
        expect(adUnits[1].bids[0].finalSource).to.equal('server');
        expect(adUnits[1].bids[1].calcSource).to.equal('client');
        expect(adUnits[1].bids[1].finalSource).to.equal('client');
      });

      it('should reuse calculated sources', () => {
        var adUnits = [
          {bids: [
            {bidder: 'rubicon', calcSource: 'client', bidSource: {server: 4, client: 1}},
            {bidder: 'appnexus', calcSource: 'server', bidSource: {server: 1, client: 1}},
            {bidder: 'bidder3', calcSource: 'server', bidSource: {client: 1}}
          ]}
        ];
        var serverClientBidders = getSourceBidderMap(adUnits);

        expect(serverClientBidders.server).to.have.members(['appnexus', 'bidder3']);
        expect(serverClientBidders.server).to.not.have.members(['rubicon']);
        expect(serverClientBidders.client).to.have.members(['rubicon']);
        expect(serverClientBidders.client).to.not.have.members(['appnexus', 'bidder3']);
        // should have saved the source on the bid
        expect(adUnits[0].bids[0].calcSource).to.equal('client');
        expect(adUnits[0].bids[0].finalSource).to.equal('client');
        expect(adUnits[0].bids[1].calcSource).to.equal('server');
        expect(adUnits[0].bids[1].finalSource).to.equal('server');
        expect(adUnits[0].bids[2].calcSource).to.equal('server');
        expect(adUnits[0].bids[2].finalSource).to.equal('server');
      });
    });

    describe('setting source through s2sconfig and adUnits', () => {
      beforeEach(() => {
        // reset s2sconfig bid sources
        config.setConfig({s2sConfig: {testing: true}});
        // set random number for testing
        randomNumber = 0.7;
      });

      it('should get sources from  both', () => {
        // set rubicon: server and appnexus: client
        var adUnits = [
          {bids: [
            {bidder: 'rubicon', bidSource: {server: 4, client: 1}},
            {bidder: 'appnexus', bidSource: {client: 1}}
          ]}
        ];

        // set rubicon: client and appnexus: server
        config.setConfig({s2sConfig: {
          bidders: ['rubicon', 'appnexus'],
          testing: true,
          bidderControl: {
            rubicon: {bidSource: {server: 2, client: 1}},
            appnexus: {bidSource: {server: 1}}
          }
        }});

        var serverClientBidders = getSourceBidderMap(adUnits);
        expect(serverClientBidders.server).to.have.members(['rubicon', 'appnexus']);
        expect(serverClientBidders.client).to.have.members(['rubicon', 'appnexus']);
      });
    });
  });

  describe('addBidderSourceTargeting', () => {
    const AST = CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING;

    function checkTargeting(bidder) {
      var targeting = window.$$PREBID_GLOBAL$$.bidderSettings[bidder][AST];
      var srcTargeting = targeting[targeting.length - 1];
      expect(srcTargeting.key).to.equal(`hb_source_${bidder}`);
      expect(srcTargeting.val).to.be.a('function');
      expect(window.$$PREBID_GLOBAL$$.bidderSettings[bidder].alwaysUseBid).to.be.true;
    }

    function checkNoTargeting(bidder) {
      var bs = window.$$PREBID_GLOBAL$$.bidderSettings;
      var targeting = bs[bidder] && bs[bidder][AST];
      if (!targeting) {
        expect(targeting).to.be.undefined;
        return;
      }
      expect(find(targeting, (kvp) => {
        return kvp.key === `hb_source_${bidder}`;
      })).to.be.undefined;
    }

    function checkTargetingVal(bidResponse, expectedVal) {
      var targeting = window.$$PREBID_GLOBAL$$.bidderSettings[bidResponse.bidderCode][AST];
      var targetingFunc = targeting[targeting.length - 1].val;
      expect(targetingFunc(bidResponse)).to.equal(expectedVal);
    }

    beforeEach(() => {
      // set bidderSettings
      window.$$PREBID_GLOBAL$$.bidderSettings = {};
    });

    it('should not set hb_source_<bidder> unless testing is on and includeSourceKvp is set', () => {
      config.setConfig({s2sConfig: {bidders: ['rubicon', 'appnexus']}});
      expect(window.$$PREBID_GLOBAL$$.bidderSettings).to.eql({});

      config.setConfig({s2sConfig: {bidders: ['rubicon', 'appnexus'], testing: true}});
      expect(window.$$PREBID_GLOBAL$$.bidderSettings).to.eql({});

      config.setConfig({s2sConfig: {
        bidders: ['rubicon', 'appnexus'],
        testing: true,
        bidderControl: {
          rubicon: {bidSource: {server: 2, client: 1}},
          appnexus: {bidSource: {server: 1}}
        }
      }});
      expect(window.$$PREBID_GLOBAL$$.bidderSettings).to.eql({});

      config.setConfig({s2sConfig: {
        bidders: ['rubicon', 'appnexus'],
        testing: false,
        bidderControl: {
          rubicon: {includeSourceKvp: true},
          appnexus: {includeSourceKvp: true}
        }
      }});
      expect(window.$$PREBID_GLOBAL$$.bidderSettings).to.eql({});
    });

    it('should set hb_source_<bidder> if includeSourceKvp is set', () => {
      config.setConfig({s2sConfig: {
        bidders: ['rubicon', 'appnexus'],
        testing: true,
        bidderControl: {
          rubicon: {includeSourceKvp: true},
          appnexus: {includeSourceKvp: true}
        }
      }});
      checkTargeting('rubicon');
      checkTargeting('appnexus');
      checkTargetingVal({bidderCode: 'rubicon', source: 'server'}, 'server');
      checkTargetingVal({bidderCode: 'appnexus', source: 'client'}, 'client');

      // turn off appnexus
      config.setConfig({s2sConfig: {
        bidders: ['rubicon', 'appnexus'],
        testing: true,
        bidderControl: {
          rubicon: {includeSourceKvp: true},
          appnexus: {includeSourceKvp: false}
        }
      }});
      checkTargeting('rubicon');
      checkNoTargeting('appnexus');
      checkTargetingVal({bidderCode: 'rubicon', source: 'client'}, 'client');

      // should default to "client"
      config.setConfig({s2sConfig: {
        bidders: ['rubicon', 'appnexus'],
        testing: true,
        bidderControl: {
          rubicon: {includeSourceKvp: true},
          appnexus: {includeSourceKvp: true}
        }
      }});
      checkTargeting('rubicon');
      checkTargeting('appnexus');
      checkTargetingVal({bidderCode: 'rubicon'}, 'client');
      checkTargetingVal({bidderCode: 'appnexus'}, 'client');
    });

    it('should reset adServerTargeting when a new config is set', () => {
      // set config with targeting
      config.setConfig({s2sConfig: {
        bidders: ['rubicon', 'appnexus'],
        testing: true,
        bidderControl: {
          rubicon: {includeSourceKvp: true},
          appnexus: {includeSourceKvp: true}
        }
      }});
      checkTargeting('rubicon');
      checkTargeting('appnexus');

      // set config without targeting
      config.setConfig({s2sConfig: {
        bidders: ['rubicon', 'appnexus'],
        testing: true
      }});
      checkNoTargeting('rubicon');
      checkNoTargeting('appnexus');
    });
  });
});
