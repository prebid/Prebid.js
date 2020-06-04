import s2sTesting from 'modules/s2sTesting.js';
import { config } from 'src/config.js';

var expect = require('chai').expect;

describe('s2sTesting', function () {
  describe('s2sTesting.getSource', function () {
    // helper function to set random number and get the source
    function getExpectedSource(randNumber, sourceWeights, sources) {
      // set random number for testing
      s2sTesting.globalRand = randNumber;
      return s2sTesting.getSource(sourceWeights, sources);
    }

    it('returns undefined if no sources', function () {
      expect(getExpectedSource(0, {})).to.be.undefined;
      expect(getExpectedSource(0.5, {})).to.be.undefined;
      expect(getExpectedSource(0.9999, {})).to.be.undefined;
    });

    it('returns undefined if no weights', function () {
      expect(getExpectedSource(0, {server: 0, client: 0})).to.be.undefined;
      expect(getExpectedSource(0.5, {client: 0})).to.be.undefined;
    });

    it('gets the expected source from 3 sources', function () {
      var sources = ['server', 'client', 'both'];
      expect(getExpectedSource(0, {server: 1, client: 1, both: 2}, sources)).to.equal('server');
      expect(getExpectedSource(0.2499999, {server: 1, client: 1, both: 2}, sources)).to.equal('server');
      expect(getExpectedSource(0.25, {server: 1, client: 1, both: 2}, sources)).to.equal('client');
      expect(getExpectedSource(0.49999, {server: 1, client: 1, both: 2}, sources)).to.equal('client');
      expect(getExpectedSource(0.5, {server: 1, client: 1, both: 2}, sources)).to.equal('both');
      expect(getExpectedSource(0.99999, {server: 1, client: 1, both: 2}, sources)).to.equal('both');
    });

    it('gets the expected source from 2 sources', function () {
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

    it('gets the expected source from 1 source', function () {
      expect(getExpectedSource(0, {client: 2})).to.equal('client');
      expect(getExpectedSource(0.5, {client: 2})).to.equal('client');
      expect(getExpectedSource(0.99999, {client: 2})).to.equal('client');
    });

    it('ignores an invalid source', function () {
      expect(getExpectedSource(0, {client: 2, cache: 2})).to.equal('client');
      expect(getExpectedSource(0.3333, {server: 1, cache: 1, client: 2})).to.equal('server');
      expect(getExpectedSource(0.34, {server: 1, cache: 1, client: 2})).to.equal('client');
    });

    it('ignores order of sources', function () {
      var sources = ['server', 'client', 'both'];
      expect(getExpectedSource(0, {client: 1, server: 1, both: 2}, sources)).to.equal('server');
      expect(getExpectedSource(0.2499999, {both: 2, client: 1, server: 1}, sources)).to.equal('server');
      expect(getExpectedSource(0.25, {client: 1, both: 2, server: 1}, sources)).to.equal('client');
      expect(getExpectedSource(0.49999, {server: 1, both: 2, client: 1}, sources)).to.equal('client');
      expect(getExpectedSource(0.5, {both: 2, server: 1, client: 1}, sources)).to.equal('both');
    });

    it('accepts an array of sources', function () {
      expect(getExpectedSource(0.3333, {second: 2, first: 1}, ['first', 'second'])).to.equal('first');
      expect(getExpectedSource(0.34, {second: 2, first: 1}, ['first', 'second'])).to.equal('second');
      expect(getExpectedSource(0.9999, {second: 2, first: 1}, ['first', 'second'])).to.equal('second');
    });
  });

  describe('s2sTesting.getSourceBidderMap', function () {
    describe('setting source through s2sConfig', function () {
      beforeEach(function () {
        // set random number for testing
        s2sTesting.globalRand = 0.7;
      });

      it('does not work if testing is "false"', function () {
        config.setConfig({s2sConfig: {
          bidders: ['rubicon'],
          testing: false,
          bidderControl: {rubicon: {bidSource: {server: 1, client: 1}}}
        }});
        expect(s2sTesting.getSourceBidderMap()).to.eql({
          server: [],
          client: []
        });
      });

      it('sets one client bidder', function () {
        config.setConfig({s2sConfig: {
          bidders: ['rubicon'],
          testing: true,
          bidderControl: {rubicon: {bidSource: {server: 1, client: 1}}}
        }});
        expect(s2sTesting.getSourceBidderMap()).to.eql({
          server: [],
          client: ['rubicon']
        });
      });

      it('sets one server bidder', function () {
        config.setConfig({s2sConfig: {
          bidders: ['rubicon'],
          testing: true,
          bidderControl: {rubicon: {bidSource: {server: 4, client: 1}}}
        }});
        expect(s2sTesting.getSourceBidderMap()).to.eql({
          server: ['rubicon'],
          client: []
        });
      });

      it('defaults to server', function () {
        config.setConfig({s2sConfig: {
          bidders: ['rubicon'],
          testing: true
        }});
        expect(s2sTesting.getSourceBidderMap()).to.eql({
          server: ['rubicon'],
          client: []
        });
      });

      it('sets two bidders', function () {
        config.setConfig({s2sConfig: {
          bidders: ['rubicon', 'appnexus'],
          testing: true,
          bidderControl: {
            rubicon: {bidSource: {server: 3, client: 1}},
            appnexus: {bidSource: {server: 1, client: 1}}
          }}});
        var serverClientBidders = s2sTesting.getSourceBidderMap();
        expect(serverClientBidders.server).to.eql(['rubicon']);
        expect(serverClientBidders.client).to.have.members(['appnexus']);
      });

      it('sends both bidders to same source when weights are the same', function () {
        s2sTesting.globalRand = 0.01;

        config.setConfig({s2sConfig: {
          bidders: ['rubicon', 'appnexus'],
          testing: true,
          bidderControl: {
            rubicon: {bidSource: {server: 1, client: 99}},
            appnexus: {bidSource: {server: 1, client: 99}}
          }}});
        expect(s2sTesting.getSourceBidderMap()).to.eql({
          client: ['rubicon', 'appnexus'],
          server: []
        });
        expect(s2sTesting.getSourceBidderMap()).to.eql({
          client: ['rubicon', 'appnexus'],
          server: []
        });
        expect(s2sTesting.getSourceBidderMap()).to.eql({
          client: ['rubicon', 'appnexus'],
          server: []
        });

        config.setConfig({s2sConfig: {
          bidders: ['rubicon', 'appnexus'],
          testing: true,
          bidderControl: {
            rubicon: {bidSource: {server: 99, client: 1}},
            appnexus: {bidSource: {server: 99, client: 1}}
          }}});
        expect(s2sTesting.getSourceBidderMap()).to.eql({
          server: ['rubicon', 'appnexus'],
          client: []
        });
        expect(s2sTesting.getSourceBidderMap()).to.eql({
          server: ['rubicon', 'appnexus'],
          client: []
        });
        expect(s2sTesting.getSourceBidderMap()).to.eql({
          server: ['rubicon', 'appnexus'],
          client: []
        });
      });
    });

    describe('setting source through adUnits', function () {
      beforeEach(function () {
        // reset s2sconfig bid sources
        config.setConfig({s2sConfig: {testing: true}});
        // set random number for testing
        s2sTesting.globalRand = 0.7;
      });

      it('sets one bidder source from one adUnit', function () {
        var adUnits = [
          {bids: [
            {bidder: 'rubicon', bidSource: {server: 4, client: 1}}
          ]}
        ];
        expect(s2sTesting.getSourceBidderMap(adUnits)).to.eql({
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
        expect(s2sTesting.getSourceBidderMap(adUnits)).to.eql({
          server: [],
          client: ['rubicon']
        });
        // should have saved the source on the bid
        expect(adUnits[0].bids[0].calcSource).to.equal('client');
        expect(adUnits[0].bids[0].finalSource).to.equal('client');
      });

      it('defaults to client if no bidSource', function () {
        var adUnits = [
          {bids: [
            {bidder: 'rubicon', bidSource: {}}
          ]}
        ];
        expect(s2sTesting.getSourceBidderMap(adUnits)).to.eql({
          server: [],
          client: ['rubicon']
        });
        // should have saved the source on the bid
        expect(adUnits[0].bids[0].calcSource).to.be.undefined;
        expect(adUnits[0].bids[0].finalSource).to.equal('client');
      });

      it('sets multiple bidders sources from one adUnit', function () {
        var adUnits = [
          {bids: [
            {bidder: 'rubicon', bidSource: {server: 2, client: 1}},
            {bidder: 'appnexus', bidSource: {server: 3, client: 1}}
          ]}
        ];
        var serverClientBidders = s2sTesting.getSourceBidderMap(adUnits);
        expect(serverClientBidders.server).to.eql(['appnexus']);
        expect(serverClientBidders.client).to.have.members(['rubicon']);
        // should have saved the source on the bid
        expect(adUnits[0].bids[0].calcSource).to.equal('client');
        expect(adUnits[0].bids[0].finalSource).to.equal('client');
        expect(adUnits[0].bids[1].calcSource).to.equal('server');
        expect(adUnits[0].bids[1].finalSource).to.equal('server');
      });

      it('sets multiple bidders sources from multiple adUnits', function () {
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
        var serverClientBidders = s2sTesting.getSourceBidderMap(adUnits);
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

      it('should reuse calculated sources', function () {
        var adUnits = [
          {bids: [
            {bidder: 'rubicon', calcSource: 'client', bidSource: {server: 4, client: 1}},
            {bidder: 'appnexus', calcSource: 'server', bidSource: {server: 1, client: 1}},
            {bidder: 'bidder3', calcSource: 'server', bidSource: {client: 1}}
          ]}
        ];
        var serverClientBidders = s2sTesting.getSourceBidderMap(adUnits);

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

    describe('setting source through s2sconfig and adUnits', function () {
      beforeEach(function () {
        // reset s2sconfig bid sources
        config.setConfig({s2sConfig: {testing: true}});
        // set random number for testing
        s2sTesting.globalRand = 0.7;
      });

      it('should get sources from  both', function () {
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

        var serverClientBidders = s2sTesting.getSourceBidderMap(adUnits);
        expect(serverClientBidders.server).to.have.members(['rubicon', 'appnexus']);
        expect(serverClientBidders.client).to.have.members(['rubicon', 'appnexus']);
      });
    });
  });
});
