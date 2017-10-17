describe('improvedigital adapter tests', function () {
  const expect = require('chai').expect;
  const Adapter = require('modules/improvedigitalBidAdapter');
  const bidmanager = require('src/bidmanager');
  const adloader = require('src/adloader');
  const constants = require('src/constants.json');
  var bidfactory = require('src/bidfactory');
  var utils = require('src/utils.js');

  var improveDigitalAdapter,
    sandbox,
    bidsRequestedOriginal;

  const simpleBidRequest = {
    bidderCode: 'improvedigital',
    bids: [
      {
        bidId: '1a2b3c',
        placementCode: 'placement1',
        params: {
          placementId: 1012544
        }
      }
    ]
  };

  const simpleSmartTagBidRequest = {
    bidderCode: 'improvedigital',
    bids: [
      {
        bidId: '1a2b3c',
        placementCode: 'placement1',
        params: {
          publisherId: 1032,
          placementKey: 'data_team_test_hb_smoke_test'
        }
      }
    ]
  };

  const keyValueBidRequest = {
    bidderCode: 'improvedigital',
    bids: [
      {
        bidId: '1a2b3c',
        placementCode: 'placement1',
        params: {
          placementId: 1012546,
          keyValues: {
            hbkv: ['01']
          }
        }
      }
    ]
  };

  const sizeBidRequest = {
    bidderCode: 'improvedigital',
    bids: [
      {
        bidId: '1a2b3c',
        placementCode: 'placement1',
        params: {
          placementId: 1012545,
          size: {
            w: 800,
            h: 600
          }
        }
      }
    ]
  };

  const twoAdSlots = {
    bidderCode: 'improvedigital',
    bids: [
      {
        bidId: '1a2b3c',
        placementCode: 'placement1',
        params: {
          placementId: 1012544,
        }
      },
      {
        bidId: '4d5e6f',
        placementCode: 'placement2',
        params: {
          placementId: 1012545,
          size: {
            w: 800,
            h: 600
          }
        }
      }
    ]
  };

  const threeAdSlots = {
    bidderCode: 'improvedigital',
    bids: [
      {
        bidId: '1a2b3c',
        placementCode: 'placement1',
        params: {
          placementId: 1012544,
        }
      },
      {
        bidId: '4d5e6f',
        placementCode: 'placement2',
        params: {
          placementId: 1012545,
          size: {
            w: 800,
            h: 600
          }
        }
      },
      {
        bidId: '7g8h9i',
        placementCode: 'placement3',
        params: {
          placementId: 1012546,
          keyValues: {
            hbkv: ['01']
          }
        }
      }
    ]
  };

  const badRequest1 = {
    bidderCode: 'improvedigital',
    bids: [
      {
        bidId: '1a2b3c',
        placementCode: 'placement1',
        params: {
          unknownId: 123456
        }
      }
    ]
  };

  const twoAdSlotsSingleRequest = {
    bidderCode: 'improvedigital',
    bids: [
      {
        bidId: '1a2b3c',
        placementCode: 'placement1',
        params: {
          singleRequest: true,
          placementId: 1012544,
        }
      },
      {
        bidId: '4d5e6f',
        placementCode: 'placement2',
        params: {
          placementId: 1012545,
          size: {
            w: 800,
            h: 600
          }
        }
      }
    ]
  };

  const simpleResponse = {
    id: '701903620',
    site_id: 191642,
    bid: [
      {
        price: 1.85185185185185,
        lid: 268514,
        advid: '5279',
        id: '1a2b3c',
        sync: [
          'http://link',
          'http://link2',
          'http://link3'
        ],
        nurl: 'http://nurl',
        h: 300,
        pid: 1053687,
        crid: '422030',
        w: 300,
        cid: '99005',
        adm: 'document.writeln(\"<a href=\\\"http:\\/\\/creativelink\\/\");'
      }
    ]
  };

  const zeroPriceResponse = {
    id: '701903620',
    site_id: 191642,
    bid: [
      {
        price: 0,
        lid: 268514,
        advid: '5279',
        id: '1a2b3c',
        sync: [
          'http://link',
          'http://link2',
          'http://link3'
        ],
        nurl: 'http://nurl',
        h: 300,
        pid: 1053687,
        crid: '422030',
        w: 300,
        cid: '99005',
        adm: 'document.writeln(\"<a href=\\\"http:\\/\\/creativelink\\/\");'
      }
    ],
    debug: ''
  };

  const multipleResponse = {
    id: '701903620',
    site_id: 191642,
    bid: [
      {
        price: 1.85185185185185,
        lid: 268514,
        advid: '5279',
        id: '1a2b3c',
        sync: [
          'http://link',
          'http://link2',
          'http://link3'
        ],
        nurl: 'http://nurl',
        h: 300,
        pid: 1053687,
        crid: '422030',
        w: 300,
        cid: '99005',
        adm: 'document.writeln(\"<a href=\\\"http:\\/\\/creativelink\\/\");'
      },
      {
        price: 1.44563918757467,
        lid: 268514,
        advid: '5279',
        id: '4d5e6f',
        sync: [
          'http://link4',
          'http://link5'
        ],
        nurl: 'http://nurl2',
        h: 600,
        pid: 1053687,
        crid: '422030',
        w: 800,
        cid: '99005',
        adm: 'document.writeln(\"<a href=\\\"http:\\/\\/creativelink2\\/\");'
      }
    ],
    debug: ''
  };

  const multipleResponseWithOneNoBid = {
    id: '701903620',
    site_id: 191642,
    bid: [
      {
        price: 1.85185185185185,
        lid: 268514,
        advid: '5279',
        id: '1a2b3c',
        sync: [
          'http://link',
          'http://link2',
          'http://link3'
        ],
        nurl: 'http://nurl',
        h: 300,
        pid: 1053687,
        crid: '422030',
        w: 300,
        cid: '99005',
        adm: 'document.writeln(\"<a href=\\\"http:\\/\\/creativelink\\/\");'
      },
      {
        price: 0,
        lid: 268514,
        advid: '5279',
        id: '4d5e6f',
        sync: [
          'http://link4',
          'http://link5'
        ],
        nurl: 'http://nurl2',
        h: 600,
        pid: 1053687,
        crid: '422030',
        w: 800,
        cid: '99005',
        adm: 'document.writeln(\"<a href=\\\"http:\\/\\/creativelink2\\/\");'
      }
    ],
    debug: ''
  };

  const multipleInvalidResponses = {
    id: '701903620',
    site_id: 191642,
    bid: [
      {
        id: '1a2b3c',
        adm: {},
        errorCode: 1,
        price: 1.00
      },
      {
        price: 1.74747474747447,
        lid: 268514,
        advid: '5279',
        id: '4d5e6f',
        sync: [
          'http://link4',
          'http://link5'
        ],
        nurl: 'http://nurl2',
        h: 600,
        pid: 1053687,
        crid: '422030',
        w: 800,
        cid: '99005'
      }
    ],
    debug: ''
  };

  const simpleResponseNoSync = {
    id: '701903620',
    site_id: 191642,
    bid: [
      {
        price: 1.85185185185185,
        lid: 268514,
        advid: '5279',
        id: '1a2b3c',
        sync: [],
        nurl: 'http://nurl',
        h: 300,
        pid: 1053687,
        crid: '422030',
        w: 300,
        cid: '99005',
        adm: 'document.writeln(\"<a href=\\\"http:\\/\\/creativelink\\/\");'
      }
    ]
  };

  var randomNumber = 9876543210;
  beforeEach(() => {
    improveDigitalAdapter = new Adapter();
    sandbox = sinon.sandbox.create();
    sandbox.stub(
      utils,
      'getUniqueIdentifierStr',
      function() {
        var retValue = randomNumber.toString();
        randomNumber++;
        return retValue;
      }
    );
    bidsRequestedOriginal = $$PREBID_GLOBAL$$._bidsRequested;
    $$PREBID_GLOBAL$$._bidsRequested = [];
  });

  afterEach(() => {
    sandbox.restore();
    $$PREBID_GLOBAL$$._bidsRequested = bidsRequestedOriginal;
  });

  describe('callBids simpleBidRequest', () => {
    beforeEach(() => {
      sandbox.stub(
        adloader,
        'loadScript'
      );
      improveDigitalAdapter.callBids(simpleBidRequest);
    });
    it('should call loadScript with correct parameters', () => {
      sinon.assert.calledOnce(adloader.loadScript);
      sinon.assert.calledWith(adloader.loadScript, 'http://ad.360yield.com/hb?jsonp=%7B%22bid_request%22%3A%7B%22id%22%3A%229876543210%22%2C%22callback%22%3A%22$$PREBID_GLOBAL$$.improveDigitalResponse%22%2C%22secure%22%3A0%2C%22version%22%3A%22' + improveDigitalAdapter.LIB_VERSION + '-' + improveDigitalAdapter.idClient.CONSTANTS.CLIENT_VERSION + '%22%2C%22imp%22%3A%5B%7B%22id%22%3A%221a2b3c%22%2C%22pid%22%3A1012544%2C%22banner%22%3A%7B%7D%7D%5D%7D%7D', null);
    });
  });

  describe('callBids simpleSmartTagBidRequest', () => {
    beforeEach(() => {
      randomNumber = 9876543210;
      sandbox.stub(
        adloader,
        'loadScript'
      );
      improveDigitalAdapter.callBids(simpleSmartTagBidRequest);
    });
    it('should call loadScript with correct parameters', () => {
      sinon.assert.calledOnce(adloader.loadScript);
      sinon.assert.calledWith(adloader.loadScript, 'http://ad.360yield.com/hb?jsonp=%7B%22bid_request%22%3A%7B%22id%22%3A%229876543210%22%2C%22callback%22%3A%22$$PREBID_GLOBAL$$.improveDigitalResponse%22%2C%22secure%22%3A0%2C%22version%22%3A%22' + improveDigitalAdapter.LIB_VERSION + '-' + improveDigitalAdapter.idClient.CONSTANTS.CLIENT_VERSION + '%22%2C%22imp%22%3A%5B%7B%22id%22%3A%221a2b3c%22%2C%22pubid%22%3A1032%2C%22pkey%22%3A%22data_team_test_hb_smoke_test%22%2C%22banner%22%3A%7B%7D%7D%5D%7D%7D', null);
    });
  });

  describe('callBids keyValueBidRequest', () => {
    beforeEach(() => {
      randomNumber = 9876543210;
      sandbox.stub(
        adloader,
        'loadScript'
      );
      improveDigitalAdapter.callBids(keyValueBidRequest);
    });
    it('should call loadScript with correct parameters', () => {
      sinon.assert.calledOnce(adloader.loadScript);
      sinon.assert.calledWith(adloader.loadScript, 'http://ad.360yield.com/hb?jsonp=%7B%22bid_request%22%3A%7B%22id%22%3A%229876543210%22%2C%22callback%22%3A%22$$PREBID_GLOBAL$$.improveDigitalResponse%22%2C%22secure%22%3A0%2C%22version%22%3A%22' + improveDigitalAdapter.LIB_VERSION + '-' + improveDigitalAdapter.idClient.CONSTANTS.CLIENT_VERSION + '%22%2C%22imp%22%3A%5B%7B%22id%22%3A%221a2b3c%22%2C%22pid%22%3A1012546%2C%22kvw%22%3A%7B%22hbkv%22%3A%5B%2201%22%5D%7D%2C%22banner%22%3A%7B%7D%7D%5D%7D%7D', null);
    });
  });

  describe('callBids sizeBidRequest', () => {
    beforeEach(() => {
      randomNumber = 9876543210;
      sandbox.stub(
        adloader,
        'loadScript'
      );
      improveDigitalAdapter.callBids(sizeBidRequest);
    });
    it('should call loadScript with correct parameters', () => {
      sinon.assert.calledOnce(adloader.loadScript);
      sinon.assert.calledWith(adloader.loadScript, 'http://ad.360yield.com/hb?jsonp=%7B%22bid_request%22%3A%7B%22id%22%3A%229876543210%22%2C%22callback%22%3A%22$$PREBID_GLOBAL$$.improveDigitalResponse%22%2C%22secure%22%3A0%2C%22version%22%3A%22' + improveDigitalAdapter.LIB_VERSION + '-' + improveDigitalAdapter.idClient.CONSTANTS.CLIENT_VERSION + '%22%2C%22imp%22%3A%5B%7B%22id%22%3A%221a2b3c%22%2C%22pid%22%3A1012545%2C%22banner%22%3A%7B%22w%22%3A800%2C%22h%22%3A600%7D%7D%5D%7D%7D', null);
    });
  });

  describe('callBids twoAdSlots', () => {
    beforeEach(() => {
      randomNumber = 9876543210;
      sandbox.stub(
        adloader,
        'loadScript'
      );
      improveDigitalAdapter.callBids(twoAdSlots);
    });
    it('should call loadScript twice with correct parameters', () => {
      sinon.assert.calledTwice(adloader.loadScript);
      sinon.assert.calledWith(adloader.loadScript, 'http://ad.360yield.com/hb?jsonp=%7B%22bid_request%22%3A%7B%22id%22%3A%229876543210%22%2C%22callback%22%3A%22$$PREBID_GLOBAL$$.improveDigitalResponse%22%2C%22secure%22%3A0%2C%22version%22%3A%22' + improveDigitalAdapter.LIB_VERSION + '-' + improveDigitalAdapter.idClient.CONSTANTS.CLIENT_VERSION + '%22%2C%22imp%22%3A%5B%7B%22id%22%3A%221a2b3c%22%2C%22pid%22%3A1012544%2C%22banner%22%3A%7B%7D%7D%5D%7D%7D', null);
      sinon.assert.calledWith(adloader.loadScript, 'http://ad.360yield.com/hb?jsonp=%7B%22bid_request%22%3A%7B%22id%22%3A%229876543211%22%2C%22callback%22%3A%22$$PREBID_GLOBAL$$.improveDigitalResponse%22%2C%22secure%22%3A0%2C%22version%22%3A%22' + improveDigitalAdapter.LIB_VERSION + '-' + improveDigitalAdapter.idClient.CONSTANTS.CLIENT_VERSION + '%22%2C%22imp%22%3A%5B%7B%22id%22%3A%224d5e6f%22%2C%22pid%22%3A1012545%2C%22banner%22%3A%7B%22w%22%3A800%2C%22h%22%3A600%7D%7D%5D%7D%7D', null);
    });
  });

  describe('callBids threeAdSlots', () => {
    beforeEach(() => {
      randomNumber = 9876543210;
      sandbox.stub(
        adloader,
        'loadScript'
      );
      improveDigitalAdapter.callBids(threeAdSlots);
    });
    it('should call loadScript thrice with correct parameters', () => {
      sinon.assert.calledThrice(adloader.loadScript);
      sinon.assert.calledWith(adloader.loadScript, 'http://ad.360yield.com/hb?jsonp=%7B%22bid_request%22%3A%7B%22id%22%3A%229876543210%22%2C%22callback%22%3A%22$$PREBID_GLOBAL$$.improveDigitalResponse%22%2C%22secure%22%3A0%2C%22version%22%3A%22' + improveDigitalAdapter.LIB_VERSION + '-' + improveDigitalAdapter.idClient.CONSTANTS.CLIENT_VERSION + '%22%2C%22imp%22%3A%5B%7B%22id%22%3A%221a2b3c%22%2C%22pid%22%3A1012544%2C%22banner%22%3A%7B%7D%7D%5D%7D%7D', null);
      sinon.assert.calledWith(adloader.loadScript, 'http://ad.360yield.com/hb?jsonp=%7B%22bid_request%22%3A%7B%22id%22%3A%229876543211%22%2C%22callback%22%3A%22$$PREBID_GLOBAL$$.improveDigitalResponse%22%2C%22secure%22%3A0%2C%22version%22%3A%22' + improveDigitalAdapter.LIB_VERSION + '-' + improveDigitalAdapter.idClient.CONSTANTS.CLIENT_VERSION + '%22%2C%22imp%22%3A%5B%7B%22id%22%3A%224d5e6f%22%2C%22pid%22%3A1012545%2C%22banner%22%3A%7B%22w%22%3A800%2C%22h%22%3A600%7D%7D%5D%7D%7D', null);
      sinon.assert.calledWith(adloader.loadScript, 'http://ad.360yield.com/hb?jsonp=%7B%22bid_request%22%3A%7B%22id%22%3A%229876543212%22%2C%22callback%22%3A%22$$PREBID_GLOBAL$$.improveDigitalResponse%22%2C%22secure%22%3A0%2C%22version%22%3A%22' + improveDigitalAdapter.LIB_VERSION + '-' + improveDigitalAdapter.idClient.CONSTANTS.CLIENT_VERSION + '%22%2C%22imp%22%3A%5B%7B%22id%22%3A%227g8h9i%22%2C%22pid%22%3A1012546%2C%22kvw%22%3A%7B%22hbkv%22%3A%5B%2201%22%5D%7D%2C%22banner%22%3A%7B%7D%7D%5D%7D%7D', null);
    });
  });

  describe('callBids bad request 1', () => {
    beforeEach(() => {
      sandbox.stub(
        adloader,
        'loadScript'
      );
      improveDigitalAdapter.callBids(badRequest1);
    });
    it('should not call loadScript', () => {
      sinon.assert.notCalled(adloader.loadScript);
    });
  });

  describe('callBids twoAdSlotsSingleRequest', () => {
    beforeEach(() => {
      randomNumber = 9876543210;
      sandbox.stub(
        adloader,
        'loadScript'
      );
      improveDigitalAdapter.callBids(twoAdSlotsSingleRequest);
    });
    it('should call loadScript twice with correct parameters', () => {
      sinon.assert.calledOnce(adloader.loadScript);
      sinon.assert.calledWith(adloader.loadScript, 'http://ad.360yield.com/hb?jsonp=%7B%22bid_request%22%3A%7B%22id%22%3A%229876543210%22%2C%22callback%22%3A%22$$PREBID_GLOBAL$$.improveDigitalResponse%22%2C%22secure%22%3A0%2C%22version%22%3A%22' + improveDigitalAdapter.LIB_VERSION + '-' + improveDigitalAdapter.idClient.CONSTANTS.CLIENT_VERSION + '%22%2C%22imp%22%3A%5B%7B%22id%22%3A%221a2b3c%22%2C%22pid%22%3A1012544%2C%22banner%22%3A%7B%7D%7D%2C%7B%22id%22%3A%224d5e6f%22%2C%22pid%22%3A1012545%2C%22banner%22%3A%7B%22w%22%3A800%2C%22h%22%3A600%7D%7D%5D%7D%7D', null);
    });
  });

  describe('improveDigitalResponse no response', () => {
    beforeEach(() => {
      sandbox.stub(
        bidmanager,
        'addBidResponse'
      );
      $$PREBID_GLOBAL$$._bidsRequested.push(simpleBidRequest);
      improveDigitalAdapter.callBids(simpleBidRequest);
      $$PREBID_GLOBAL$$.improveDigitalResponse([]);
    });
    it('should not call bidmanager.addBidResponse', () => {
      sinon.assert.notCalled(bidmanager.addBidResponse);
    });
  });

  describe('improveDigitalResponse simpleResponse', () => {
    beforeEach(() => {
      sandbox.stub(
        bidmanager,
        'addBidResponse'
      );
      $$PREBID_GLOBAL$$._bidsRequested.push(simpleBidRequest);
      improveDigitalAdapter.callBids(simpleBidRequest);
      $$PREBID_GLOBAL$$.improveDigitalResponse(simpleResponse);
    });
    it('should call bidmanager.addBidResponse once with correct parameters', () => {
      sinon.assert.calledOnce(bidmanager.addBidResponse);
      sinon.assert.calledWith(bidmanager.addBidResponse, 'placement1', sinon.match({bidderCode: 'improvedigital', width: 300, height: 300, statusMessage: 'Bid available', ad: '<img src=\"http://nurl\" width=\"0\" height=\"0\" style=\"display:none\"><script>document.writeln(\"<a href=\\\"http:\\/\\/creativelink\\/\");document.writeln(\"<img src=\\\"http:\\/\\/link\\\" style=\\\"display:none\\\"/><img src=\\\"http:\\/\\/link2\\\" style=\\\"display:none\\\"/><img src=\\\"http:\\/\\/link3\\\" style=\\\"display:none\\\"/>\")</script>', cpm: 1.85185185185185, adId: '1a2b3c'}));
    });
  });

  describe('improveDigitalResponse zero bid', () => {
    beforeEach(() => {
      randomNumber = 1111111111;
      sandbox.stub(
        bidmanager,
        'addBidResponse'
      );
      $$PREBID_GLOBAL$$._bidsRequested.push(simpleBidRequest);
      improveDigitalAdapter.callBids(simpleBidRequest);
      $$PREBID_GLOBAL$$.improveDigitalResponse(zeroPriceResponse);
    });
    it('should call bidmanager.addBidResponse once with correct parameters', () => {
      sinon.assert.calledOnce(bidmanager.addBidResponse);
      sinon.assert.calledWith(bidmanager.addBidResponse, 'placement1', sinon.match({bidderCode: 'improvedigital', width: 0, height: 0, statusMessage: 'Bid returned empty or error response', adId: '1a2b3c'}));
    });
  });

  describe('improveDigitalResponse multipleResponseWithOneNoBid', () => {
    beforeEach(() => {
      randomNumber = 1111111111;
      sandbox.stub(
        bidmanager,
        'addBidResponse'
      );
      $$PREBID_GLOBAL$$._bidsRequested.push(twoAdSlots);
      improveDigitalAdapter.callBids(twoAdSlots);
      $$PREBID_GLOBAL$$.improveDigitalResponse(multipleResponseWithOneNoBid);
    });
    it('should call bidmanager.addBidResponse once with correct parameters', () => {
      sinon.assert.calledTwice(bidmanager.addBidResponse);
      sinon.assert.calledWith(bidmanager.addBidResponse, 'placement1', sinon.match({bidderCode: 'improvedigital', width: 300, height: 300, adId: '1a2b3c', statusMessage: 'Bid available', ad: '<img src=\"http://nurl\" width=\"0\" height=\"0\" style=\"display:none\"><script>document.writeln(\"<a href=\\\"http:\\/\\/creativelink\\/\");document.writeln(\"<img src=\\\"http:\\/\\/link\\\" style=\\\"display:none\\\"/><img src=\\\"http:\\/\\/link2\\\" style=\\\"display:none\\\"/><img src=\\\"http:\\/\\/link3\\\" style=\\\"display:none\\\"/>\")</script>', cpm: 1.85185185185185}));
      sinon.assert.calledWith(bidmanager.addBidResponse, 'placement2', sinon.match({bidderCode: 'improvedigital', width: 0, height: 0, adId: '4d5e6f', statusMessage: 'Bid returned empty or error response'}));
    });
  });

  describe('improveDigitalResponse multipleInvalidResponses', () => {
    beforeEach(() => {
      randomNumber = 1111111111;
      sandbox.stub(
        bidmanager,
        'addBidResponse'
      );
      $$PREBID_GLOBAL$$._bidsRequested.push(twoAdSlots);
      improveDigitalAdapter.callBids(twoAdSlots);
      $$PREBID_GLOBAL$$.improveDigitalResponse(multipleInvalidResponses);
    });
    it('should call bidmanager.addBidResponse twice both with invalid', () => {
      sinon.assert.calledTwice(bidmanager.addBidResponse);
      sinon.assert.calledWith(bidmanager.addBidResponse, 'placement1', sinon.match({bidderCode: 'improvedigital', width: 0, height: 0, adId: '1a2b3c', statusMessage: 'Bid returned empty or error response'}));
      sinon.assert.calledWith(bidmanager.addBidResponse, 'placement2', sinon.match({bidderCode: 'improvedigital', width: 0, height: 0, adId: '4d5e6f', statusMessage: 'Bid returned empty or error response'}));
    });
  });

  describe('improveDigitalResponse simpleResponseNoSync', () => {
    beforeEach(() => {
      sandbox.stub(
        bidmanager,
        'addBidResponse'
      );
      $$PREBID_GLOBAL$$._bidsRequested.push(simpleBidRequest);
      improveDigitalAdapter.callBids(simpleBidRequest);
      $$PREBID_GLOBAL$$.improveDigitalResponse(simpleResponseNoSync);
    });
    it('should call bidmanager.addBidResponse once with correct parameters', () => {
      sinon.assert.calledOnce(bidmanager.addBidResponse);
      sinon.assert.calledWith(bidmanager.addBidResponse, 'placement1', sinon.match({bidderCode: 'improvedigital', width: 300, height: 300, statusMessage: 'Bid available', ad: '<img src=\"http://nurl\" width=\"0\" height=\"0\" style=\"display:none\"><script>document.writeln(\"<a href=\\\"http:\\/\\/creativelink\\/\");</script>', cpm: 1.85185185185185, adId: '1a2b3c'}));
    });
  });
});
