import { getSourceBidderMap, calculateBidSources, getSource, setRandom } from 'modules/s2sTesting';
import { config } from 'src/config';

var events = require('src/events');
var CONSTANTS = require('src/constants.json');
const BID_RESPONSE = CONSTANTS.EVENTS.BID_RESPONSE;

var expect = require('chai').expect;

describe('s2sTesting', function () {
  describe('getSource', () => {
    // helper function to set random number and get the source
    function getExpectedSource(randNumber, sourceWeights, sources) {
      setRandom(randNumber);
      return getSource(sourceWeights, sources);
    }

    it('returns undefined if no sources', () => {
      expect(getExpectedSource(0, {})).to.be.undefined;
      expect(getExpectedSource(0.5, {})).to.be.undefined;
      expect(getExpectedSource(0.9999, {})).to.be.undefined;
    });
    it('returns undefined if no weights', () => {
      expect(getExpectedSource(0, {server: 0, client: 0})).to.be.undefined;
      expect(getExpectedSource(0.5, {both: 0})).to.be.undefined;
    });
    it('gets the expected source from 3 sources', () => {
      expect(getExpectedSource(0, {server: 1, client: 1, both: 2})).to.equal('server');
      expect(getExpectedSource(0.2499999, {server: 1, client: 1, both: 2})).to.equal('server');
      expect(getExpectedSource(0.25, {server: 1, client: 1, both: 2})).to.equal('client');
      expect(getExpectedSource(0.49999, {server: 1, client: 1, both: 2})).to.equal('client');
      expect(getExpectedSource(0.5, {server: 1, client: 1, both: 2})).to.equal('both');
      expect(getExpectedSource(0.99999, {server: 1, client: 1, both: 2})).to.equal('both');
    });
    it('gets the expected source from 2 sources', () => {
      expect(getExpectedSource(0, {server: 2, client: 3})).to.equal('server');
      expect(getExpectedSource(0.39999, {server: 2, client: 3})).to.equal('server');
      expect(getExpectedSource(0.4, {server: 2, client: 3})).to.equal('client');
      expect(getExpectedSource(0.9, {server: 2, client: 3})).to.equal('client');
    });
    it('gets the expected source from 1 source', () => {
      expect(getExpectedSource(0, {both: 2})).to.equal('both');
      expect(getExpectedSource(0.5, {both: 2})).to.equal('both');
      expect(getExpectedSource(0.99999, {both: 2})).to.equal('both');
    });
    it('ignores an invalid source', () => {
      expect(getExpectedSource(0, {both: 2, cache: 2})).to.equal('both');
      expect(getExpectedSource(0.3333, {server: 1, cache: 1, both: 2})).to.equal('server');
      expect(getExpectedSource(0.34, {server: 1, cache: 1, both: 2})).to.equal('both');
    });
    it('ignores order of sources', () => {
      expect(getExpectedSource(0, {client: 1, server: 1, both: 2})).to.equal('server');
      expect(getExpectedSource(0.2499999, {both: 2, client: 1, server: 1})).to.equal('server');
      expect(getExpectedSource(0.25, {client: 1, both: 2, server: 1})).to.equal('client');
      expect(getExpectedSource(0.49999, {server: 1, both: 2, client: 1})).to.equal('client');
      expect(getExpectedSource(0.5, {both: 2, server: 1, client: 1})).to.equal('both');
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
        setRandom(0.7);
      });

      it('does not work if testing is "false"', () => {
        config.setConfig({s2sConfig: {
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
          testing: true,
          bidderControl: {rubicon: {bidSource: {server: 1, client: 1}}}
        }});
        expect(getSourceBidderMap()).to.eql({
          server: [],
          client: ['rubicon']
        });
      });

      it('sets one bidder with "both"', () => {
        config.setConfig({s2sConfig: {
          testing: true,
          bidderControl: {rubicon: {bidSource: {server: 1, client: 1, both: 2}}}
        }});
        expect(getSourceBidderMap()).to.eql({
          server: ['rubicon'],
          client: ['rubicon']
        });
      });

      it('sets one server bidder', () => {
        config.setConfig({s2sConfig: {
          testing: true,
          bidderControl: {rubicon: {bidSource: {server: 4, client: 1}}}
        }});
        expect(getSourceBidderMap()).to.eql({
          server: ['rubicon'],
          client: []
        });
      });

      it('sets two bidders', () => {
        config.setConfig({s2sConfig: {
          testing: true,
          bidderControl: {
            rubicon: {bidSource: {server: 2, client: 2, both: 1}},
            appnexus: {bidSource: {server: 1, client: 1, both: 2}}
          }}});
        var serverClientBidders = getSourceBidderMap();
        expect(serverClientBidders.server).to.eql(['appnexus']);
        expect(serverClientBidders.client).to.have.members(['rubicon', 'appnexus']);
      });
    });

    describe('setting source through adUnits', () => {
      beforeEach(() => {
        // reset s2sconfig bid sources
        config.setConfig({s2sConfig: {testing: true}});
        // set random number for testing
        setRandom(0.7);
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
            {bidder: 'rubicon', bidSource: {server: 1, both: 1}}
          ]}
        ];
        expect(getSourceBidderMap(adUnits)).to.eql({
          server: ['rubicon'],
          client: ['rubicon']
        });
        // should have saved the source on the bid
        expect(adUnits[0].bids[0].calcSource).to.equal('both');
        expect(adUnits[0].bids[0].finalSource).to.equal('both');
      });

      it('sets multiple bidders sources from one adUnit', () => {
        var adUnits = [
          {bids: [
            {bidder: 'rubicon', bidSource: {server: 2, client: 2, both: 1}},
            {bidder: 'appnexus', bidSource: {server: 1, client: 1, both: 2}}
          ]}
        ];
        var serverClientBidders = getSourceBidderMap(adUnits);
        expect(serverClientBidders.server).to.eql(['appnexus']);
        expect(serverClientBidders.client).to.have.members(['rubicon', 'appnexus']);
        // should have saved the source on the bid
        expect(adUnits[0].bids[0].calcSource).to.equal('client');
        expect(adUnits[0].bids[0].finalSource).to.equal('client');
        expect(adUnits[0].bids[1].calcSource).to.equal('both');
        expect(adUnits[0].bids[1].finalSource).to.equal('both');
      });

      it('sets multiple bidders sources from multiple adUnits', () => {
        var adUnits = [
          {bids: [
            {bidder: 'rubicon', bidSource: {server: 2, client: 2, both: 1}},
            {bidder: 'appnexus', bidSource: {server: 1, client: 1, both: 2}}
          ]},
          {bids: [
            {bidder: 'rubicon', bidSource: {server: 4, both: 1}},
            {bidder: 'bidder3', bidSource: {client: 1}}
          ]}
        ];
        var serverClientBidders = getSourceBidderMap(adUnits);
        expect(serverClientBidders.server).to.have.members(['rubicon', 'appnexus']);
        expect(serverClientBidders.client).to.have.members(['rubicon', 'appnexus', 'bidder3']);
        // should have saved the source on the bid
        expect(adUnits[0].bids[0].calcSource).to.equal('client');
        expect(adUnits[0].bids[0].finalSource).to.equal('client');
        expect(adUnits[0].bids[1].calcSource).to.equal('both');
        expect(adUnits[0].bids[1].finalSource).to.equal('both');
        expect(adUnits[1].bids[0].calcSource).to.equal('server');
        expect(adUnits[1].bids[0].finalSource).to.equal('server');
        expect(adUnits[1].bids[1].calcSource).to.equal('client');
        expect(adUnits[1].bids[1].finalSource).to.equal('client');
      });

      it('should reuse calculated sources', () => {
        var adUnits = [
          {bids: [
            {bidder: 'rubicon', calcSource: 'both', bidSource: {server: 4, client: 1}},
            {bidder: 'appnexus', calcSource: 'client', bidSource: {server: 4, client: 1}},
            {bidder: 'bidder3', calcSource: 'server', bidSource: {client: 1}}
          ]}
        ];
        var serverClientBidders = getSourceBidderMap(adUnits);
        expect(serverClientBidders.server).to.have.members(['rubicon', 'bidder3']);
        expect(serverClientBidders.client).to.have.members(['rubicon', 'appnexus']);
        // should have saved the source on the bid
        expect(adUnits[0].bids[0].calcSource).to.equal('both');
        expect(adUnits[0].bids[0].finalSource).to.equal('both');
        expect(adUnits[0].bids[1].calcSource).to.equal('client');
        expect(adUnits[0].bids[1].finalSource).to.equal('client');
        expect(adUnits[0].bids[2].calcSource).to.equal('server');
        expect(adUnits[0].bids[2].finalSource).to.equal('server');
      });
    });

    describe('setting source through s2sconfig and adUnits', () => {
      beforeEach(() => {
        // reset s2sconfig bid sources
        config.setConfig({s2sConfig: {testing: true}});
        // set random number for testing
        setRandom(0.7);
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
          testing: true,
          bidderControl: {
            rubicon: {bidSource: {server: 2, client: 2, both: 1}},
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
      var targeting = window.pbjs.bidderSettings[bidder][AST];
      var srcTargeting = targeting[targeting.length - 1];
      expect(srcTargeting.key).to.equal(`hb_source_${bidder}`);
      expect(srcTargeting.val).to.be.a('function');
    }

    function checkNoTargeting(bidder) {
      var bs = window.pbjs.bidderSettings;
      var targeting = bs[bidder] && bs[bidder][AST];
      if (!targeting) {
        expect(targeting).to.be.undefined;
        return;
      }
      expect(targeting.find((kvp) => {
        return kvp.key === `hb_source_${bidder}`;
      })).to.be.undefined;
    }

    function checkTargetingVal(requestId, bidderCode, expectedVal) {
      var targeting = window.pbjs.bidderSettings[bidderCode][AST];
      var targetingFunc = targeting[targeting.length - 1].val;
      expect(targetingFunc({requestId, bidderCode})).to.equal(expectedVal);
    }

    beforeEach(() => {
      // set bidderSettings
      window.pbjs.bidderSettings = {};
    });

    it('should not set hb_source_<bidder> unless testing is on and includeSourceKvp is set', () => {
      config.setConfig({s2sConfig: {bidders: ['rubicon', 'appnexus']}});
      expect(window.pbjs.bidderSettings).to.eql({});

      config.setConfig({s2sConfig: {bidders: ['rubicon', 'appnexus'], testing: true}});
      expect(window.pbjs.bidderSettings).to.eql({});

      config.setConfig({s2sConfig: {
        bidders: ['rubicon', 'appnexus'],
        testing: true,
        bidderControl: {
          rubicon: {bidSource: {server: 2, client: 2, both: 1}},
          appnexus: {bidSource: {server: 1}}
        }
      }});
      expect(window.pbjs.bidderSettings).to.eql({});

      config.setConfig({s2sConfig: {
        bidders: ['rubicon', 'appnexus'],
        testing: false,
        bidderControl: {
          rubicon: {includeSourceKvp: true},
          appnexus: {includeSourceKvp: true}
        }
      }});
      expect(window.pbjs.bidderSettings).to.eql({});
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

      events.emit(BID_RESPONSE, {requestId: 1234, bidder: 'rubicon', src: 'server'});
      checkTargetingVal(1234, 'rubicon', 'server');

      events.emit(BID_RESPONSE, {requestId: 1234, bidder: 'appnexus', src: 'client'});
      checkTargetingVal(1234, 'appnexus', 'client');

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

      events.emit(BID_RESPONSE, {requestId: 4321, bidder: 'rubicon', src: 'client'});
      events.emit(BID_RESPONSE, {requestId: 4321, bidder: 'appnexus', src: 'client'});
      checkTargetingVal(4321, 'rubicon', 'client');
      checkNoTargeting('appnexus');
    });

    it('should keep requests separate', () => {});

    it('should log an error if there are multiple requests with the same src', () => {});

    it('should reset adServerTargeting when new a config is set', () => {});

    it('should handle "both" client and server requests from the same bidder', () => {
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

      events.emit(BID_RESPONSE, {requestId: 1111, bidder: 'rubicon', src: 's2s'});
      events.emit(BID_RESPONSE, {requestId: 1111, bidder: 'appnexus', src: 'client'});
      events.emit(BID_RESPONSE, {requestId: 1111, bidder: 'rubicon', src: 'client'});
      events.emit(BID_RESPONSE, {requestId: 1111, bidder: 'appnexus', src: 'client'});

      checkTargetingVal(1111, 'rubicon', 'both');
      checkTargetingVal(1111, 'appnexus', 'client');
    });
  });
});
