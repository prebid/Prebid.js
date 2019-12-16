import { expect } from 'chai';
import { spec } from 'modules/reklamstoreBidAdapter';

describe('reklamstoreBidAdapterTests', function() {
  let bidRequestData = {
    bids: [
      {
        bidder: 'reklamstore',
        params: {
          regionId: 532211
        },
        sizes: [[300, 250]]
      }
    ]
  };
  let request = [];

  it('validate_params', function() {
    expect(
      spec.isBidRequestValid({
        bidder: 'reklamstore',
        params: {
          regionId: 532211
        }
      })
    ).to.equal(true);
  });

  it('validate_generated_params', function() {
    let bidderRequest = {
      refererInfo: {
        referer: 'https://reklamstore.com'
      }
    };
    request = spec.buildRequests(bidRequestData.bids, bidderRequest);
    let req_data = request[0].data;

    expect(req_data.regionId).to.equal(532211);
  });

  const serverResponse = {
    body:
      {
        cpm: 1.2,
        ad: 'Ad html',
        w: 300,
        h: 250,
        syncs: [{
          type: 'image',
          url: 'https://link1'
        },
        {
          type: 'iframe',
          url: 'https://link2'
        }
        ]
      }
  };

  it('validate_response_params', function() {
    let bids = spec.interpretResponse(serverResponse, bidRequestData.bids[0]);
    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];
    expect(bid.ad).to.equal('Ad html');
    expect(bid.cpm).to.equal(1.2);
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.currency).to.equal('USD');
  });

  it('should return no syncs when pixel syncing is disabled', function () {
    const syncs = spec.getUserSyncs({ pixelEnabled: false }, [serverResponse]);
    expect(syncs).to.deep.equal([]);
  });

  it('should return user syncs', function () {
    const syncs = spec.getUserSyncs({pixelEnabled: true, iframeEnabled: true}, [serverResponse]);
    const expected = [
      { type: 'image', url: 'https://link1' },
      { type: 'iframe', url: 'https://link2' },
    ];
    expect(syncs).to.deep.equal(expected);
  });
});
