import liAnalytics from '../../../modules/liveintentAnalyticsAdapter';
import { expect } from 'chai';

let args = {
  auctionId: '99abbc81-c1f1-41cd-8f25-f7149244c897',
  timestamp: 1660915379703,
  auctionEnd: 1660915381635,
  adUnits: [
    {
      code: 'ID_Bot100AdJ1',
      mediaTypes: {
        banner: {
          sizes: [
            [
              300,
              250
            ],
            [
              320,
              50
            ]
          ]
        }
      },
      ortb2Imp: {
        ext: {
          data: {
            adserver: {
              name: 'gam',
              adslot: '/777/test/home/ID_Bot100AdJ1'
            },
            pbadslot: '/777/test/home/ID_Bot100AdJ1'
          },
          gpid: '/777/test/home/ID_Bot100AdJ1'
        }
      },
      bids: [
        {
          bidder: 'testBidder',
          params: {
            siteId: 321218,
            zoneId: 1732558,
            position: 'bug',
            accountId: 10777
          },
          userIdAsEids: [
            {
              source: 'source1.com',
              uids: [
                {
                  id: 'ID5*yO-L9xRugTx4mkIJ9z99eYva6CZQhz8B70QOkLLSEEQWowsxvVQqMaZOt4qpBTYAFqR3y6ZtZ8qLJJBAsRqnRRalTfy8iZszQavAAkZcAjkWpxp6DnOSkF3R5LafC10OFqhwcxH699dDc_fI6RVEGBasN6zrJwgqCGelgfQLtQwWrikWRyi0l3ICFj9JUiVGFrCF8SAFaqJD9A0_I07a8xa0-jADtEj1T8w30oX--sMWvTK_I5_3zA5f3z0OMoxbFsCMFdhfGRDuw5GrpI475g',
                  atype: 1,
                  ext: {
                    linkType: 2
                  }
                }
              ]
            },
            {
              source: 'source2.com',
              uids: [
                {
                  id: 'ID5*yO-L9xRugTx4mkIJ9z99eYva6CZQhz8B70QOkLLSEEQWowsxvVQqMaZOt4qpBTYAFqR3y6ZtZ8qLJJBAsRqnRRalTfy8iZszQavAAkZcAjkWpxp6DnOSkF3R5LafC10OFqhwcxH699dDc_fI6RVEGBasN6zrJwgqCGelgfQLtQwWrikWRyi0l3ICFj9JUiVGFrCF8SAFaqJD9A0_I07a8xa0-jADtEj1T8w30oX--sMWvTK_I5_3zA5f3z0OMoxbFsCMFdhfGRDuw5GrpI475g',
                  atype: 1,
                  ext: {
                    linkType: 2
                  }
                }
              ]
            }
          ]
        },
        {
          bidder: 'testBidder2',
          params: {
            adSlot: '2926251',
            publisherId: '159423'
          },
          userIdAsEids: [
            {
              source: 'source1.com',
              uids: [
                {
                  id: 'ID5*yO-L9xRugTx4mkIJ9z99eYva6CZQhz8B70QOkLLSEEQWowsxvVQqMaZOt4qpBTYAFqR3y6ZtZ8qLJJBAsRqnRRalTfy8iZszQavAAkZcAjkWpxp6DnOSkF3R5LafC10OFqhwcxH699dDc_fI6RVEGBasN6zrJwgqCGelgfQLtQwWrikWRyi0l3ICFj9JUiVGFrCF8SAFaqJD9A0_I07a8xa0-jADtEj1T8w30oX--sMWvTK_I5_3zA5f3z0OMoxbFsCMFdhfGRDuw5GrpI475g',
                  atype: 1,
                  ext: {
                    linkType: 2
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  bidderRequests: [
    {
      auctionStart: 1660915379703
    },
    {
      auctionStart: 1660915379703
    }
  ],
  bidsReceived: [
    {
      adUnitCode: 'ID_Bot100AdJ1',
      timeToRespond: 824,
      cpm: 0.447,
      currency: 'USD',
      ttl: 300,
      bidder: 'testBidder'
    }
  ],
  winningBids: []
}

let winningBids = [
  {
    adUnitCode: 'ID_Bot100AdJ1',
    timeToRespond: 824,
    cpm: 0.447,
    currency: 'USD',
    ttl: 300,
    bidder: 'testBidder'
  }
];

describe('LiveIntent Analytics Adapter ', () => {
  it('extract sizes', function () {
    let expectedResult = [{
      w: 100,
      h: 50
    }];
    let banner = {
      sizes: [
        [100, 50]
      ]
    };
    expect(liAnalytics.getBannerSizes(banner)).to.deep.equal(expectedResult);
  });

  it('creates analytics event from args and winning bids', () => {
    let expectedResult = {
      instanceId: '77abbc81-c1f1-41cd-8f25-f7149244c800',
      url: 'https://test.com/',
      bidsReceived: [
        {
          adUnitCode: 'ID_Bot100AdJ1',
          timeToRespond: 824,
          cpm: 0.447,
          currency: 'USD',
          ttl: 300,
          bidder: 'testBidder'
        }
      ],
      auctionStart: 1660915379703,
      auctionEnd: 1660915381635,
      adUnits: [
        {
          code: 'ID_Bot100AdJ1',
          mediaType: 'banner',
          sizes: [
            {
              w: 300,
              h: 250
            },
            {
              w: 320,
              h: 50
            }
          ],
          ortb2Imp: {
            gpid: '/777/test/home/ID_Bot100AdJ1',
            ext: {
              data: {
                aupName: '/777/test/home/ID_Bot100AdJ1',
                adserver: {
                  name: 'gam',
                  adslot: '/777/test/home/ID_Bot100AdJ1'
                },
                pbadslot: '/777/test/home/ID_Bot100AdJ1'
              },
              gpid: '/777/test/home/ID_Bot100AdJ1'
            }
          }
        }
      ],
      winningBids: [
        {
          adUnitCode: 'ID_Bot100AdJ1',
          timeToRespond: 824,
          cpm: 0.447,
          currency: 'USD',
          ttl: 300,
          bidder: 'testBidder'
        }
      ],
      auctionId: '99abbc81-c1f1-41cd-8f25-f7149244c897',
      userIds: [
        {
          source: 'source1.com',
          uids: [
            {
              id: 'ID5*yO-L9xRugTx4mkIJ9z99eYva6CZQhz8B70QOkLLSEEQWowsxvVQqMaZOt4qpBTYAFqR3y6ZtZ8qLJJBAsRqnRRalTfy8iZszQavAAkZcAjkWpxp6DnOSkF3R5LafC10OFqhwcxH699dDc_fI6RVEGBasN6zrJwgqCGelgfQLtQwWrikWRyi0l3ICFj9JUiVGFrCF8SAFaqJD9A0_I07a8xa0-jADtEj1T8w30oX--sMWvTK_I5_3zA5f3z0OMoxbFsCMFdhfGRDuw5GrpI475g',
              atype: 1,
              ext: {
                linkType: 2
              }
            }
          ]
        },
        {
          source: 'source2.com',
          uids: [
            {
              id: 'ID5*yO-L9xRugTx4mkIJ9z99eYva6CZQhz8B70QOkLLSEEQWowsxvVQqMaZOt4qpBTYAFqR3y6ZtZ8qLJJBAsRqnRRalTfy8iZszQavAAkZcAjkWpxp6DnOSkF3R5LafC10OFqhwcxH699dDc_fI6RVEGBasN6zrJwgqCGelgfQLtQwWrikWRyi0l3ICFj9JUiVGFrCF8SAFaqJD9A0_I07a8xa0-jADtEj1T8w30oX--sMWvTK_I5_3zA5f3z0OMoxbFsCMFdhfGRDuw5GrpI475g',
              atype: 1,
              ext: {
                linkType: 2
              }
            }
          ]
        }
      ],
      bidders: [
        {
          bidder: 'testBidder',
          params: {
            siteId: 321218,
            zoneId: 1732558,
            position: 'bug',
            accountId: 10777
          }
        },
        {
          bidder: 'testBidder2',
          params: {
            adSlot: '2926251',
            publisherId: '159423'
          }
        }
      ]
    };
    expect(liAnalytics.createAnalyticsEvent(args, winningBids)).to.deep.equal(expectedResult);
  });
});
