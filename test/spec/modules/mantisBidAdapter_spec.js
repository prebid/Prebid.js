'use strict';

describe('mantis adapter tests', function () {
  const expect = require('chai').expect;
  const adapter = require('modules/mantisBidAdapter');
  const bidmanager = require('src/bidmanager');
  const adloader = require('src/adloader');
  const constants = require('src/constants.json');

  var mantis, sandbox;

  beforeEach(() => {
    mantis = new adapter();
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();

    delete window.context;
    delete window.mantis_link;
    delete window.mantis_breakpoint;
    delete window.mantis_uuid;
  });

  var callBidExample = {
    bidderCode: 'mantis',
    bids: [
      {
        bidId: 'bidId1',
        bidder: 'mantis',
        placementCode: 'foo',
        sizes: [[728, 90]],
        params: {
          property: '1234',
          zoneId: 'zone1'
        }
      },
      {
        bidId: 'bidId2',
        bidder: 'mantis',
        placementCode: 'bar',
        sizes: [[300, 600], [300, 250]],
        params: {
          property: '1234',
          zoneId: 'zone2'
        }
      }
    ]
  };

  describe('callBids', () => {
    it('should create appropriate bid responses', () => {
      sandbox.stub(bidmanager, 'addBidResponse');
      sandbox.stub(adloader, 'loadScript', function (url) {
        var jsonp = eval(decodeURIComponent(url.match(/jsonp=(.*)&property/)[1]));

        jsonp({
          ads: {
            bidId1: {
              cpm: 1,
              html: '<script></script>',
              width: 300,
              height: 600
            }
          }
        });
      });

      mantis.callBids(callBidExample);

      sinon.assert.calledTwice(bidmanager.addBidResponse);

      expect(bidmanager.addBidResponse.firstCall.args[0]).to.eql('foo');

      var bid1 = bidmanager.addBidResponse.firstCall.args[1];
      expect(bid1.getStatusCode()).to.eql(constants.STATUS.GOOD);
      expect(bid1.bidderCode).to.eql('mantis');
      expect(bid1.cpm).to.eql(1);
      expect(bid1.ad).to.eql('<script></script>');
      expect(bid1.width).to.eql(300);
      expect(bid1.height).to.eql(600);

      expect(bidmanager.addBidResponse.secondCall.args[0]).to.eql('bar');

      var bid2 = bidmanager.addBidResponse.secondCall.args[1];
      expect(bid2.getStatusCode()).to.eql(constants.STATUS.NO_BID);
      expect(bid2.bidderCode).to.eql('mantis');
    });

    it('should load script with relevant bid data', () => {
      sandbox.stub(adloader, 'loadScript');

      mantis.callBids(callBidExample);

      sinon.assert.calledOnce(adloader.loadScript);

      var serverCall = adloader.loadScript.firstCall.args[0];

      expect(serverCall).to.match(/buster=[0-9]+&/);
      expect(serverCall).to.match(/tz=-?[0-9]+&/);
      expect(serverCall).to.match(/secure=(true|false)&/);
      expect(serverCall).to.string('property=1234&');
      expect(serverCall).to.string('bids[0][bidId]=bidId1&');
      expect(serverCall).to.string('bids[0][sizes][0][width]=728&');
      expect(serverCall).to.string('bids[0][sizes][0][height]=90&');
      expect(serverCall).to.string('bids[0][config][zoneId]=zone1&');
      expect(serverCall).to.string('bids[1][bidId]=bidId2&');
      expect(serverCall).to.string('bids[1][sizes][0][width]=300&');
      expect(serverCall).to.string('bids[1][sizes][0][height]=600&');
      expect(serverCall).to.string('bids[1][sizes][1][width]=300&');
      expect(serverCall).to.string('bids[1][sizes][1][height]=250&');
      expect(serverCall).to.string('bids[1][config][zoneId]=zone2&');
      expect(serverCall).to.string('version=1');
    });

    /* tests below are to just adhere to code coverage requirements, but it is already tested in our own libraries/deployment process */
    it('should send uuid from window if set', () => {
      sandbox.stub(adloader, 'loadScript');

      window.mantis_uuid = '4321';

      mantis.callBids(callBidExample);

      sinon.assert.calledOnce(adloader.loadScript);

      var serverCall = adloader.loadScript.firstCall.args[0];

      expect(serverCall).to.string('uuid=4321&');
    });

    it('should send mobile = true if breakpoint is hit', () => {
      sandbox.stub(adloader, 'loadScript');

      window.mantis_link = true; // causes iframe detection to not work
      window.mantis_breakpoint = 100000000; // force everything to be mobile

      mantis.callBids(callBidExample);

      sinon.assert.calledOnce(adloader.loadScript);

      var serverCall = adloader.loadScript.firstCall.args[0];

      expect(serverCall).to.string('mobile=true&');
    });

    it('should send different params if amp is detected', () => {
      sandbox.stub(adloader, 'loadScript');

      window.context = {
        tagName: 'AMP-AD',
        location: {
          href: 'bar',
          referrer: 'baz'
        }
      };

      mantis.callBids(callBidExample);

      sinon.assert.calledOnce(adloader.loadScript);

      var serverCall = adloader.loadScript.firstCall.args[0];

      expect(serverCall).to.string('mobile=true&');
      // expect(serverCall).to.string('url=bar&');
    });
  });
});
