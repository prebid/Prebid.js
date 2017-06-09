import {expect} from 'chai';
import * as utils from 'src/utils';
import AolAdapter from 'modules/aolBidAdapter';
import bidmanager from 'src/bidmanager';

let getDefaultBidResponse = () => {
  return {
    id: '245730051428950632',
    cur: 'USD',
    seatbid: [{
      bid: [{
        id: 1,
        impid: '245730051428950632',
        price: 0.09,
        adm: '<script>logInfo(\'ad\');</script>',
        crid: '0',
        h: 90,
        w: 728,
        ext: {sizeid: 225}
      }]
    }]
  };
};

let getDefaultBidRequest = () => {
  return {
    bidderCode: 'aol',
    requestId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
    bidderRequestId: '7101db09af0db2',
    start: new Date().getTime(),
    bids: [{
      bidder: 'aol',
      bidId: '84ab500420319d',
      bidderRequestId: '7101db09af0db2',
      requestId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
      placementCode: 'foo',
      params: {
        placement: 1234567,
        network: '9599.1'
      }
    }]
  };
};

describe('AolAdapter', () => {
  let adapter;

  beforeEach(() => adapter = new AolAdapter());

  function createBidderRequest({bids, params} = {}) {
    var bidderRequest = getDefaultBidRequest();
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

    describe('bid request', () => {
      describe('Marketplace api', () => {
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
          expect(requests).to.be.empty;
        });

        it('should hit the Marketplace api endpoint with the Marketplace config', () => {
          adapter.callBids(getDefaultBidRequest());
          expect(requests[0].url).to.contain('adserver-us.adtech.advertising.com/pubapi/3.0/');
        });

        it('should hit endpoint based on the region config option', () => {
          adapter.callBids(createBidderRequest({
            params: {
              placement: 1234567,
              network: '9599.1',
              region: 'eu'
            }
          }));
          expect(requests[0].url).to.contain('adserver-eu.adtech.advertising.com/pubapi/3.0/');
        });

        it('should hit the default endpoint in case of unknown region config option', () => {
          adapter.callBids(createBidderRequest({
            params: {
              placement: 1234567,
              network: '9599.1',
              region: 'an'
            }
          }));
          expect(requests[0].url).to.contain('adserver-us.adtech.advertising.com/pubapi/3.0/');
        });

        it('should hit endpoint based on the server config option', () => {
          adapter.callBids(createBidderRequest({
            params: {
              placement: 1234567,
              network: '9599.1',
              server: 'adserver-eu.adtech.advertising.com'
            }
          }));
          expect(requests[0].url).to.contain('adserver-eu.adtech.advertising.com/pubapi/3.0/');
        });

        it('should be the pubapi bid request', () => {
          adapter.callBids(getDefaultBidRequest());
          expect(requests[0].url).to.contain('cmd=bid;');
        });

        it('should be the version 2 of pubapi', () => {
          adapter.callBids(getDefaultBidRequest());
          expect(requests[0].url).to.contain('v=2;');
        });

        it('should contain cache busting', () => {
          adapter.callBids(getDefaultBidRequest());
          expect(requests[0].url).to.match(/misc=\d+/);
        });

        it('should contain required params - placement & network', () => {
          adapter.callBids(createBidderRequest({
            params: {
              placement: 1234567,
              network: '9599.1'
            }
          }));
          expect(requests[0].url).to.contain('/pubapi/3.0/9599.1/1234567/');
        });

        it('should contain pageId and sizeId of 0 if params are missing', () => {
          adapter.callBids(createBidderRequest({
            params: {
              placement: 1234567,
              network: '9599.1'
            }
          }));
          expect(requests[0].url).to.contain('/pubapi/3.0/9599.1/1234567/0/0/ADTECH;');
        });

        it('should contain pageId optional param', () => {
          adapter.callBids(createBidderRequest({
            params: {
              placement: 1234567,
              network: '9599.1',
              pageId: 12345
            }
          }));
          expect(requests[0].url).to.contain('/pubapi/3.0/9599.1/1234567/12345/');
        });

        it('should contain sizeId optional param', () => {
          adapter.callBids(createBidderRequest({
            params: {
              placement: 1234567,
              network: '9599.1',
              sizeId: 12345
            }
          }));
          expect(requests[0].url).to.contain('/12345/ADTECH;');
        });

        it('should contain generated alias if alias param is missing', () => {
          adapter.callBids(createBidderRequest({
            params: {
              placement: 1234567,
              network: '9599.1'
            }
          }));
          expect(requests[0].url).to.match(/alias=\w+?;/);
        });

        it('should contain alias optional param', () => {
          adapter.callBids(createBidderRequest({
            params: {
              placement: 1234567,
              network: '9599.1',
              alias: 'desktop_articlepage_something_box_300_250'
            }
          }));
          expect(requests[0].url).to.contain('alias=desktop_articlepage_something_box_300_250');
        });

        it('should not contain bidfloor if bidFloor param is missing', () => {
          adapter.callBids(createBidderRequest({
            params: {
              placement: 1234567,
              network: '9599.1'
            }
          }));
          expect(requests[0].url).not.to.contain('bidfloor=');
        });

        it('should contain bidFloor optional param', () => {
          adapter.callBids(createBidderRequest({
            params: {
              placement: 1234567,
              network: '9599.1',
              bidFloor: 0.80
            }
          }));
          expect(requests[0].url).to.contain('bidfloor=0.8');
        });
      });

      describe('Nexage api', () => {
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
          expect(requests).to.be.empty;
        });

        it('should hit the nexage api endpoint with the nexage config', () => {
          adapter.callBids(createBidderRequest({
            params: {
              dcn: '11223344',
              pos: 'header-2324'
            }
          }));
          expect(requests[0].url).to.contain('hb.nexage.com/bidRequest?');
        });

        it('should hit the nexage api custom endpoint if specified in the nexage config', () => {
          adapter.callBids(createBidderRequest({
            params: {
              host: 'qa-hb.nexage.com',
              dcn: '11223344',
              pos: 'header-2324'
            }
          }));
          expect(requests[0].url).to.contain('qa-hb.nexage.com/bidRequest?');
        });

        it('should contain required params - dcn & pos', () => {
          adapter.callBids(createBidderRequest({
            params: {
              dcn: '54321123',
              pos: 'footer-2324'
            }
          }));
          expect(requests[0].url).to.contain('hb.nexage.com/bidRequest?dcn=54321123&pos=footer-2324');
        });

        it('should contain cmd=bid by default', () => {
          adapter.callBids(createBidderRequest({
            params: {
              dcn: '54321123',
              pos: 'footer-2324'
            }
          }));
          expect(requests[0].url).to.contain('hb.nexage.com/bidRequest?dcn=54321123&pos=footer-2324&cmd=bid');
        });

        it('should contain optional parameters if they are set', () => {
          adapter.callBids(createBidderRequest({
            params: {
              dcn: '54321123',
              pos: 'footer-2324',
              ext: {
                param1: 'val1',
                param2: 'val2',
                param3: 'val3',
                param4: 'val4'
              }
            }
          }));
          expect(requests[0].url).to.contain('hb.nexage.com/bidRequest?dcn=54321123&pos=footer-2324&cmd=bid' +
            '&param1=val1&param2=val2&param3=val3&param4=val4');
        });

        it('should hit the nexage api endpoint with post data with the openrtb config', () => {
          let bidConfig = {
            id: 'id-1',
            imp: [{
              id: 'id-2',
              banner: {
                w: '100',
                h: '100'
              },
              tagid: 'header1'
            }]
          };
          adapter.callBids(createBidderRequest({
            params: bidConfig
          }));
          expect(requests[0].url).to.contain('hb.nexage.com/bidRequest?');
          expect(requests[0].requestBody).to.deep.equal(bidConfig);
          expect(requests[0].requestHeaders).to.have.property('x-openrtb-version');
        });

        it('should not hit the nexage api endpoint with post data with the openrtb config' +
          ' if a required parameter is missing', () => {
          let bidConfig = {
            id: 'id-1',
            imp: [{
              // id: 'id-2',
              banner: {
                w: '100',
                h: '100'
              },
              tagid: 'header1'
            }]
          };
          adapter.callBids(createBidderRequest({
            params: bidConfig
          }));
          expect(requests).to.be.empty;
        })
        ;
      });
    });

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

      it('should be added to bidmanager if returned from pubapi', () => {
        server.respondWith(JSON.stringify(getDefaultBidResponse()));
        adapter.callBids(getDefaultBidRequest());
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
      });

      it('should be added to bidmanager if returned from nexage GET bid request', () => {
        server.respondWith(JSON.stringify(getDefaultBidResponse()));
        adapter.callBids(createBidderRequest({
          params: {
            dcn: '54321123',
            pos: 'footer-2324'
          }
        }));
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
      });

      it('should be added to bidmanager if returned from nexage POST bid request', () => {
        server.respondWith(JSON.stringify(getDefaultBidResponse()));
        adapter.callBids(createBidderRequest({
          params: {
            id: 'id-1',
            imp: [{
              id: 'id-2',
              banner: {
                w: '100',
                h: '100'
              },
              tagid: 'header1'
            }]
          }
        }));
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        var bidResponse = bidmanager.addBidResponse.firstCall.args[1];
      });

      it('should be added to bidmanager with correct bidderCode', () => {
        server.respondWith(JSON.stringify(getDefaultBidResponse()));
        adapter.callBids(getDefaultBidRequest());
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        expect(bidmanager.addBidResponse.firstCall.args[1]).to.have.property('bidderCode', 'aol');
      });

      it('should have adId matching the bidId from related bid request', () => {
        server.respondWith(JSON.stringify(getDefaultBidResponse()));
        adapter.callBids(getDefaultBidRequest());
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        expect(bidmanager.addBidResponse.firstCall.args[1])
          .to.have.property('adId', '84ab500420319d');
      });

      it('should be added to bidmanager as invalid in case of empty response', () => {
        server.respondWith('');
        adapter.callBids(getDefaultBidRequest());
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        expect(bidmanager.addBidResponse.firstCall.args[1].getStatusCode()).to.equal(2);
      });

      it('should be added to bidmanager as invalid in case of invalid JSON response', () => {
        server.respondWith('{foo:{bar:{baz:');
        adapter.callBids(getDefaultBidRequest());
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        expect(bidmanager.addBidResponse.firstCall.args[1].getStatusCode()).to.equal(2);
      });

      it('should be added to bidmanager as invalid in case of no bid data', () => {
        let bidResponse = getDefaultBidResponse();
        bidResponse.seatbid = [];
        server.respondWith(JSON.stringify(bidResponse));

        adapter.callBids(getDefaultBidRequest());
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        expect(bidmanager.addBidResponse.firstCall.args[1].getStatusCode()).to.equal(2);
      });

      it('should have adId matching the bidId from bid request in case of no bid data', () => {
        let bidResponse = getDefaultBidResponse();
        bidResponse.seatbid = [];
        server.respondWith(JSON.stringify(bidResponse));

        adapter.callBids(getDefaultBidRequest());
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        expect(bidmanager.addBidResponse.firstCall.args[1])
          .to.have.property('adId', '84ab500420319d');
      });

      it('should be added to bidmanager as invalid in case of empty price', () => {
        let bidResponse = getDefaultBidResponse();
        bidResponse.seatbid[0].bid[0].price = undefined;

        server.respondWith(JSON.stringify(bidResponse));
        adapter.callBids(getDefaultBidRequest());
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        expect(bidmanager.addBidResponse.firstCall.args[1].getStatusCode()).to.equal(2);
      });

      it('should be added to bidmanager with attributes from pubapi response', () => {
        let bidResponse = getDefaultBidResponse();
        bidResponse.seatbid[0].bid[0].crid = '12345';

        server.respondWith(JSON.stringify(bidResponse));
        adapter.callBids(getDefaultBidRequest());
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        let addedBidResponse = bidmanager.addBidResponse.firstCall.args[1];
        expect(addedBidResponse.ad).to.equal('<script>logInfo(\'ad\');</script>');
        expect(addedBidResponse.cpm).to.equal(0.09);
        expect(addedBidResponse.width).to.equal(728);
        expect(addedBidResponse.height).to.equal(90);
        expect(addedBidResponse.creativeId).to.equal('12345');
        expect(addedBidResponse.pubapiId).to.equal('245730051428950632');
      });

      it('should be added to bidmanager including pixels from pubapi response', () => {
        let bidResponse = getDefaultBidResponse();
        bidResponse.ext = {
          pixels: '<script>document.write(\'<img src="pixel.gif">\');</script>'
        };

        server.respondWith(JSON.stringify(bidResponse));
        adapter.callBids(getDefaultBidRequest());
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        let addedBidResponse = bidmanager.addBidResponse.firstCall.args[1];
        expect(addedBidResponse.ad).to.equal(
          '<script>logInfo(\'ad\');</script>' +
          '<script>if(!parent.$$PREBID_GLOBAL$$.aolGlobals.pixelsDropped){' +
          'parent.$$PREBID_GLOBAL$$.aolGlobals.pixelsDropped=true;' +
          'document.write(\'<img src="pixel.gif">\');}</script>'
        );
      });

      it('should be added to bidmanager including dealid from pubapi response', () => {
        let bidResponse = getDefaultBidResponse();
        bidResponse.seatbid[0].bid[0].dealid = '12345';

        server.respondWith(JSON.stringify(bidResponse));
        adapter.callBids(getDefaultBidRequest());
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        let addedBidResponse = bidmanager.addBidResponse.firstCall.args[1];
        expect(addedBidResponse.dealId).to.equal('12345');
      });

      it('should be added to bidmanager including encrypted price from pubapi response', () => {
        let bidResponse = getDefaultBidResponse();
        bidResponse.seatbid[0].bid[0].ext.encp = 'a9334987';
        server.respondWith(JSON.stringify(bidResponse));

        adapter.callBids(getDefaultBidRequest());
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        let addedBidResponse = bidmanager.addBidResponse.firstCall.args[1];
        expect(addedBidResponse.cpm).to.equal('a9334987');
      });

      it('should not render pixels on pubapi response when no parameter is set', () => {
        let bidResponse = getDefaultBidResponse();
        bidResponse.ext = {
          pixels: '<script>document.write(\'<iframe src="pixels.org"></iframe>\');</script>'
        };
        server.respondWith(JSON.stringify(bidResponse));
        adapter.callBids(getDefaultBidRequest());
        server.respond();
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        expect(document.body.querySelectorAll('iframe[src="pixels.org"]').length).to.equal(0);
      });

      it('should render pixels from pubapi response when param userSyncOn is set with \'bidResponse\'', () => {
        let bidResponse = getDefaultBidResponse();
        bidResponse.ext = {
          pixels: '<script>document.write(\'<iframe src="pixels.org"></iframe>' +
          '<iframe src="pixels1.org"></iframe>\');</script>'
        };

        server.respondWith(JSON.stringify(bidResponse));
        let bidRequest = getDefaultBidRequest();
        bidRequest.bids[0].params.userSyncOn = 'bidResponse';
        adapter.callBids(bidRequest);
        server.respond();

        expect(bidmanager.addBidResponse.calledOnce).to.be.true;

        let assertPixelsItem = (pixelsItemSelector) => {
          let pixelsItem = document.body.querySelectorAll(pixelsItemSelector)[0];

          expect(pixelsItem.width).to.equal('1');
          expect(pixelsItem.height).to.equal('1');
          expect(pixelsItem.style.display).to.equal('none');
        };

        assertPixelsItem('iframe[src="pixels.org"]');
        assertPixelsItem('iframe[src="pixels1.org"]');
        expect($$PREBID_GLOBAL$$.aolGlobals.pixelsDropped).to.be.true;
      });

      it('should not render pixels if it was rendered before', () => {
        $$PREBID_GLOBAL$$.aolGlobals.pixelsDropped = true;
        let bidResponse = getDefaultBidResponse();
        bidResponse.ext = {
          pixels: '<script>document.write(\'<iframe src="test.com"></iframe>' +
          '<iframe src="test2.org"></iframe>\');</script>'
        };
        server.respondWith(JSON.stringify(bidResponse));

        let bidRequest = getDefaultBidRequest();
        bidRequest.bids[0].params.userSyncOn = 'bidResponse';
        adapter.callBids(bidRequest);
        server.respond();

        expect(bidmanager.addBidResponse.calledOnce).to.be.true;

        let assertPixelsItem = (pixelsItemSelector) => {
          let pixelsItems = document.body.querySelectorAll(pixelsItemSelector);

          expect(pixelsItems.length).to.equal(0);
        };

        assertPixelsItem('iframe[src="test.com"]');
        assertPixelsItem('iframe[src="test2.com"]');
      });
    });

    describe('when bidCpmAdjustment is set', () => {
      let bidderSettingsBackup;
      let server;

      beforeEach(() => {
        bidderSettingsBackup = $$PREBID_GLOBAL$$.bidderSettings;
        server = sinon.fakeServer.create();
      });

      afterEach(() => {
        $$PREBID_GLOBAL$$.bidderSettings = bidderSettingsBackup;
        server.restore();
        if (utils.logWarn.restore) {
          utils.logWarn.restore();
        }
      });

      it('should show warning in the console', function() {
        sinon.spy(utils, 'logWarn');
        server.respondWith(JSON.stringify(getDefaultBidResponse()));
        $$PREBID_GLOBAL$$.bidderSettings = {
          aol: {
            bidCpmAdjustment: function() {}
          }
        };
        adapter.callBids(getDefaultBidRequest());
        server.respond();
        expect(utils.logWarn.calledOnce).to.be.true;
      });
    });
  });
});
