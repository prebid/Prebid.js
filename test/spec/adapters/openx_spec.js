describe('openx adapter tests', function () {

  const expect = require('chai').expect;
  const assert = require('chai').assert;
  const adapter = require('src/adapters/openx');
  const bidmanager = require('src/bidmanager');
  const adloader = require('src/adloader');
  const CONSTANTS = require('src/constants.json');

  before(() => sinon.stub(document.body, 'appendChild'));
  after(() => document.body.appendChild.restore());

  describe('test openx callback responce', function () {

    it('should exist and be a function', function () {
      expect(pbjs.oxARJResponse).to.exist.and.to.be.a('function');
    });

    it('should add empty bid responses if no bids returned', function () {
      let stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      let bidderRequest = {
        bidderCode: 'openx',
        bids: [
          {
            bidId: 'bidId1',
            bidder: 'openx',
            params: {
              delDomain: 'delDomain1',
              unit: '1234'
            },
            sizes: [[300, 250]],
            placementCode: 'test-gpt-div-1234'
          }
        ]
      };

      // empty ads in bidresponse
      let response = {
        "ads":
        {
          "version": 1,
          "count": 1,
          "pixels": "http://testpixels.net",
          "ad": []
        }
      };

      pbjs._bidsRequested.push(bidderRequest);
      // adapter needs to be called, in order for the stub to register.
      adapter();

      pbjs.oxARJResponse(response);

      let bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      let bidResponse1 = stubAddBidResponse.getCall(0).args[1];
      expect(bidPlacementCode1).to.equal('test-gpt-div-1234');
      expect(bidResponse1.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(bidResponse1.bidderCode).to.equal('openx');
      stubAddBidResponse.restore();
    });
  });

  it('should add bid responses if bids are returned', function () {
    let stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

    let bidderRequest = {
      bidderCode: 'openx',
      bids: [
        {
          bidId: 'bidId1',
          bidder: 'openx',
          params: {
            delDomain: 'delDomain1',
            unit: '1234'
          },
          sizes: [[300, 250]],
          placementCode: 'test-gpt-div-1234'
        }
      ]
    };

    // empty ads in bidresponse
    let response = {
      "ads":
      {
        "version": 1,
        "count": 1,
        "pixels": "http://testpixels.net",
        "ad": [
          {
            "adunitid": 1234,
            "adid": 5678,
            "type": "html",
            "html": "test_html",
            "framed": 1,
            "is_fallback": 0,
            "ts": "ts",
            "cpipc": 1000,
            "pub_rev": "1000",
            "adv_id": "adv_id",
            "brand_id": "",
            "creative": [
              {
                "width": "300",
                "height": "250",
                "target": "_blank",
                "mime": "text/html",
                "media": "test_media",
                "tracking": {
                  "impression": "test_impression",
                  "inview": "test_inview",
                  "click": "test_click"
                }
              }
            ]
          }]
      }
    };

    pbjs._bidsRequested.push(bidderRequest);
    // adapter needs to be called, in order for the stub to register.
    adapter();

    pbjs.oxARJResponse(response);

    let bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
    let bidResponse1 = stubAddBidResponse.getCall(0).args[1];
    let bid1width = '300';
    let bid1height = '250';
    let cpm = 1;
    expect(bidPlacementCode1).to.equal('test-gpt-div-1234');
    expect(bidResponse1.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
    expect(bidResponse1.bidderCode).to.equal('openx');
    expect(bidResponse1.width).to.equal(bid1width);
    expect(bidResponse1.height).to.equal(bid1height);
    expect(bidResponse1.cpm).to.equal(cpm);
    stubAddBidResponse.restore();
  });

  it('should add no fill bid responses if bids are returned, but have empty pub rev', function () {
    let stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

    let bidderRequest = {
      bidderCode: 'openx',
      bids: [
        {
          bidId: 'bidId1',
          bidder: 'openx',
          params: {
            delDomain: 'delDomain1',
            unit: '1234'
          },
          sizes: [[300, 250]],
          placementCode: 'test-gpt-div-1234'
        }
      ]
    };

    // Empty pub rev in bid response
    let response = {
      "ads":
      {
        "version": 1,
        "count": 1,
        "pixels": "http://testpixels.net",
        "ad": [
          {
            "adunitid": 1234,
            "adid": 5678,
            "type": "html",
            "html": "test_html",
            "framed": 1,
            "is_fallback": 1,
            "ts": "ts",
            "cpipc": 1000,
            "pub_rev": "",
            "adv_id": "adv_id",
            "brand_id": "",
            "creative": [
              {
                "width": "300",
                "height": "250",
                "target": "_blank",
                "mime": "text/html",
                "media": "test_media",
                "tracking": {
                  "impression": "test_impression",
                  "inview": "test_inview",
                  "click": "test_click"
                }
              }
            ]
          }]
      }
    };

    pbjs._bidsRequested.push(bidderRequest);
    // adapter needs to be called, in order for the stub to register.
    adapter();

    pbjs.oxARJResponse(response);

    let bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
    let bidResponse1 = stubAddBidResponse.getCall(0).args[1];
    expect(bidPlacementCode1).to.equal('test-gpt-div-1234');
    expect(bidResponse1.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
    expect(bidResponse1.bidderCode).to.equal('openx');
    stubAddBidResponse.restore();
  });

  it('should not call loadscript when inputting with empty params', function () {
    let spyLoadScript = sinon.spy(adloader, 'loadScript');
    adapter().callBids({});
    assert(!spyLoadScript.called);
    spyLoadScript.restore();
  });

  it('should call loadscript with the correct params', function () {
    let spyLoadScript = sinon.spy(adloader, 'loadScript');
    let params = {
      bids: [
        {
          sizes: [[300, 250], [300, 600]],
          params: {
            delDomain: 'testdelDomain',
            unit: 1234
          }
        }
      ]
    };
    adapter().callBids(params);

    sinon.assert.calledOnce(spyLoadScript);

    let bidUrl = spyLoadScript.getCall(0).args[0];
    expect(bidUrl).to.include('testdelDomain');
    expect(bidUrl).to.include('1234');
    expect(bidUrl).to.include('300x250,300x600');
    spyLoadScript.restore();
  });

  it('should send out custom params on bids that have customParams specified', function () {
    let spyLoadScript = sinon.spy(adloader, 'loadScript');
    let params = {
      bids: [
        {
          sizes: [[300, 250], [300, 600]],
          params: {
            delDomain: 'testdelDomain',
            unit: 1234,
            customParams: {'test1': 'testval1'}
          }
        }
      ]
    };
    adapter().callBids(params);

    sinon.assert.calledOnce(spyLoadScript);

    let bidUrl = spyLoadScript.getCall(0).args[0];
    expect(bidUrl).to.include('testdelDomain');
    expect(bidUrl).to.include('1234');
    expect(bidUrl).to.include('300x250,300x600');
    expect(bidUrl).to.include('c.test1=testval1');
    spyLoadScript.restore();
  });

});
