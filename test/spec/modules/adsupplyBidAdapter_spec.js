describe('adsupply adapter tests', function () {
  const expect = require('chai').expect;

  const AdSupplyAdapter = require('../../../modules/adsupplyBidAdapter');
  const adloader = require('../../../src/adloader');
  const bidmanager = require('../../../src/bidmanager');
  const CONSTANTS = require('../../../src/constants.json');
  let adsupplyAdapter = new AdSupplyAdapter();

  beforeEach(() => {
    pbjs._bidsRequested = [];
  });

  it('adsupply response handler should exist and be a function', function () {
    expect(pbjs.adSupplyResponseHandler).to.exist.and.to.be.a('function');
  });

  it('two requests are sent to adsupply engine', function () {
    let stubLoadScript = sinon.stub(adloader, 'loadScript');

    let request = {
      bids: [{
        placementCode: 'pc1',
        bidder: 'adsupply',
        bidId: 'bidId1',
        params: {
          zoneId: 111,
          clientId: 'g32db6906-55f4-42b1-a7d2-7dfaddce96fd',
          siteId: '0ab16161-a1de-4683-8837-c420bd4387c0',
          endpointUrl: 'engine.4dsply.com'
        }
      },
      {
        placementCode: 'pc2',
        bidder: 'adsupply',
        bidId: 'bidId2',
        params: {
          clientId: 'g32db6906-55f4-42b1-a7d2-7dfaddce96fd',
          zoneId: 222,
          siteId: '0ab16161-a1de-4683-8837-c420bd4387c0',
          endpointUrl: 'engine.4dsply.com'
        }
      }]
    };

    adsupplyAdapter.callBids(request);

    sinon.assert.calledTwice(stubLoadScript);

    adloader.loadScript.restore();
  });

  it('zoneId is not a number and not specified', function () {
    let stubLoadScript = sinon.stub(adloader, 'loadScript');

    let request = {
      bids: [{
        placementCode: 'pc1',
        bidder: 'adsupply',
        bidId: 'bidId1',
        params: {
          clientId: 'g32db6906-55f4-42b1-a7d2-7dfaddce96fd',
          zoneId: '111',
          siteId: '0ab16161-a1de-4683-8837-c420bd4387c0',
          endpointUrl: 'engine.4dsply.com'
        }
      },
      {
        placementCode: 'pc2',
        bidder: 'adsupply',
        bidId: 'bidId2',
        params: {
          clientId: 'g32db6906-55f4-42b1-a7d2-7dfaddce96fd',
          siteId: '0ab16161-a1de-4683-8837-c420bd4387c0',
          endpointUrl: 'engine.4dsply.com'
        }
      }]
    };

    adsupplyAdapter.callBids(request);

    sinon.assert.notCalled(stubLoadScript);

    adloader.loadScript.restore();
  });

  it('siteId is empty and not specified', function () {
    let stubLoadScript = sinon.stub(adloader, 'loadScript');

    let request = {
      bids: [{
        placementCode: 'pc1',
        bidder: 'adsupply',
        bidId: 'bidId1',
        params: {
          zoneId: 111,
          siteId: '',
          clientId: 'g32db6906-55f4-42b1-a7d2-7dfaddce96fd',
          endpointUrl: 'engine.4dsply.com'
        }
      },
      {
        placementCode: 'pc2',
        bidder: 'adsupply',
        bidId: 'bidId2',
        params: {
          zoneId: 222,
          clientId: 'g32db6906-55f4-42b1-a7d2-7dfaddce96fd',
          endpointUrl: 'engine.4dsply.com'
        }
      }]
    };

    adsupplyAdapter.callBids(request);

    sinon.assert.notCalled(stubLoadScript);

    adloader.loadScript.restore();
  });

  it('endpointUrl is empty and not specified', function () {
    let stubLoadScript = sinon.stub(adloader, 'loadScript');

    let request = {
      bids: [{
        placementCode: 'pc1',
        bidder: 'adsupply',
        bidId: 'bidId1',
        params: {
          clientId: 'g32db6906-55f4-42b1-a7d2-7dfaddce96fd',
          zoneId: 111,
          siteId: '0ab16161-a1de-4683-8837-c420bd4387c0',
          endpointUrl: ''
        }
      },
      {
        placementCode: 'pc2',
        bidder: 'adsupply',
        bidId: 'bidId2',
        params: {
          clientId: 'g32db6906-55f4-42b1-a7d2-7dfaddce96fd',
          zoneId: 222,
          siteId: '0ab16161-a1de-4683-8837-c420bd4387c0',
        }
      }]
    };

    adsupplyAdapter.callBids(request);

    sinon.assert.notCalled(stubLoadScript);

    adloader.loadScript.restore();
  });

  it('clientId is empty and not specified', function () {
    let stubLoadScript = sinon.stub(adloader, 'loadScript');

    let request = {
      bids: [{
        placementCode: 'pc1',
        bidder: 'adsupply',
        bidId: 'bidId1',
        params: {
          clientId: '',
          zoneId: 111,
          siteId: '0ab16161-a1de-4683-8837-c420bd4387c0',
          endpointUrl: 'engine.4dsply.com'
        }
      },
      {
        placementCode: 'pc2',
        bidder: 'adsupply',
        bidId: 'bidId2',
        params: {
          zoneId: 222,
          siteId: '0ab16161-a1de-4683-8837-c420bd4387c0',
          endpointUrl: 'engine.4dsply.com'
        }
      }]
    };

    adsupplyAdapter.callBids(request);

    sinon.assert.notCalled(stubLoadScript);

    adloader.loadScript.restore();
  });

  it('parameters are missed', function () {
    let stubLoadScript = sinon.stub(adloader, 'loadScript');

    let request = {
      bids: [{
        placementCode: 'pc1',
        bidder: 'adsupply',
        bidId: 'bidId1'
      }]
    };

    adsupplyAdapter.callBids(request);

    sinon.assert.notCalled(stubLoadScript);

    adloader.loadScript.restore();
  });

  it('Parameters added to the request url', function () {
    let stubLoadScript = sinon.stub(adloader, 'loadScript');

    let request = {
      bids: [{
        placementCode: 'pc1',
        bidder: 'adsupply',
        bidId: 'bidId1',
        params: {
          zoneId: 111,
          clientId: 'g32db6906-55f4-42b1-a7d2-7dfaddce96fd',
          siteId: '0ab16161-a1de-4683-8837-c420bd4387c0',
          endpointUrl: 'engine.4dsply.com'
        }
      }]
    };

    adsupplyAdapter.callBids(request);

    var requestUrl = stubLoadScript.getCall(0).args[0];
    expect(requestUrl).to.contain('111');
    expect(requestUrl).to.contain('0ab16161-a1de-4683-8837-c420bd4387c0');
    expect(requestUrl).to.contain('engine.4dsply.com');
    expect(requestUrl).to.contain('&hbt=1');
    expect(requestUrl).to.contain('g32db6906-55f4-42b1-a7d2-7dfaddce96fd');

    adloader.loadScript.restore();
  });

  it('Response handler invalid data', function () {
    let stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');

    // adapter needs to be called, in order for the stub to register.
    new AdSupplyAdapter();

    // bidId is not valid
    pbjs.adSupplyResponseHandler(null);

    // bidRequest object is not found
    pbjs.adSupplyResponseHandler('bidId1');

    let clientId = 'g5d384afa-c050-4bac-b202-dab8fb06e381';
    // Zone property is not found
    let bidderRequest = {
      bidderCode: 'adsupply',
      bids: [{
        placementCode: 'pc1',
        bidder: 'adsupply',
        bidId: 'bidId1',
        params: {
          clientId: clientId,
          zoneId: 111,
          siteId: '0ab16161-a1de-4683-8837-c420bd4387c0',
          endpointUrl: 'engine.4dsply.com'
        }
      }]
    };
    pbjs._bidsRequested.push(bidderRequest);
    pbjs.adSupplyResponseHandler('bidId1');

    // Media is not found
    window[clientId] = window[clientId] || {};
    window[clientId]['b111'] = window[clientId]['b111'] || {};
    pbjs.adSupplyResponseHandler('bidId1');

    sinon.assert.notCalled(stubAddBidResponse);

    pbjs._bidsRequested.pop();
    bidmanager.addBidResponse.restore();
  });

  it('No Fill response', function () {
    let stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
    // adapter needs to be called, in order for the stub to register.
    new AdSupplyAdapter();

    let clientId = 'g5d384afa-c050-4bac-b202-dab8fb06e381';
    // Zone property is not found
    let bidderRequest = {
      bidderCode: 'adsupply',
      bids: [{
        placementCode: 'pc1',
        bidder: 'adsupply',
        bidId: 'bidId1',
        params: {
          clientId: clientId,
          zoneId: 111,
          siteId: '0ab16161-a1de-4683-8837-c420bd4387c0',
          endpointUrl: 'engine.4dsply.com'
        }
      }]
    };

    pbjs._bidsRequested.push(bidderRequest);

    window[clientId] = window[clientId] || {};
    window[clientId]['b111'] = window[clientId]['b111'] || {};
    window[clientId]['b111'].Media = { width: 300 };
    pbjs.adSupplyResponseHandler('bidId1');

    sinon.assert.calledOnce(stubAddBidResponse);

    let bidPlacementCode = stubAddBidResponse.getCall(0).args[0];
    let bidResponse = stubAddBidResponse.getCall(0).args[1];
    expect(bidPlacementCode).to.equal('pc1');
    expect(bidResponse.getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
    expect(bidResponse.bidderCode).to.equal('adsupply');

    pbjs._bidsRequested.pop();
    bidmanager.addBidResponse.restore();
  });

  it('Fill response', function () {
    let stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse');
    // adapter needs to be called, in order for the stub to register.
    new AdSupplyAdapter();

    let clientId = 'g5d384afa-c050-4bac-b202-dab8fb06e381';
    // Zone property is not found
    let bidderRequest = {
      bidderCode: 'adsupply',
      bids: [{
        placementCode: 'pc1',
        bidder: 'adsupply',
        bidId: 'bidId1',
        params: {
          clientId: clientId,
          zoneId: 111,
          siteId: '0ab16161-a1de-4683-8837-c420bd4387c0',
          endpointUrl: 'engine.4dsply.com'
        }
      }]
    };

    pbjs._bidsRequested.push(bidderRequest);

    window[clientId] = window[clientId] || {};
    window[clientId]['b111'] = window[clientId]['b111'] || {};
    window[clientId]['b111'].Media = { Width: 300, Height: 250, Url: '/Redirect.engine', Ecpm: 0.0012 };
    pbjs.adSupplyResponseHandler('bidId1');

    sinon.assert.calledOnce(stubAddBidResponse);

    let bidPlacementCode = stubAddBidResponse.getCall(0).args[0];
    let bidResponse = stubAddBidResponse.getCall(0).args[1];
    expect(bidPlacementCode).to.equal('pc1');
    expect(bidResponse.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
    expect(bidResponse.bidderCode).to.equal('adsupply');

    pbjs._bidsRequested.pop();
    bidmanager.addBidResponse.restore();
  });
});
