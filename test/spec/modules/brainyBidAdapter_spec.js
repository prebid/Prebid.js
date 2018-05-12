import { expect } from 'chai';
import { spec } from 'modules/brainyBidAdapter';

const URL = '//proparm.co.jp/ssp/p/pbjs';
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
}

const bidResponse = {
  ad_id: '1036e9746c-d186-49ae-90cb-2796d0f9b223',
  adm: '<img src=\'http://placehold.it/300x250/ffff6d/000000/?text=everrise300x250\'>',
  cpm: 100,
  height: 250,
  width: 300
};

describe('brainy Adapter', () => {
  describe('request', () => {
    it('should validate bid request', () => {
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });
    it('should not validate incorrect bid request', () => {
      expect(spec.isBidRequestValid(invalidBidReq)).to.equal(false);
    });
  });
  describe('build request', () => {
    it('Verify bid request', () => {
      const request = spec.buildRequests(bidReq);
      expect(request[0].method).to.equal('GET');
      expect(request[0].url).to.equal(URL);
      expect(request[0].data).to.match(new RegExp(`${correctReq.accountID}`));
      expect(request[0].data).to.match(new RegExp(`${correctReq.slotID}`));
    });
  });

  describe('interpretResponse', () => {
    it('should build bid array', () => {
      const request = spec.buildRequests(bidReq);
      const result = spec.interpretResponse({body: bidResponse}, request[0]);
      expect(result.length).to.equal(1);
    });

    it('should have all relevant fields', () => {
      const request = spec.buildRequests(bidReq);
      const result = spec.interpretResponse({body: bidResponse}, request[0]);
      const bid = result[0];

      expect(bid.cpm).to.equal(bidResponse.cpm);
      expect(bid.width).to.equal(bidResponse.width);
      expect(bid.height).to.equal(bidResponse.height);
    });
  });
});
