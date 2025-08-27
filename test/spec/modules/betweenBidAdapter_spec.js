import { expect } from 'chai';
import { spec } from 'modules/betweenBidAdapter.js';

describe('betweenBidAdapterTests', function () {
  it('validate_pub_params', function () {
    expect(spec.isBidRequestValid({
      bidder: 'between',
      params: {
        w: 240,
        h: 400,
        s: 1112
      }
    })).to.equal(true);
  });
  it('validate_generated_params', function () {
    const bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'between',
      params: {w: 240, h: 400, s: 1112},
      sizes: [[240, 400]]
    }]
    const request = spec.buildRequests(bidRequestData);
    const req_data = JSON.parse(request.data)[0].data;
    expect(req_data.bidid).to.equal('bid1234');
  });

  it('validate_video_params', function () {
    const bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'between',
      params: {w: 240, h: 400, s: 1112},
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [970, 250],
          maxd: 123,
          mind: 234,
          codeType: 'unknown code type'
        }
      },
    }];
    const request = spec.buildRequests(bidRequestData);
    const req_data = JSON.parse(request.data)[0].data;

    expect(req_data.mediaType).to.equal(2);
    expect(req_data.maxd).to.equal(123);
    expect(req_data.mind).to.equal(234);
    expect(req_data.pos).to.equal('atf');
    expect(req_data.codeType).to.equal('inpage');
  });

  it('validate itu param', function() {
    const bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'between',
      params: {
        w: 240,
        h: 400,
        s: 1112,
        itu: 'https://something.url'
      },
      sizes: [[240, 400]]
    }];

    const request = spec.buildRequests(bidRequestData);
    const req_data = JSON.parse(request.data)[0].data;

    expect(req_data.itu).to.equal('https://something.url');
  });
  it('validate cur param', function() {
    const bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'between',
      params: {
        w: 240,
        h: 400,
        s: 1112,
        cur: 'THX'
      },
      sizes: [[240, 400]]
    }];

    const request = spec.buildRequests(bidRequestData);
    const req_data = JSON.parse(request.data)[0].data;

    expect(req_data.cur).to.equal('THX');
  });
  it('validate default cur USD', function() {
    const bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'between',
      params: {
        w: 240,
        h: 400,
        s: 1112
      },
      sizes: [[240, 400]]
    }];

    const request = spec.buildRequests(bidRequestData);
    const req_data = JSON.parse(request.data)[0].data;

    expect(req_data.cur).to.equal('USD');
  });
  it('validate subid param', function() {
    const bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'between',
      params: {
        w: 240,
        h: 400,
        s: 1112,
        subid: 1138,
      },
      sizes: [[240, 400]]
    }];

    const request = spec.buildRequests(bidRequestData);
    const req_data = JSON.parse(request.data)[0].data;

    expect(req_data.subid).to.equal(1138);
  });

  it('validate eids parameter', function() {
    const USER_ID_DATA = [
      {
        source: 'admixer.net',
        uids: [
          { id: '5706411dc1c54268ac2ed668b27f92a3', atype: 3 }
        ]
      }
    ];

    const bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'between',
      params: {
        w: 240,
        h: 400,
        s: 1112,
      },
      sizes: [[240, 400]],
      userIdAsEids: USER_ID_DATA,
    }];

    const request = spec.buildRequests(bidRequestData);
    const req_data = JSON.parse(request.data)[0].data;

    expect(req_data.eids).to.have.deep.members(USER_ID_DATA);
  });

  it('validate eids parameter, if userIdAsEids = undefined', function() {
    const bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'between',
      params: {
        w: 240,
        h: 400,
        s: 1112,
      },
      sizes: [[240, 400]],
      userIdAsEids: undefined
    }];

    const request = spec.buildRequests(bidRequestData);
    const req_data = JSON.parse(request.data)[0].data;

    expect(req_data.eids).to.have.deep.members([]);
  });

  it('validate click3rd param', function() {
    const bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'between',
      params: {
        w: 240,
        h: 400,
        s: 1112,
        click3rd: 'https://something.url',
      },
      sizes: [[240, 400]]
    }];

    const request = spec.buildRequests(bidRequestData);
    const req_data = JSON.parse(request.data)[0].data;

    expect(req_data.click3rd).to.equal('https://something.url');
  });
  it('validate pubdata param', function() {
    const bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'between',
      params: {
        w: 240,
        h: 400,
        s: 1112,
        pubdata: {
          param: '&test=tset'
        },
      },
      sizes: [[240, 400]]
    }];

    const request = spec.buildRequests(bidRequestData);
    const req_data = JSON.parse(request.data)[0].data;

    expect(req_data['pubside_macro[param]']).to.equal('%26test%3Dtset');
  });
  it('validate gdprConsent', function() {
    const bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'between',
      params: {
        w: 240,
        h: 400,
        s: 1112,
      },
      sizes: [[240, 400]]
    }];
    const bidderRequest = {
      gdprConsent: {
        consentString: 'BOtGbjbOtGbjbBQABBENC3-AAAAtR7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4u_1vf99yfm1-7etr3tp_87ues2_Xur__79__3z3_9pxP78k89r7337Ew_v-_v-b7JCON_IA',
        gdprApplies: true
      }
    }

    const request = spec.buildRequests(bidRequestData, bidderRequest);
    const req_data = JSON.parse(request.data)[0].data;

    expect(req_data.gdprApplies).to.equal(bidderRequest.gdprConsent.gdprApplies);
    expect(req_data.consentString).to.equal(bidderRequest.gdprConsent.consentString);
  });
  it('validate_response_params', function () {
    const serverResponse = {
      body: [{
        bidid: 'bid1234',
        cpm: 1.12,
        w: 240,
        h: 400,
        currency: 'USD',
        ad: 'Ad html'
      }]
    };
    const bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(1.12);
    expect(bid.currency).to.equal('USD');
    expect(bid.width).to.equal(240);
    expect(bid.height).to.equal(400);
    expect(bid.netRevenue).to.equal(true);
    expect(bid.requestId).to.equal('bid1234');
    expect(bid.ad).to.equal('Ad html');
  });
  it('validate_response_params', function () {
    const serverResponse = {
      body: [{
        bidid: 'bid1234',
        w: 240,
        h: 400,
        currency: 'USD',
        ad: 'Ad html'
      }]
    };
    const bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(0);
    expect(bid.currency).to.equal('USD');
    expect(bid.width).to.equal(240);
    expect(bid.height).to.equal(400);
    expect(bid.netRevenue).to.equal(true);
    expect(bid.requestId).to.equal('bid1234');
    expect(bid.ad).to.equal('Ad html');
  });

  it('validate_response_video_params', function () {
    const serverResponse = {
      body: [{
        mediaType: 2,
        vastXml: 'vastXml',
      }]
    };
    const bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.mediaType).to.equal(2);
    expect(bid.vastXml).to.equal('vastXml');
  });

  it('validate response params without currency', function () {
    const serverResponse = {
      body: [{
        bidid: 'bid1234',
        w: 240,
        h: 400,
        ad: 'Ad html'
      }]
    };
    const bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.currency).to.equal('USD');
  });
  it('check getUserSyncs', function() {
    const syncs = spec.getUserSyncs({}, {});
    expect(syncs).to.be.an('array').that.to.have.lengthOf(2);
    expect(syncs[0]).to.deep.equal({type: 'iframe', url: 'https://ads.betweendigital.com/sspmatch-iframe'});
    expect(syncs[1]).to.deep.equal({type: 'image', url: 'https://ads.betweendigital.com/sspmatch'});
  });

  it('check sizes', function() {
    const bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'between',
      mediaTypes: {
        banner: {
          sizes: [[970, 250], [240, 400], [728, 90]]
        }
      },
      params: {
        s: 1112,
      },
    }];

    const request = spec.buildRequests(bidRequestData);
    const req_data = JSON.parse(request.data)[0].data;

    expect(req_data.sizes).to.deep.equal(['970x250', '240x400', '728x90'])
  });

  it('check adomain', function() {
    const serverResponse = {
      body: [{
        bidid: 'bid1234',
        cpm: 1.12,
        w: 240,
        h: 400,
        currency: 'USD',
        ad: 'Ad html',
        adomain: ['domain1.com', 'domain2.com']
      }]
    };
    const bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.meta.advertiserDomains).to.deep.equal(['domain1.com', 'domain2.com']);
  });
  it('check server response without adomain', function() {
    const serverResponse = {
      body: [{
        bidid: 'bid1234',
        cpm: 1.12,
        w: 240,
        h: 400,
        currency: 'USD',
        ad: 'Ad html',
      }]
    };
    const bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.meta.advertiserDomains).to.deep.equal([]);
  });
});
