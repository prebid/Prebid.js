describe('mobfox adapter tests', function () {
  const expect = require('chai').expect;
  const utils = require('src/utils');
  const adapter = require('modules/mobfoxBidAdapter');
  const bidmanager = require('src/bidmanager');
  const adloader = require('src/adloader');
  const CONSTANTS = require('src/constants.json');
  const ajax = require('src/ajax.js');
  let mockResponses = {
    banner: {
      'request': {
        'type': 'textAd',
        'htmlString': '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title><\/title><style>body{margin:0;padding:0}#mobfoxCover{background:0 0;margin:0;padding:0;border:none;position:absolute;left:0;top:0;z-index:100}<\/style><\/head><body><div id="mobfoxCover"><\/div><script type="text\/javascript">function checkRedirect(e){return function(){if(state===REDIRECT){state=REDUNDANT;var t=window.document.querySelector("iframe").contentDocument.querySelector("html").innerHTML.toLowerCase();if(!(t.indexOf("<script")<0&&t.indexOf("<iframe")<0)){var o=new XMLHttpRequest,d={creativeId:creativeId,advertiserId:advertiserId,hParam:hParam,dspId:dspId,networkId:networkId,autoPilotInventoryConfId:autoPilotInventoryConfId,stackItemId:stackItemId,adSpaceId:adSpaceId,cId:cId,adomain:adomain,geo:geo,event:e,ua:window.navigator.userAgent,adId:adId,site:window.location.href,md5Hash:md5Hash,snapshot:btoa(unescape(encodeURIComponent(t)))};o.open("POST","http:\/\/my.mobfox.com\/fraud-integration",!1),o.setRequestHeader("Content-type","application\/json"),o.send(JSON.stringify(d))}}}}function init(){window.onbeforeunload=checkRedirect("onbeforeunload"),window.addEventListener("beforeunload",checkRedirect("beforeunload")),window.addEventListener("unload",checkRedirect("unload")),document.addEventListener("visibilitychange",function(){"hidden"===document.visibilityState&&checkRedirect("visibilityState")});var e=document.createElement("iframe");document.body.appendChild(e),e.width="320",e.height="50";var t=document.querySelector("#mobfoxCover");t.style.width=e.width+"px",t.style.height=e.height+"px",e.style.margin="0px",e.style.padding="0px",e.style.border="none",e.scrolling="no",e.style.overflow="hidden",e.sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-same-origin";var o=atob(markupB64);setTimeout(function(){state=NORMAL},200),setTimeout(function(){var e=document.querySelector("#mobfoxCover");document.body.removeChild(e)},200);var d="srcdoc"in e,n=o;o.indexOf("<body>")<0&&(n="<html><body style="margin:0">"+o+"<\/body><\/html>"),d?e.srcdoc=n:(e.contentWindow.document.open(),e.contentWindow.document.write(n),e.contentWindow.document.close())}var markupB64="PGEgaHJlZj0iaHR0cDovL3Rva3lvLW15Lm1vYmZveC5jb20vZXhjaGFuZ2UuY2xpY2sucGhwP2g9ZGI1ZjZkOTJiMDk1OGI0ZDFlNjU4ZjZlNWRkNWY0MmUiIHRhcmdldD0iX2JsYW5rIj48aW1nIHNyYz0iaHR0cHM6Ly9jcmVhdGl2ZWNkbi5tb2Jmb3guY29tL2U4ZTkxNWYzMmJhOTVkM2JmMzY4YTM5N2EyMzQ4NzVmLmdpZiIgYm9yZGVyPSIwIi8+PC9hPjxicj48aW1nIHN0eWxlPSJwb3NpdGlvbjphYnNvbHV0ZTsgbGVmdDogLTEwMDAwcHg7IiB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBzcmM9Imh0dHA6Ly90b2t5by1teS5tb2Jmb3guY29tL2V4Y2hhbmdlLnBpeGVsLnBocD9oPWRiNWY2ZDkyYjA5NThiNGQxZTY1OGY2ZTVkZDVmNDJlIi8+PHNjcmlwdCB0eXBlPSJ0ZXh0L2phdmFzY3JpcHQiPmRvY3VtZW50LndyaXRlKCc8aW1nIHN0eWxlPSJwb3NpdGlvbjphYnNvbHV0ZTsgbGVmdDogLTEwMDAwcHg7IiB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBzcmM9Imh0dHA6Ly90b2t5by1teS5tb2Jmb3guY29tL2V4Y2hhbmdlLnBpeGVsLnBocD9oPWRiNWY2ZDkyYjA5NThiNGQxZTY1OGY2ZTVkZDVmNDJlJnRlc3Q9MSIvPicpOzwvc2NyaXB0Pg==",INITIAL=0,REDIRECT=1,REDUNDANT=2,NORMAL=3,state=INITIAL,creativeId="",advertiserId="",hParam="db5f6d92b0958b4d1e658f6e5dd5f42e",dspId="",networkId="",autoPilotInventoryConfId="",stackItemId="392746",serverHost="184.172.209.50",adSpaceId="",adId="",cId="",adomain="",geo="US",md5Hash="f3bd183c0b19faf12c76e75461cb8cac";document.addEventListener("DOMContentLoaded",function(e){state=REDIRECT}),setTimeout(init,1)<\/script><\/body><\/html>',
        'clicktype': 'safari',
        'clickurl': 'http://tokyo-my.mobfox.com/exchange.click.php?h=db5f6d92b0958b4d1e658f6e5dd5f42e',
        'urltype': 'link',
        'refresh': '30',
        'scale': 'no',
        'skippreflight': 'yes'
      }
    }
  };

  let mockRequestsParams = {
    banner: {
      rt: 'api',
      r_type: 'banner',
      i: '69.197.148.18',
      s: 'fe96717d9875b9da4339ea5367eff1ec',
      u: 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/600.1.3 (KHTML, like Gecko) Version/8.0 Mobile/12A4345d Safari/600.1.4',
      adspace_strict: 0,

      // o_iosadvid: '1976F519-26D0-4428-9891-3133253A453F',
      // r_floor: '0.2',
      // longitude: '12.12',
      // latitude: '280.12',
      // demo_gender: 'male',
      // demo_age: '1982',
      // demo_keywords: 'sports',
      // adspace_width: 320,
      // adspace_height: 50
    }
  };

  before(() => sinon.stub(document.body, 'appendChild'));
  after(() => document.body.appendChild.restore());

  let xhrMock = {
    getResponseHeader: getResponseHeaderMock
  };
  function getResponseHeaderMock(header) {
    switch (header) {
      case 'Content-Type':
        return 'application/json';
      case 'X-Pricing-CPM':
        return '1';
    }
  }
  function createMobfoxErrorStub() {
    return sinon.stub(ajax, 'ajax').callsFake((url, callbacks) => {
      callbacks.success(
        JSON.stringify({error: 'No Ad Available'}),
        xhrMock
      );
    });
  }

  function createMobfoxSuccessStub() {
    return sinon.stub(ajax, 'ajax').callsFake((url, callbacks) => {
      callbacks.success(
        JSON.stringify(mockResponses.banner)
        , xhrMock
      );
    });
  }

  describe('test mobfox error response', function () {
    let stubAddBidResponse, stubAjax;
    before(function () {
      stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
      stubAjax = createMobfoxErrorStub()
    });

    after(function () {
      stubAddBidResponse.restore();
      stubAjax.restore();
    });

    it('should add empty bid responses if no bids returned', function () {
      let bidderRequest = {
        bidderCode: 'mobfox',
        bids: [
          {
            bidId: 'bidId1',
            bidder: 'mobfox',
            params: {},
            sizes: [[300, 250]],
            placementCode: 'test-gpt-div-1234'
          }
        ]
      };

      // empty ads in bidresponse
      let requestParams = utils.cloneJson(mockRequestsParams.banner);
      requestParams.adspace_width = 1231564; // should return an error
      bidderRequest.bids[0].params = requestParams;
      $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);
      // adapter needs to be called, in order for the stub to register.
      adapter().callBids(bidderRequest);

      let bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      let bidResponse1 = stubAddBidResponse.getCall(0).args[1];
      expect(bidPlacementCode1).to.equal('test-gpt-div-1234');
      expect(bidResponse1.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(bidResponse1.bidderCode).to.equal('mobfox');
    });
  });

  describe('test mobfox success response', function () {
    let stubAddBidResponse, stubAjax;
    before(function () {
      stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
      stubAjax = createMobfoxSuccessStub()
    });

    after(function () {
      stubAddBidResponse.restore();
      stubAjax.restore();
    });

    it('should add a bid response', function () {
      let bidderRequest = {
        bidderCode: 'mobfox',
        bids: [
          {
            bidId: 'bidId1',
            bidder: 'mobfox',
            params: {},
            sizes: [[300, 250]],
            placementCode: 'test-gpt-div-1234'
          }
        ]
      };

      let requestParams = utils.cloneJson(mockRequestsParams.banner);
      bidderRequest.bids[0].params = requestParams;
      $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);
      // adapter needs to be called, in order for the stub to register.
      adapter().callBids(bidderRequest);

      let bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      let bidResponse1 = stubAddBidResponse.getCall(0).args[1];
      expect(bidPlacementCode1).to.equal('test-gpt-div-1234');
      expect(bidResponse1.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      expect(bidResponse1.bidderCode).to.equal('mobfox');

      expect(bidResponse1.cpm).to.equal(1);
      expect(bidResponse1.width).to.equal(bidderRequest.bids[0].sizes[0][0]);
      expect(bidResponse1.height).to.equal(bidderRequest.bids[0].sizes[0][1]);
    });
  });
});
