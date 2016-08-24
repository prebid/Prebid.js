describe('adsparc adapter tests', function () {
    var expect = require('chai').expect;
    var assert = require('chai').assert;
    var urlParse = require('url-parse');
    var querystringify = require('querystringify');

    var adapter = require('src/adapters/adsparc');
    var bidmanager = require('src/bidmanager');
    var adLoader = require('src/adloader');
    var utils = require('src/utils');


    window.pbjs = window.pbjs || {};
    if (typeof(pbjs)==="undefined"){
      var pbjs = window.pbjs;
    }

    var spyLoadScript;
    beforeEach(function () {
        spyLoadScript = sinon.spy(adLoader, 'loadScript');
      });

    afterEach(function () {
        spyLoadScript.restore();
      });

    var logErrorSpy;
    beforeEach(function () {
        logErrorSpy = sinon.spy(utils, 'logError');
      });

    afterEach(function () {
        logErrorSpy.restore();
      });

    describe('creation of bid url', function () {

        if (typeof(pbjs._bidsRequested)==="undefined"){
          pbjs._bidsRequested = [];
        }

        it('should fix parameter name', function () {

              var params = {
                bidderCode: 'adsparc',
                bids: [
                    {
                        bidder: 'adsparc',
                        sizes: [[300, 250]],
                        params: {
                          size: '300x250',
                          pubId: '2',
                          pageUrl: 'http://www.mysite.com',
                          refUrl: 'http://www.mysite.com',
                        },
                        placementCode: '/19968336/header-bid-tag-0'
                      },
                    {
                        bidder: 'adsparc',
                        sizes: [[300, 250]],
                        params: {
                          size: '300x250',
                          pubId: '3',
                          pageUrl: 'http://www.mysite.com',
                          refUrl: 'http://www.mysite.com',
                        },
                        placementCode: '/19968336/header-bid-tag-1'
                      }
                    
                ]
              };
              adapter().callBids(params);
			
              var bidUrl1 = "http://pubs.adsparc.net/bid/ad.json?type=1&p=2&sz=300x250&pageUrl=http%3A%2F%2Fwww.ndtv.com%2F&refUrl=";
              var bidUrl2 = "http://pubs.adsparc.net/bid/ad.json?type=1&p=3&sz=300x250&pageUrl=http%3A%2F%2Fwww.ndtv.com%2F&refUrl=";
			
              var parsedBidUrl = urlParse(bidUrl1);
              var parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);
              var generatedCallback = 'adadsparcHandler_28136300x250';


              expect(parsedBidUrl.hostname).to.equal('pubs.adsparc.net');
              expect(parsedBidUrl.pathname).to.equal('/bid/ad.json');

              expect(parsedBidUrlQueryString).to.have.property('type').and.to.equal('1');
              expect(parsedBidUrlQueryString).to.have.property('p').and.to.equal('2');
              expect(parsedBidUrlQueryString).to.have.property('sz').and.to.equal('300x250');


              parsedBidUrl = urlParse(bidUrl2);
              parsedBidUrlQueryString = querystringify.parse(parsedBidUrl.query);
              generatedCallback = 'adadsparcHandler_28137728x90';

              expect(parsedBidUrl.hostname).to.equal('pubs.adsparc.net');
              expect(parsedBidUrl.pathname).to.equal('/bid/ad.json');

              expect(parsedBidUrlQueryString).to.have.property('type').and.to.equal('1');
              expect(parsedBidUrlQueryString).to.have.property('p').and.to.equal('3');
              expect(parsedBidUrlQueryString).to.have.property('sz').and.to.equal('300x250');
            });

      });

    describe('handling of the callback response', function () {
        if (typeof(pbjs._bidsReceived)==="undefined"){
          pbjs._bidsReceived = [];
        }
        if (typeof(pbjs._bidsRequested)==="undefined"){
          pbjs._bidsRequested = [];
        }
        if (typeof(pbjs._adsReceived)==="undefined"){
          pbjs._adsReceived = [];
        }

        var params = {
          bidderCode: 'adsparc',
          bids: [
              {
                  bidder: 'adsparc',
                  sizes: [[300, 250]],
                  params: {
                    size: '300x250',
                    pubId: '2',
                    pageUrl: 'http://www.mysite.com',
                    refUrl: 'http://www.mysite.com',
                  },
                  placementCode: '/19968336/header-bid-tag-0'
                },
              {
                  bidder: 'adsparc',
                  sizes: [[300, 250]],
                  params: {
                          size: '300x250',
                          pubId: '3',
                          pageUrl: 'http://www.mysite.com',
                          refUrl: 'http://www.mysite.com',
                        },
                  placementCode: '/19968336/header-bid-tag-1'
                }
              
          ]
        };

       

        it('bidmanager.addBidResponse should be called with correct arguments', function () {

            var stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

            adapter().callBids(params);

            var adUnits = new Array();
            var unit = new Object();
            unit.bids = params.bids;
            unit.code = '/19968336/header-bid-tag';
            unit.sizes=[[300,250],[728,90]];
            adUnits.push(unit);

            if (typeof(pbjs._bidsRequested)==="undefined"){
              pbjs._bidsRequested = [params];
            }
            else{
              pbjs._bidsRequested.push(params);
            }

            pbjs.adUnits = adUnits;

            var response = {"adCode":"<SCRIPT SRC='http://as.eu.angsrvr.com/select?type=js&plc=1067679&cache={RANDOM}&padsrvcurl=\'></SCRIPT>","eCpm":0.2};
            var response2 = {"adCode":"<SCRIPT SRC='http://pubs.adsparc.net/track/ad.json?type=1&p=3&sz=300x250'></SCRIPT>","eCpm":0.3};

            

            var bidObject1 = response;
            var bidObject2 = response2;
            

            expect(bidObject1.eCpm).to.equal(0.2);
            expect(bidObject1.adCode).to.equal("<SCRIPT SRC='http://as.eu.angsrvr.com/select?type=js&plc=1067679&cache={RANDOM}&padsrvcurl=\'></SCRIPT>");

            expect(bidObject2.eCpm).to.equal(0.3);
            expect(bidObject2.adCode).to.equal("<SCRIPT SRC='http://pubs.adsparc.net/track/ad.json?type=1&p=3&sz=300x250'></SCRIPT>");


            stubAddBidResponse.restore();
          });
      });
  });
