describe('wideorbit adapter tests', function () {
  var expect = require('chai').expect;
  var urlParse = require('url-parse');

    // FYI: querystringify will perform encoding/decoding
  var querystringify = require('querystringify');

  var adapter = require('modules/wideorbitBidAdapter');
  var adLoader = require('src/adloader');
  var bidmanager = require('src/bidmanager');

  describe('creation of bid url', function () {
    let stubLoadScript;

    beforeEach(function () {
      stubLoadScript = sinon.stub(adLoader, 'loadScript');
    });

    afterEach(function () {
      stubLoadScript.restore();
    });

    it('should be called only once', function () {
      var params = {
        bidderCode: 'wideorbit',
        bids: [
          {
            bidder: 'wideorbit',
            params: {
              pbId: 1,
              pId: 101
            },
            placementCode: 'div-gpt-ad-12345-1'
          },
          {
            bidder: 'wideorbit',
            params: {
              pbId: 1,
              site: 'Site 1',
              page: 'Page 1',
              width: 100,
              height: 200,
              subPublisher: 'Sub Publisher 1'
            },
            placementCode: 'div-gpt-ad-12345-2'
          }
        ]
      };

      adapter().callBids(params);

      sinon.assert.calledOnce(stubLoadScript);
    });

    it('should fix parameters name', function () {
      var params = {
        bidderCode: 'wideorbit',
        bids: [
          {
            bidder: 'wideorbit',
            params: {
              PBiD: 1,
              PID: 101,
              ReferRer: 'http://www.foo.com?param1=param1&param2=param2'
            },
            placementCode: 'div-gpt-ad-12345-1'
          },
          {
            bidder: 'wideorbit',
            params: {
              pbid: 1,
              SiTe: 'Site 1',
              Page: 'Page 1',
              widTH: 100,
              HEIGHT: 200,
              SUBPublisher: 'Sub Publisher 1'
            },
            placementCode: 'div-gpt-ad-12345-2'
          }
        ]
      };

      adapter().callBids(params);

      var bidUrl = stubLoadScript.getCall(0).args[0];

      sinon.assert.calledWith(stubLoadScript, bidUrl);

      var parsedBidUrl = urlParse(bidUrl);
      var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

      expect(parsedBidUrl.hostname).to.equal('p1.atemda.com')
      expect(parsedBidUrl.pathname).to.equal('/JSAdservingMP.ashx')
      expect(parsedBidUrlQueryString).to.have.property('pc').and.to.equal('2');
      expect(parsedBidUrlQueryString).to.have.property('pbId').and.to.equal('1');
      expect(parsedBidUrlQueryString).to.have.property('jsv').and.to.equal('1.0');
      expect(parsedBidUrlQueryString).to.have.property('tsv').and.to.equal('1.0');
      expect(parsedBidUrlQueryString).to.have.property('cts').to.have.length.above(0);
      expect(parsedBidUrlQueryString).to.have.property('arp').and.to.equal('0');
      expect(parsedBidUrlQueryString).to.have.property('fl').and.to.equal('0');
      expect(parsedBidUrlQueryString).to.have.property('jscb').and.to.equal('window.$$PREBID_GLOBAL$$.handleWideOrbitCallback');
      expect(parsedBidUrlQueryString).to.have.property('mpp').and.to.equal('0');
      expect(parsedBidUrlQueryString).to.have.property('cb').to.have.length.above(0);
      expect(parsedBidUrlQueryString).to.have.property('hb').and.to.equal('1');
      expect(parsedBidUrlQueryString).to.have.property('url').and.to.equal('http://www.foo.com?param1=param1&param2=param2');

      expect(parsedBidUrlQueryString).to.have.property('gid0').and.to.equal('div-gpt-ad-12345-1');
      expect(parsedBidUrlQueryString).to.have.property('rpos0').and.to.equal('0');
      expect(parsedBidUrlQueryString).to.have.property('ecpm0').and.to.equal('');

      expect(parsedBidUrlQueryString).to.have.property('gid1').and.to.equal('div-gpt-ad-12345-2');
      expect(parsedBidUrlQueryString).to.have.property('rpos1').and.to.equal('0');
      expect(parsedBidUrlQueryString).to.have.property('ecpm1').and.to.equal('');

      expect(parsedBidUrlQueryString).to.have.property('pId0').and.to.equal('101');
      expect(parsedBidUrlQueryString).to.have.property('rank0').and.to.equal('0');

      expect(parsedBidUrlQueryString).to.have.property('wsName1').and.to.equal('Site 1');
      expect(parsedBidUrlQueryString).to.have.property('wName1').and.to.equal('Page 1');
      expect(parsedBidUrlQueryString).to.have.property('rank1').and.to.equal('1');
      expect(parsedBidUrlQueryString).to.have.property('bfDim1').and.to.equal('100x200');
      expect(parsedBidUrlQueryString).to.have.property('subp1').and.to.equal('Sub Publisher 1');
    });

    describe('placement by name', function () {
      it('should be called with specific parameters for two bids', function () {
        var params = {
          bidderCode: 'wideorbit',
          bids: [
            {
              bidder: 'wideorbit',
              params: {
                pbId: 1,
                site: 'Site 1',
                page: 'Page 1',
                width: 100,
                height: 200,
                subPublisher: 'Sub Publisher 1',
                atf: true
              },
              placementCode: 'div-gpt-ad-12345-1'
            },
            {
              bidder: 'wideorbit',
              params: {
                pbId: 1,
                site: 'Site 2',
                page: 'Page 2',
                width: 200,
                height: 300,
                rank: 123,
                ecpm: 1.8
              },
              placementCode: 'div-gpt-ad-12345-2'
            }
          ]
        };

        adapter().callBids(params);

        var bidUrl = stubLoadScript.getCall(0).args[0];

        sinon.assert.calledWith(stubLoadScript, bidUrl);

        var parsedBidUrl = urlParse(bidUrl);
        var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

        expect(parsedBidUrl.hostname).to.equal('p1.atemda.com')
        expect(parsedBidUrl.pathname).to.equal('/JSAdservingMP.ashx')
        expect(parsedBidUrlQueryString).to.have.property('pc').and.to.equal('2');
        expect(parsedBidUrlQueryString).to.have.property('pbId').and.to.equal('1');
        expect(parsedBidUrlQueryString).to.have.property('jsv').and.to.equal('1.0');
        expect(parsedBidUrlQueryString).to.have.property('tsv').and.to.equal('1.0');
        expect(parsedBidUrlQueryString).to.have.property('cts').to.have.length.above(0);
        expect(parsedBidUrlQueryString).to.have.property('arp').and.to.equal('0');
        expect(parsedBidUrlQueryString).to.have.property('fl').and.to.equal('0');
        expect(parsedBidUrlQueryString).to.have.property('jscb').and.to.equal('window.$$PREBID_GLOBAL$$.handleWideOrbitCallback');
        expect(parsedBidUrlQueryString).to.have.property('mpp').and.to.equal('0');
        expect(parsedBidUrlQueryString).to.have.property('cb').to.have.length.above(0);
        expect(parsedBidUrlQueryString).to.have.property('hb').and.to.equal('1');
        expect(parsedBidUrlQueryString).to.have.property('url').and.to.be.empty;

        expect(parsedBidUrlQueryString).to.have.property('gid0').and.to.equal('div-gpt-ad-12345-1');
        expect(parsedBidUrlQueryString).to.have.property('rpos0').and.to.equal('1001');
        expect(parsedBidUrlQueryString).to.have.property('ecpm0').and.to.equal('');

        expect(parsedBidUrlQueryString).to.have.property('gid1').and.to.equal('div-gpt-ad-12345-2');
        expect(parsedBidUrlQueryString).to.have.property('rpos1').and.to.equal('0');
        expect(parsedBidUrlQueryString).to.have.property('ecpm1').and.to.equal('1.8');

        expect(parsedBidUrlQueryString).to.have.property('wsName0').and.to.equal('Site 1');
        expect(parsedBidUrlQueryString).to.have.property('wName0').and.to.equal('Page 1');
        expect(parsedBidUrlQueryString).to.have.property('rank0').and.to.equal('0');
        expect(parsedBidUrlQueryString).to.have.property('bfDim0').and.to.equal('100x200');
        expect(parsedBidUrlQueryString).to.have.property('subp0').and.to.equal('Sub Publisher 1');

        expect(parsedBidUrlQueryString).to.have.property('wsName1').and.to.equal('Site 2');
        expect(parsedBidUrlQueryString).to.have.property('wName1').and.to.equal('Page 2');
        expect(parsedBidUrlQueryString).to.have.property('rank1').and.to.equal('123');
        expect(parsedBidUrlQueryString).to.have.property('bfDim1').and.to.equal('200x300');
        expect(parsedBidUrlQueryString).to.have.property('subp1').and.to.equal('');
      });
    });

    describe('placement by id', function () {
      it('should be called with specific parameters for two bids', function () {
        var params = {
          bidderCode: 'wideorbit',
          bids: [
            {
              bidder: 'wideorbit',
              params: {
                pbId: 1,
                pId: 101,
                atf: true,
                ecpm: 0.8
              },
              placementCode: 'div-gpt-ad-12345-1'
            },
            {
              bidder: 'wideorbit',
              params: {
                pbId: 1,
                pId: 102,
                rank: 123
              },
              placementCode: 'div-gpt-ad-12345-2'
            }
          ]
        };

        adapter().callBids(params);

        var bidUrl = stubLoadScript.getCall(0).args[0];

        sinon.assert.calledWith(stubLoadScript, bidUrl);

        var parsedBidUrl = urlParse(bidUrl);
        var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);

        expect(parsedBidUrl.hostname).to.equal('p1.atemda.com')
        expect(parsedBidUrl.pathname).to.equal('/JSAdservingMP.ashx')
        expect(parsedBidUrlQueryString).to.have.property('pc').and.to.equal('2');
        expect(parsedBidUrlQueryString).to.have.property('pbId').and.to.equal('1');
        expect(parsedBidUrlQueryString).to.have.property('jsv').and.to.equal('1.0');
        expect(parsedBidUrlQueryString).to.have.property('tsv').and.to.equal('1.0');
        expect(parsedBidUrlQueryString).to.have.property('cts').to.have.length.above(0);
        expect(parsedBidUrlQueryString).to.have.property('arp').and.to.equal('0');
        expect(parsedBidUrlQueryString).to.have.property('fl').and.to.equal('0');
        expect(parsedBidUrlQueryString).to.have.property('jscb').and.to.equal('window.$$PREBID_GLOBAL$$.handleWideOrbitCallback');
        expect(parsedBidUrlQueryString).to.have.property('mpp').and.to.equal('0');
        expect(parsedBidUrlQueryString).to.have.property('cb').to.have.length.above(0);
        expect(parsedBidUrlQueryString).to.have.property('hb').and.to.equal('1');
        expect(parsedBidUrlQueryString).to.have.property('url').and.to.be.empty;

        expect(parsedBidUrlQueryString).to.have.property('gid0').and.to.equal('div-gpt-ad-12345-1');
        expect(parsedBidUrlQueryString).to.have.property('rpos0').and.to.equal('1001');
        expect(parsedBidUrlQueryString).to.have.property('ecpm0').and.to.equal('0.8');

        expect(parsedBidUrlQueryString).to.have.property('gid1').and.to.equal('div-gpt-ad-12345-2');
        expect(parsedBidUrlQueryString).to.have.property('rpos1').and.to.equal('0');
        expect(parsedBidUrlQueryString).to.have.property('ecpm1').and.to.equal('');

        expect(parsedBidUrlQueryString).to.have.property('pId0').and.to.equal('101');
        expect(parsedBidUrlQueryString).to.have.property('rank0').and.to.equal('0');

        expect(parsedBidUrlQueryString).to.have.property('pId1').and.to.equal('102');
        expect(parsedBidUrlQueryString).to.have.property('rank1').and.to.equal('123');
      });
    });
  });

    // describe('handling of the callback response', function () {
    //
    //     var placements = [
    //         {
    //             ExtPlacementId: 'div-gpt-ad-12345-1',
    //             Type: 'DirectHTML',
    //             Bid: 1.3,
    //             Width: 50,
    //             Height: 100,
    //             Source: '<div data-id="div-gpt-ad-12345-1">The AD 1 itself...</div>',
    //             TrackingCodes: [
    //                 'https://www.admeta.com/1.gif'
    //             ]
    //         },
    //         {
    //             ExtPlacementId: 'div-gpt-ad-12345-2',
    //             Type: 'DirectHTML',
    //             Bid: 1.5,
    //             Width: 100,
    //             Height: 200,
    //             Source: '<div data-id="div-gpt-ad-12345-2">The AD 2 itself...</div>',
    //             TrackingCodes: [
    //                 'http://www.admeta.com/2a.gif',
    //                 '<img src="http://www.admeta.com/2b.gif"></img>'
    //             ]
    //         },
    //         {
    //             ExtPlacementId: 'div-gpt-ad-12345-3',
    //             Type: 'Other',
    //             Bid: 1.7,
    //             Width: 150,
    //             Height: 250,
    //             Source: '<div data-id="div-gpt-ad-12345-3">The AD 3 itself...</div>',
    //             TrackingCodes: [
    //                 'http://www.admeta.com/3.gif'
    //             ]
    //         }
    //     ];
    //
    //     it('callback function should exist', function () {
    //         expect($$PREBID_GLOBAL$$.handleWideOrbitCallback).to.exist.and.to.be.a('function');
    //     });
    //
    //     it('bidmanager.addBidResponse should be called thrice with correct arguments', function () {
    //
    //         var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
    //
    //         var params = {
    //             bidderCode: 'wideorbit',
    //             bids: [
    //                 {
    //                     bidder: 'wideorbit',
    //                     params: {
    //                         pbId: 1,
    //                         pId: 101
    //                     },
    //                     placementCode: 'div-gpt-ad-12345-1'
    //                 },
    //                 {
    //                     bidder: 'wideorbit',
    //                     params: {
    //                         pbId: 1,
    //                         site: 'Site 1',
    //                         page: 'Page 1',
    //                         width: 100,
    //                         height: 200,
    //                         subPublisher: 'Sub Publisher 1'
    //                     },
    //                     placementCode: 'div-gpt-ad-12345-2'
    //                 },
    //                 {
    //                     bidder: 'wideorbit',
    //                     params: {
    //                         pbId: 1,
    //                         pId: 102
    //                     },
    //                     placementCode: 'div-gpt-ad-12345-3'
    //                 },
    //             ]
    //         };
    //
    //         var response = {
    //             UserMatchings: [
    //                 {
    //                     Type: 'redirect',
    //                     Url: 'http%3A%2F%2Fwww.admeta.com%2F1.gif'
    //                 }
    //             ],
    //             Placements: placements
    //         };
    //
    //         adapter().callBids(params);
    //         $$PREBID_GLOBAL$$.handleWideOrbitCallback(response);
    //
    //         var bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
    //         var bidObject1 = stubAddBidResponse.getCall(0).args[1];
    //         var bidPlacementCode2 = stubAddBidResponse.getCall(1).args[0];
    //         var bidObject2 = stubAddBidResponse.getCall(1).args[1];
    //         var bidPlacementCode3 = stubAddBidResponse.getCall(2).args[0];
    //         var bidObject3 = stubAddBidResponse.getCall(2).args[1];
    //
    //         expect(bidPlacementCode1).to.equal('div-gpt-ad-12345-1');
    //         expect(bidObject1.cpm).to.equal(1.3);
    //         expect(bidObject1.ad).to.equal('<img src="https://www.admeta.com/1.gif" width="0" height="0" style="position:absolute"></img><div data-id="div-gpt-ad-12345-1">The AD 1 itself...</div>');
    //         expect(bidObject1.width).to.equal(50);
    //         expect(bidObject1.height).to.equal(100);
    //         expect(bidObject1.getStatusCode()).to.equal(1);
    //         expect(bidObject1.bidderCode).to.equal('wideorbit');
    //
    //         expect(bidPlacementCode2).to.equal('div-gpt-ad-12345-2');
    //         expect(bidObject2.cpm).to.equal(1.50);
    //         expect(bidObject2.ad).to.equal('<img src="http://www.admeta.com/2b.gif"></img><img src="http://www.admeta.com/2a.gif" width="0" height="0" style="position:absolute"></img><div data-id="div-gpt-ad-12345-2">The AD 2 itself...</div>');
    //         expect(bidObject2.width).to.equal(100);
    //         expect(bidObject2.height).to.equal(200);
    //         expect(bidObject2.getStatusCode()).to.equal(1);
    //         expect(bidObject2.bidderCode).to.equal('wideorbit');
    //
    //         expect(bidPlacementCode3).to.equal('div-gpt-ad-12345-3');
    //         expect(bidObject3.getStatusCode()).to.equal(2);
    //         expect(bidObject3.bidderCode).to.equal('wideorbit');
    //
    //         sinon.assert.calledWith(stubAddBidResponse, bidPlacementCode1, bidObject1);
    //         sinon.assert.calledWith(stubAddBidResponse, bidPlacementCode2, bidObject2);
    //         sinon.assert.calledWith(stubAddBidResponse, bidPlacementCode3, bidObject3);
    //
    //         sinon.assert.calledThrice(stubAddBidResponse);
    //
    //         stubAddBidResponse.restore();
    //
    //     });
    //
    //     it('should append an image to the head when type is set to redirect', function () {
    //
    //         var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
    //
    //         var response = {
    //             UserMatchings: [
    //                 {
    //                     Type: 'redirect',
    //                     Url: 'http%3A%2F%2Fwww.admeta.com%2F1.gif'
    //                 }
    //             ],
    //             Placements: placements
    //         };
    //
    //         $$PREBID_GLOBAL$$.handleWideOrbitCallback(response);
    //
    //         var imgElement = document.querySelectorAll("head img")[0];
    //
    //         expect(imgElement).to.exist;
    //         expect(imgElement.src).to.equal('http://www.admeta.com/1.gif');
    //
    //         stubAddBidResponse.restore();
    //     });
    //
    //     it('should append an iframe to the head when type is set to iframe', function () {
    //
    //         var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
    //
    //         var response = {
    //             UserMatchings: [
    //                 {
    //                     Type: 'iframe',
    //                     Url: 'http%3A%2F%2Fwww.admeta.com%2F1.ashx'
    //                 }
    //             ],
    //             Placements: placements
    //         };
    //
    //         $$PREBID_GLOBAL$$.handleWideOrbitCallback(response);
    //
    //         var iframeElement = document.querySelectorAll("head iframe")[0];
    //
    //         expect(iframeElement).to.exist;
    //         expect(iframeElement.src).to.equal('http://www.admeta.com/1.ashx');
    //
    //         stubAddBidResponse.restore();
    //
    // });
    //
    //     it('should append an script to the head when type is set to js', function () {
    //
    //         var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
    //
    //         var response = {
    //             UserMatchings: [
    //                 {
    //                     Type: 'js',
    //                     Url: 'http%3A%2F%2Fwww.admeta.com%2F1.js'
    //                 }
    //             ],
    //             Placements: placements
    //         };
    //
    //         $$PREBID_GLOBAL$$.handleWideOrbitCallback(response);
    //
    //         var scriptElement = document.querySelectorAll("head script")[0];
    //
    //         expect(scriptElement).to.exist;
    //         expect(scriptElement.src).to.equal('http://www.admeta.com/1.js');
    //
    //         stubAddBidResponse.restore();
    //     });
    //
    //     it('should do nothing when type is set to unrecognized type', function () {
    //
    //         var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
    //
    //         var response = {
    //             UserMatchings: [
    //                 {
    //                     Type: 'unrecognized',
    //                     Url: 'http%3A%2F%2Fwww.admeta.com%2F1.js'
    //                 }
    //             ],
    //             Placements: placements
    //         };
    //
    //         $$PREBID_GLOBAL$$.handleWideOrbitCallback(response);
    //
    //         stubAddBidResponse.restore();
    //     });
    //
    // });
});
