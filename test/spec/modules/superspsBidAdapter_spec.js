import { expect } from 'chai';
import { URL, SSSPUID, spec } from '../../../modules/superspsBidAdapter.js';
import { newBidder } from '../../../src/adapters/bidderFactory.js';

describe('adapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('buildRequests', function () {
    const bidRequest = {
      adUnitCode: 'adunitcode',
      auctionId: 'randomActionId',
      bidId: 'randomBidId',
      mediaTypes: { banner: { sizes: [[300, 250]] } },
    };

    const bidRequestWithUser = {
      adUnitCode: 'adunitcode',
      auctionId: 'randomActionId',
      bidId: 'randomBidId',
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      userId: {
        pubProvidedId: [
          {
            source: 'example.com',
            uids: [
              {
                id: 'id1',
                atype: 1,
                ext: {
                  stype: 'ppuid',
                },
              },
              {
                id: 'id2',
                atype: 1,
                ext: {
                  stype: 'ppuid',
                },
              },
            ],
          },
        ],
      },
    };

    let bidderRequests = {
      auctionId: '123',
      refererInfo: {
        page: 'http://mypage.org?pbjs_debug=true',
        domain: 'mypage.org',
      },
    };

    const request = spec.buildRequests(
      [bidRequest, bidRequestWithUser],
      bidderRequests
    );
    it('sends bid to defined url via POST', function () {
      expect(request[0].method).to.equal('POST');
      expect(request[0].url).to.equal(URL);
    });

    it('data sent are correct', () => {
      expect(request[0].data.adUnitCode).to.equal(bidRequest.adUnitCode);
      expect(request[0].data.bidId).to.equal(bidRequest.bidId);
      expect(request[0].data.auctionId).to.equal(bidderRequests.auctionId);
      expect(request[0].data.ssspUid).to.equal(SSSPUID);
    });

    it('data with user sent are correct', () => {
      expect(request[1].data.adUnitCode).to.equal(bidRequestWithUser.adUnitCode);
      expect(request[1].data.bidId).to.equal(bidRequestWithUser.bidId);
      expect(request[1].data.auctionId).to.equal(bidderRequests.auctionId);
      expect(request[1].data.ssspUid).to.equal(SSSPUID);
      expect(request[1].data.pubProvidedIds).to.haveOwnProperty(bidRequestWithUser.userId.pubProvidedId[0].source);
    });
  });
});
