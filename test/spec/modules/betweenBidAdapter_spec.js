import { expect } from 'chai';
import { spec } from 'modules/betweenBidAdapter';

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
    let bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'between',
      params: {w: 240, h: 400, s: 1112},
      sizes: [[240, 400]]
    }]
    let request = spec.buildRequests(bidRequestData);
    let req_data = request[0].data;
    expect(req_data.bidid).to.equal('bid1234');
  });
  it('validate itu param', function() {
    let bidRequestData = [{
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

    let request = spec.buildRequests(bidRequestData);
    let req_data = request[0].data;

    expect(req_data.itu).to.equal('https://something.url');
  });
  it('validate cur param', function() {
    let bidRequestData = [{
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

    let request = spec.buildRequests(bidRequestData);
    let req_data = request[0].data;

    expect(req_data.cur).to.equal('THX');
  });
  it('validate subid param', function() {
    let bidRequestData = [{
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

    let request = spec.buildRequests(bidRequestData);
    let req_data = request[0].data;

    expect(req_data.subid).to.equal(1138);
  });
  it('validate click3rd param', function() {
    let bidRequestData = [{
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

    let request = spec.buildRequests(bidRequestData);
    let req_data = request[0].data;

    expect(req_data.click3rd).to.equal('https://something.url');
  });
  it('validate pubdata param', function() {
    let bidRequestData = [{
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

    let request = spec.buildRequests(bidRequestData);
    let req_data = request[0].data;

    expect(req_data['pubside_macro[param]']).to.equal('%26test%3Dtset');
  });
  it('validate gdprConsent', function() {
    let bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'between',
      params: {
        w: 240,
        h: 400,
        s: 1112,
      },
      sizes: [[240, 400]]
    }];
    let bidderRequest = {
      gdprConsent: {
        consentString: 'BOtGbjbOtGbjbBQABBENC3-AAAAtR7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4u_1vf99yfm1-7etr3tp_87ues2_Xur__79__3z3_9pxP78k89r7337Ew_v-_v-b7JCON_IA',
        gdprApplies: true
      }
    }

    let request = spec.buildRequests(bidRequestData, bidderRequest);
    let req_data = request[0].data;

    expect(req_data.gdprApplies).to.equal(bidderRequest.gdprConsent.gdprApplies);
    expect(req_data.consentString).to.equal(bidderRequest.gdprConsent.consentString);
  });
  it('validate_response_params', function () {
    let serverResponse = {
      body: [{
        bidid: 'bid1234',
        cpm: 1.12,
        w: 240,
        h: 400,
        currency: 'USD',
        ad: 'Ad html'
      }]
    };
    let bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);
    let bid = bids[0];
    expect(bid.cpm).to.equal(1.12);
    expect(bid.currency).to.equal('USD');
    expect(bid.width).to.equal(240);
    expect(bid.height).to.equal(400);
    expect(bid.netRevenue).to.equal(true);
    expect(bid.requestId).to.equal('bid1234');
    expect(bid.ad).to.equal('Ad html');
  });
  it('validate_response_params', function () {
    let serverResponse = {
      body: [{
        bidid: 'bid1234',
        w: 240,
        h: 400,
        currency: 'USD',
        ad: 'Ad html'
      }]
    };
    let bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);
    let bid = bids[0];
    expect(bid.cpm).to.equal(0);
    expect(bid.currency).to.equal('USD');
    expect(bid.width).to.equal(240);
    expect(bid.height).to.equal(400);
    expect(bid.netRevenue).to.equal(true);
    expect(bid.requestId).to.equal('bid1234');
    expect(bid.ad).to.equal('Ad html');
  });
  it('validate response params without currency', function () {
    let serverResponse = {
      body: [{
        bidid: 'bid1234',
        w: 240,
        h: 400,
        ad: 'Ad html'
      }]
    };
    let bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);
    let bid = bids[0];
    expect(bid.currency).to.equal('RUB');
  });
  it('check getUserSyncs', function() {
    const syncs = spec.getUserSyncs({}, {});
    expect(syncs).to.be.an('array').that.to.have.lengthOf(1);
    expect(syncs[0]).to.deep.equal({type: 'iframe', url: 'https://ads.betweendigital.com/sspmatch-iframe'});
  });
});
