import {AuctionIndex} from '../../../../src/auctionIndex.js';

describe('auction index', () => {
  let index, auctions;

  function mockAuction(id, adUnits, bidderRequests, ortb2) {
    return {
      getAuctionId() { return id },
      getAdUnits() { return adUnits; },
      getBidRequests() { return bidderRequests; },
      getFPD() {
        return { global: { ortb2 } }
      }
    }
  }

  beforeEach(() => {
    auctions = [];
    index = new AuctionIndex(() => auctions);
  })

  describe('getAuction', () => {
    beforeEach(() => {
      auctions = [mockAuction('a1'), mockAuction('a2')];
    });

    it('should find auctions by auctionId', () => {
      expect(index.getAuction({auctionId: 'a1'})).to.equal(auctions[0]);
    });

    it('should return undef if auction is missing', () => {
      expect(index.getAuction({auctionId: 'missing'})).to.be.undefined;
    });

    it('should return undef if no auctionId is provided', () => {
      expect(index.getAuction({})).to.be.undefined;
    });
  });

  describe('getAdUnit', () => {
    let adUnits;

    beforeEach(() => {
      adUnits = [{adUnitId: 'au1'}, {adUnitId: 'au2'}];
      auctions = [
        mockAuction('a1', [adUnits[0], {}]),
        mockAuction('a2', [adUnits[1]])
      ];
    });

    it('should find adUnits by adUnitId', () => {
      expect(index.getAdUnit({adUnitId: 'au2'})).to.equal(adUnits[1]);
    });

    it('should return undefined if adunit is missing', () => {
      expect(index.getAdUnit({adUnitId: 'missing'})).to.be.undefined;
    });

    it('should return undefined if no adUnitId is provided', () => {
      expect(index.getAdUnit({})).to.be.undefined;
    });
  });

  describe('getBidRequest', () => {
    let bidRequests;
    beforeEach(() => {
      bidRequests = [{bidId: 'b1'}, {bidId: 'b2'}];
      auctions = [
        mockAuction('a1', [], [{bids: [bidRequests[0], {}]}]),
        mockAuction('a2', [], [{bids: [bidRequests[1]]}])
      ]
    });

    it('should find bidRequests by requestId', () => {
      expect(index.getBidRequest({requestId: 'b2'})).to.equal(bidRequests[1]);
    });

    it('should return undef if bidRequest is missing', () => {
      expect(index.getBidRequest({requestId: 'missing'})).to.be.undefined;
    });

    it('should return undef if no requestId is provided', () => {
      expect(index.getBidRequest({})).to.be.undefined;
    });
  });

  describe('getMediaTypes', () => {
    let bidderRequests, mediaTypes, adUnits;

    beforeEach(() => {
      mediaTypes = [{mockMT: '1'}, {mockMT: '2'}, {mockMT: '3'}, {mockMT: '4'}]
      adUnits = [
        {adUnitId: 'au1', mediaTypes: mediaTypes[0]},
        {adUnitId: 'au2', mediaTypes: mediaTypes[1]}
      ]
      bidderRequests = [
        {bidderRequestId: 'ber1', bids: [{bidId: 'b1', mediaTypes: mediaTypes[2], adUnitId: 'au1'}, {}]},
        {bidderRequestId: 'ber2', bids: [{bidId: 'b2', mediaTypes: mediaTypes[3], adUnitId: 'au2'}]}
      ]
      auctions = [
        mockAuction('a1', [adUnits[0]], [bidderRequests[0], {}]),
        mockAuction('a2', [adUnits[1]], [bidderRequests[1]])
      ]
    });

    it('should find mediaTypes by adUnitId', () => {
      expect(index.getMediaTypes({adUnitId: 'au2'})).to.equal(mediaTypes[1]);
    });

    it('should find mediaTypes by requestId', () => {
      expect(index.getMediaTypes({requestId: 'b1'})).to.equal(mediaTypes[2]);
    });

    it('should give precedence to request.mediaTypes over adUnit.mediaTypes', () => {
      expect(index.getMediaTypes({requestId: 'b2', adUnitId: 'au2'})).to.equal(mediaTypes[3]);
    });

    it('should return undef if requestId and adUnitId do not match', () => {
      expect(index.getMediaTypes({requestId: 'b1', adUnitId: 'au2'})).to.be.undefined;
    });

    it('should return undef if no params are provided', () => {
      expect(index.getMediaTypes({})).to.be.undefined;
    });

    ['requestId', 'adUnitId'].forEach(param => {
      it(`should return undef if ${param} is missing`, () => {
        expect(index.getMediaTypes({[param]: 'missing'})).to.be.undefined;
      });
    })
  });

  describe('getOrtb2', () => {
    let bidderRequests, adUnits = [];
    beforeEach(() => {
      bidderRequests = [
        {bidderRequestId: 'ber1', ortb2: {}, bids: [{bidId: 'b1', adUnitId: 'au1'}, {}]},
        {bidderRequestId: 'ber2', bids: [{bidId: 'b2', adUnitId: 'au2'}]}
      ]
      auctions = [
        mockAuction('a1', [adUnits[0]], [bidderRequests[0], {}]),
        mockAuction('a2', [adUnits[1]], [bidderRequests[1]], {ortb2Field: true})
      ]
    });
    it('should return ortb2 for bid if exists on bidder request', () => {
      const ortb2 = index.getOrtb2({bidderRequestId: 'ber1'});
      expect(ortb2).to.be.a('object');
    })

    it('should return ortb2 from auction if does not exist on bidder request', () => {
      const ortb2 = index.getOrtb2({bidderRequestId: 'ber2', auctionId: 'a2'});
      expect(ortb2).to.be.deep.equals({ortb2Field: true});
    })
  })
});
