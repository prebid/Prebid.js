import {spec} from '../../../modules/zetaSspBidAdapter.js'

describe('Zeta Ssp Bid Adapter', function() {
  const eids = [
    {
      'source': 'example.com',
      'uids': [
        {
          'id': 'someId1',
          'atype': 1
        },
        {
          'id': 'someId2',
          'atype': 1
        },
        {
          'id': 'someId3',
          'atype': 2
        }
      ],
      'ext': {
        'foo': 'bar'
      }
    }
  ];

  const bannerRequest = [{
    bidId: 12345,
    auctionId: 67890,
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      }
    },
    refererInfo: {
      referer: 'zetaglobal.com'
    },
    params: {
      placement: 12345,
      user: {
        uid: 12345,
        buyeruid: 12345
      },
      tags: {
        someTag: 123,
        sid: 'publisherId'
      },
      test: 1
    },
    userIdAsEids: eids
  }];

  it('Test the bid validation function', function () {
    const validBid = spec.isBidRequestValid(bannerRequest[0]);
    const invalidBid = spec.isBidRequestValid(null);

    expect(validBid).to.be.true;
    expect(invalidBid).to.be.false;
  });

  it('Test provide eids', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);
    expect(payload.user.ext.eids).to.eql(eids);
  });

  it('Test the request processing function', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    expect(request).to.not.be.empty;

    const payload = request.data;
    expect(payload).to.not.be.empty;
  });

  const responseBody = {
    id: '12345',
    seatbid: [
      {
        bid: [
          {
            id: 'auctionId',
            impid: 'impId',
            price: 0.0,
            adm: 'adMarkup',
            crid: 'creativeId',
            adomain: [
              'https://example.com'
            ],
            h: 250,
            w: 300
          }
        ]
      }
    ],
    cur: 'USD'
  };

  it('Test the response parsing function', function () {
    const receivedBid = responseBody.seatbid[0].bid[0];
    const response = {};
    response.body = responseBody;

    const bidResponse = spec.interpretResponse(response, null);
    expect(bidResponse).to.not.be.empty;

    const bid = bidResponse[0];
    expect(bid).to.not.be.empty;
    expect(bid.ad).to.equal(receivedBid.adm);
    expect(bid.cpm).to.equal(receivedBid.price);
    expect(bid.height).to.equal(receivedBid.h);
    expect(bid.width).to.equal(receivedBid.w);
    expect(bid.requestId).to.equal(receivedBid.impid);
    expect(bid.meta.advertiserDomains).to.equal(receivedBid.adomain);
  });

  it('Different cases for user syncs', function () {
    const USER_SYNC_URL_IFRAME = 'https://ssp.disqus.com/sync?type=iframe';
    const USER_SYNC_URL_IMAGE = 'https://ssp.disqus.com/sync?type=image';

    const sync1 = spec.getUserSyncs({iframeEnabled: true})[0];
    expect(sync1.type).to.equal('iframe');
    expect(sync1.url).to.include(USER_SYNC_URL_IFRAME);

    const sync2 = spec.getUserSyncs({iframeEnabled: false})[0];
    expect(sync2.type).to.equal('image');
    expect(sync2.url).to.include(USER_SYNC_URL_IMAGE);

    const sync3 = spec.getUserSyncs({iframeEnabled: true}, {}, {gdprApplies: true})[0];
    expect(sync3.type).to.equal('iframe');
    expect(sync3.url).to.include(USER_SYNC_URL_IFRAME);
    expect(sync3.url).to.include('&gdpr=');

    const sync4 = spec.getUserSyncs({iframeEnabled: true}, {}, {gdprApplies: true}, 'test')[0];
    expect(sync4.type).to.equal('iframe');
    expect(sync4.url).to.include(USER_SYNC_URL_IFRAME);
    expect(sync4.url).to.include('&gdpr=');
    expect(sync4.url).to.include('&us_privacy=');
  });
});
