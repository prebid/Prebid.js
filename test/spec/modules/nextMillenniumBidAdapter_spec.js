import { expect } from 'chai';
import { spec } from 'modules/nextMillenniumBidAdapter.js';

describe('nextMillenniumBidAdapterTests', function() {
  let bidRequestData = {
    bids: [
      {
        bidId: 'transaction_1234',
        bidder: 'nextMillennium',
        params: {
          placement_id: 12345
        },
        sizes: [[300, 250]]
      }
    ]
  };
  let request = [];

  it('validate_pub_params', function() {
    expect(
      spec.isBidRequestValid({
        bidder: 'nextMillennium',
        params: {
          placement_id: 12345
        }
      })
    ).to.equal(true);
  });

  it('validate_generated_params', function() {
    let bidRequestData = [
      {
        bidId: 'bid1234',
        bidder: 'nextMillennium',
        params: { placement_id: -1 },
        sizes: [[300, 250]]
      }
    ];
    let request = spec.buildRequests(bidRequestData);
    expect(request[0].bidId).to.equal('bid1234');
  });

  it('validate_getUserSyncs_function', function() {
    expect(spec.getUserSyncs({ iframeEnabled: true })).to.have.lengthOf(1);
    expect(spec.getUserSyncs({ iframeEnabled: false })).to.have.lengthOf(0);

    let pixel = spec.getUserSyncs({ iframeEnabled: true });
    expect(pixel[0].type).to.equal('iframe');
    expect(pixel[0].url).to.equal('https://brainlyads.com/hb/s2s/matching');
  });

  it('validate_response_params', function() {
    let serverResponse = {
      body: {
        cpm: 1.7,
        width: 300,
        height: 250,
        creativeId: 'p35t0enob6twbt9mofjc8e',
        ad: 'Hello! It\'s a test ad!'
      }
    };

    let bids = spec.interpretResponse(serverResponse, bidRequestData.bids[0]);
    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];

    expect(bid.creativeId).to.equal('p35t0enob6twbt9mofjc8e');
    expect(bid.ad).to.equal('Hello! It\'s a test ad!');
    expect(bid.cpm).to.equal(1.7);
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
