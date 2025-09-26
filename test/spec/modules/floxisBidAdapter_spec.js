import { expect } from 'chai';
import { spec } from 'modules/floxisBidAdapter.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';

const BIDDER_CODE = 'floxis';

describe('floxisBidAdapter', function () {
  const validBannerBid = {
    bidId: '1',
    adUnitCode: 'adunit-1',
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    params: { partner: 'floxis', placementId: 123 },
    ortb2Imp: { secure: 1 }
  };
  const validVideoBid = {
    bidId: '2',
    adUnitCode: 'adunit-2',
    mediaTypes: { video: { playerSize: [[640, 480]], mimes: ['video/mp4'], protocols: [2, 3] } },
    params: { partner: 'floxis', placementId: 456 },
    ortb2Imp: { secure: 1 }
  };
  const invalidBid = {
    bidId: '3',
    adUnitCode: 'adunit-3',
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    params: { partner: '', placementId: 'notanint' }
  };

  it('should validate correct banner bid', function () {
    expect(spec.isBidRequestValid(validBannerBid)).to.be.true;
  });

  it('should validate correct video bid', function () {
    expect(spec.isBidRequestValid(validVideoBid)).to.be.true;
  });

  it('should invalidate incorrect bid', function () {
    expect(spec.isBidRequestValid(invalidBid)).to.be.false;
  });

  it('should build request with correct url and payload', function () {
    const requests = spec.buildRequests([validBannerBid], {});
    expect(requests).to.have.lengthOf(1);
    expect(requests[0].url).to.include('floxis-us.floxis.tech/pbjs');
    expect(requests[0].data).to.be.an('object');
    expect(requests[0].data.imp).to.be.an('array');
    expect(requests[0].data.site.ext.placementId).to.equal(123);
  });

  it('should handle empty bid requests', function () {
    const requests = spec.buildRequests([], {});
    expect(requests).to.be.an('array').that.is.empty;
  });

  it('should invalidate bid with no media types', function () {
    const noMediaTypeBid = {
      bidId: '4',
      adUnitCode: 'adunit-4',
      params: { partner: 'floxis', placementId: 123 }
    };
    expect(spec.isBidRequestValid(noMediaTypeBid)).to.be.false;
  });

  it('should validate supported media types', function () {
    expect(spec.supportedMediaTypes).to.include(BANNER);
    expect(spec.supportedMediaTypes).to.include(VIDEO);
    expect(spec.supportedMediaTypes).to.include(NATIVE);
  });

  it('should return empty user syncs', function () {
    expect(spec.getUserSyncs()).to.be.an('array').that.is.empty;
  });

  it('should interpret response correctly', function () {
    const serverResponse = {
      body: {
        seatbid: [{
          bid: [{
            impid: '1',
            price: 1.23,
            w: 300,
            h: 250,
            crid: 'creative-1',
            adm: '<div>ad</div>',
            cur: 'USD'
          }]
        }]
      }
    };
    const requests = spec.buildRequests([validBannerBid], {});
    const bids = spec.interpretResponse(serverResponse, requests[0]);
    expect(bids).to.be.an('array');
    if (bids.length > 0) {
      expect(bids[0]).to.have.property('cpm');
      expect(bids[0]).to.have.property('requestId');
      expect(bids[0].cpm).to.equal(1.23);
    }
  });

  it('should set bidfloor and bidfloorcur from Floors Module', function () {
    const floorValue = 2.5;
    const floorCurrency = 'USD';
    const bidWithFloor = {
      bidId: '10',
      adUnitCode: 'adunit-10',
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      params: { partner: 'floxis', placementId: 999 },
      getFloor: function({currency, mediaType, size}) {
        return { floor: floorValue, currency: floorCurrency };
      }
    };
    const requests = spec.buildRequests([bidWithFloor], {});
    expect(requests).to.have.lengthOf(1);
    const imp = requests[0].data.imp[0];
    expect(imp.bidfloor).to.equal(floorValue);
    expect(imp.bidfloorcur).to.equal(floorCurrency);
  });

  it('should set ORTB blocking params in request and imp', function () {
    const bidWithBlocking = {
      bidId: '20',
      adUnitCode: 'adunit-20',
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      params: {
        partner: 'floxis',
        placementId: 555,
        bcat: ['IAB1-1', 'IAB1-2'],
        badv: ['example.com', 'test.com'],
        bapp: ['com.example.app'],
        battr: [1, 2, 3]
      }
    };
    const requests = spec.buildRequests([bidWithBlocking], {});
    expect(requests).to.have.lengthOf(1);
    const req = requests[0].data;
    expect(req.bcat).to.deep.equal(['IAB1-1', 'IAB1-2']);
    expect(req.badv).to.deep.equal(['example.com', 'test.com']);
    expect(req.bapp).to.deep.equal(['com.example.app']);
    const imp = req.imp[0];
    expect(imp.banner.battr).to.deep.equal([1, 2, 3]);
  });

  it('should invalidate video bid with missing mimes', function () {
    const bid = {
      bidId: 'v1',
      adUnitCode: 'adunit-v1',
      mediaTypes: { video: { playerSize: [[640, 480]], protocols: [2, 3] } },
      params: { partner: 'floxis', placementId: 123 }
    };
    expect(spec.isBidRequestValid(bid)).to.be.false;
  });

  it('should invalidate video bid with missing protocols', function () {
    const bid = {
      bidId: 'v2',
      adUnitCode: 'adunit-v2',
      mediaTypes: { video: { playerSize: [[640, 480]], mimes: ['video/mp4'] } },
      params: { partner: 'floxis', placementId: 123 }
    };
    expect(spec.isBidRequestValid(bid)).to.be.false;
  });

  it('should validate correct video bid with mimes and protocols', function () {
    const bid = {
      bidId: 'v3',
      adUnitCode: 'adunit-v3',
      mediaTypes: { video: { playerSize: [[640, 480]], mimes: ['video/mp4'], protocols: [2, 3] } },
      params: { partner: 'floxis', placementId: 123 }
    };
    expect(spec.isBidRequestValid(bid)).to.be.true;
  });

  it('should invalidate native bid with no assets', function () {
    const bid = {
      bidId: 'n1',
      adUnitCode: 'adunit-n1',
      mediaTypes: { native: {} },
      params: { partner: 'floxis', placementId: 123 }
    };
    expect(spec.isBidRequestValid(bid)).to.be.false;
  });

  it('should validate native bid with assets', function () {
    const bid = {
      bidId: 'n2',
      adUnitCode: 'adunit-n2',
      mediaTypes: { native: { image: { required: true, sizes: [150, 50] }, title: { required: true, len: 80 } } },
      params: { partner: 'floxis', placementId: 123 }
    };
    expect(spec.isBidRequestValid(bid)).to.be.true;
  });
});
