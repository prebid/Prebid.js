import {spec} from 'modules/mocktioneerBidAdapter.js';

describe('mocktioneerBidAdapter', function () {
  it('passes numeric bid param and echoes in meta', function () {
    const adUnit = {
      adUnitCode: 'div-1',
      bidId: 'bid123',
      params: { endpoint: 'http://test', bid: 2.5 },
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      ortb2Imp: { banner: { w: 300, h: 250 } }
    };
    const bidderRequest = { bids: [adUnit], timeout: 1000, ortb2: { site: { page: 'https://example.com' } } };
    const req = spec.buildRequests([adUnit], bidderRequest);
    // ensure imp.ext.mocktioneer.bid is numeric
    const ortb = req.data;
    expect(ortb.imp[0].ext.mocktioneer.bid).to.equal(2.5);

    const response = {
      body: {
        id: 'r1', cur: 'USD', seatbid: [{bid: [{
          id: 'b1', impid: ortb.imp[0].id, price: 2.5, adm: '<html></html>', crid: 'c1', w: 300, h: 250, mtype: 1,
          adomain: ['example.com'], ext: {mocktioneer: {bid: 2.5}}
        }]}]
      }
    };
    const bids = spec.interpretResponse(response, req);
    expect(bids[0].meta.mocktioneer.bid).to.equal(2.5);
    expect(bids[0].cpm).to.equal(2.5);
  });
});

