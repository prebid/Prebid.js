import { expect } from 'chai';
import { spec } from 'modules/brainyBidAdapter';

const URL = 'https://proparm.jp/ssp/p/pbjs';
const BIDDER_CODE = 'brainy';

const validBidReq = {
  bidder: BIDDER_CODE,
  params: {
    accountID: '12345',
    slotID: '12345'
  }
};

const invalidBidReq = {
  bidder: BIDDER_CODE,
  params: {
    accountID: '',
    slotID: ''
  }
};

const bidReq = [{
  bidder: BIDDER_CODE,
  params: {
    accountID: '12345',
    slotID: '12345'
  }
}];

const correctReq = {
  accountID: '12345',
  slotID: '12345'
};

const bidResponse = {
  ad_id: '1036e9746c-d186-49ae-90cb-2796d0f9b223',
  adm: '<img src=\'https://placehold.it/300x250/ffff6d/000000/?text=everrise300x250\'>',
  syncUrl: 'https://testparm.com/ssp-sync/p/sync?uid=2110180601155125000059&buyer=2&slot=34',
  cpm: 100,
  height: 250,
  width: 300
};

const bidSyncResponse = [{
  body: {
    ad_id: '1036e9746c-d186-49ae-90cb-2796d0f9b223',
    adm: '<img src=\'https://placehold.it/300x250/ffff6d/000000/?text=everrise300x250\'>',
    syncUrl: 'https://testparm.com/ssp-sync/p/sync?uid=2110180601155125000059&buyer=2&slot=34',
    cpm: 100,
    height: 250,
    width: 300
  }
}];

const invalidSyncBidResponse = [{
  body: {
    ad_id: '1036e9746c-d186-49ae-90cb-2796d0f9b223',
    adm: '<img src=\'https://placehold.it/300x250/ffff6d/000000/?text=everrise300x250\'>',
    syncUrl: 'null',
    cpm: 100,
    height: 250,
    width: 300
  }
}];

describe('brainy Adapter', function () {
  describe('request', function () {
    it('should validate bid request', function () {
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });
    it('should not validate incorrect bid request', function () {
      expect(spec.isBidRequestValid(invalidBidReq)).to.equal(false);
    });
  });
  describe('build request', function () {
    it('Verify bid request', function () {
      const request = spec.buildRequests(bidReq);
      expect(request[0].method).to.equal('GET');
      expect(request[0].url).to.equal(URL);
      expect(request[0].data).to.match(new RegExp(`${correctReq.accountID}`));
      expect(request[0].data).to.match(new RegExp(`${correctReq.slotID}`));
    });
  });

  describe('interpretResponse', function () {
    it('should build bid array', function () {
      const request = spec.buildRequests(bidReq);
      const result = spec.interpretResponse({body: bidResponse}, request[0]);
      expect(result.length).to.equal(1);
    });

    it('should have all relevant fields', function () {
      const request = spec.buildRequests(bidReq);
      const result = spec.interpretResponse({body: bidResponse}, request[0]);
      const bid = result[0];

      expect(bid.cpm).to.equal(bidResponse.cpm);
      expect(bid.width).to.equal(bidResponse.width);
      expect(bid.height).to.equal(bidResponse.height);
    });
  });

  describe('spec.getUserSyncs', function () {
    let syncOptions
    beforeEach(function () {
      syncOptions = {
        enabledBidders: ['brainy'],
        pixelEnabled: true
      }
    });
    it('sucess with usersync url', function () {
      const result = [];
      result.push({type: 'image', url: 'https://testparm.com/ssp-sync/p/sync?uid=2110180601155125000059&buyer=2&slot=34'});
      expect(spec.getUserSyncs(syncOptions, bidSyncResponse)).to.deep.equal(result);
    });

    it('sucess without usersync url', function () {
      const result = [];
      expect(spec.getUserSyncs(syncOptions, invalidSyncBidResponse)).to.deep.equal(result);
    });
    it('empty response', function () {
      const serverResponse = [{body: {}}];
      const result = [];
      expect(spec.getUserSyncs(syncOptions, serverResponse)).to.deep.equal(result);
    });
  });
});
