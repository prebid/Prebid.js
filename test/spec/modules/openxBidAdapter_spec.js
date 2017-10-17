const expect = require('chai').expect;
const assert = require('chai').assert;
const adapter = require('modules/openxBidAdapter')();
const bidmanager = require('src/bidmanager');
const adloader = require('src/adloader');
const CONSTANTS = require('src/constants.json');
const ajax = require('src/ajax');

describe('openx adapter tests', function () {
  describe('test openx callback response', function () {
    let stubAjax;
    let stubAddBidResponse;
    this.response = null;
    let responseHandlerCallback = (_url, callback, _data, _params) => {
      return callback(this.response);
    };

    beforeEach(() => {
      stubAjax = sinon.stub(ajax, 'ajax', responseHandlerCallback);
      stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
      sinon.stub(document.body, 'appendChild');
    });
    afterEach(() => {
      stubAjax.restore();
      stubAddBidResponse.restore();
      this.response = null;
      document.body.appendChild.restore();
    });
    it('should add empty bid responses if no bids returned', () => {
      // empty ads in bidresponse
      this.response = JSON.stringify({
        'ads':
        {
          'version': 1,
          'count': 1,
          'pixels': 'http://testpixels.net',
          'ad': []
        }
      });

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

      $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);
      adapter.callBids(bidderRequest);

      let bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      let bidResponse1 = stubAddBidResponse.getCall(0).args[1];
      expect(bidPlacementCode1).to.equal('test-gpt-div-1234');
      expect(bidResponse1.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(bidResponse1.bidderCode).to.equal('openx');
    });

    it('should add bid responses if bids are returned', () => {
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

      this.response = JSON.stringify({
        'ads':
        {
          'version': 1,
          'count': 1,
          'pixels': 'http://testpixels.net',
          'ad': [
            {
              'adunitid': 1234,
              'adid': 5678,
              'type': 'html',
              'html': 'test_html',
              'framed': 1,
              'is_fallback': 0,
              'ts': 'ts',
              'cpipc': 1000,
              'pub_rev': '1000',
              'adv_id': 'adv_id',
              'brand_id': '',
              'creative': [
                {
                  'width': '300',
                  'height': '250',
                  'target': '_blank',
                  'mime': 'text/html',
                  'media': 'test_media',
                  'tracking': {
                    'impression': 'test_impression',
                    'inview': 'test_inview',
                    'click': 'test_click'
                  }
                }
              ]
            }]
        }
      });

      $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);
      adapter.callBids(bidderRequest);

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
    });
  });
  describe('test openx ad requests', () => {
    let spyAjax;
    let spyBtoa;
    beforeEach(() => {
      spyAjax = sinon.spy(ajax, 'ajax');
      spyBtoa = sinon.spy(window, 'btoa');
      sinon.stub(document.body, 'appendChild');
    });
    afterEach(() => {
      spyAjax.restore();
      spyBtoa.restore();
      document.body.appendChild.restore();
    });

    it('should not call ajax when inputting with empty params', () => {
      adapter.callBids({});
      assert(!spyAjax.called);
    });

    it('should call ajax with the correct bid url', () => {
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
      adapter.callBids(params);
      sinon.assert.calledOnce(spyAjax);

      let bidUrl = spyAjax.getCall(0).args[0];
      expect(bidUrl).to.include('testdelDomain');
      expect(bidUrl).to.include('1234');
      expect(bidUrl).to.include('300x250,300x600');
    });

    it('should send out custom params on bids that have customParams specified', () => {
      let params = {
        bids: [
          {
            sizes: [[300, 250], [300, 600]],
            params: {
              delDomain: 'testdelDomain',
              unit: 1234,
              customParams: {'test1': 'testval1+', 'test2': ['testval2/', 'testval3']}
            }
          }
        ]
      };
      adapter.callBids(params);

      sinon.assert.calledOnce(spyAjax);
      sinon.assert.calledWith(spyBtoa, 'test1=testval1.&test2=testval2_,testval3');
      let bidUrl = spyAjax.getCall(0).args[0];
      expect(bidUrl).to.include('testdelDomain');
      expect(bidUrl).to.include('1234');
      expect(bidUrl).to.include('300x250,300x600');
    });

    it('should send out custom floors on bids that have customFloors specified', () => {
      let params = {
        bids: [
          {
            sizes: [[300, 250], [300, 600]],
            params: {
              delDomain: 'testdelDomain',
              unit: 1234,
              customFloor: 1
            }
          },
          {
            sizes: [[320, 50]],
            params: {
              delDomain: 'testdelDomain',
              unit: 1234
            }
          },
          {
            sizes: [[728, 90]],
            params: {
              delDomain: 'testdelDomain',
              unit: 1234,
              customFloor: 1.5
            }
          }
        ]
      };
      adapter.callBids(params);

      sinon.assert.calledOnce(spyAjax);
      let bidUrl = spyAjax.getCall(0).args[0];
      expect(bidUrl).to.include('testdelDomain');
      expect(bidUrl).to.include('1234');
      expect(bidUrl).to.include('300x250,300x600|320x50|728x90');
      expect(bidUrl).to.include('aumfs=1000%2C0%2C1500');
    });

    it('should change bc param if configureable bc is specified', () => {
      let params = {
        bids: [
          {
            sizes: [[300, 250], [300, 600]],
            params: {
              delDomain: 'testdelDomain',
              unit: 1234,
              bc: 'hb_pb_test'
            }
          },
          {
            sizes: [[320, 50]],
            params: {
              delDomain: 'testdelDomain',
              unit: 1234,
              bc: 'hb_pb_test'
            }
          },
          {
            sizes: [[728, 90]],
            params: {
              delDomain: 'testdelDomain',
              unit: 1234,
              bc: 'hb_pb_test'
            }
          }
        ]
      };
      adapter.callBids(params);

      sinon.assert.calledOnce(spyAjax);
      let bidUrl = spyAjax.getCall(0).args[0];
      expect(bidUrl).to.include('testdelDomain');
      expect(bidUrl).to.include('1234');
      expect(bidUrl).to.include('300x250,300x600|320x50|728x90');
      expect(bidUrl).to.include('bc=hb_pb_test');
    });
  });
});
