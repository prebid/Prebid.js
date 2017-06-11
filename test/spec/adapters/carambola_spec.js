import {expect} from 'chai';
import * as utils from 'src/utils';
import CarambolaAdapter from 'src/adapters/carambola';
import bidmanager from 'src/bidmanager';

const DEFAULT_BIDDER_REQUEST = {
  bidderCode: 'carambola',
  requestId: 'c9ad932a-41d9-4821-b6dc-0c8146029faf',
  adId: '2e3daacdeed03d',
  start: new Date().getTime(),
  bids: [{
    bidder: 'carambola',
    adId: '2e3daacdeed03d',
    requestId: 'c9ad932a-41d9-4821-b6dc-0c8146029faf',
    adUnitCode: 'cbola_prebid_code_97',
    token: 'CGYCLyIy',
    pageViewId: '22478638',
    params: {
      pid: 'hbtest',
      did: 112591,
      wid: 0
    }
  }]
};

const DEFAULT_HB_RESPONSE = {
  cpm: 0.1693953107111156,
  ad: '<!--Carambola Script -->     <script data-cfasync="false" class="carambola_InContent" type="text/javascript" data-hb_pvid="22478638"  data-hb_token="9cd6bf9c-433d-4663-b67f-da727f4cebff" cbola_wid="2" >(function (i,d,s,o,m,r,c,l,w,q,y,h,g) {    var e=d.getElementById(r);if(e===null){        var t = d.createElement(o); t.src = g; t.id = r; t.setAttribute(m, s);t.async = 1;var n=d.getElementsByTagName(o)[0];n.parentNode.insertBefore(t, n);        var dt=new Date().getTime();        try{i[l][w+y](h,i[l][q+y](h)+\'&\'+dt);}catch(er){i[h]=dt;}    } else if(typeof i[c]!==\'undefined\'){i[c]++}    else{i[c]=1;}})(window, document, \'InContent\', \'script\', \'mediaType\', \'carambola_proxy\',\'Cbola_IC\',\'localStorage\',\'set\',\'get\',\'Item\',\'cbolaDt\',\'//route.carambo.la/hb/inimage/getLayer?pid=hbtest&did=112591&wid=2&hb_token=CGYCLyIy&pvid=22478638&rdn=[RANDOM_NUMBER]\')</script>',
  token: '9cd6bf9c-433d-4663-b67f-da727f4cebff',
  width: '300',
  height: '250',
  currencyCode: 'USD',
  pageViewId: '22478638',
  requestStatus: 1

};

describe('carambolaAdapter', function () {
  let adapter;

  beforeEach(() => adapter = new CarambolaAdapter());

  function createBidderRequest({bids, params} = {}) {
    var bidderRequest = utils.cloneJson(DEFAULT_BIDDER_REQUEST);
    if (bids && Array.isArray(bids)) {
      bidderRequest.bids = bids;
    }
    if (params) {
      bidderRequest.bids.forEach(bid => bid.params = params);
    }
    return bidderRequest;
  }

  describe('callBids()', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    //  bid request starts
    describe('bid request', () => {
      let xhr;
      let requests;

      beforeEach(() => {
        xhr = sinon.useFakeXMLHttpRequest();
        requests = [];
        xhr.onCreate = request => requests.push(request);
      });

      afterEach(() => xhr.restore());

      it('requires parameters to be made', () => {
        adapter.callBids({});
        expect(requests[0]).to.be.empty;
      });

      it('should hit the default route.carambo.la endpoint', () => {
        adapter.callBids(DEFAULT_BIDDER_REQUEST);
        expect(requests[0].url).to.contain('route.carambo.la');
      });

      it('should verifiy that a page_view_id is sent', () => {
        adapter.callBids(DEFAULT_BIDDER_REQUEST);
        expect(requests[0].url).to.contain('pageViewId=');
      });

      it('should should send the correct did', () => {
        adapter.callBids(createBidderRequest({
          params: {
            did: 112591,
            wid: 0
          }
        }));
        expect(requests[0].url).to.contain('did=112591');
      });
    });
    //  bid request ends

    //  bid response starts
    describe('bid response', () => {
      let server;

      beforeEach(() => {
        server = sinon.fakeServer.create();
        sinon.stub(bidmanager, 'addBidResponse');
      });

      afterEach(() => {
        server.restore();
        bidmanager.addBidResponse.restore();
      });

      it('should be added to bidmanager if response is valid', () => {
        server.respondWith(JSON.stringify(DEFAULT_HB_RESPONSE));
        adapter.callBids(DEFAULT_BIDDER_REQUEST);
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
      });

      it('should be added to bidmanager with correct bidderCode', () => {
        server.respondWith(JSON.stringify(DEFAULT_HB_RESPONSE));
        adapter.callBids(DEFAULT_BIDDER_REQUEST);
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        expect(bidmanager.addBidResponse.firstCall.args[1]).to.have.property('bidderCode', 'carambola');
      });

      it('should have pageViewId matching the pageViewId from related bid request', () => {
        server.respondWith(JSON.stringify(DEFAULT_HB_RESPONSE));
        adapter.callBids(DEFAULT_BIDDER_REQUEST);
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        expect(bidmanager.addBidResponse.firstCall.args[1])
          .to.have.property('pvid', DEFAULT_BIDDER_REQUEST.bids[0].pageViewId);
      });
    });
    //  bid response ends
  });
});
