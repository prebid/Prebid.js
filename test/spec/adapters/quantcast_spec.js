import {expect} from 'chai';
import Adapter from '../../../src/adapters/quantcast';
import * as ajax from 'src/ajax';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';

describe('quantcast adapter', () => {

  let bidsRequestedOriginal;
  let adapter;
  let sandbox;
  let ajaxStub;

  const bidderRequest = {
    bidderCode: 'quantcast',
    requestId : "595ffa73-d78a-46c9-b18e-f99548a5be6b",
    bidderRequestId:"1cc026909c24c8",
    bids: [
      {
        bidId: '2f7b179d443f14',
        bidder: 'quantcast',
        placementCode: 'div-gpt-ad-1438287399331-0',
        sizes: [[300,250],[300,600]],
        params: {
          publisherId: 'test-publisher',
          battr : [1,2],
        }
      }
    ]
  };

  beforeEach(() => {
    bidsRequestedOriginal = $$PREBID_GLOBAL$$._bidsRequested;
    $$PREBID_GLOBAL$$._bidsRequested = [];

    adapter = new Adapter();
    sandbox = sinon.sandbox.create();
    ajaxStub = sandbox.stub(ajax, 'ajax');
  });

  afterEach(() => {
    sandbox.restore();

    $$PREBID_GLOBAL$$._bidsRequested = bidsRequestedOriginal;
  });

  describe('sizes', () => {
    let bidderRequest = {
      bidderCode: 'quantcast',
      requestId : "595ffa73-d78a-46c9-b18e-f99548a5be6b",
      bidderRequestId:"1cc026909c24c8",
      bids: [
        {
          bidId: '2f7b179d443f14',
          bidder: 'quantcast',
          placementCode: 'div-gpt-ad-1438287399331-0',
          sizes: [[300,250],[300,600]],
          params: {
            publisherId: 'test-publisher',
            battr : [1,2],
          }
        }
      ]
    };

    it('should not call server when empty input is provided', () => {
      adapter.callBids({});
      sinon.assert.notCalled(ajaxStub);
    });

    it('should call server once even when multiple sizes are passed', () => {
      adapter.callBids(bidderRequest);
      sinon.assert.calledOnce(ajaxStub);

      expect(ajaxStub.firstCall.args[0]).to.eql(adapter.QUANTCAST_CALLBACK_URL);
      expect(ajaxStub.firstCall.args[1]).to.exist.and.to.be.a('function');
      expect(ajaxStub.firstCall.args[2]).to.include('div-gpt-ad-1438287399331-0');
      expect(ajaxStub.firstCall.args[2]).to.include('test-publisher');
      expect(ajaxStub.firstCall.args[2]).to.include('2f7b179d443f14');
      expect(ajaxStub.firstCall.args[3]).to.eql({method : 'POST', withCredentials: true});
    });

    it('should call server once when one size is passed', () => {
      bidderRequest.bids[0].sizes = [728, 90];
      adapter.callBids(bidderRequest);
      sinon.assert.calledOnce(ajaxStub);

      expect(ajaxStub.firstCall.args[0]).to.eql(adapter.QUANTCAST_CALLBACK_URL);
      expect(ajaxStub.firstCall.args[1]).to.exist.and.to.be.a('function');
      expect(ajaxStub.firstCall.args[3]).to.eql({method : 'POST', withCredentials: true});
    });

    it('should call server once when size is passed as string', () => {
      bidderRequest.bids[0].sizes = "728x90";
      adapter.callBids(bidderRequest);
      sinon.assert.calledOnce(ajaxStub);

      expect(ajaxStub.firstCall.args[0]).to.eql(adapter.QUANTCAST_CALLBACK_URL);
      expect(ajaxStub.firstCall.args[1]).to.exist.and.to.be.a('function');
      expect(ajaxStub.firstCall.args[3]).to.eql({method : 'POST', withCredentials: true});
    });

    it('should call server once when sizes are passed as a comma-separated string', () => {
      bidderRequest.bids[0].sizes = "728x90,360x240";
      adapter.callBids(bidderRequest);
      sinon.assert.calledOnce(ajaxStub);

      expect(ajaxStub.firstCall.args[0]).to.eql(adapter.QUANTCAST_CALLBACK_URL);
      expect(ajaxStub.firstCall.args[1]).to.exist.and.to.be.a('function');
      expect(ajaxStub.firstCall.args[3]).to.eql({method : 'POST', withCredentials: true});
    });


  });

  describe('handleQuantcastCB add bids to the manager', () => {

    let firstBid;
    let addBidReponseStub;
    let bidsRequestedOriginal;
    // respond
    let bidderReponse = {
      "bidderCode": "quantcast",
      "requestId" : bidderRequest.requestId,
      "bids" : [
          {
            "statusCode" : 1,
            "placementCode" : bidderRequest.bids[0].bidId,
            "cpm": 4.5,
            "ad": "<!DOCTYPE html>\n\n\n<div style=\"height: 250; width: 300; display: table-cell; vertical-align: middle;\">\n<div style=\"width: 300px; margin-left: auto; margin-right: auto;\">  \n\n  <script src=\"https://adserver.adtechus.com/addyn/3.0/5399.1/2394397/0/-1/QUANTCAST;size=300x250;target=_blank;alias=;kvp36=;sub1=;kvl=;kvc=;kvs=300x250;kvi=;kva=;sub2=;rdclick=http://exch.quantserve.com/r?a=;labels=_qc.clk,_click.adserver.rtb,_click.rand.;rtbip=;rtbdata2=;redirecturl2=\" type=\"text/javascript\"></script>\n\n<img src=\"https://exch.quantserve.com/pixel/p_12345.gif?media=ad&p=&r=&rand=&labels=_qc.imp,_imp.adserver.rtb&rtbip=&rtbdata2=\" style=\"display: none;\" border=\"0\" height=\"1\" width=\"1\" alt=\"Quantcast\"/>\n\n</div>\n</div>",
            "width": 300,
            "height": 250
          }
       ]
    };

    beforeEach(() => {
      bidsRequestedOriginal = $$PREBID_GLOBAL$$._bidsRequested;
      addBidReponseStub = sandbox.stub(bidManager, 'addBidResponse');
      $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);
    });

    afterEach(() => {
      sandbox.restore();
      $$PREBID_GLOBAL$$._bidsRequested = bidsRequestedOriginal;
    });

    it('should exist and be a function', () => {
      expect($$PREBID_GLOBAL$$.handleQuantcastCB).to.exist.and.to.be.a('function');
    });

    it('should not add bid when empty text response comes', () => {
      $$PREBID_GLOBAL$$.handleQuantcastCB();
      sinon.assert.notCalled(addBidReponseStub);
    });

    it('should not add bid when empty json response comes', () => {
      $$PREBID_GLOBAL$$.handleQuantcastCB(JSON.stringify({}));
      sinon.assert.notCalled(addBidReponseStub);
    });

    it('should not add bid when malformed json response comes', () => {
      $$PREBID_GLOBAL$$.handleQuantcastCB('non json text');
      sinon.assert.notCalled(addBidReponseStub);
    });

    it('should add a bid object for each bid', () => {
      // You need the following call so that the in-memory storage of the bidRequest is carried out. Without this the callback won't work correctly.
      adapter.callBids(bidderRequest);
      $$PREBID_GLOBAL$$.handleQuantcastCB(JSON.stringify(bidderReponse));
      sinon.assert.calledOnce(addBidReponseStub);
      expect(addBidReponseStub.firstCall.args[0]).to.eql("div-gpt-ad-1438287399331-0");
    });

    it('should return no bid even when requestId and sizes are missing', () =>{
      let bidderReponse = {
          "bidderCode": "quantcast",
          "bids" : [
              {
                "statusCode" : 0,
                "placementCode" : bidderRequest.bids[0].bidId,
              }
           ]
        };

      // You need the following call so that the in-memory storage of the bidRequest is carried out. Without this the callback won't work correctly.
      adapter.callBids(bidderRequest);
      $$PREBID_GLOBAL$$.handleQuantcastCB(JSON.stringify(bidderReponse));
      //sinon.assert.calledOnce(addBidReponseStub);
      //expect(addBidReponseStub.firstCall.args[0]).to.eql("div-gpt-ad-1438287399331-0");
    });
  });

});
