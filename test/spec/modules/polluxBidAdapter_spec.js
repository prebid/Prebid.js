import {expect} from 'chai';
import Adapter from '../../../modules/polluxBidAdapter';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';

describe('Pollux Adapter', () => {
  let adapter;

  const REQUEST = {
    'bidderCode': 'pollux',
    'requestId': 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
    'bidderRequestId': '7101db09af0db2',
    'bids': [
      {
        'bidder': 'pollux',
        'bidderUrl': '//adn-dev.polluxnetwork.com/prebid',
        'params': {
          'zone': '123'
        },
        'code': 'div-gpt-ad-1460505661639-0',
        'sizes': [[728, 90]],
        'bidId': '84ab500420319d',
        'bidderRequestId': '7101db09af0db2',
        'requestId': 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6'
      }
    ],
    'start': 1469479810130
  };

  sinon.stub(bidManager, 'addBidResponse');
  const adLoaderStub = sinon.stub(adLoader, 'loadScript');

  describe('callBids', () => {
    adapter = new Adapter();
    adapter.callBids(REQUEST);
    expect(adLoaderStub.getCall(0).args[0]).to.contain('zone=123');
    expect(adLoaderStub.getCall(0).args[0]).to.contain('domain=');
  });
});
