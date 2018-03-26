import { expect } from 'chai';
import { spec } from 'modules/bridgewellBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';

describe('bridgewellBidAdapter', function () {
  let bidRequests = [
    {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CLJgEAYYvxUiBXBlbm55KgkIrAIQ-gEaATk'
      },
      'adUnitCode': 'adunit-code-1',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    },
    {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CgUxMjMzOBIBNiIGcGVubnkzKggI2AUQWhoBOQ'
      },
      'adUnitCode': 'adunit-code-2',
      'sizes': [[728, 90]],
      'bidId': '3150ccb55da321',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    },
    {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CgUxMjMzOBIBNiIFcGVubnkqCQisAhD6ARoBOQ'
      },
      'adUnitCode': 'adunit-code-1',
      'sizes': [[300, 250]],
      'bidId': '42dbe3a7168a6a',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    },
    {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CgUxMjMzOBIBNiIFcGVubnkqCQisAhD6ARoBOQ',
        'cpmWeight': 0.5
      },
      'adUnitCode': 'adunit-code-1',
      'sizes': [[300, 250]],
      'bidId': '42dbe3a7168a6a',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    },
    {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CgUxMjMzOBIBNiIGcGVubnkzKggI2AUQWhoBOQ',
        'cpmWeight': -0.5
      },
      'adUnitCode': 'adunit-code-2',
      'sizes': [[728, 90]],
      'bidId': '3150ccb55da321',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    },
    {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CgUxMjMzOBIBNiIGcGVubnkzKggI2AUQWhoBOQ',
      },
      'adUnitCode': 'adunit-code-2',
      'sizes': [728, 90],
      'bidId': '3150ccb55da321',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    }
  ];
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bidWithoutCpmWeight = {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CLJgEAYYvxUiBXBlbm55KgkIrAIQ-gEaATk'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    let bidWithCorrectCpmWeight = {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CLJgEAYYvxUiBXBlbm55KgkIrAIQ-gEaATk',
        'cpmWeight': 0.5
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    let bidWithUncorrectCpmWeight = {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CLJgEAYYvxUiBXBlbm55KgkIrAIQ-gEaATk',
        'cpmWeight': -1.0
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    let bidWithZeroCpmWeight = {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CLJgEAYYvxUiBXBlbm55KgkIrAIQ-gEaATk',
        'cpmWeight': 0
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bidWithoutCpmWeight)).to.equal(true);
      expect(spec.isBidRequestValid(bidWithCorrectCpmWeight)).to.equal(true);
      expect(spec.isBidRequestValid(bidWithUncorrectCpmWeight)).to.equal(false);
      expect(spec.isBidRequestValid(bidWithZeroCpmWeight)).to.equal(false);
    });

    it('should return false when required params are not passed', () => {
      let bidWithoutCpmWeight = Object.assign({}, bidWithoutCpmWeight);
      let bidWithCorrectCpmWeight = Object.assign({}, bidWithCorrectCpmWeight);
      let bidWithUncorrectCpmWeight = Object.assign({}, bidWithUncorrectCpmWeight);
      let bidWithZeroCpmWeight = Object.assign({}, bidWithZeroCpmWeight);

      delete bidWithoutCpmWeight.params;
      delete bidWithCorrectCpmWeight.params;
      delete bidWithUncorrectCpmWeight.params;
      delete bidWithZeroCpmWeight.params;

      bidWithoutCpmWeight.params = {
        'ChannelID': 0
      };

      bidWithCorrectCpmWeight.params = {
        'ChannelID': 0
      };

      bidWithUncorrectCpmWeight.params = {
        'ChannelID': 0
      };

      bidWithZeroCpmWeight.params = {
        'ChannelID': 0
      };

      expect(spec.isBidRequestValid(bidWithoutCpmWeight)).to.equal(false);
      expect(spec.isBidRequestValid(bidWithCorrectCpmWeight)).to.equal(false);
      expect(spec.isBidRequestValid(bidWithUncorrectCpmWeight)).to.equal(false);
      expect(spec.isBidRequestValid(bidWithZeroCpmWeight)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    it('should attach valid params to the tag', () => {
      const request = spec.buildRequests([bidRequests[0]]);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('ChannelID').that.is.a('string');
    });

    it('should attach validBidRequests to the tag', () => {
      const request = spec.buildRequests(bidRequests);
      const validBidRequests = request.validBidRequests;
      expect(validBidRequests).to.deep.equal(bidRequests);
    });

    it('should attach valid params to the tag if multiple ChannelIDs are presented', () => {
      const request = spec.buildRequests(bidRequests);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('ChannelID').that.is.a('string');
      expect(payload.ChannelID.split(',')).to.have.lengthOf(bidRequests.length);
    });
  });

  describe('interpretResponse', () => {
    const request = spec.buildRequests(bidRequests);
    const serverResponses = [{
      'id': 'e5b10774-32bf-4931-85ee-05095e8cff21',
      'bidder_code': 'bridgewell',
      'cpm': 5.0,
      'width': 300,
      'height': 250,
      'ad': '<div>test 300x250</div>',
      'ttl': 360,
      'net_revenue': 'true',
      'currency': 'NTD'
    }, {
      'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
      'bidder_code': 'bridgewell',
      'cpm': 5.0,
      'width': 728,
      'height': 90,
      'ad': '<div>test 728x90</div>',
      'ttl': 360,
      'net_revenue': 'true',
      'currency': 'NTD'
    }, {
      'id': '8f12c646-3b87-4326-a837-c2a76999f168',
      'bidder_code': 'bridgewell',
      'cpm': 5.0,
      'width': 300,
      'height': 250,
      'ad': '<div>test 300x250</div>',
      'ttl': 360,
      'net_revenue': 'true',
      'currency': 'NTD'
    }, {
      'id': '8f12c646-3b87-4326-a837-c2a76999f168',
      'bidder_code': 'bridgewell',
      'cpm': 5.0,
      'width': 300,
      'height': 250,
      'ad': '<div>test 300x250</div>',
      'ttl': 360,
      'net_revenue': 'true',
      'currency': 'NTD'
    }, {
      'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
      'bidder_code': 'bridgewell',
      'cpm': 5.0,
      'width': 728,
      'height': 90,
      'ad': '<div>test 728x90</div>',
      'ttl': 360,
      'net_revenue': 'true',
      'currency': 'NTD'
    }, {
      'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
      'bidder_code': 'bridgewell',
      'cpm': 5.0,
      'width': 728,
      'height': 90,
      'ad': '<div>test 728x90</div>',
      'ttl': 360,
      'net_revenue': 'true',
      'currency': 'NTD'
    }];

    it('should return all required parameters', () => {
      const result = spec.interpretResponse({'body': serverResponses}, request);
      result.every(res => expect(res.cpm).to.be.a('number'));
      result.every(res => expect(res.width).to.be.a('number'));
      result.every(res => expect(res.height).to.be.a('number'));
      result.every(res => expect(res.ttl).to.be.a('number'));
      result.every(res => expect(res.netRevenue).to.be.a('boolean'));
      result.every(res => expect(res.currency).to.be.a('string'));
      result.every(res => expect(res.ad).to.be.a('string'));
    });

    it('should give up bid if server response is undefiend', () => {
      const result = spec.interpretResponse({'body': undefined}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if cpm is missing', () => {
      let target = Object.assign({}, serverResponses[0]);
      delete target.cpm;
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if width or height is missing', () => {
      let target = Object.assign({}, serverResponses[0]);
      delete target.height;
      delete target.width;
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if ad is missing', () => {
      let target = Object.assign({}, serverResponses[0]);
      delete target.ad;
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if revenue mode is missing', () => {
      let target = Object.assign({}, serverResponses[0]);
      delete target.net_revenue;
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if currency is missing', () => {
      let target = Object.assign({}, serverResponses[0]);
      delete target.currency;
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });
  });
});
