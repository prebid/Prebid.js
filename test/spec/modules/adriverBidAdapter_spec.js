import { expect } from 'chai';
import { spec } from 'modules/adriverBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as bidderFactory from 'src/adapters/bidderFactory.js';
import { auctionManager } from 'src/auctionManager.js';

const ENDPOINT = 'https://pb.adriver.ru/cgi-bin/bid.cgi';

describe('adriverAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      bidder: 'adriver',
      params: {
        placementId: '55:test_placement',
        siteid: 'testSiteID'
      },
      adUnitCode: 'adunit-code',
      sizes: [[300, 250], [300, 600], [300, 250]],
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
      userIdAsEids: [
        {
          source: 'id5-sync.com',
          uids: [
            {
              id: '',
              atype: 1,
              ext: {
                linkType: 0,
                abTestingControlGroup: true
              }
            }
          ]
        },
        {
          source: 'sharedid.org',
          uids: [
            {
              id: '01F4W41TMN7NBXBA0PXJMPB7GF',
              atype: 1,
              ext: {
                third: '01F4W41TMN7NBXBA0PXJMPB7GF'
              }
            }
          ]
        }
      ]
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    let getAdUnitsStub;
    const floor = 3;

    const bidRequests = [
      {
        bidder: 'adriver',
        params: {
          placementId: '55:test_placement',
          siteid: 'testSiteID',
          dealid: 'dealidTest'
        },
        adUnitCode: 'adunit-code',
        sizes: [[300, 250], [300, 600], [300, 250]],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        transactionId: '04f2659e-c005-4eb1-a57c-fa93145e3843',
        userId: {
          adrcid: 'testCookieValue',
        },
        userIdAsEids: [
          {
            source: 'id5-sync.com',
            uids: [
              {
                id: '',
                atype: 1,
                ext: {
                  linkType: 0,
                  abTestingControlGroup: true
                }
              }
            ]
          },
          {
            source: 'sharedid.org',
            uids: [
              {
                id: '01F4W41TMN7NBXBA0PXJMPB7GF',
                atype: 1,
                ext: {
                  third: '01F4W41TMN7NBXBA0PXJMPB7GF'
                }
              }
            ]
          }
        ]
      }
    ];

    const bidderRequest = {
      'bidderCode': 'adriver',
      'auctionId': '2cdbf766-c37e-464c-a924-d8cf2a2f7ed2',
      'bidderRequestId': '10415226a1f2ac',
      'bids': [
        {
          'bidder': 'adriver',
          'params': {
            'siteid': '216200',
            'bidfloor': 1.33,
            'placementId': 'test1'
          },
          'auctionId': '2cdbf766-c37e-464c-a924-d8cf2a2f7ed2',
          'floorData': {
            'skipped': false,
            'skipRate': 5,
            'modelVersion': 'BlackBerryZap',
            'location': 'setConfig'
          },
          'userId': {
            'id5id': {
              'uid': 'ID5-ZHMO7vyrzH4ggO1TVF8lZ31h77BjNP6pLgMwIrhvtw!ID5*wP-eG3RLeJjkl1O5yeOMcf3Ksrsq1OeqM5nQZLgPvOMAACaMv9QnPWzdhdbFYu3r',
              'ext': {
                'linkType': 2,
                'abTestingControlGroup': false
              }
            },
            'sharedid': {
              'id': '01F4W41TMN7NBXBA0PXJMPB7GF',
              'third': '01F4W41TMN7NBXBA0PXJMPB7GF'
            }
          },
          'userIdAsEids': [
            {
              'source': 'id5-sync.com',
              'uids': [
                {
                  'id': 'ID5-ZHMO7vyrzH4ggO1TVF8lZ31h77BjNP6pLgMwIrhvtw!ID5*wP-eG3RLeJjkl1O5yeOMcf3Ksrsq1OeqM5nQZLgPvOMAACaMv9QnPWzdhdbFYu3r',
                  'atype': 1,
                  'ext': {
                    'linkType': 2,
                    'abTestingControlGroup': false
                  }
                }
              ]
            },
            {
              'source': 'sharedid.org',
              'uids': [
                {
                  'id': '01F4W41TMN7NBXBA0PXJMPB7GF',
                  'atype': 1,
                  'ext': {
                    'third': '01F4W41TMN7NBXBA0PXJMPB7GF'
                  }
                }
              ]
            }
          ],
          'mediaTypes': {
            'banner': {
              'sizes': [
                [
                  300,
                  250
                ],
                [
                  600,
                  500
                ]
              ]
            }
          },
          'adUnitCode': 'div-gpt-ad-51545-0',
          'transactionId': '01dfccdf-70d0-461f-b284-9132877ebe02',
          'sizes': [
            [
              300,
              250
            ],
            [
              600,
              500
            ]
          ],
          'bidId': '2794d8415635b3',
          'bidderRequestId': '10415226a1f2ac',
          'src': 'client',
          'bidRequestsCount': 1,
          'bidderRequestsCount': 1,
          'bidderWinsCount': 0
        }
      ],
      'auctionStart': 1622465003758,
      'timeout': 1000,
      'refererInfo': {
        'referer': 'http://localhost:9999/integrationExamples/gpt/adUnitFloors.html',
        'reachedTop': true,
        'isAmp': false,
        'numIframes': 0,
        'stack': [
          'http://localhost:9999/integrationExamples/gpt/adUnitFloors.html'
        ],
        'canonicalUrl': null
      },
      'start': 1622465003762
    };

    let floorTestData = {
      'currency': 'USD',
      'floor': floor
    };

    bidRequests[0].getFloor = _ => {
      return floorTestData;
    };

    beforeEach(function() {
      getAdUnitsStub = sinon.stub(auctionManager, 'getAdUnits').callsFake(function() {
        return [];
      });
    });

    afterEach(function() {
      getAdUnitsStub.restore();
    });

    it('should exist currency', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);

      expect(payload.cur).to.exist;
    });

    it('should exist timeout', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.tmax).to.exist;
      expect(payload.tmax).to.equal(1000);
    });

    it('should exist at', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);

      expect(payload.at).to.exist;
      expect(payload.at).to.deep.equal(1);
    });

    it('should parse imp', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);

      expect(payload.imp[0]).to.exist;
      expect(payload.imp[0].id).to.deep.equal('55:test_placement');

      expect(payload.imp[0].ext).to.exist;
      expect(payload.imp[0].ext.query).to.deep.equal('bn=15&custom=111=' + '30b31c1838de1e');

      expect(payload.imp[0].banner).to.exist;
      expect(payload.imp[0].banner.w).to.deep.equal(300);
      expect(payload.imp[0].banner.h).to.deep.equal(250);
    });

    it('should parse pmp', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);

      expect(payload.imp[0].pmp).to.exist;

      expect(payload.imp[0].pmp.deals).to.exist;

      expect(payload.imp[0].pmp.deals[0].bidfloor).to.exist;
      expect(payload.imp[0].pmp.deals[0].bidfloor).to.deep.equal(3);

      expect(payload.imp[0].pmp.deals[0].bidfloorcur).to.exist;
      expect(payload.imp[0].pmp.deals[0].bidfloorcur).to.deep.equal('RUB');
    });

    const cookieValues = [
      { adrcid: 'adrcidValue' },
      { adrcid: undefined }
    ]
    cookieValues.forEach(cookieValue => describe('test cookie exist or not behavior', function () {
      let expectedValues = {
        adrcid: cookieValue.adrcid,
        at: '',
        cur: '',
        tmax: '',
        site: '',
        id: '',
        user: '',
        device: '',
        imp: ''
      }

      it('check adrcid if it exists', function () {
        bidRequests[0].userId.adrcid = cookieValue.adrcid;
        const payload = JSON.parse(spec.buildRequests(bidRequests).data);
        if (cookieValue.adrcid) {
          expect(Object.keys(payload)).to.have.members(Object.keys(expectedValues));
        } else {
          expect(payload.adrcid).to.equal(undefined);
        }
      });
    }));

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });
  });

  describe('interpretResponse', function () {
    let bfStub;
    before(function() {
      bfStub = sinon.stub(bidderFactory, 'getIabSubCategory');
    });

    after(function() {
      bfStub.restore();
    });

    let response = {
      'id': '221594457-1615288400-1-46-',
      'bidid': 'D8JW8XU8-L5m7qFMNQGs7i1gcuPvYMEDOKsktw6e9uLy5Eebo9HftVXb0VpKj4R2dXa93i6QmRhjextJVM4y1SqodMAh5vFOb_eVkHA',
      'seatbid': [{
        'bid': [{
          'id': '1',
          'impid': '/19968336/header-bid-tag-0',
          'price': 4.29,
          'h': 250,
          'w': 300,
          'adid': '7121351',
          'adomain': ['http://ikea.com'],
          'nurl': 'https://ad.adriver.ru/cgi-bin/erle.cgi?expid=D8JW8XU8-L5m7qFMNQGs7i1gcuPvYMEDOKsktw6e9uLy5Eebo9HftVXb0VpKj4R2dXa93i6QmRhjextJVM4y1SqodMAh5vFOb_eVkHA&bid=7121351&wprc=4.29&tuid=-1&custom=207=/19968336/header-bid-tag-0',
          'cid': '717570',
          'ext': '2c262a7058758d'
        }]
      }, {
        'bid': [{
          'id': '1',
          'impid': '/19968336/header-bid-tag-0',
          'price': 17.67,
          'h': 600,
          'w': 300,
          'adid': '7121369',
          'adomain': ['http://ikea.com'],
          'nurl': 'https://ad.adriver.ru/cgi-bin/erle.cgi?expid=DdtToXX5cpTaMMxrJSEsOsUIXt3WmC3jOvuNI5DguDrY8edFG60Jg1M-iMkVNKQ4OiAdHSLPJLQQXMUXZfI9VbjMoGCb-zzOTPiMpshI&bid=7121369&wprc=17.67&tuid=-1&custom=207=/19968336/header-bid-tag-0',
          'cid': '717570',
          'ext': '2c262a7058758d'
        }]
      }],
      'cur': 'RUB'
    };

    it('should get correct bid response', function () {
      let expectedResponse = [
        {
          requestId: '2c262a7058758d',
          cpm: 4.29,
          width: 300,
          height: 250,
          creativeId: '/19968336/header-bid-tag-0',
          currency: 'RUB',
          netRevenue: true,
          ttl: 3000,
          meta: {
            advertiserDomains: ['http://ikea.com']
          },
          ad: '<IFRAME SRC="https://ad.adriver.ru/cgi-bin/erle.cgi?expid=D8JW8XU8-L5m7qFMNQGs7i1gcuPvYMEDOKsktw6e9uLy5Eebo9HftVXb0VpKj4R2dXa93i6QmRhjextJVM4y1SqodMAh5vFOb_eVkHA&bid=7121351&wprc=4.29&tuid=-1&custom=207=/19968336/header-bid-tag-0" FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true" STYLE ="WIDTH:300px; HEIGHT:250px"></IFRAME>'
        }
      ];
      let bidderRequest = {
        bids: [{
          bidId: '3db3773286ee59',
          adUnitCode: 'code'
        }]
      };
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', function () {
      let response = {
        'version': '0.0.1',
        'tags': [{
          'uuid': '84ab500420319d',
          'tag_id': 5976557,
          'auction_id': '297492697822162468',
          'nobid': true
        }]
      };
      let bidderRequest;

      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(result.length).to.equal(0);
    });
  });

  describe('function _getFloor', function () {
    let bidRequests = [
      {
        bidder: 'adriver',
        params: {
          placementId: '55:test_placement',
          siteid: 'testSiteID',
          dealid: 'dealidTest',
        },
        adUnitCode: 'adunit-code',
        sizes: [[300, 250], [300, 600], [300, 250]],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        transactionId: '04f2659e-c005-4eb1-a57c-fa93145e3843',
        userId: {
          adrcid: 'testCookieValue',
        },
        userIdAsEids: [
          {
            source: 'id5-sync.com',
            uids: [
              {
                id: '',
                atype: 1,
                ext: {
                  linkType: 0,
                  abTestingControlGroup: true
                }
              }
            ]
          },
          {
            source: 'sharedid.org',
            uids: [
              {
                id: '01F4W41TMN7NBXBA0PXJMPB7GF',
                atype: 1,
                ext: {
                  third: '01F4W41TMN7NBXBA0PXJMPB7GF'
                }
              }
            ]
          }
        ]
      }
    ];

    const floorTestData = {
      'currency': 'RUB',
      'floor': 1.50
    };

    const bitRequestStandard = JSON.parse(JSON.stringify(bidRequests));

    bitRequestStandard[0].getFloor = () => {
      return floorTestData;
    };

    it('valid BidRequests', function () {
      const request = spec.buildRequests(bitRequestStandard);
      const payload = JSON.parse(request.data);

      expect(typeof bitRequestStandard[0].getFloor).to.equal('function');
      expect(payload.imp[0].bidfloor).to.equal(1.50);
      expect(payload.imp[0].bidfloorcur).to.equal('RUB');
    });

    const bitRequestEmptyCurrency = JSON.parse(JSON.stringify(bidRequests));

    const floorTestDataEmptyCurrency = {
      'currency': 'RUB',
      'floor': 1.50
    };

    bitRequestEmptyCurrency[0].getFloor = () => {
      return floorTestDataEmptyCurrency;
    };

    it('empty currency', function () {
      const request = spec.buildRequests(bitRequestEmptyCurrency);
      const payload = JSON.parse(request.data);

      expect(payload.imp[0].bidfloor).to.equal(1.50);
      expect(payload.imp[0].bidfloorcur).to.equal('RUB');
    });

    const bitRequestFloorNull = JSON.parse(JSON.stringify(bidRequests));

    const floorTestDataFloorNull = {
      'currency': '',
      'floor': null
    };

    bitRequestFloorNull[0].getFloor = () => {
      return floorTestDataFloorNull;
    };

    it('empty floor', function () {
      const request = spec.buildRequests(bitRequestFloorNull);
      const payload = JSON.parse(request.data);

      expect(payload.imp[0].bidfloor).to.equal(0);
    });

    const bitRequestGetFloorNotFunction = JSON.parse(JSON.stringify(bidRequests));

    bitRequestGetFloorNotFunction[0].getFloor = 0;

    it('bid.getFloor is not a function', function () {
      const request = spec.buildRequests(bitRequestGetFloorNotFunction);
      const payload = JSON.parse(request.data);

      expect(payload.imp[0].bidfloor).to.equal(0);
      expect(payload.imp[0].bidfloorcur).to.equal('RUB');
    });

    const bitRequestGetFloorBySized = JSON.parse(JSON.stringify(bidRequests));

    bitRequestGetFloorBySized[0].getFloor = (requestParams = {currency: 'USD', mediaType: '*', size: '*'}) => {
      if (requestParams.size.length === 2 && requestParams.size[0] === 300 && requestParams.size[1] === 250) {
        return {
          'currency': 'RUB',
          'floor': 3.33
        }
      } else {
        return {}
      }
    };

    it('bid.getFloor get size', function () {
      const request = spec.buildRequests(bitRequestGetFloorBySized);
      const payload = JSON.parse(request.data);

      expect(payload.imp[0].bidfloor).to.equal(3.33);
      expect(payload.imp[0].bidfloorcur).to.equal('RUB');
      expect(payload.imp[0].bidfloorcur).to.equal('RUB');
    });
  });

  describe('user ids', function () {
    let bidRequests = [
      {
        bidder: 'adriver',
        params: {
          placementId: '55:test_placement',
          siteid: 'testSiteID',
          dealid: 'dealidTest',
        },
        adUnitCode: 'adunit-code',
        sizes: [[300, 250], [300, 600], [300, 250]],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        transactionId: '04f2659e-c005-4eb1-a57c-fa93145e3843',
        userId: {
          adrcid: 'testCookieValue',
        },
        userIdAsEids: [
          {
            source: 'id5-sync.com',
            uids: [
              {
                id: '',
                atype: 1,
                ext: {
                  linkType: 0,
                  abTestingControlGroup: true
                }
              }
            ]
          },
          {
            source: 'sharedid.org',
            uids: [
              {
                id: '01F4W41TMN7NBXBA0PXJMPB7GF',
                atype: 1,
                ext: {
                  third: '01F4W41TMN7NBXBA0PXJMPB7GF'
                }
              }
            ]
          }
        ]
      }
    ];

    it('user id id5-sync.com', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);

      expect(payload.user.ext.eids[0].source).to.equal('id5-sync.com');
      expect(payload.user.ext.eids[0].uids[0].id).to.equal('');
    });

    it('user id sharedid.org', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);

      expect(payload.user.ext.eids[1].source).to.equal('sharedid.org');
      expect(payload.user.ext.eids[1].uids[0].id).to.equal('01F4W41TMN7NBXBA0PXJMPB7GF');
    });
  });
});
