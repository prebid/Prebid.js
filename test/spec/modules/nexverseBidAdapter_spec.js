import { expect } from 'chai';
import { spec } from 'modules/nexverseBidAdapter.js';

describe('nexverseBidAdapter', function () {
  const bid = {
    bidder: 'nexverse',
    params: {
      uid: '12345',
      pub_id: '67890',
      pub_epid: 'abcdef',
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]],
      },
    },
  };

  it('should validate bid request', function () {
    expect(spec.isBidRequestValid(bid)).to.equal(true);
  });

  it('should build requests', function () {
    const bidderRequest = { refererInfo: { page: 'https://example.com' } };
    const request = spec.buildRequests([bid], bidderRequest);
    expect(request[0].url).to.exist;
    expect(request[0].method).to.equal('POST');
    expect(request[0].data).to.be.a('string');
  });

  it('should interpret the response', function () {
    const serverResponse = {
      body: {
        seatbid: [
          {
            bid: [
              {
                impid: '1',
                price: 1.5,
                w: 300,
                h: 250,
                adm: '<html>Ad</html>',
                crid: '123abc',
                adomain: ['example.com'],
              },
            ],
          },
        ],
      },
    };
    const request = spec.interpretResponse(serverResponse);
    expect(request).to.be.an('array').that.is.not.empty;
    expect(request[0].cpm).to.equal(1.5);
  });
});
