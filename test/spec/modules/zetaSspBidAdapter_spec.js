import {spec} from '../../../modules/zetaSspBidAdapter.js'

describe('Zeta Ssp Bid Adapter', function () {
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
      referer: 'http://www.zetaglobal.com/page?param=value'
    },
    gdprConsent: {
      gdprApplies: 1,
      consentString: 'consentString'
    },
    params: {
      placement: 111,
      user: {
        uid: 222,
        buyeruid: 333
      },
      tags: {
        someTag: 444,
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

  it('Test page and domain in site', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);
    expect(payload.site.page).to.eql('http://www.zetaglobal.com/page?param=value');
    expect(payload.site.domain).to.eql(window.location.origin); // config.js -> DEFAULT_PUBLISHER_DOMAIN
  });

  it('Test the request processing function', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    expect(request).to.not.be.empty;

    const payload = request.data;
    expect(payload).to.not.be.empty;
  });

  it('Test the response parsing function', function () {
    const response = {
      body: {
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
              },
              {
                id: 'auctionId2',
                impid: 'impId2',
                price: 0.1,
                adm: 'adMarkup2',
                crid: 'creativeId2',
                adomain: [
                  'https://example2.com'
                ],
                h: 150,
                w: 200
              }
            ]
          }
        ],
        cur: 'USD'
      }
    };

    const bidResponse = spec.interpretResponse(response, null);
    expect(bidResponse).to.not.be.empty;

    const bid1 = bidResponse[0];
    const receivedBid1 = response.body.seatbid[0].bid[0];
    expect(bid1).to.not.be.empty;
    expect(bid1.ad).to.equal(receivedBid1.adm);
    expect(bid1.cpm).to.equal(receivedBid1.price);
    expect(bid1.height).to.equal(receivedBid1.h);
    expect(bid1.width).to.equal(receivedBid1.w);
    expect(bid1.requestId).to.equal(receivedBid1.impid);
    expect(bid1.meta.advertiserDomains).to.equal(receivedBid1.adomain);

    const bid2 = bidResponse[1];
    const receivedBid2 = response.body.seatbid[0].bid[1];
    expect(bid2).to.not.be.empty;
    expect(bid2.ad).to.equal(receivedBid2.adm);
    expect(bid2.cpm).to.equal(receivedBid2.price);
    expect(bid2.height).to.equal(receivedBid2.h);
    expect(bid2.width).to.equal(receivedBid2.w);
    expect(bid2.requestId).to.equal(receivedBid2.impid);
    expect(bid2.meta.advertiserDomains).to.equal(receivedBid2.adomain);
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

  it('Test do not override user object', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const payload = JSON.parse(request.data);
    expect(payload.user.uid).to.eql(222);
    expect(payload.user.buyeruid).to.eql(333);
    expect(payload.user.ext.consent).to.eql('consentString');
  });
});
