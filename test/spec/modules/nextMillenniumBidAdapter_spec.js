import { expect } from 'chai';
import { spec } from 'modules/nextMillenniumBidAdapter.js';

describe('nextMillenniumBidAdapterTests', function() {
  const bidRequestData = [
    {
      bidId: 'bid1234',
      auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      bidder: 'nextMillennium',
      params: { placement_id: '-1' },
      sizes: [[300, 250]],
      uspConsent: '1---',
      gdprConsent: {
        consentString: 'kjfdniwjnifwenrif3',
        gdprApplies: true
      }
    }
  ];

  it('Request params check with GDPR Consent', function () {
    const request = spec.buildRequests(bidRequestData, bidRequestData[0]);
    expect(JSON.parse(request[0].data).user.ext.consent).to.equal('kjfdniwjnifwenrif3');
    expect(JSON.parse(request[0].data).regs.ext.us_privacy).to.equal('1---');
    expect(JSON.parse(request[0].data).regs.ext.gdpr).to.equal(1);
  });

  it('validate_generated_params', function() {
    const request = spec.buildRequests(bidRequestData);
    expect(request[0].bidId).to.equal('bid1234');
    expect(JSON.parse(request[0].data).id).to.equal('b06c5141-fe8f-4cdf-9d7d-54415490a917');
  });

  it('validate_response_params', function() {
    const serverResponse = {
      body: {
        id: 'f7b3d2da-e762-410c-b069-424f92c4c4b2',
        seatbid: [
          {
            bid: [
              {
                id: '7457329903666272789',
                price: 0.5,
                adm: 'Hello! It\'s a test ad!',
                adid: '96846035',
                adomain: ['test.addomain.com'],
                w: 300,
                h: 250
              }
            ]
          }
        ],
        cur: 'USD'
      }
    };

    let bids = spec.interpretResponse(serverResponse, bidRequestData[0]);
    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];

    expect(bid.creativeId).to.equal('96846035');
    expect(bid.ad).to.equal('Hello! It\'s a test ad!');
    expect(bid.cpm).to.equal(0.5);
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.currency).to.equal('USD');
  });
});
