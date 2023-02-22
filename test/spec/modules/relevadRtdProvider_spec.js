import { addRtdData, getBidRequestData, relevadSubmodule, serverData } from 'modules/relevadRtdProvider.js';
import { server } from 'test/mocks/xhr.js';
import {config} from 'src/config.js';
import { deepClone, deepAccess, deepSetValue } from '../../../src/utils.js';

const responseHeader = {'Content-Type': 'application/json'};

const moduleConfigCommon = {
  'dryrun': true,
  params: {
    setgpt: true,
    minscore: 50,
    partnerid: 12345,
    bidders: [{ bidder: 'appnexus' },
      { bidder: 'rubicon', },
      { bidder: 'smart', },
      { bidder: 'ix', },
      { bidder: 'proxistore', },
      { bidder: 'other' }]
  }
};

const reqBidsCommon = {
  'timeout': 10000,
  'adUnitCodes': ['/19968336/header-bid-tag-0'],
  'ortb2Fragments': {
    'global': {
      'site': {
        'page': 'http://www.localhost.localdomain:8888/integrationExamples/gpt/relevadRtdProvider_example.html?pbjs_debug=true',
        'domain': 'localhost.localdomain:8888',
        'publisher': {
          'domain': 'localhost.localdomain:8888'
        }
      },
      'device': {
        'w': 355,
        'h': 682,
        'dnt': 0,
        'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'language': 'en'
      }
    },
    'bidder': {}
  }
};

const adUnitsCommon = [
  {
    'code': '/19968336/header-bid-tag-0',
    'mediaTypes': {
      'banner': { 'sizes': [[728, 90]] }
    },
    'bids': [
      {
        'bidder': 'appnexus',
        'params': { 'placementId': '13144370' }
      },
      { bidder: 'other' },
      { bidder: 'rubicon', 'params': { id: 1 } },
      { bidder: 'smart', },
      { bidder: 'ix', },
      { bidder: 'proxistore', }
    ]
  }
];

describe('relevadRtdProvider', function() {
  describe('relevadSubmodule', function() {
    it('successfully instantiates', function () {
		      expect(relevadSubmodule.init()).to.equal(true);
    });
  });

  describe('Add segments and categories test 1', function() {
    it('adds contextual categories and segments', function() {
      let moduleConfig = { ...deepClone(moduleConfigCommon) };
      let reqBids = {
        ...deepClone(reqBidsCommon),
        'adUnits': deepClone(adUnitsCommon),
      };

      let data = {
        segments: ['segment1', 'segment2'],
        cats: { 'category3': 100 },
      };

      (config.getConfig('ix') || {}).firstPartyData = null;
      addRtdData(reqBids, data, moduleConfig, () => {});
      expect(reqBids.adUnits[0].bids[0].params.keywords).to.have.deep.property('relevad_rtd', ['segment1', 'segment2', 'category3']);
      expect(reqBids.adUnits[0].bids[1].ortb2.site.ext.data).to.have.deep.property('relevad_rtd', ['category3']);
      expect(reqBids.adUnits[0].bids[1].ortb2.user.ext.data).to.have.deep.property('relevad_rtd', ['segment1', 'segment2']);
      expect(reqBids.adUnits[0].bids[3].params).to.have.deep.property('target', 'relevad_rtd=segment1;relevad_rtd=segment2;relevad_rtd=category3');
      expect(reqBids.adUnits[0].bids[5].ortb2.user.ext.data).to.have.deep.property('segments', ['segment1', 'segment2']);
      expect(reqBids.adUnits[0].bids[5].ortb2.user.ext.data).to.have.deep.property('contextual_categories', ['category3']);
      expect(reqBids.ortb2Fragments.bidder.rubicon.user.ext.data).to.have.deep.property('relevad_rtd', ['segment1', 'segment2']);
      expect(config.getConfig('ix.firstPartyData')).to.have.deep.property('relevad_rtd', ['segment1', 'segment2', 'category3']);
    });
  });

  describe('Add segments and categories test 2 to one bidder out of many', function() {
    it('adds contextual categories and segments', function() {
      let moduleConfig = { ...deepClone(moduleConfigCommon) };
      let reqBids = {
        ...deepClone(reqBidsCommon),
        'adUnits': deepClone(adUnitsCommon),
      };

      let data = {
        segments: ['segment1', 'segment2'],
        cats: { 'category3': 100 },
        wl: { 'appnexus': { 'placementId': '13144370' } },
      };

      (config.getConfig('ix') || {}).firstPartyData = null;
      addRtdData(reqBids, data, moduleConfig, () => { });
      expect(reqBids.adUnits[0].bids[0].params.keywords).to.have.deep.property('relevad_rtd', ['segment1', 'segment2', 'category3']);
      expect(reqBids.adUnits[0].bids[1].ortb2?.site?.ext?.data || {}).to.not.have.property('relevad_rtd');
      expect(reqBids.adUnits[0].bids[1].ortb2?.user?.ext?.data || {}).to.not.have.property('relevad_rtd');
      expect(reqBids.adUnits[0].bids[3].params || {}).to.not.have.deep.property('target', 'relevad_rtd=segment1;relevad_rtd=segment2;relevad_rtd=category3');
      expect(reqBids.adUnits[0].bids[5].ortb2?.user?.ext?.data || {}).to.not.have.deep.property('segments', ['segment1', 'segment2']);
      expect(reqBids.adUnits[0].bids[5].ortb2?.user?.ext?.data || {}).to.not.have.deep.property('contextual_categories', ['category3']);
      expect(reqBids.adUnits[0].bids[5].ortb2?.user?.ext?.data || {}).to.not.have.deep.property('contextual_categories', {'0': 'category3'});
      expect(reqBids.ortb2Fragments?.bidder?.rubicon?.user?.ext?.data || {}).to.not.have.deep.property('relevad_rtd', ['segment1', 'segment2']);
      expect(config.getConfig('ix.firstPartyData') || {}).to.not.have.deep.property('relevad_rtd', ['segment1', 'segment2', 'category3']);
    });
  });

  describe('Add segments and categories test 4', function() {
    it('adds contextual categories and segments', function() {
      let moduleConfig = {
        'dryrun': true,
        params: {
          setgpt: true,
          minscore: 50,
          partnerid: 12345,
        }
      };

      let reqBids = {
        'timeout': 10000,
        'adUnits': deepClone(adUnitsCommon),
        'adUnitCodes': [ '/19968336/header-bid-tag-0' ],
        'ortb2Fragments': {
          'global': {
            'site': {
              'page': 'http://www.localhost.localdomain:8888/integrationExamples/gpt/relevadRtdProvider_example.html?pbjs_debug=true',
              'domain': 'localhost.localdomain:8888',
              'publisher': {
                'domain': 'localhost.localdomain:8888'
              }
            },
            'device': {
              'w': 355,
              'h': 682,
              'dnt': 0,
              'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
              'language': 'en'
            }
          },
          'bidder': {}
        },
        'metrics': {},
        'defer': { 'promise': {} }
      }

      let data = {
        segments: ['segment1', 'segment2'],
        cats: {'category3': 100}
      };
      (config.getConfig('ix') || {}).firstPartyData = null;
      addRtdData(reqBids, data, moduleConfig, () => {});
      expect(reqBids.adUnits[0].bids[0].params.keywords).to.have.deep.property('relevad_rtd', ['segment1', 'segment2', 'category3']);
    });
  });

  describe('Get Segments And Categories', function() {
    it('gets data from async request and adds contextual categories and segments', function() {
      const moduleConfig = {
        params: {
          'dryrun': true,
          sdtgpt: false,
          minscore: 50,
          bidders: [{ bidder: 'appnexus' },
            { bidder: 'other' }]
        }
      };

      let reqBidsConfigObj = {
        adUnits: [{
          bids: [{
            bidder: 'appnexus',
            params: {
              placementId: 13144370
            }
          }, {
            bidder: 'other'
          }]
        }]
      };

      let data = {
        segments: ['segment1', 'segment2'],
        cats: {'category3': 100}
      };

      getBidRequestData(reqBidsConfigObj, () => {}, moduleConfig, {});

      let request = server.requests[0];
      request.respond(200, responseHeader, JSON.stringify(data));

      expect(reqBidsConfigObj.adUnits[0].bids[0].params.keywords).to.have.deep.property('relevad_rtd', ['segment1', 'segment2', 'category3']);
      expect(reqBidsConfigObj.adUnits[0].bids[1].ortb2.site.ext.data).to.have.deep.property('relevad_rtd', ['category3']);
      expect(reqBidsConfigObj.adUnits[0].bids[1].ortb2.user.ext.data).to.have.deep.property('relevad_rtd', ['segment1', 'segment2']);
    });
  });
});

describe('Process auction end data', function() {
  it('Collects bid data on auction end event', function() {
    const auctionEndData = {
      'auctionDetails': {
        'auctionId': 'f7ec9895-5809-475e-8fef-49cbc221921a',
        'auctionStatus': 'completed',
        'adUnits': [
          {
            'code': '/19968336/header-bid-tag-0',
            'mediaTypes': {
              'banner': { 'sizes': [ [ 728, 90 ] ] }
            },
            'bids': [
              {
                'bidder': 'appnexus',
                'params': {
                  'placementId': '13144370',
                  'keywords': {
                    'relevad_rtd': [ 'IAB410-391', 'IAB63-53' ]
                  }
                }
              }
            ],
            'ortb2Imp': { 'ext': { 'data': { 'relevad_rtd': [ 'IAB410-391', 'IAB63-53' ] }, } },
            'sizes': [ [ 728, 90 ] ],
          }
        ],
        'adUnitCodes': [ '/19968336/header-bid-tag-0' ],
        'bidderRequests': [
          {
            'bidderCode': 'appnexus',
            'auctionId': 'f7ec9895-5809-475e-8fef-49cbc221921a',
            'bidderRequestId': '1d917281b2bf6c',
            'bids': [
              {
                'bidder': 'appnexus',
                'params': {
                  'placementId': '13144370',
                  'keywords': {
                    'relevad_rtd': [
                      'IAB410-391',
                      'IAB63-53'
                    ]
                  }
                },
                'ortb2Imp': {
                  'ext': { 'data': { 'relevad_rtd': [ 'IAB410-391', 'IAB63-53' ] }, }
                },
                'mediaTypes': { 'banner': { 'sizes': [ [ 728, 90 ] ] } },
                'adUnitCode': '/19968336/header-bid-tag-0',
                'sizes': [ [ 728, 90 ] ],
                'bidId': '20f0b347b07f94',
                'bidderRequestId': '1d917281b2bf6c',
                'auctionId': 'f7ec9895-5809-475e-8fef-49cbc221921a',
                'src': 'client',
                'bidRequestsCount': 1,
                'bidderRequestsCount': 1,
                'bidderWinsCount': 0,
                'ortb2': {
                  'site': {
                    'page': 'http://www.localhost.localdomain:8888/integrationExamples/gpt/relevadRtdProvider_example.html',
                    'domain': 'localhost.localdomain:8888',
                    'publisher': { 'domain': 'localhost.localdomain:8888' },
                    'cat': [ 'IAB410-391', 'IAB63-53' ],
                    'pagecat': [ 'IAB410-391', 'IAB63-53' ],
                    'sectioncat': [ 'IAB410-391', 'IAB63-53' ]
                  },
                  'device': {
                    'w': 326,
                    'h': 649,
                    'dnt': 0,
                    'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
                    'language': 'en'
                  }
                }
              }
            ],
            'timeout': 10000,
            'refererInfo': {
              'reachedTop': true,
              'isAmp': false,
              'numIframes': 0,
              'stack': [
                'http://www.localhost.localdomain:8888/integrationExamples/gpt/relevadRtdProvider_example.html'
              ],
              'topmostLocation': 'http://www.localhost.localdomain:8888/integrationExamples/gpt/relevadRtdProvider_example.html',
              'location': 'http://www.localhost.localdomain:8888/integrationExamples/gpt/relevadRtdProvider_example.html',
              'canonicalUrl': null,
              'page': 'http://www.localhost.localdomain:8888/integrationExamples/gpt/relevadRtdProvider_example.html',
              'domain': 'www.localhost.localdomain:8888',
              'ref': null,
              'legacy': {
                'reachedTop': true,
                'isAmp': false,
                'numIframes': 0,
                'stack': [ 'http://www.localhost.localdomain:8888/integrationExamples/gpt/relevadRtdProvider_example.html' ],
                'referer': 'http://www.localhost.localdomain:8888/integrationExamples/gpt/relevadRtdProvider_example.html',
                'canonicalUrl': null
              }
            },
            'ortb2': {
              'site': {
                'page': 'http://www.localhost.localdomain:8888/integrationExamples/gpt/relevadRtdProvider_example.html',
                'domain': 'localhost.localdomain:8888',
                'publisher': { 'domain': 'localhost.localdomain:8888' },
                'cat': [ 'IAB410-391', 'IAB63-53' ],
                'pagecat': [ 'IAB410-391', 'IAB63-53' ],
                'sectioncat': [ 'IAB410-391', 'IAB63-53' ]
              },
              'device': {
                'w': 326,
                'h': 649,
                'dnt': 0,
                'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
                'language': 'en'
              }
            },
            'start': 1674132848498
          }
        ],
        'noBids': [],
        'bidsReceived': [
          {
            'bidderCode': 'appnexus',
            'width': 728,
            'height': 90,
            'statusMessage': 'Bid available',
            'adId': '3222e6ead116f3',
            'requestId': '20f0b347b07f94',
            'transactionId': 'df8586ac-6476-4fbf-a727-eda99996dc39',
            'auctionId': 'f7ec9895-5809-475e-8fef-49cbc221921a',
            'mediaType': 'banner',
            'source': 'client',
            'cpm': 1.5,
            'creativeId': 98493734,
            'currency': 'USD',
            'netRevenue': true,
            'ttl': 300,
            'adUnitCode': '/19968336/header-bid-tag-0',
            'adapterCode': 'appnexus',
            'originalCpm': 1.5,
            'originalCurrency': 'USD',
            'responseTimestamp': 1674132848649,
            'requestTimestamp': 1674132848498,
            'bidder': 'appnexus',
            'size': '728x90',
          }
        ],
      },
      'config': {
        'name': 'RelevadRTDModule',
        'waitForIt': true,
        'dryrun': true,
        'params': {
          'partnerid': 12345,
          'setgpt': true
        }
      },
      'userConsent': { 'gdpr': null, 'usp': null, 'gpp': null, 'coppa': false }
    };

    let auctionDetails = auctionEndData['auctionDetails'];
    let userConsent = auctionEndData['userConsent'];
    let moduleConfig = auctionEndData['config'];

    relevadSubmodule.onAuctionEndEvent(auctionDetails, moduleConfig, userConsent);
    expect(serverData.clientdata).to.deep.equal(
      {
        'event': 'bids',
        'adunits': [
          {
            'code': '/19968336/header-bid-tag-0',
            'bids': [
              {
                'bidder': 'appnexus',
                'cpm': 1.5,
                'currency': 'USD',
                'type': 'banner',
                'ttr': undefined,
                'dealId': undefined,
                'size': '728x90'
              }
            ]
          }
        ],
        'reledata': { segments: ['segment1', 'segment2'], cats: { 'category3': 100 }, },
        'gdpra': '',
        'gdprc': '',
        'aid': '',
        'cid': '12345',
        'pid': '',
      }
    );
  });
});
