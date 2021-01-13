import {expect} from 'chai';
import {spec} from '../../../modules/waardexBidAdapter.js';
import { auctionManager } from 'src/auctionManager.js';
import { deepClone } from 'src/utils.js';

describe('waardexBidAdapter', () => {
  const validBid = {
    bidId: '112435ry',
    bidder: 'waardex',
    params: {
      placementId: 1,
      traffic: 'banner',
      zoneId: 1,
    }
  };

  describe('isBidRequestValid', () => {
    it('Should return true. bidId and params such as placementId and zoneId are present', () => {
      expect(spec.isBidRequestValid(validBid)).to.be.true;
    });
    it('Should return false. bidId is not present in bid object', () => {
      const invalidBid = deepClone(validBid);
      delete invalidBid.bidId;
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });
    it('Should return false. zoneId is not present in bid.params object', () => {
      const invalidBid = deepClone(validBid);
      delete invalidBid.params.zoneId;
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });
  });

  describe('buildRequests', () => {
    let getAdUnitsStub;
    const validBidRequests = [{
      bidId: 'fergr675ujgh',
      mediaTypes: {
        banner: {
          sizes: [[300, 600], [300, 250]]
        }
      },
      params: {
        bidfloor: 1.5,
        position: 1,
        instl: 1,
        zoneId: 100
      },
    }];

    const bidderRequest = {
      refererInfo: {
        referer: 'https://www.google.com/?some_param=some_value'
      },
    };

    beforeEach(() => getAdUnitsStub = sinon.stub(auctionManager, 'getAdUnits').callsFake(() => []));
    afterEach(() => getAdUnitsStub.restore());

    it('should return valid build request object', () => {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const {
        data: payload,
        url,
        method,
      } = request;

      expect(payload.bidRequests[0]).deep.equal({
        bidId: validBidRequests[0].bidId,
        bidfloor: validBidRequests[0].params.bidfloor,
        position: validBidRequests[0].params.position,
        instl: validBidRequests[0].params.instl,
        banner: {
          sizes: [
            {
              width: validBidRequests[0].mediaTypes.banner.sizes[0][0],
              height: validBidRequests[0].mediaTypes.banner.sizes[0][1]
            },
            {
              width: validBidRequests[0].mediaTypes.banner.sizes[1][0],
              height: validBidRequests[0].mediaTypes.banner.sizes[1][1]
            },
          ],
        }
      });
      const ENDPOINT = `https://hb.justbidit.xyz:8843/prebid?pubId=${validBidRequests[0].params.zoneId}`;
      expect(url).to.equal(ENDPOINT);
      expect(method).to.equal('POST');
    });
  });

  describe('interpretResponse', () => {
    const serverResponse = {
      body: {
        seatbid: [{
          bid: [{
            id: 'someId',
            price: 3.3,
            w: 250,
            h: 300,
            crid: 'dspCreativeIdHere',
            adm: 'html markup here',
            dealId: '123456789',
            cid: 'dsp campaign id',
            adomain: 'advertisers domain',
            ext: {
              mediaType: 'banner',
            },
          }],
        }],
      },
    };

    it('bid response is valid', () => {
      const result = spec.interpretResponse(serverResponse);
      const expected = [{
        requestId: serverResponse.body.seatbid[0].bid[0].id,
        cpm: serverResponse.body.seatbid[0].bid[0].price,
        currency: 'USD',
        width: serverResponse.body.seatbid[0].bid[0].w,
        height: serverResponse.body.seatbid[0].bid[0].h,
        creativeId: serverResponse.body.seatbid[0].bid[0].crid,
        netRevenue: true,
        ttl: 3000,
        ad: serverResponse.body.seatbid[0].bid[0].adm,
        dealId: serverResponse.body.seatbid[0].bid[0].dealid,
        meta: {
          cid: serverResponse.body.seatbid[0].bid[0].cid,
          adomain: serverResponse.body.seatbid[0].bid[0].adomain,
          mediaType: serverResponse.body.seatbid[0].bid[0].ext.mediaType,
        },
      }];
      expect(result).deep.equal(expected);
    });

    it('invalid bid response. requestId is not exists in bid response', () => {
      const invalidServerResponse = deepClone(serverResponse);
      delete invalidServerResponse.body.seatbid[0].bid[0].id;

      const result = spec.interpretResponse(invalidServerResponse);
      expect(result).deep.equal([]);
    });

    it('invalid bid response. cpm is not exists in bid response', () => {
      const invalidServerResponse = deepClone(serverResponse);
      delete invalidServerResponse.body.seatbid[0].bid[0].price;

      const result = spec.interpretResponse(invalidServerResponse);
      expect(result).deep.equal([]);
    });

    it('invalid bid response. creativeId is not exists in bid response', () => {
      const invalidServerResponse = deepClone(serverResponse);
      delete invalidServerResponse.body.seatbid[0].bid[0].crid;

      const result = spec.interpretResponse(invalidServerResponse);
      expect(result).deep.equal([]);
    });

    it('invalid bid response. width is not exists in bid response', () => {
      const invalidServerResponse = deepClone(serverResponse);
      delete invalidServerResponse.body.seatbid[0].bid[0].w;

      const result = spec.interpretResponse(invalidServerResponse);
      expect(result).deep.equal([]);
    });

    it('invalid bid response. height is not exists in bid response', () => {
      const invalidServerResponse = deepClone(serverResponse);
      delete invalidServerResponse.body.seatbid[0].bid[0].h;

      const result = spec.interpretResponse(invalidServerResponse);
      expect(result).deep.equal([]);
    });

    it('invalid bid response. ad is not exists in bid response', () => {
      const invalidServerResponse = deepClone(serverResponse);
      delete invalidServerResponse.body.seatbid[0].bid[0].adm;

      const result = spec.interpretResponse(invalidServerResponse);
      expect(result).deep.equal([]);
    });
  });
});
