import { expect } from 'chai';
import * as utils from '../../../src/utils.js';
import { spec } from 'modules/nextMillenniumBidAdapter.js';

describe('nextMillenniumBidAdapterTests', function() {
  let bidRequestData = {
    bids: [
      {
        bidId: 'transaction_1234',
        bidder: 'nextMillennium',
        params: {
          placement_id: '12345'
        },
        sizes: [[300, 250]]
      }
    ]
  };

  it('validate_pub_params', function() {
    expect(
      spec.isBidRequestValid({
        bidder: 'nextMillennium',
        params: {
          placement_id: '12345'
        }
      })
    ).to.equal(true);
  });

  it('validate_generated_params', function() {
    let bidRequestData = [
      {
        bidId: 'bid1234',
        bidder: 'nextMillennium',
        params: { placement_id: '-1' },
        sizes: [[300, 250]]
      }
    ];
    let request = spec.buildRequests(bidRequestData);
    expect(request[0].bidId).to.equal('bid1234');
  });

  it('validate_response_params', function() {
    let serverResponse = {
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

    let bids = spec.interpretResponse(serverResponse, bidRequestData.bids[0]);
    expect(bids).to.have.lengthOf(1);
    let bid = bids[0];

    expect(bid.creativeId).to.equal('96846035');
    expect(bid.ad).to.equal('Hello! It\'s a test ad!');
    expect(bid.cpm).to.equal(0.5);
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.currency).to.equal('USD');
  });

  it('validate_response_params_with passback', function() {
    let serverResponse = {
      body: [
        {
          hash: '1e100887dd614b0909bf6c49ba7f69fdd1360437',
          content: 'Ad html passback',
          size: [300, 250],
          is_passback: 1
        }
      ]
    };
    let bids = spec.interpretResponse(serverResponse);

    expect(bids).to.have.lengthOf(0);
  });
});
