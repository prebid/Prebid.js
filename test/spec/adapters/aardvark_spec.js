import {expect} from 'chai';
import Adapter from '../../../src/adapters/aardvark';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';

describe('aardvark adapter', () => {

  let bidsRequestedOriginal;
  let adapter;
  let sandbox;

  const bidderRequest = {
    bidderCode: 'aardvark',
    bids: [
      {
        bidId: 'bidId1',
        bidder: 'aardvark',
        placementCode: 'foo',
        sizes: [[728, 90]],
        params: {
          ai: 'XBC1',
          sc: 'AAAA'
        }
      },
      {
        bidId: 'bidId2',
        bidder: 'aardvark',
        placementCode: 'bar',
        sizes: [[300, 600]],
        params: {
          ai: 'XBC1',
          sc: 'BBBB'
        }
      }
    ]
  };

  beforeEach(() => {
    bidsRequestedOriginal = pbjs._bidsRequested;
    pbjs._bidsRequested = [];

    adapter = new Adapter();
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();

    pbjs._bidsRequested = bidsRequestedOriginal;
  });

  describe('callBids', () => {

    beforeEach(() => {
      sandbox.stub(adLoader, 'loadScript');
      adapter.callBids(bidderRequest);
    });

    it('should load script', () => {
      sinon.assert.calledOnce(adLoader.loadScript);

      let expected = '//thor.rtk.io/XBC1/AAAA_BBBB/aardvark/?jsonp=window.pbjs.aardvarkResponse&rtkreferer=localhost:9876';
      expect(adLoader.loadScript.firstCall.args[0]).to.eql(expected);
    });

  });

  describe('aardvarkResponse', () => {

    it('should exist and be a function', () => {
      expect(pbjs.aardvarkResponse).to.exist.and.to.be.a('function');
    });
  });

  describe('add bids to the manager', () => {

    let firstBid;
    let secondBid;

    beforeEach(() => {
      sandbox.stub(bidManager, 'addBidResponse');

      pbjs._bidsRequested.push(bidderRequest);

      // respond
      let bidderReponse = [
        {
          "adm": "<div></div>",
          "cpm": 0.39440,
          "ex": "",
          "height": "90",
          "id": "AAAA",
          "nurl": "",
          "width": "728"
        },
        {
          "adm": "<div></div>",
          "cpm": 0.03485,
          "ex": "",
          "height": "600",
          "id": "BBBB",
          "nurl": "",
          "width": "300"
        }
      ];
      pbjs.aardvarkResponse(bidderReponse);

      firstBid = bidManager.addBidResponse.firstCall.args[1];
      secondBid = bidManager.addBidResponse.secondCall.args[1];
    });

    it('should add a bid object for each bid', () => {
      sinon.assert.calledTwice(bidManager.addBidResponse);
    });

    it('should pass the correct placement code as first param', () => {
      let firstPlacementCode = bidManager.addBidResponse.firstCall.args[0];
      let secondPlacementCode = bidManager.addBidResponse.secondCall.args[0];

      expect(firstPlacementCode).to.eql('foo');
      expect(secondPlacementCode).to.eql('bar');
    });

    it('should have a good statusCode', () => {
      expect(firstBid.getStatusCode()).to.eql(1);
      expect(secondBid.getStatusCode()).to.eql(1);
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

  describe('add empty bids if no bid returned', () => {

    let firstBid;
    let secondBid;

    beforeEach(() => {
      sandbox.stub(bidManager, 'addBidResponse');

      pbjs._bidsRequested.push(bidderRequest);

      // respond
      let bidderReponse = [];
      pbjs.aardvarkResponse(bidderReponse);

      firstBid = bidManager.addBidResponse.firstCall.args[1];
      secondBid = bidManager.addBidResponse.secondCall.args[1];
    });

    it('should add a bid object for each bid', () => {
      sinon.assert.calledTwice(bidManager.addBidResponse);
    });

    it('should have an error statusCode', () => {
      expect(firstBid.getStatusCode()).to.eql(2);
      expect(secondBid.getStatusCode()).to.eql(2);
    });

    it('should pass the correct placement code as first param', () => {
      let firstPlacementCode = bidManager.addBidResponse.firstCall.args[0];
      let secondPlacementCode = bidManager.addBidResponse.secondCall.args[0];

      expect(firstPlacementCode).to.eql('foo');
      expect(secondPlacementCode).to.eql('bar');
    });

    it('should add the bidder code to the bid object', () => {
      expect(firstBid).to.have.property('bidderCode', 'aardvark');
      expect(secondBid).to.have.property('bidderCode', 'aardvark');
    });

  });
});
