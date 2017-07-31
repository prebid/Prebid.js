describe('aardvark adapter tests', function () {
  const expect = require('chai').expect;
  const adapter = require('modules/aardvarkBidAdapter');
  const bidmanager = require('src/bidmanager');
  const adloader = require('src/adloader');
  const constants = require('src/constants.json');

  var aardvark,
    sandbox,
    bidsRequestedOriginal;

  const bidderRequest = {
      bidderCode: 'aardvark',
      bids: [
        {
          bidId: 'bidId1',
          bidder: 'aardvark',
          placementCode: 'foo',
          sizes: [[728, 90]],
          rtkid: 1,
          params: {
            ai: 'AH5S',
            sc: 'BirH'
          }
        },
        {
          bidId: 'bidId2',
          bidder: 'aardvark',
          placementCode: 'bar',
          sizes: [[300, 600]],
          rtkid: 1,
          params: {
            ai: 'AH5S',
            sc: '661h'
          }
        }
      ]
    },

    bidderRequestCustomHost = {
      bidderCode: 'aardvark',
      bids: [
        {
          bidId: 'bidId1',
          bidder: 'aardvark',
          placementCode: 'foo',
          sizes: [[728, 90]],
          rtkid: 1,
          params: {
            ai: 'AH5S',
            sc: 'BirH',
            host: 'custom.server.com'
          }
        },
        {
          bidId: 'bidId2',
          bidder: 'aardvark',
          placementCode: 'bar',
          sizes: [[300, 600]],
          rtkid: 1,
          params: {
            ai: 'AH5S',
            sc: '661h',
            host: 'custom.server.com'
          }
        }
      ]
    },

    // respond
    bidderResponse = [
      {
        'adm': '<div></div>',
        'cpm': 0.39440,
        'ex': '',
        'height': '90',
        'id': 'BirH',
        'nurl': '',
        'width': '728',
        'cid': 'bidId1'
      },
      {
        'adm': '<div></div>',
        'cpm': 0.03485,
        'ex': '',
        'height': '600',
        'id': '661h',
        'nurl': '',
        'width': '300',
        'cid': 'bidId2'
      }
    ];

  beforeEach(() => {
    aardvark = new adapter();
    sandbox = sinon.sandbox.create();
    bidsRequestedOriginal = $$PREBID_GLOBAL$$._bidsRequested;
    $$PREBID_GLOBAL$$._bidsRequested = [];
  });

  afterEach(() => {
    sandbox.restore();

    $$PREBID_GLOBAL$$._bidsRequested = bidsRequestedOriginal;
  });

  describe('callBids', () => {
    beforeEach(() => {
      sandbox.stub(adloader, 'loadScript');
      aardvark.callBids(bidderRequest);
    });
    it('should load script', () => {
      sinon.assert.calledOnce(adloader.loadScript);
      expect(adloader.loadScript.firstCall.args[0]).to.eql(
        '//thor.rtk.io/AH5S/BirH_661h/aardvark/?jsonp=$$PREBID_GLOBAL$$.aardvarkResponse&rtkreferer=localhost:9876&BirH=bidId1&661h=bidId2');
    });
  });

  describe('callBids with custom host', () => {
    beforeEach(() => {
      sandbox.stub(adloader, 'loadScript');
      aardvark.callBids(bidderRequestCustomHost);
    });
    it('should load script', () => {
      sinon.assert.calledOnce(adloader.loadScript);
      expect(adloader.loadScript.firstCall.args[0]).to.eql(
        '//custom.server.com/AH5S/BirH_661h/aardvark/?jsonp=$$PREBID_GLOBAL$$.aardvarkResponse&rtkreferer=localhost:9876&BirH=bidId1&661h=bidId2');
    });
  });

  describe('aardvarkResponse', () => {
    it('should exist and be a function', () => {
      expect($$PREBID_GLOBAL$$.aardvarkResponse).to.exist.and.to.be.a('function');
    });
  });

  describe('add empty bids if no bid returned', () => {
    let firstBid;
    let secondBid;

    beforeEach(() => {
      sandbox.stub(bidmanager, 'addBidResponse');

      $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);
      aardvark.callBids(bidderRequest);

      $$PREBID_GLOBAL$$.aardvarkResponse([]);

      firstBid = bidmanager.addBidResponse.firstCall.args[1];
      secondBid = bidmanager.addBidResponse.secondCall.args[1];
    });

    it('should add a bid object for each bid', () => {
      sinon.assert.calledTwice(bidmanager.addBidResponse);
    });

    it('should have an error statusCode', () => {
      expect(firstBid.getStatusCode()).to.eql(constants.STATUS.NO_BID);
      expect(secondBid.getStatusCode()).to.eql(constants.STATUS.NO_BID);
    });

    it('should include bid request bidId as the adId', () => {
      expect(firstBid).to.have.property('adId', 'bidId1');
      expect(secondBid).to.have.property('adId', 'bidId2');
    });

    it('should pass the correct placement code as first param', () => {
      let firstPlacementCode = bidmanager.addBidResponse.firstCall.args[0];
      let secondPlacementCode = bidmanager.addBidResponse.secondCall.args[0];

      expect(firstPlacementCode).to.eql('foo');
      expect(secondPlacementCode).to.eql('bar');
    });

    it('should add the bidder code to the bid object', () => {
      expect(firstBid).to.have.property('bidderCode', 'aardvark');
      expect(secondBid).to.have.property('bidderCode', 'aardvark');
    });
  });

  describe('add bids to the manager', () => {
    let firstBid;
    let secondBid;

    beforeEach(() => {
      sandbox.stub(bidmanager, 'addBidResponse');

      $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);
      aardvark.callBids(bidderRequest);

      $$PREBID_GLOBAL$$.aardvarkResponse(bidderResponse);
      firstBid = bidmanager.addBidResponse.firstCall.args[1];
      secondBid = bidmanager.addBidResponse.secondCall.args[1];
    });

    it('should add a bid object for each bid', () => {
      sinon.assert.calledTwice(bidmanager.addBidResponse);
    });

    it('should pass the correct placement code as first param', () => {
      let firstPlacementCode = bidmanager.addBidResponse.firstCall.args[0];
      let secondPlacementCode = bidmanager.addBidResponse.secondCall.args[0];

      expect(firstPlacementCode).to.eql('foo');
      expect(secondPlacementCode).to.eql('bar');
    });

    it('should include bid request bidId as the adId', () => {
      expect(firstBid).to.have.property('adId', 'bidId1');
      expect(secondBid).to.have.property('adId', 'bidId2');
    });

    it('should have a good statusCode', () => {
      expect(firstBid.getStatusCode()).to.eql(constants.STATUS.GOOD);
      expect(secondBid.getStatusCode()).to.eql(constants.STATUS.GOOD);
    });

    it('should add the CPM to the bid object', () => {
      expect(firstBid).to.have.property('cpm', 0.39440);
      expect(secondBid).to.have.property('cpm', 0.03485);
    });

    it('should add the bidder code to the bid object', () => {
      expect(firstBid).to.have.property('bidderCode', 'aardvark');
      expect(secondBid).to.have.property('bidderCode', 'aardvark');
    });

    it('should include the ad to the bid object', () => {
      expect(firstBid).to.have.property('ad');
      expect(secondBid).to.have.property('ad');
    });

    it('should include the size to the bid object', () => {
      expect(firstBid).to.have.property('width', 728);
      expect(firstBid).to.have.property('height', 90);
      expect(secondBid).to.have.property('width', 300);
      expect(secondBid).to.have.property('height', 600);
    });
  });
});
