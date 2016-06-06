var assert = require("assert");

var utils = require('../../src/utils');
var bidmanager = require('../../src/bidmanager');
var bidfactory = require('../../src/bidfactory');
var fixtures = require('../fixtures/fixtures');
var prebid = require('../../src/prebid');


describe('prebid.js', function () {

  describe('getWinningBidTargeting', () => {

    before(() => {
      pbjs._bidsReceived = fixtures.getBidResponses();
    });

    after(() => {
      // Reset pbjs._bidsReceived because other tests rely on it.
      pbjs._bidsReceived = fixtures.getBidResponses();
    });

    it('should return correct winning bid targeting', () => {

      var targeting = prebid.getWinningBidTargeting();
      var expected = [
        {
          "/19968336/header-bid-tag-0": [
            {
              "hb_bidder": [
                "appnexus"
              ]
            },
            {
              "hb_adid": [
                "233bcbee889d46d"
              ]
            },
            {
              "hb_pb": [
                "10.00"
              ]
            },
            {
              "hb_size": [
                "300x250"
              ]
            },
            {
              "foobar": [
                "300x250"
              ]
            }
          ]
        },
        {
          "/19968336/header-bid-tag1": [
            {
              "hb_bidder": [
                "appnexus"
              ]
            },
            {
              "hb_adid": [
                "24bd938435ec3fc"
              ]
            },
            {
              "hb_pb": [
                "10.00"
              ]
            },
            {
              "hb_size": [
                "728x90"
              ]
            },
            {
              "foobar": [
                "728x90"
              ]
            }
          ]
        }
      ]

      assert.deepEqual(targeting, expected);      

    });

  });

  describe('getAdserverTargeting', () => {

    before(() => {
      pbjs._bidsReceived = fixtures.getBidResponses();
    });

    after(() => {
      // Reset pbjs._bidsReceived because other tests rely on it.
      pbjs._bidsReceived = fixtures.getBidResponses();
    });

    it('should return correct targeting with default bidder settings', () => {

      var targeting = prebid.getAdserverTargeting();

      var expected = {
        "/19968336/header-bid-tag-0": {
          "foobar": "300x250",
          "hb_size": "300x250",
          "hb_pb": "10.00",
          "hb_adid": "233bcbee889d46d",
          "hb_bidder": "appnexus"
        },
        "/19968336/header-bid-tag1": {
          "foobar": "728x90",
          "hb_size": "728x90",
          "hb_pb": "10.00",
          "hb_adid": "24bd938435ec3fc",
          "hb_bidder": "appnexus"
        }
      };

      assert.deepEqual(targeting, expected);
    });

  });

});
