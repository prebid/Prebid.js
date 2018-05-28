import {expect} from 'chai';
import Adapter from '../../../modules/appnexusBidAdapter';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';

describe('AppNexus Adapter', () => {
  let adapter;

  const REQUEST = {
    'bidderCode': 'appnexus',
    'requestId': 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
    'bidderRequestId': '7101db09af0db2',
    'bids': [
      {
        'bidder': 'appnexus',
        'params': {
          'placementId': '4799418',
          'trafficSourceCode': 'source'
        },
        'placementCode': '/19968336/header-bid-tag1',
        'sizes': [
          [728, 90],
          [970, 90]
        ],
        'bidId': '84ab500420319d',
        'bidderRequestId': '7101db09af0db2',
        'requestId': 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6'
      }
    ],
    'start': 1469479810130
  };

  let sandbox;
  let adLoaderStub;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.stub(bidManager, 'addBidResponse');
    adLoaderStub = sandbox.stub(adLoader, 'loadScript');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('callBids', () => {
    it('should contain traffic_source_code', () => {
      adapter = new Adapter();
      adapter.callBids(REQUEST);
      expect(adLoaderStub.getCall(0).args[0]).to.contain('traffic_source_code=source');
    });
  });
});
