import { expect } from 'chai';
import { spec } from 'modules/clydoBidAdapter.js';

function makeBid(overrides = {}) {
  return Object.assign({
    adUnitCode: '/15185185/prebid_example_1',
    bidId: 'bid-1',
    ortb2: {},
    ortb2Imp: {},
    mediaTypes: {
      banner: { sizes: [[300, 250]] }
    },
    bidder: 'clydo',
    params: {
      partnerId: 'abcdefghij',
      region: 'us'
    }
  }, overrides);
}

describe('clydoBidAdapter', () => {
  describe('isBidRequestValid', () => {
    it('returns false for missing params', () => {
      expect(spec.isBidRequestValid(makeBid({ params: undefined }))).to.equal(false);
    });
    it('returns false for invalid region', () => {
      expect(spec.isBidRequestValid(makeBid({ params: { partnerId: 'x', region: 'xx' } }))).to.equal(false);
    });
    it('returns true for valid params', () => {
      expect(spec.isBidRequestValid(makeBid())).to.equal(true);
    });
  });

  describe('buildRequests', () => {
    it('builds POST request with endpoint and JSON content type', () => {
      const bid = makeBid();
      const reqs = spec.buildRequests([bid], {});
      expect(reqs).to.be.an('array').with.lengthOf(1);
      const req = reqs[0];
      expect(req.method).to.equal('POST');
      expect(req.url).to.include('us');
      expect(req.url).to.include('abcdefghij');
      expect(req).to.not.have.property('options');
      expect(req).to.have.property('data');
    });

    it('adds imp.ext.clydo and bidfloor when available', () => {
      const bid = makeBid({
        getFloor: ({ currency }) => ({ floor: 1.5, currency })
      });
      const req = spec.buildRequests([bid], {})[0];
      const data = req.data;
      expect(data.imp[0].ext.clydo).to.deep.equal(bid.params);
      expect(data.imp[0].bidfloor).to.equal(1.5);
      expect(data.imp[0].bidfloorcur).to.equal('USD');
    });

    describe('banner', () => {
      it('builds banner imp when mediaTypes.banner present', () => {
        const bid = makeBid({ mediaTypes: { banner: { sizes: [[300, 250]] } } });
        const data = spec.buildRequests([bid], {})[0].data;
        expect(data.imp[0]).to.have.property('banner');
      });
    });
  });

  describe('interpretResponse', () => {
    it('returns empty when body is null', () => {
      const bid = makeBid();
      const req = spec.buildRequests([bid], {})[0];
      const res = spec.interpretResponse({ body: null }, req);
      expect(res).to.be.an('array').that.is.empty;
    });
  });
});
