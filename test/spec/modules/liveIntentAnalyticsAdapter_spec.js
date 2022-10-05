import liAnalytics from 'modules/liveIntentAnalyticsAdapter';
import { expect } from 'chai';
import { server } from 'test/mocks/xhr.js';
import { auctionManager } from 'src/auctionManager.js';

let utils = require('src/utils');
let refererDetection = require('src/refererDetection');
let instanceId = '77abbc81-c1f1-41cd-8f25-f7149244c800';
let url = 'https://www.test.com'
let sandbox;
let clock;
let now = new Date();

let events = require('src/events');
let constants = require('src/constants.json');
let auctionId = '99abbc81-c1f1-41cd-8f25-f7149244c897'

const config = {
  provider: 'liveintent',
  options: {
    bidWonTimeout: 2000,
    sampling: 1
  }
}

let args = {
  auctionId: auctionId,
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
      bidderCode: 'tripl_ss1',
      auctionId: '8e5a5eda-a7dc-49a3-bc7f-654fc',
      bidderRequestId: '953fe1ee8a1645',
      uniquePbsTid: '0da1f980-8351-415d-860d-ebbdb4274179',
      auctionStart: 1660915379703
    },
    {
      bidderCode: 'tripl_ss2',
      auctionId: '8e5a5eda-a7dc-49a3-bc7f-6ca682ae893c',
      bidderRequestId: '953fe1ee8a164e',
      uniquePbsTid: '0da1f980-8351-415d-860d-ebbdb4274180',
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

let expectedEvent = {
  instanceId: instanceId,
  url: url,
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
  auctionId: auctionId,
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

describe('LiveIntent Analytics Adapter ', () => {
  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(events, 'getEvents').returns([]);
    clock = sandbox.useFakeTimers(now.getTime());
  });
  afterEach(function () {
    liAnalytics.disableAnalytics();
    sandbox.restore();
    clock.restore();
  });

  it('request is computed and sent correctly', () => {
    liAnalytics.enableAnalytics(config);
    sandbox.stub(utils, 'generateUUID').returns(instanceId);
    sandbox.stub(refererDetection, 'getRefererInfo').returns({page: url});
    sandbox.stub(auctionManager.index, 'getAuction').withArgs(auctionId).returns({ getWinningBids: () => winningBids });
    events.emit(constants.EVENTS.AUCTION_END, args);
    clock.tick(2000);
    expect(server.requests.length).to.equal(1);

    let requestBody = JSON.parse(server.requests[0].requestBody);
    expect(requestBody).to.deep.equal(expectedEvent);
  });

  it('track is called', () => {
    liAnalytics.enableAnalytics(config);
    sandbox.stub(liAnalytics, 'track');
    events.emit(constants.EVENTS.AUCTION_END, args);
    events.emit(constants.EVENTS.AUCTION_END, args);
    events.emit(constants.EVENTS.AUCTION_END, args);
    clock.tick(6000);
    sinon.assert.callCount(liAnalytics.track, 3)
  })
});
