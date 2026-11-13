import { expect } from 'chai';
import { spec } from 'modules/alvadsBidAdapter.js';

describe('ALVADS Bid Adapter', function() {
  const bannerBid = {
    bidId: 'banner-1',
    mediaTypes: { banner: { sizes: [[320, 100]] } },
    params: {
      publisherId: 'D7DACCE3-C23D-4AB9-8FE6-9FF41BF32F8F',
      tagid: 'zone-001',
      bidfloor: 0.1,
      userId: 'user-001'
    }
  };

  const videoBid = {
    bidId: 'video-1',
    mediaTypes: { video: { playerSize: [[1280, 720]] } },
    params: {
      publisherId: 'D7DACCE3-C23D-4AB9-8FE6-9FF41BF32F8F',
      bidfloor: 0.5,
      userId: 'user-002',
      language: 'en',
      count: 1
    }
  };

  const bidderRequestBanner = {
    refererInfo: { page: "http://localhost:1200" },
    gdprConsent: true,
    uspConsent: '1YNN'
  };
  const bidderRequestVideo = {
    refererInfo: { page: "https://instagram.com" },
    gdprConsent: true,
    uspConsent: '1YNN'
  };

  // -----------------------------
  describe('isBidRequestValid', function() {
    it('validates banner bid requests', function() {
      expect(spec.isBidRequestValid(bannerBid)).to.be.true;
    });

    it('validates video bid requests', function() {
      expect(spec.isBidRequestValid(videoBid)).to.be.true;
    });

    it('rejects invalid bid requests', function() {
      expect(spec.isBidRequestValid({})).to.be.false;
    });
  });

  // -----------------------------
  describe('buildRequests', function() {
    it('uses default endpoint if none provided', function() {
      const requests = spec.buildRequests([bannerBid], bidderRequestBanner);
      expect(requests[0].url).to.equal('https://helios-ads-qa-core.ssidevops.com/decision/openrtb');
    });

    it('uses custom endpoint from bid params', function() {
      const customBid = {
        ...bannerBid,
        params: { ...bannerBid.params, endpoint: 'https://helios-ads-qa-core.ssidevops.com/decision/openrtb' }
      };
      const requests = spec.buildRequests([customBid], bidderRequestBanner);
      expect(requests[0].url).to.equal('https://helios-ads-qa-core.ssidevops.com/decision/openrtb');
    });

    it('builds correct banner request payload', function() {
      const requests = spec.buildRequests([bannerBid], bidderRequestBanner);
      const request = requests[0];
      const data = JSON.parse(request.data);

      expect(data.imp).to.have.lengthOf(1);
      expect(data.imp[0].banner).to.deep.equal({ w: 320, h: 100 });
      expect(data.imp[0].tagid).to.equal(bannerBid.params.tagid);
      expect(data.site.publisher.id).to.equal(bannerBid.params.publisherId);
    });

    it('builds correct video request payload', function() {
      const requests = spec.buildRequests([videoBid], bidderRequestVideo);
      const request = requests[0];
      const data = JSON.parse(request.data);

      expect(data.imp).to.have.lengthOf(1);
      expect(data.imp[0].video).to.deep.equal({ w: 1280, h: 720 });
    });
  });
  // -----------------------------
  describe('interpretResponse', function() {
    it('returns empty array if no bids', function() {
      const serverResponse = { body: { seatbid: [] } };
      const result = spec.interpretResponse(serverResponse, { bid: bannerBid });
      expect(result).to.have.lengthOf(0);
    });

    it('interprets banner bid response', function() {
      const serverResponse = {
        body: {
          seatbid: [
            { bid: [{ impid: 'banner-1', price: 1.2, w: 320, h: 100, crid: 'c1', adm: '<div>ad</div>' }] }
          ],
          cur: 'USD'
        }
      };

      const result = spec.interpretResponse(serverResponse, { bid: bannerBid });
      expect(result).to.have.lengthOf(1);
      const r = result[0];
      expect(r.mediaType).to.equal('banner');
      expect(r.cpm).to.equal(1.2);
      expect(r.ad).to.equal('<div>ad</div>');
      expect(r.width).to.equal(320);
      expect(r.height).to.equal(100);
      expect(r.creativeId).to.equal('c1');
    });

    it('interprets video bid response', function() {
      const serverResponse = {
        body: {
          seatbid: [
            { bid: [{ impid: 'video-1', price: 2.5, w: 1280, h: 720, crid: 'v1', adm: '<VAST></VAST>', ext: { vast_url: 'http://vast.url' }, adomain: ['example.com'] }] }
          ],
          cur: 'USD'
        }
      };

      const result = spec.interpretResponse(serverResponse, { bid: videoBid });
      expect(result).to.have.lengthOf(1);
      const r = result[0];
      expect(r.mediaType).to.equal('video');
      expect(r.cpm).to.equal(2.5);
      expect(r.vastXml).to.equal('<VAST></VAST>');
      expect(r.vastUrl).to.equal('http://vast.url');
      expect(r.width).to.equal(1280);
      expect(r.height).to.equal(720);
      expect(r.creativeId).to.equal('v1');
      expect(r.meta.advertiserDomains).to.deep.equal(['example.com']);
    });
  });

  // -----------------------------
  describe('onTimeout', function() {
    it('calls logWarn with timeout data', function() {
      const logs = [];
      const original = spec.onTimeout;
      spec.onTimeout = (data) => logs.push(data);

      spec.onTimeout({ bidId: 'timeout-1' });
      expect(logs).to.have.lengthOf(1);
      expect(logs[0].bidId).to.equal('timeout-1');

      spec.onTimeout = original;
    });
  });

  describe('onBidWon', function() {
    it('calls logInfo with bid won', function() {
      const logs = [];
      const original = spec.onBidWon;
      spec.onBidWon = (bid) => logs.push(bid);

      spec.onBidWon({ bidId: 'won-1' });
      expect(logs).to.have.lengthOf(1);
      expect(logs[0].bidId).to.equal('won-1');

      spec.onBidWon = original;
    });
  });
});
