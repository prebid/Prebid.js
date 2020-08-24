import { expect } from 'chai';
import { spec, getWidthAndHeightFromVideoObject, playerSizeIsNestedArray, defaultSize } from 'modules/ozoneBidAdapter.js';
import { config } from 'src/config.js';
import {Renderer} from '../../../src/Renderer.js';
import {getGranularityKeyName, getGranularityObject} from '../../../modules/ozoneBidAdapter.js';
import * as utils from '../../../src/utils.js';
const OZONEURI = 'https://elb.the-ozone-project.com/openrtb2/auction';
const BIDDER_CODE = 'ozone';
/*

NOTE - use firefox console to deep copy the objects to use here

 */
var originalPropertyBag = {'lotameWasOverridden': 0, 'pageId': null};
var validBidRequests = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];
var validBidRequestsMulti = [
  {
    testId: 1,
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  },
  {
    testId: 2,
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff0',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c0',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];
var validBidRequestsWithUserIdData = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87',
    userId: {'pubcid': '12345678', 'id5id': 'ID5-someId', 'criteortus': {'ozone': {'userid': 'critId123'}}, 'idl_env': 'liverampId', 'lipb': {'lipbid': 'lipbidId123'}, 'parrableId': {eid: 'parrableid123'}}
  }
];
var validBidRequestsMinimal = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    params: { publisherId: '9876abcd12-3', placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];
var validBidRequestsNoSizes = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];

var validBidRequestsWithBannerMediaType = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    mediaTypes: {banner: {sizes: [[300, 250], [300, 600]]}},
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];
var validBidRequestsWithNonBannerMediaTypesAndValidOutstreamVideo = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, video: {skippable: true, playback_method: ['auto_play_sound_off'], targetDiv: 'some-different-div-id-to-my-adunitcode'} } ] },
    mediaTypes: {video: {mimes: ['video/mp4'], 'context': 'outstream', 'sizes': [640, 480], playerSize: [640, 480]}, native: {info: 'dummy data'}},
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];

var validBidRequests1OutstreamVideo2020 = [
  {
    'bidder': 'ozone',
    'testname': 'validBidRequests1OutstreamVideo2020',
    'params': {
      'publisherId': 'OZONERUP0001',
      'placementId': '8000000009',
      'siteId': '4204204201',
      'video': {
        'skippable': true,
        'playback_method': [
          'auto_play_sound_off'
        ]
      },
      'customData': [
        {
          'settings': {},
          'targeting': {
            'sens': 'f',
            'pt1': '/uk',
            'pt2': 'uk',
            'pt3': 'network-front',
            'pt4': 'ng',
            'pt5': [
              'uk'
            ],
            'pt7': 'desktop',
            'pt8': [
              'tfmqxwj7q',
              'penl4dfdk',
              'sek9ghqwi'
            ],
            'pt9': '|k0xw2vqzp33kklb3j5w4|||'
          }
        }
      ],
      'lotameData': {
        'Profile': {
          'tpid': '4e5c21fc7c181c2b1eb3a73d543a27f6',
          'pid': '3a45fd4872fa01f35c49586d8dcb7c60',
          'Audiences': {
            'Audience': [
              {
                'id': '439847',
                'abbr': 'all'
              },
              {
                'id': '446197',
                'abbr': 'Arts, Culture & Literature'
              },
              {
                'id': '446198',
                'abbr': 'Business'
              }
            ]
          }
        }
      }
    },
    'userId': {
      'pubcid': '2ada6ae6-aeca-4e07-8922-a99b3aaf8a56'
    },
    'userIdAsEids': [
      {
        'source': 'pubcid.org',
        'uids': [
          {
            'id': '2ada6ae6-aeca-4e07-8922-a99b3aaf8a56',
            'atype': 1
          }
        ]
      }
    ],
    'mediaTypes': {
      'video': {
        'playerSize': [
          [
            640,
            480
          ]
        ],
        'mimes': [
          'video/mp4'
        ],
        'context': 'outstream'
      }
    },
    'adUnitCode': 'video-ad',
    'transactionId': '02c1ea7d-0bf2-451b-a122-1420040d1cf8',
    'sizes': [
      [
        640,
        480
      ]
    ],
    'bidId': '2899ec066a91ff8',
    'bidderRequestId': '1c1586b27a1b5c8',
    'auctionId': '0456c9b7-5ab2-4fec-9e10-f418d3d1f04c',
    'src': 'client',
    'bidRequestsCount': 1,
    'bidderRequestsCount': 1,
    'bidderWinsCount': 0
  }
];

// WHEN sent as bidderRequest to buildRequests you should send the child: .bidderRequest
var validBidderRequest1OutstreamVideo2020 = {
  bidderRequest: {
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    auctionStart: 1536838908986,
    bidderCode: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    bids: [
      {
        'bidder': 'ozone',
        'params': {
          'publisherId': 'OZONERUP0001',
          'placementId': '8000000009',
          'siteId': '4204204201',
          'video': {
            'skippable': true,
            'playback_method': [
              'auto_play_sound_off'
            ]
          },
          'customData': [
            {
              'settings': {},
              'targeting': {
                'sens': 'f',
                'pt1': '/uk',
                'pt2': 'uk',
                'pt3': 'network-front',
                'pt4': 'ng',
                'pt5': [
                  'uk'
                ],
                'pt7': 'desktop',
                'pt8': [
                  'tfmqxwj7q',
                  'penl4dfdk',
                  'uayf5jmv3',
                  'sek9ghqwi'
                ],
                'pt9': '|k0xw2vqzp33kklb3j5w4|||'
              }
            }
          ],
          'lotameData': {
            'Profile': {
              'tpid': '4e5c21fc7c181c2b1eb3a73d543a27f6',
              'pid': '3a45fd4872fa01f35c49586d8dcb7c60',
              'Audiences': {
                'Audience': [
                  {
                    'id': '439847',
                    'abbr': 'all'
                  },
                  {
                    'id': '446197',
                    'abbr': 'Arts, Culture & Literature'
                  },
                  {
                    'id': '446198',
                    'abbr': 'Business'
                  }
                ]
              }
            }
          }
        },
        'userId': {
          'id5id': 'ID5-ZHMOpSv9CkZNiNd1oR4zc62AzCgSS73fPjmQ6Od7OA',
          'pubcid': '2ada6ae6-aeca-4e07-8922-a99b3aaf8a56'
        },
        'userIdAsEids': [
          {
            'source': 'id5-sync.com',
            'uids': [
              {
                'id': 'ID5-ZHMOpSv9CkZNiNd1oR4zc62AzCgSS73fPjmQ6Od7OA',
                'atype': 1
              }
            ]
          },
          {
            'source': 'pubcid.org',
            'uids': [
              {
                'id': '2ada6ae6-aeca-4e07-8922-a99b3aaf8a56',
                'atype': 1
              }
            ]
          }
        ],
        'mediaTypes': {
          'video': {
            'playerSize': [
              [
                640,
                480
              ]
            ],
            'mimes': [
              'video/mp4'
            ],
            'context': 'outstream'
          }
        },
        'adUnitCode': 'video-ad',
        'transactionId': 'ec20cc65-de38-4410-b5b3-50de5b7df66a',
        'sizes': [
          [
            640,
            480
          ]
        ],
        'bidId': '2899ec066a91ff8',
        'bidderRequestId': '1c1586b27a1b5c8',
        'auctionId': '0456c9b7-5ab2-4fec-9e10-f418d3d1f04c',
        'src': 'client',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 1,
        'bidderWinsCount': 0
      }],
    doneCbCallCount: 1,
    start: 1536838908987,
    timeout: 3000
  }
};
// WHEN sent as bidderRequest to buildRequests you should send the child: .bidderRequest
var validBidderRequest = {
  bidderRequest: {
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    auctionStart: 1536838908986,
    bidderCode: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    bids: [{
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
      bidId: '2899ec066a91ff8',
      bidRequestsCount: 1,
      bidder: 'ozone',
      bidderRequestId: '1c1586b27a1b5c8',
      crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
      params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { banner: { topframe: 1, w: 300, h: 250, format: [{ w: 300, h: 250 }, { w: 300, h: 600 }] }, id: '2899ec066a91ff8', secure: 1, tagid: 'undefined' } ] },
      sizes: [[300, 250], [300, 600]],
      transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
    }],
    doneCbCallCount: 1,
    start: 1536838908987,
    timeout: 3000
  }
};

// bidder request with GDPR - change the values for testing:
// gdprConsent.gdprApplies (true/false)
// gdprConsent.vendorData.purposeConsents (make empty, make null, remove it)
// gdprConsent.vendorData.vendorConsents (remove 524, remove all, make the element null, remove it)
// WHEN sent as bidderRequest to buildRequests you should send the child: .bidderRequest
var bidderRequestWithFullGdpr = {
  bidderRequest: {
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    auctionStart: 1536838908986,
    bidderCode: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    bids: [{
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
      bidId: '2899ec066a91ff8',
      bidRequestsCount: 1,
      bidder: 'ozone',
      bidderRequestId: '1c1586b27a1b5c8',
      crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
      params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { banner: { topframe: 1, w: 300, h: 250, format: [{ w: 300, h: 250 }, { w: 300, h: 600 }] }, id: '2899ec066a91ff8', secure: 1, tagid: 'undefined' } ] },
      sizes: [[300, 250], [300, 600]],
      transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
    }],
    doneCbCallCount: 1,
    start: 1536838908987,
    timeout: 3000,
    gdprConsent: {
      'consentString': 'BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA',
      'vendorData': {
        'metadata': 'BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA',
        'gdprApplies': true,
        'hasGlobalScope': false,
        'cookieVersion': '1',
        'created': '2019-05-31T12:46:48.825',
        'lastUpdated': '2019-05-31T12:46:48.825',
        'cmpId': '28',
        'cmpVersion': '1',
        'consentLanguage': 'en',
        'consentScreen': '1',
        'vendorListVersion': 148,
        'maxVendorId': 631,
        'purposeConsents': {
          '1': true,
          '2': true,
          '3': true,
          '4': true,
          '5': true
        },
        'vendorConsents': {
          '468': true,
          '522': true,
          '524': true, /* 524 is ozone */
          '565': true,
          '591': true
        }
      },
      'gdprApplies': true
    }, }
};

var gdpr1 = {
  'consentString': 'BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA',
  'vendorData': {
    'metadata': 'BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA',
    'gdprApplies': true,
    'hasGlobalScope': false,
    'cookieVersion': '1',
    'created': '2019-05-31T12:46:48.825',
    'lastUpdated': '2019-05-31T12:46:48.825',
    'cmpId': '28',
    'cmpVersion': '1',
    'consentLanguage': 'en',
    'consentScreen': '1',
    'vendorListVersion': 148,
    'maxVendorId': 631,
    'purposeConsents': {
      '1': true,
      '2': true,
      '3': true,
      '4': true,
      '5': true
    },
    'vendorConsents': {
      '468': true,
      '522': true,
      '524': true, /* 524 is ozone */
      '565': true,
      '591': true
    }
  },
  'gdprApplies': true
};

// simulating the Mirror
var bidderRequestWithPartialGdpr = {
  bidderRequest: {
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    auctionStart: 1536838908986,
    bidderCode: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    bids: [{
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
      bidId: '2899ec066a91ff8',
      bidRequestsCount: 1,
      bidder: 'ozone',
      bidderRequestId: '1c1586b27a1b5c8',
      crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
      params: {
        publisherId: '9876abcd12-3',
        customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}],
        lotameData: {
          'Profile': {
            'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4',
            'Audiences': {
              'Audience': [{'id': '99999', 'abbr': 'sports'}, {
                'id': '88888',
                'abbr': 'movie'
              }, {'id': '77777', 'abbr': 'blogger'}]
            }
          }
        },
        placementId: '1310000099',
        siteId: '1234567890',
        id: 'fea37168-78f1-4a23-a40e-88437a99377e',
        auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
        imp: [{
          banner: {topframe: 1, w: 300, h: 250, format: [{w: 300, h: 250}, {w: 300, h: 600}]},
          id: '2899ec066a91ff8',
          secure: 1,
          tagid: 'undefined'
        }]
      },
      sizes: [[300, 250], [300, 600]],
      transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
    }],
    doneCbCallCount: 1,
    start: 1536838908987,
    timeout: 3000,
    gdprConsent: {
      'consentString': 'BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA',
      'gdprApplies': true,
      'vendorData': {
        'metadata': 'BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA',
        'gdprApplies': true
      }
    }
  }
};

// make sure the impid matches the request bidId
var validResponse = {
  'body': {
    'id': 'd6198807-7a53-4141-b2db-d2cb754d68ba',
    'seatbid': [
      {
        'bid': [
          {
            'id': '677903815252395017',
            'impid': '2899ec066a91ff8',
            'price': 0.5,
            'adm': '<script src="https://fra1-ib.adnxs.com/ab?e=wqT_3QLXB6DXAwAAAwDWAAUBCNDh6dwFENjt4vTs9Y6bWhjxtI3siuOTmREqNgkAAAECCOA_EQEHNAAA4D8ZAAAAgOtR4D8hERIAKREJADERG6gwsqKiBjjtSEDtSEgCUI3J-y5YnPFbYABotc95eMuOBYABAYoBA1VTRJIBAQbwUpgBrAKgAdgEqAEBsAEAuAECwAEDyAEC0AEA2AEA4AEA8AEAigI7dWYoJ2EnLCAyNTI5ODg1LCAxNTM2ODQ4MDgwKTt1ZigncicsIDk4NDkzNTgxNh4A8JySAv0BIWJ6YWpPQWl1c0s0S0VJM0oteTRZQUNDYzhWc3dBRGdBUUFSSTdVaFFzcUtpQmxnQVlQX19fXzhQYUFCd0FYZ0JnQUVCaUFFQmtBRUJtQUVCb0FFQnFBRURzQUVBdVFFcGk0aURBQURnUDhFQktZdUlnd0FBNERfSkFUMDR0TTFxYXZFXzJRRUFBQUFBQUFEd1AtQUJBUFVCBQ8oSmdDQUtBQ0FMVUMFEARMMAkI8FBNQUNBY2dDQWRBQ0FkZ0NBZUFDQU9nQ0FQZ0NBSUFEQVpBREFKZ0RBYWdEcnJDdUNyb0RDVVpTUVRFNk16WTROT0FER2cuLpoCPSFLQXVvRkE2AAFwblBGYklBUW9BRG9KUmxKQk1Ub3pOamcwUUJwSkENAfBAOEQ4LsICL2h0dHA6Ly9wcmViaWQub3JnL2Rldi1kb2NzL2dldHRpbmctc3RhcnRlZC5odG1s2AIA4AKtmEjqAiINOthkZW1vLnRoZS1vem9uZS1wcm9qZWN0LmNvbS_yAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDLhYAIExFQUZfTkFNRQEdCB4KGjIzAPCHTEFTVF9NT0RJRklFRBIAgAMAiAMBkAMAmAMUoAMBqgMAwAOsAsgDANgDAOADAOgDAPgDA4AEAJIECS9vcGVucnRiMpgEAKIECTEyNy4wLjAuMagEALIEDAgAEAAYACAAMAA4ALgEAMAEAMgEANIEDjkzMjUjRlJBMTozNjg02gQCCAHgBADwBEHvIIgFAZgFAKAF_xEBsAGqBSRkNjE5ODgwNy03YTUzLTQxNDEtYjJkYi1kMmNiNzU0ZDY4YmHABQDJBWlQFPA_0gUJCQkMpAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYAmAYAuAYAwQYAAAAAAAAAAMgGAA..&s=ab84b182eef7d9b4e58c74fe8987705c25ed803c&referrer=http%3A%2F%2Fdemo.the-ozone-project.com%2F&pp=${AUCTION_PRICE}"></script>',
            'adid': '98493581',
            'adomain': [
              'http://prebid.org'
            ],
            'iurl': 'https://fra1-ib.adnxs.com/cr?id=98493581',
            'cid': '9325',
            'crid': '98493581',
            'cat': [
              'IAB3-1'
            ],
            'w': 300,
            'h': 600,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'appnexus': {
                  'brand_id': 555545,
                  'auction_id': 6500448734132353000,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            }
          }
        ],
        'seat': 'appnexus'
      }
    ],
    'cur': 'GBP', /* NOTE - this is where cur is, not in the seatbids. */
    'ext': {
      'responsetimemillis': {
        'appnexus': 47,
        'openx': 30
      }
    },
    'timing': {
      'start': 1536848078.089177,
      'end': 1536848078.142203,
      'TimeTaken': 0.05302619934082031
    }
  },
  'headers': {}
};

var validResponse2Bids = {
  'body': {
    'id': 'd6198807-7a53-4141-b2db-d2cb754d68ba',
    'seatbid': [
      {
        'bid': [
          {
            'id': '677903815252395017',
            'impid': '2899ec066a91ff8',
            'price': 0.5,
            'adm': '<script src="https://fra1-ib.adnxs.com/ab?e=wqT_3QLXB6DXAwAAAwDWAAUBCNDh6dwFENjt4vTs9Y6bWhjxtI3siuOTmREqNgkAAAECCOA_EQEHNAAA4D8ZAAAAgOtR4D8hERIAKREJADERG6gwsqKiBjjtSEDtSEgCUI3J-y5YnPFbYABotc95eMuOBYABAYoBA1VTRJIBAQbwUpgBrAKgAdgEqAEBsAEAuAECwAEDyAEC0AEA2AEA4AEA8AEAigI7dWYoJ2EnLCAyNTI5ODg1LCAxNTM2ODQ4MDgwKTt1ZigncicsIDk4NDkzNTgxNh4A8JySAv0BIWJ6YWpPQWl1c0s0S0VJM0oteTRZQUNDYzhWc3dBRGdBUUFSSTdVaFFzcUtpQmxnQVlQX19fXzhQYUFCd0FYZ0JnQUVCaUFFQmtBRUJtQUVCb0FFQnFBRURzQUVBdVFFcGk0aURBQURnUDhFQktZdUlnd0FBNERfSkFUMDR0TTFxYXZFXzJRRUFBQUFBQUFEd1AtQUJBUFVCBQ8oSmdDQUtBQ0FMVUMFEARMMAkI8FBNQUNBY2dDQWRBQ0FkZ0NBZUFDQU9nQ0FQZ0NBSUFEQVpBREFKZ0RBYWdEcnJDdUNyb0RDVVpTUVRFNk16WTROT0FER2cuLpoCPSFLQXVvRkE2AAFwblBGYklBUW9BRG9KUmxKQk1Ub3pOamcwUUJwSkENAfBAOEQ4LsICL2h0dHA6Ly9wcmViaWQub3JnL2Rldi1kb2NzL2dldHRpbmctc3RhcnRlZC5odG1s2AIA4AKtmEjqAiINOthkZW1vLnRoZS1vem9uZS1wcm9qZWN0LmNvbS_yAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDLhYAIExFQUZfTkFNRQEdCB4KGjIzAPCHTEFTVF9NT0RJRklFRBIAgAMAiAMBkAMAmAMUoAMBqgMAwAOsAsgDANgDAOADAOgDAPgDA4AEAJIECS9vcGVucnRiMpgEAKIECTEyNy4wLjAuMagEALIEDAgAEAAYACAAMAA4ALgEAMAEAMgEANIEDjkzMjUjRlJBMTozNjg02gQCCAHgBADwBEHvIIgFAZgFAKAF_xEBsAGqBSRkNjE5ODgwNy03YTUzLTQxNDEtYjJkYi1kMmNiNzU0ZDY4YmHABQDJBWlQFPA_0gUJCQkMpAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYAmAYAuAYAwQYAAAAAAAAAAMgGAA..&s=ab84b182eef7d9b4e58c74fe8987705c25ed803c&referrer=http%3A%2F%2Fdemo.the-ozone-project.com%2F&pp=${AUCTION_PRICE}"></script>',
            'adid': '98493581',
            'adomain': [
              'http://prebid.org'
            ],
            'iurl': 'https://fra1-ib.adnxs.com/cr?id=98493581',
            'cid': '9325',
            'crid': '98493581',
            'cat': [
              'IAB3-1'
            ],
            'w': 300,
            'h': 600,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'appnexus': {
                  'brand_id': 555545,
                  'auction_id': 6500448734132353000,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            }
          },
          {
            'id': '677903815252395010',
            'impid': '2899ec066a91ff0',
            'price': 0.9,
            'adm': '<script src="test"></script>',
            'adid': '98493580',
            'adomain': [
              'http://prebid.org'
            ],
            'iurl': 'https://fra1-ib.adnxs.com/cr?id=98493581',
            'cid': '9320',
            'crid': '98493580',
            'cat': [
              'IAB3-1'
            ],
            'w': 300,
            'h': 600,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'appnexus': {
                  'brand_id': 555540,
                  'auction_id': 6500448734132353000,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            }
          } ],
        'seat': 'appnexus'
      }
    ],
    'cur': 'GBP', /* NOTE - this is where cur is, not in the seatbids. */
    'ext': {
      'responsetimemillis': {
        'appnexus': 47,
        'openx': 30
      }
    },
    'timing': {
      'start': 1536848078.089177,
      'end': 1536848078.142203,
      'TimeTaken': 0.05302619934082031
    }
  },
  'headers': {}
};
/*
A bidder returns a bid for both sizes in an adunit
 */
var validResponse2BidsSameAdunit = {
  'body': {
    'id': 'd6198807-7a53-4141-b2db-d2cb754d68ba',
    'seatbid': [
      {
        'bid': [
          {
            'id': '677903815252395017',
            'impid': '2899ec066a91ff8',
            'price': 0.5,
            'adm': '<script src="src-1"></script>',
            'adid': '98493581',
            'adomain': [
              'http://prebid.org'
            ],
            'iurl': 'https://fra1-ib.adnxs.com/cr?id=98493581',
            'cid': '9325',
            'crid': '98493581',
            'cat': [
              'IAB3-1'
            ],
            'w': 300,
            'h': 600,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'appnexus': {
                  'brand_id': 555545,
                  'auction_id': 6500448734132353000,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            }
          },
          {
            'id': '677903815252395010',
            'impid': '2899ec066a91ff8',
            'price': 0.9,
            'adm': '<script src="src-2"></script>',
            'adid': '98493580',
            'adomain': [
              'http://prebid.org'
            ],
            'iurl': 'https://fra1-ib.adnxs.com/cr?id=98493581',
            'cid': '9320',
            'crid': '98493580',
            'cat': [
              'IAB3-1'
            ],
            'w': 300,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'appnexus': {
                  'brand_id': 555540,
                  'auction_id': 6500448734132353000,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            }
          } ],
        'seat': 'ozappnexus'
      }
    ],
    'cur': 'GBP', /* NOTE - this is where cur is, not in the seatbids. */
    'ext': {
      'responsetimemillis': {
        'appnexus': 47,
        'openx': 30
      }
    },
    'timing': {
      'start': 1536848078.089177,
      'end': 1536848078.142203,
      'TimeTaken': 0.05302619934082031
    }
  },
  'headers': {}
};
/*

SPECIAL CONSIDERATION FOR VIDEO TESTS:

DO NOT USE _validVideoResponse directly - the interpretResponse function will modify it (adding a renderer!!!) so all
subsequent calls will already have a renderer attached!!!

*/
function getCleanValidVideoResponse() {
  return JSON.parse(JSON.stringify(_validVideoResponse));
}
var _validVideoResponse = {
  'body': {
    'id': 'd6198807-7a53-4141-b2db-d2cb754d68ba',
    'seatbid': [
      {
        'bid': [
          {
            'id': '2899ec066a91ff8',
            'impid': '2899ec066a91ff8',
            'price': 31.7,
            'adm': '<VAST ...></VAST>',
            'adomain': [
              'sarr.properties'
            ],
            'crid': 'ozone-655',
            'cat': [
              'IAB21'
            ],
            'w': 640,
            'h': 360,
            'ext': {
              'prebid': {
                'type': 'video'
              }
            },
            'adId': '2899ec066a91ff8-2',
            'cpm': 31.7,
            'bidId': '2899ec066a91ff8',
            'requestId': '2899ec066a91ff8',
            'width': 640,
            'height': 360,
            'ad': '<VAST  ...></VAST>',
            'netRevenue': true,
            'creativeId': 'ozone-655',
            'currency': 'USD',
            'ttl': 300,
            'adserverTargeting': {
              'oz_ozbeeswax': 'ozbeeswax',
              'oz_ozbeeswax_pb': '31.7',
              'oz_ozbeeswax_crid': 'ozone-655',
              'oz_ozbeeswax_adv': 'sarr.properties',
              'oz_ozbeeswax_imp_id': '49d16ccc28663a8',
              'oz_ozbeeswax_adId': '49d16ccc28663a8-2',
              'oz_ozbeeswax_pb_r': '20.00',
              'oz_ozbeeswax_omp': '1',
              'oz_ozbeeswax_vid': 'outstream',
              'oz_auc_id': 'efa7fea0-7e87-4811-be86-fefb38c35fbb',
              'oz_winner': 'ozbeeswax',
              'oz_response_id': 'efa7fea0-7e87-4811-be86-fefb38c35fbb',
              'oz_winner_auc_id': '49d16ccc28663a8',
              'oz_winner_imp_id': '49d16ccc28663a8',
              'oz_pb_v': '2.4.0',
              'hb_bidder': 'ozone',
              'hb_adid': '49d16ccc28663a8-2',
              'hb_pb': '20.00',
              'hb_size': '640x360',
              'hb_source': 'client',
              'hb_format': 'banner'
            },
            'originalCpm': 31.7,
            'originalCurrency': 'USD'
          }
        ],
        'seat': 'ozbeeswax'
      }
    ],
    'ext': {
      'responsetimemillis': {
        'beeswax': 9,
        'openx': 43,
        'ozappnexus': 31,
        'ozbeeswax': 7
      }
    },
    'timing': {
      'start': 1536848078.089177,
      'end': 1536848078.142203,
      'TimeTaken': 0.05302619934082031
    }
  },
  'headers': {}
};

var validBidResponse1adWith2Bidders = {
  'body': {
    'id': '91221f96-b931-4acc-8f05-c2a1186fa5ac',
    'seatbid': [
      {
        'bid': [
          {
            'id': 'd6198807-7a53-4141-b2db-d2cb754d68ba',
            'impid': '2899ec066a91ff8',
            'price': 0.36754,
            'adm': '<script>removed</script>',
            'adid': '134928661',
            'adomain': [
              'somecompany.com'
            ],
            'iurl': 'https:\/\/ams1-ib.adnxs.com\/cr?id=134928661',
            'cid': '8825',
            'crid': '134928661',
            'cat': [
              'IAB8-15',
              'IAB8-16',
              'IAB8-4',
              'IAB8-1',
              'IAB8-14',
              'IAB8-6',
              'IAB8-13',
              'IAB8-3',
              'IAB8-17',
              'IAB8-12',
              'IAB8-8',
              'IAB8-7',
              'IAB8-2',
              'IAB8-9',
              'IAB8',
              'IAB8-11'
            ],
            'w': 300,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'appnexus': {
                  'brand_id': 14640,
                  'auction_id': 1.8369641905139e+18,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            }
          }
        ],
        'seat': 'appnexus'
      },
      {
        'bid': [
          {
            'id': '75665207-a1ca-49db-ba0e-a5e9c7d26f32',
            'impid': '37fff511779365a',
            'price': 1.046,
            'adm': '<div>removed</div>',
            'adomain': [
              'kx.com'
            ],
            'crid': '13005',
            'w': 300,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              }
            }
          }
        ],
        'seat': 'openx'
      }
    ],
    'ext': {
      'responsetimemillis': {
        'appnexus': 91,
        'openx': 109,
        'ozappnexus': 46,
        'ozbeeswax': 2,
        'pangaea': 91
      }
    }
  },
  'headers': {}
};

/*
testing 2 ads, 2 bidders, one bidder bids for both slots in one adunit
 */

var multiRequest1 = [
  {
    'bidder': 'ozone',
    'params': {
      'publisherId': 'OZONERUP0001',
      'siteId': '4204204201',
      'placementId': '0420420421',
      'customData': [
        {
          'settings': {},
          'targeting': {
            'sens': 'f',
            'pt1': '/uk',
            'pt2': 'uk',
            'pt3': 'network-front',
            'pt4': 'ng',
            'pt5': [
              'uk'
            ],
            'pt7': 'desktop',
            'pt8': [
              'tfmqxwj7q',
              'penl4dfdk',
              'uayf5jmv3',
              't8nyiude5',
              'sek9ghqwi'
            ],
            'pt9': '|k0xw2vqzp33kklb3j5w4|||'
          }
        }
      ],
      'lotameData': {
        'Profile': {
          'tpid': '4e5c21fc7c181c2b1eb3a73d543a27f6',
          'pid': '3a45fd4872fa01f35c49586d8dcb7c60',
          'Audiences': {
            'Audience': [
              {
                'id': '439847',
                'abbr': 'all'
              },
              {
                'id': '446197',
                'abbr': 'Arts, Culture & Literature'
              },
              {
                'id': '446198',
                'abbr': 'Business'
              }
            ]
          }
        }
      }
    },
    'mediaTypes': {
      'banner': {
        'sizes': [
          [
            300,
            250
          ],
          [
            300,
            600
          ]
        ]
      }
    },
    'adUnitCode': 'mpu',
    'transactionId': '6480bac7-31b5-4723-9145-ad8966660651',
    'sizes': [
      [
        300,
        250
      ],
      [
        300,
        600
      ]
    ],
    'bidId': '2d30e86db743a8',
    'bidderRequestId': '1d03a1dfc563fc',
    'auctionId': '592ee33b-fb2e-4c00-b2d5-383e99cac57f',
    'src': 'client',
    'bidRequestsCount': 1,
    'bidderRequestsCount': 1,
    'bidderWinsCount': 0
  },
  {
    'bidder': 'ozone',
    'params': {
      'publisherId': 'OZONERUP0001',
      'siteId': '4204204201',
      'placementId': '0420420421',
      'customData': [
        {
          'settings': {},
          'targeting': {
            'sens': 'f',
            'pt1': '/uk',
            'pt2': 'uk',
            'pt3': 'network-front',
            'pt4': 'ng',
            'pt5': [
              'uk'
            ],
            'pt7': 'desktop',
            'pt8': [
              'tfmqxwj7q',
              'penl4dfdk',
              't8nxz6qzd',
              't8nyiude5',
              'sek9ghqwi'
            ],
            'pt9': '|k0xw2vqzp33kklb3j5w4|||'
          }
        }
      ],
      'lotameData': {
        'Profile': {
          'tpid': '4e5c21fc7c181c2b1eb3a73d543a27f6',
          'pid': '3a45fd4872fa01f35c49586d8dcb7c60',
          'Audiences': {
            'Audience': [
              {
                'id': '439847',
                'abbr': 'all'
              },
              {
                'id': '446197',
                'abbr': 'Arts, Culture & Literature'
              },
              {
                'id': '446198',
                'abbr': 'Business'
              }
            ]
          }
        }
      }
    },
    'mediaTypes': {
      'banner': {
        'sizes': [
          [
            728,
            90
          ],
          [
            970,
            250
          ]
        ]
      }
    },
    'adUnitCode': 'leaderboard',
    'transactionId': 'a49988e6-ae7c-46c4-9598-f18db49892a0',
    'sizes': [
      [
        728,
        90
      ],
      [
        970,
        250
      ]
    ],
    'bidId': '3025f169863b7f8',
    'bidderRequestId': '1d03a1dfc563fc',
    'auctionId': '592ee33b-fb2e-4c00-b2d5-383e99cac57f',
    'src': 'client',
    'bidRequestsCount': 1,
    'bidderRequestsCount': 1,
    'bidderWinsCount': 0
  }
];

// WHEN sent as bidderRequest to buildRequests you should send the child: .bidderRequest
var multiBidderRequest1 = {
  bidderRequest: {
    'bidderCode': 'ozone',
    'auctionId': '592ee33b-fb2e-4c00-b2d5-383e99cac57f',
    'bidderRequestId': '1d03a1dfc563fc',
    'bids': [
      {
        'bidder': 'ozone',
        'params': {
          'publisherId': 'OZONERUP0001',
          'siteId': '4204204201',
          'placementId': '0420420421',
          'customData': [
            {
              'settings': {},
              'targeting': {
                'sens': 'f',
                'pt1': '/uk',
                'pt2': 'uk',
                'pt3': 'network-front',
                'pt4': 'ng',
                'pt5': [
                  'uk'
                ],
                'pt7': 'desktop',
                'pt8': [
                  'tfmqxwj7q',
                  'txeh7uyo0',
                  't8nxz6qzd',
                  't8nyiude5',
                  'sek9ghqwi'
                ],
                'pt9': '|k0xw2vqzp33kklb3j5w4|||'
              }
            }
          ],
          'lotameData': {
            'Profile': {
              'tpid': '4e5c21fc7c181c2b1eb3a73d543a27f6',
              'pid': '3a45fd4872fa01f35c49586d8dcb7c60',
              'Audiences': {
                'Audience': [
                  {
                    'id': '439847',
                    'abbr': 'all'
                  },
                  {
                    'id': '446197',
                    'abbr': 'Arts, Culture & Literature'
                  },
                  {
                    'id': '446198',
                    'abbr': 'Business'
                  }
                ]
              }
            }
          }
        },
        'mediaTypes': {
          'banner': {
            'sizes': [
              [
                300,
                250
              ],
              [
                300,
                600
              ]
            ]
          }
        },
        'adUnitCode': 'mpu',
        'transactionId': '6480bac7-31b5-4723-9145-ad8966660651',
        'sizes': [
          [
            300,
            250
          ],
          [
            300,
            600
          ]
        ],
        'bidId': '2d30e86db743a8',
        'bidderRequestId': '1d03a1dfc563fc',
        'auctionId': '592ee33b-fb2e-4c00-b2d5-383e99cac57f',
        'src': 'client',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 1,
        'bidderWinsCount': 0
      },
      {
        'bidder': 'ozone',
        'params': {
          'publisherId': 'OZONERUP0001',
          'siteId': '4204204201',
          'placementId': '0420420421',
          'customData': [
            {
              'settings': {},
              'targeting': {
                'sens': 'f',
                'pt1': '/uk',
                'pt2': 'uk',
                'pt3': 'network-front',
                'pt4': 'ng',
                'pt5': [
                  'uk'
                ],
                'pt7': 'desktop',
                'pt8': [
                  'tfmqxwj7q',
                  'penl4dfdk',
                  't8nxz6qzd',
                  't8nyiude5',
                  'sek9ghqwi'
                ],
                'pt9': '|k0xw2vqzp33kklb3j5w4|||'
              }
            }
          ],
          'lotameData': {
            'Profile': {
              'tpid': '4e5c21fc7c181c2b1eb3a73d543a27f6',
              'pid': '3a45fd4872fa01f35c49586d8dcb7c60',
              'Audiences': {
                'Audience': [
                  {
                    'id': '439847',
                    'abbr': 'all'
                  },
                  {
                    'id': '446197',
                    'abbr': 'Arts, Culture & Literature'
                  },
                  {
                    'id': '446198',
                    'abbr': 'Business'
                  }
                ]
              }
            }
          }
        },
        'mediaTypes': {
          'banner': {
            'sizes': [
              [
                728,
                90
              ],
              [
                970,
                250
              ]
            ]
          }
        },
        'adUnitCode': 'leaderboard',
        'transactionId': 'a49988e6-ae7c-46c4-9598-f18db49892a0',
        'sizes': [
          [
            728,
            90
          ],
          [
            970,
            250
          ]
        ],
        'bidId': '3025f169863b7f8',
        'bidderRequestId': '1d03a1dfc563fc',
        'auctionId': '592ee33b-fb2e-4c00-b2d5-383e99cac57f',
        'src': 'client',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 1,
        'bidderWinsCount': 0
      }
    ],
    'auctionStart': 1592918645574,
    'timeout': 3000,
    'refererInfo': {
      'referer': 'http://ozone.ardm.io/adapter/2.4.0/620x350-switch.html?guardian=true&pbjs_debug=true',
      'reachedTop': true,
      'numIframes': 0,
      'stack': [
        'http://ozone.ardm.io/adapter/2.4.0/620x350-switch.html?guardian=true&pbjs_debug=true'
      ]
    },
    'gdprConsent': {
      'consentString': 'BOvy5sFO1dBa2AKAiBENDP-AAAAwVrv7_77-_9f-_f__9uj3Gr_v_f__32ccL5tv3h_7v-_7fi_-0nV4u_1tft9ydk1-5ctDztp507iakiPHmqNeb9n_mz1eZpRP58E09j53z7Ew_v8_v-b7BCPN_Y3v-8K96kA',
      'vendorData': {
        'metadata': 'BOvy5sFO1dBa2AKAiBENDPA',
        'gdprApplies': true,
        'hasGlobalConsent': false,
        'hasGlobalScope': false,
        'purposeConsents': {
          '1': true,
          '2': true,
          '3': true,
          '4': true,
          '5': true
        },
        'vendorConsents': {
          '1': true,
          '2': true,
          '3': false,
          '4': true,
          '5': true
        }
      },
      'gdprApplies': true
    },
    'start': 1592918645578
  }
};

var multiResponse1 = {
  'body': {
    'id': '592ee33b-fb2e-4c00-b2d5-383e99cac57f',
    'seatbid': [
      {
        'bid': [
          {
            'id': '4419718600113204943',
            'impid': '2d30e86db743a8',
            'price': 0.2484,
            'adm': '<scr .. .iv>',
            'adid': '119683582',
            'adomain': [
              'https://ozoneproject.com'
            ],
            'iurl': 'https://ams1-ib.adnxs.com/cr?id=119683582',
            'cid': '9979',
            'crid': '119683582',
            'cat': [
              'IAB3'
            ],
            'w': 300,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'ozone': {},
                'appnexus': {
                  'brand_id': 734921,
                  'auction_id': 2995348111857539600,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            },
            'cpm': 0.2484,
            'bidId': '2d30e86db743a8',
            'requestId': '2d30e86db743a8',
            'width': 300,
            'height': 250,
            'ad': '<scr...iv>',
            'netRevenue': true,
            'creativeId': '119683582',
            'currency': 'USD',
            'ttl': 300,
            'originalCpm': 0.2484,
            'originalCurrency': 'USD'
          },
          {
            'id': '18552976939844681',
            'impid': '3025f169863b7f8',
            'price': 0.0621,
            'adm': '<sc..this ad will lose to the next one.div>',
            'adid': '120179216',
            'adomain': [
              'appnexus.com'
            ],
            'iurl': 'https://ams1-ib.adnxs.com/cr?id=120179216',
            'cid': '9979',
            'crid': '120179216',
            'w': 970,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'ozone': {},
                'appnexus': {
                  'brand_id': 1,
                  'auction_id': 3449036134472542700,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            },
            'cpm': 0.0621,
            'bidId': '3025f169863b7f8',
            'requestId': '3025f169863b7f8',
            'width': 970,
            'height': 250,
            'ad': '<scr...iv>',
            'netRevenue': true,
            'creativeId': '120179216',
            'currency': 'USD',
            'ttl': 300,
            'originalCpm': 0.0621,
            'originalCurrency': 'USD'
          },
          {
            'id': '18552976939844999',
            'impid': '3025f169863b7f8',
            'price': 0.521,
            'adm': '<sc. second bid for bidId 3025f169863b7f8 ..div>',
            'adid': '120179216',
            'adomain': [
              'appnexus.com'
            ],
            'iurl': 'https://ams1-ib.adnxs.com/cr?id=120179216',
            'cid': '9999',
            'crid': '120179299',
            'w': 728,
            'h': 90,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'ozone': {},
                'appnexus': {
                  'brand_id': 1,
                  'auction_id': 3449036134472542700,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            },
            'cpm': 0.521,
            'bidId': '3025f169863b7f8',
            'requestId': '3025f169863b7f8',
            'width': 728,
            'height': 90,
            'ad': '<scr...iv>',
            'netRevenue': true,
            'creativeId': '120179299',
            'currency': 'USD',
            'ttl': 300,
            'originalCpm': 0.0621,
            'originalCurrency': 'USD'
          }
        ],
        'seat': 'ozappnexus'
      },
      {
        'bid': [
          {
            'id': '1c605e8a-4992-4ec6-8a5c-f82e2938c2db',
            'impid': '2d30e86db743a8',
            'price': 0.01,
            'adm': '<div  ... div>',
            'crid': '540463358',
            'w': 300,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'ozone': {}
              }
            },
            'cpm': 0.01,
            'bidId': '2d30e86db743a8',
            'requestId': '2d30e86db743a8',
            'width': 300,
            'height': 250,
            'ad': '<div ...div>',
            'netRevenue': true,
            'creativeId': '540463358',
            'currency': 'USD',
            'ttl': 300,
            'originalCpm': 0.01,
            'originalCurrency': 'USD'
          },
          {
            'id': '3edeb4f7-d91d-44e2-8aeb-4a2f6d295ce5',
            'impid': '3025f169863b7f8',
            'price': 0.01,
            'adm': '<div ... div>',
            'crid': '540221061',
            'w': 970,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'ozone': {}
              }
            },
            'cpm': 0.01,
            'bidId': '3025f169863b7f8',
            'requestId': '3025f169863b7f8',
            'width': 970,
            'height': 250,
            'ad': '<div ... div>',
            'netRevenue': true,
            'creativeId': '540221061',
            'currency': 'USD',
            'ttl': 300,
            'originalCpm': 0.01,
            'originalCurrency': 'USD'
          }
        ],
        'seat': 'openx'
      }
    ],
    'ext': {
      'debug': {},
      'responsetimemillis': {
        'beeswax': 6,
        'openx': 91,
        'ozappnexus': 40,
        'ozbeeswax': 6
      }
    }
  },
  'headers': {}
};

/*
--------------------end of 2 slots, 2 ----------------------------
 */

describe('ozone Adapter', function () {
  describe('isBidRequestValid', function () {
    // A test ad unit that will consistently return test creatives
    let validBidReq = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1310000099',
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });

    var validBidReq2 = {

      bidder: BIDDER_CODE,
      params: {
        placementId: '1310000099',
        publisherId: '9876abcd12-3',
        siteId: '1234567890',
        customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}],
        lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}]}}},
      },
      siteId: 1234567890
    }

    it('should return true when required params found and all optional params are valid', function () {
      expect(spec.isBidRequestValid(validBidReq2)).to.equal(true);
    });

    var xEmptyPlacement = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '',
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should not validate empty placementId', function () {
      expect(spec.isBidRequestValid(xEmptyPlacement)).to.equal(false);
    });

    var xMissingPlacement = {
      bidder: BIDDER_CODE,
      params: {
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should not validate missing placementId', function () {
      expect(spec.isBidRequestValid(xMissingPlacement)).to.equal(false);
    });

    var xBadPlacement = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '123X45',
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should not validate placementId with a non-numeric value', function () {
      expect(spec.isBidRequestValid(xBadPlacement)).to.equal(false);
    });

    var xBadPlacementTooShort = {
      bidder: BIDDER_CODE,
      params: {
        placementId: 123456789, /* should be exactly 10 chars */
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should not validate placementId with a numeric value of wrong length', function () {
      expect(spec.isBidRequestValid(xBadPlacementTooShort)).to.equal(false);
    });

    var xBadPlacementTooLong = {
      bidder: BIDDER_CODE,
      params: {
        placementId: 12345678901, /* should be exactly 10 chars */
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should not validate placementId with a numeric value of wrong length', function () {
      expect(spec.isBidRequestValid(xBadPlacementTooLong)).to.equal(false);
    });

    var xMissingPublisher = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        siteId: '1234567890'
      }
    };

    it('should not validate missing publisherId', function () {
      expect(spec.isBidRequestValid(xMissingPublisher)).to.equal(false);
    });

    var xMissingSiteId = {
      bidder: BIDDER_CODE,
      params: {
        publisherId: '9876abcd12-3',
        placementId: '1234567890',
      }
    };

    it('should not validate missing sitetId', function () {
      expect(spec.isBidRequestValid(xMissingSiteId)).to.equal(false);
    });

    var xBadPublisherTooShort = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '9876abcd12a',
        siteId: '1234567890'
      }
    };

    it('should not validate publisherId being too short', function () {
      expect(spec.isBidRequestValid(xBadPublisherTooShort)).to.equal(false);
    });

    var xBadPublisherTooLong = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '9876abcd12abc',
        siteId: '1234567890'
      }
    };

    it('should not validate publisherId being too long', function () {
      expect(spec.isBidRequestValid(xBadPublisherTooLong)).to.equal(false);
    });

    var publisherNumericOk = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: 123456789012,
        siteId: '1234567890'
      }
    };

    it('should validate publisherId being 12 digits', function () {
      expect(spec.isBidRequestValid(publisherNumericOk)).to.equal(true);
    });

    var xEmptyPublisher = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '',
        siteId: '1234567890'
      }
    };

    it('should not validate empty publisherId', function () {
      expect(spec.isBidRequestValid(xEmptyPublisher)).to.equal(false);
    });

    var xBadSite = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '9876abcd12-3',
        siteId: '12345Z'
      }
    };

    it('should not validate bad siteId', function () {
      expect(spec.isBidRequestValid(xBadSite)).to.equal(false);
    });

    var xBadSiteTooLong = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '9876abcd12-3',
        siteId: '12345678901'
      }
    };

    it('should not validate siteId too long', function () {
      expect(spec.isBidRequestValid(xBadSite)).to.equal(false);
    });

    var xBadSiteTooShort = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '9876abcd12-3',
        siteId: '123456789'
      }
    };

    it('should not validate siteId too short', function () {
      expect(spec.isBidRequestValid(xBadSite)).to.equal(false);
    });

    var allNonStrings = {
      bidder: BIDDER_CODE,
      params: {
        placementId: 1234567890,
        publisherId: '9876abcd12-3',
        siteId: 1234567890
      }
    };

    it('should validate all numeric values being sent as non-string numbers', function () {
      expect(spec.isBidRequestValid(allNonStrings)).to.equal(true);
    });

    var emptySiteId = {
      bidder: BIDDER_CODE,
      params: {
        placementId: 1234567890,
        publisherId: '9876abcd12-3',
        siteId: ''
      }
    };

    it('should not validate siteId being empty string (it is required now)', function () {
      expect(spec.isBidRequestValid(emptySiteId)).to.equal(false);
    });

    var xBadCustomData = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'siteId': '1234567890',
        'customData': 'this aint gonna work'
      }
    };

    it('should not validate customData not being an array', function () {
      expect(spec.isBidRequestValid(xBadCustomData)).to.equal(false);
    });

    var xBadCustomData_OLD_CUSTOMDATA_VALUE = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'siteId': '1234567890',
        'customData': {'gender': 'bart', 'age': 'low'}
      }
    };

    it('should not validate customData being an object, not an array', function () {
      expect(spec.isBidRequestValid(xBadCustomData_OLD_CUSTOMDATA_VALUE)).to.equal(false);
    });

    var xBadCustomData_zerocd = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1111111110',
        'publisherId': '9876abcd12-3',
        'siteId': '1234567890',
        'customData': []
      }
    };

    it('should not validate customData array having no elements', function () {
      expect(spec.isBidRequestValid(xBadCustomData_zerocd)).to.equal(false);
    });

    var xBadCustomData_notargeting = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'customData': [{'settings': {}, 'xx': {'gender': 'bart', 'age': 'low'}}],
        siteId: '1234567890'
      }
    };
    it('should not validate customData[] having no "targeting"', function () {
      expect(spec.isBidRequestValid(xBadCustomData_notargeting)).to.equal(false);
    });

    var xBadCustomData_tgt_not_obj = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'customData': [{'settings': {}, 'targeting': 'this should be an object'}],
        siteId: '1234567890'
      }
    };
    it('should not validate customData[0].targeting not being an object', function () {
      expect(spec.isBidRequestValid(xBadCustomData_tgt_not_obj)).to.equal(false);
    });

    var xBadCustomParams = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'siteId': '1234567890',
        'customParams': 'this key is no longer valid'
      }
    };
    it('should not validate customParams - this is a renamed key', function () {
      expect(spec.isBidRequestValid(xBadCustomParams)).to.equal(false);
    });

    var xBadLotame = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'lotameData': 'this should be an object',
        siteId: '1234567890'
      }
    };
    it('should not validate lotameData being sent', function () {
      expect(spec.isBidRequestValid(xBadLotame)).to.equal(false);
    });

    var xBadVideoContext2 = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'lotameData': {},
        siteId: '1234567890'
      },
      mediaTypes: {
        video: {
          mimes: ['video/mp4']}
      }
    };

    it('should not validate video without context attribute', function () {
      expect(spec.isBidRequestValid(xBadVideoContext2)).to.equal(false);
    });

    let validVideoBidReq = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1310000099',
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      },
      mediaTypes: {
        video: {
          mimes: ['video/mp4'],
          'context': 'outstream'},
      }
    };

    it('should validate video outstream being sent', function () {
      expect(spec.isBidRequestValid(validVideoBidReq)).to.equal(true);
    });
    it('should validate video instream being sent even though its not properly supported yet', function () {
      let instreamVid = JSON.parse(JSON.stringify(validVideoBidReq));
      instreamVid.mediaTypes.video.context = 'instream';
      expect(spec.isBidRequestValid(instreamVid)).to.equal(true);
    });
    // validate lotame override parameters
    it('should validate lotame override params', function () {
      // mock the getGetParametersAsObject function to simulate GET parameters for lotame overrides:
      spec.getGetParametersAsObject = function() {
        return {'oz_lotameid': '123abc', 'oz_lotamepid': 'pid123', 'oz_lotametpid': 'tpid123'};
      };
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });
    it('should validate missing lotame override params', function () {
      // mock the getGetParametersAsObject function to simulate GET parameters for lotame overrides:
      spec.getGetParametersAsObject = function() {
        return {'oz_lotameid': '123abc', 'oz_lotamepid': 'pid123'};
      };
      expect(spec.isBidRequestValid(validBidReq)).to.equal(false);
    });
    it('should validate invalid lotame override params', function () {
      // mock the getGetParametersAsObject function to simulate GET parameters for lotame overrides:
      spec.getGetParametersAsObject = function() {
        return {'oz_lotameid': '123abc', 'oz_lotamepid': 'pid123', 'oz_lotametpid': '123 "this ain\\t right!" eee'};
      };
      expect(spec.isBidRequestValid(validBidReq)).to.equal(false);
    });
    it('should validate no lotame override params', function () {
      // mock the getGetParametersAsObject function to simulate GET parameters for lotame overrides:
      spec.getGetParametersAsObject = function() {
        return {};
      };
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('sends bid request to OZONEURI via POST', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      expect(request.url).to.equal(OZONEURI);
      expect(request.method).to.equal('POST');
    });

    it('sends data as a string', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      expect(request.data).to.be.a('string');
    });

    it('sends all bid parameters', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      expect(request).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
    });

    it('adds all parameters inside the ext object only', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      expect(request.data).to.be.a('string');
      var data = JSON.parse(request.data);
      expect(data.ext.ozone.lotameData).to.be.an('object');
      expect(data.imp[0].ext.ozone.customData).to.be.an('array');
      expect(request).not.to.have.key('lotameData');
      expect(request).not.to.have.key('customData');
    });

    it('ignores ozoneData in & after version 2.1.1', function () {
      let validBidRequestsWithOzoneData = validBidRequests;
      validBidRequestsWithOzoneData[0].params.ozoneData = {'networkID': '3048', 'dfpSiteID': 'd.thesun', 'sectionID': 'homepage', 'path': '/', 'sec_id': 'null', 'sec': 'sec', 'topics': 'null', 'kw': 'null', 'aid': 'null', 'search': 'null', 'article_type': 'null', 'hide_ads': '', 'article_slug': 'null'};
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      expect(request.data).to.be.a('string');
      var data = JSON.parse(request.data);
      expect(data.ext.ozone.lotameData).to.be.an('object');
      expect(data.imp[0].ext.ozone.customData).to.be.an('array');
      expect(data.imp[0].ext.ozone.ozoneData).to.be.undefined;
      expect(request).not.to.have.key('lotameData');
      expect(request).not.to.have.key('customData');
    });

    it('has correct bidder', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      expect(request.bidderRequest.bids[0].bidder).to.equal(BIDDER_CODE);
    });

    it('handles mediaTypes element correctly', function () {
      const request = spec.buildRequests(validBidRequestsWithBannerMediaType, validBidderRequest.bidderRequest);
      expect(request).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
    });

    it('handles no ozone, lotame or custom data', function () {
      const request = spec.buildRequests(validBidRequestsMinimal, validBidderRequest.bidderRequest);
      expect(request).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
    });

    it('handles video mediaType element correctly, with outstream video', function () {
      const request = spec.buildRequests(validBidRequests1OutstreamVideo2020, validBidderRequest.bidderRequest);
      expect(request).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
    });

    it('should not crash when there is no sizes element at all', function () {
      const request = spec.buildRequests(validBidRequestsNoSizes, validBidderRequest.bidderRequest);
      expect(request).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
    });

    it('should be able to handle non-single requests', function () {
      config.setConfig({'ozone': {'singleRequest': false}});
      const request = spec.buildRequests(validBidRequestsNoSizes, validBidderRequest.bidderRequest);
      expect(request).to.be.a('array');
      expect(request[0]).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
      // need to reset the singleRequest config flag:
      config.setConfig({'ozone': {'singleRequest': true}});
    });

    it('should add gdpr consent information to the request when ozone is true', function () {
      let consentString = 'BOcocyaOcocyaAfEYDENCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NphLgA==';
      let bidderRequest = validBidderRequest.bidderRequest;
      bidderRequest.gdprConsent = {
        consentString: consentString,
        gdprApplies: true,
        vendorData: {
          metadata: consentString,
          gdprApplies: true,
          vendorConsents: {524: true},
          purposeConsents: {1: true, 2: true, 3: true, 4: true, 5: true}
        }
      }

      const request = spec.buildRequests(validBidRequestsNoSizes, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.regs.ext.gdpr).to.equal(1);
      expect(payload.user.ext.consent).to.equal(consentString);
    });

    // mirror
    it('should add gdpr consent information to the request when vendorData is missing vendorConsents (Mirror)', function () {
      let consentString = 'BOcocyaOcocyaAfEYDENCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NphLgA==';
      let bidderRequest = validBidderRequest.bidderRequest;
      bidderRequest.gdprConsent = {
        consentString: consentString,
        gdprApplies: true,
        vendorData: {
          metadata: consentString,
          gdprApplies: true
        }
      }

      const request = spec.buildRequests(validBidRequestsNoSizes, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.regs.ext.gdpr).to.equal(1);
      expect(payload.user.ext.consent).to.equal(consentString);
    });
    it('should set regs.ext.gdpr flag to 0 when gdprApplies is false', function () {
      let consentString = 'BOcocyaOcocyaAfEYDENCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NphLgA==';
      let bidderRequest = validBidderRequest.bidderRequest;
      bidderRequest.gdprConsent = {
        consentString: consentString,
        gdprApplies: false,
        vendorData: {
          metadata: consentString,
          gdprApplies: true,
          vendorConsents: {}, /* 524 is not present */
          purposeConsents: {1: true, 2: true, 3: true, 4: true, 5: true}
        }
      };

      const request = spec.buildRequests(validBidRequestsNoSizes, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.regs.ext.gdpr).to.equal(0);
    });

    it('should not have imp[N].ext.ozone.userId', function () {
      let consentString = 'BOcocyaOcocyaAfEYDENCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NphLgA==';
      let bidderRequest = validBidderRequest.bidderRequest;
      bidderRequest.gdprConsent = {
        consentString: consentString,
        gdprApplies: false,
        vendorData: {
          metadata: consentString,
          gdprApplies: true,
          vendorConsents: {524: true},
          purposeConsents: {1: true, 2: true, 3: true, 4: true, 5: true}
        }
      };

      let bidRequests = validBidRequests;
      // values from http://prebid.org/dev-docs/modules/userId.html#pubcommon-id
      bidRequests[0]['userId'] = {
        'criteortus': '1111',
        'digitrustid': {data: {id: 'DTID', keyv: 4, privacy: {optout: false}, producer: 'ABC', version: 2}},
        'id5id': '2222',
        'idl_env': '3333',
        'lipb': {'lipbid': '4444'},
        'parrableId': {eid: 'eidVersion.encryptionKeyReference.encryptedValue'},
        'pubcid': '5555',
        'tdid': '6666'
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      let firstBid = payload.imp[0].ext.ozone;
      expect(firstBid).to.not.have.property('userId');
      delete validBidRequests[0].userId; // tidy up now, else it will screw with other tests
    });

    it('should pick up the value of pubcid when built using the pubCommonId module (not userId)', function () {
      let bidRequests = validBidRequests;
      // values from http://prebid.org/dev-docs/modules/userId.html#pubcommon-id
      bidRequests[0]['userId'] = {
        'criteortus': '1111',
        'digitrustid': {data: {id: 'DTID', keyv: 4, privacy: {optout: false}, producer: 'ABC', version: 2}},
        'id5id': '2222',
        'idl_env': '3333',
        'lipb': {'lipbid': '4444'},
        'parrableId': {eid: 'eidVersion.encryptionKeyReference.encryptedValue'},
        // 'pubcid': '5555', // remove pubcid from here to emulate the OLD module & cause the failover code to kick in
        'tdid': '6666'
      };
      const request = spec.buildRequests(bidRequests, validBidderRequest.bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.ext.ozone.pubcid).to.equal(bidRequests[0]['crumbs']['pubcid']);
      delete validBidRequests[0].userId; // tidy up now, else it will screw with other tests
    });

    it('should add a user.ext.eids object to contain user ID data in the new location (Nov 2019)', function() {
      const request = spec.buildRequests(validBidRequestsWithUserIdData, validBidderRequest.bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.user).to.exist;
      expect(payload.user.ext).to.exist;
      expect(payload.user.ext.eids).to.exist;
      expect(payload.user.ext.eids[0]['source']).to.equal('pubcid');
      expect(payload.user.ext.eids[0]['uids'][0]['id']).to.equal('12345678');
      expect(payload.user.ext.eids[1]['source']).to.equal('pubcommon');
      expect(payload.user.ext.eids[1]['uids'][0]['id']).to.equal('12345678');
      expect(payload.user.ext.eids[2]['source']).to.equal('id5-sync.com');
      expect(payload.user.ext.eids[2]['uids'][0]['id']).to.equal('ID5-someId');
      expect(payload.user.ext.eids[3]['source']).to.equal('criteortus');
      expect(payload.user.ext.eids[3]['uids'][0]['id']).to.equal('critId123');
      expect(payload.user.ext.eids[4]['source']).to.equal('liveramp.com');
      expect(payload.user.ext.eids[4]['uids'][0]['id']).to.equal('liverampId');
      expect(payload.user.ext.eids[5]['source']).to.equal('liveintent.com');
      expect(payload.user.ext.eids[5]['uids'][0]['id']).to.equal('lipbidId123');
      expect(payload.user.ext.eids[6]['source']).to.equal('parrable.com');
      expect(payload.user.ext.eids[6]['uids'][0]['id']).to.equal('parrableid123');
    });

    it('should use oztestmode GET value if set', function() {
      // mock the getGetParametersAsObject function to simulate GET parameters for oztestmode:
      spec.getGetParametersAsObject = function() {
        return {'oztestmode': 'mytestvalue_123'};
      };
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].ext.ozone.customData).to.be.an('array');
      expect(data.imp[0].ext.ozone.customData[0].targeting.oztestmode).to.equal('mytestvalue_123');
    });
    it('should use oztestmode GET value if set, even if there is no customdata in config', function() {
      // mock the getGetParametersAsObject function to simulate GET parameters for oztestmode:
      spec.getGetParametersAsObject = function() {
        return {'oztestmode': 'mytestvalue_123'};
      };
      const request = spec.buildRequests(validBidRequestsMinimal, validBidderRequest.bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].ext.ozone.customData).to.be.an('array');
      expect(data.imp[0].ext.ozone.customData[0].targeting.oztestmode).to.equal('mytestvalue_123');
    });
    var specMock = utils.deepClone(spec);
    it('should use a valid ozstoredrequest GET value if set to override the placementId values, and set oz_rw if we find it', function() {
      // mock the getGetParametersAsObject function to simulate GET parameters for ozstoredrequest:
      specMock.getGetParametersAsObject = function() {
        return {'ozstoredrequest': '1122334455'}; // 10 digits are valid
      };
      const request = specMock.buildRequests(validBidRequestsMinimal, validBidderRequest.bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.ext.ozone.oz_rw).to.equal(1);
      expect(data.imp[0].ext.prebid.storedrequest.id).to.equal('1122334455');
    });
    it('should NOT use an invalid ozstoredrequest GET value if set to override the placementId values, and set oz_rw to 0', function() {
      // mock the getGetParametersAsObject function to simulate GET parameters for ozstoredrequest:
      specMock.getGetParametersAsObject = function() {
        return {'ozstoredrequest': 'BADVAL'}; // 10 digits are valid
      };
      const request = specMock.buildRequests(validBidRequestsMinimal, validBidderRequest.bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.ext.ozone.oz_rw).to.equal(0);
      expect(data.imp[0].ext.prebid.storedrequest.id).to.equal('1310000099');
    });

    it('should pick up the value of valid lotame override parameters when there is a lotame object', function () {
      spec.getGetParametersAsObject = function() {
        return {'oz_lotameid': '123abc', 'oz_lotamepid': 'pid123', 'oz_lotametpid': '123eee'};
      };
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.ext.ozone.lotameData.Profile.Audiences.Audience[0].id).to.equal('123abc');
      expect(payload.ext.ozone.oz_lot_rw).to.equal(1);
    });
    it('should pick up the value of valid lotame override parameters when there is an empty lotame object', function () {
      let nolotameBidReq = JSON.parse(JSON.stringify(validBidRequests));
      nolotameBidReq[0].params.lotameData = {};
      spec.getGetParametersAsObject = function() {
        return {'oz_lotameid': '123abc', 'oz_lotamepid': 'pid123', 'oz_lotametpid': '123eeetpid'};
      };
      const request = spec.buildRequests(nolotameBidReq, validBidderRequest.bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.ext.ozone.lotameData.Profile.Audiences.Audience[0].id).to.equal('123abc');
      expect(payload.ext.ozone.lotameData.Profile.tpid).to.equal('123eeetpid');
      expect(payload.ext.ozone.lotameData.Profile.pid).to.equal('pid123');
      expect(payload.ext.ozone.oz_lot_rw).to.equal(1);
    });
    it('should pick up the value of valid lotame override parameters when there is NO "lotame" key at all', function () {
      let nolotameBidReq = JSON.parse(JSON.stringify(validBidRequests));
      delete (nolotameBidReq[0].params['lotameData']);
      spec.getGetParametersAsObject = function() {
        return {'oz_lotameid': '123abc', 'oz_lotamepid': 'pid123', 'oz_lotametpid': '123eeetpid'};
      };
      const request = spec.buildRequests(nolotameBidReq, validBidderRequest.bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.ext.ozone.lotameData.Profile.Audiences.Audience[0].id).to.equal('123abc');
      expect(payload.ext.ozone.lotameData.Profile.tpid).to.equal('123eeetpid');
      expect(payload.ext.ozone.lotameData.Profile.pid).to.equal('pid123');
      expect(payload.ext.ozone.oz_lot_rw).to.equal(1);
      spec.propertyBag = originalPropertyBag; // tidy up
    });
    // NOTE - only one negative test case;
    // you can't send invalid lotame params to buildRequests because 'validate' will have rejected them
    it('should not use lotame override parameters if they dont exist', function () {
      expect(spec.propertyBag.lotameWasOverridden).to.equal(0);
      spec.getGetParametersAsObject = function() {
        return {}; //  no lotame override params
      };
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.ext.ozone.oz_lot_rw).to.equal(0);
    });

    it('should pick up the config value of coppa & set it in the request', function () {
      config.setConfig({'coppa': true});
      const request = spec.buildRequests(validBidRequestsNoSizes, validBidderRequest.bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.regs).to.include.keys('coppa');
      expect(payload.regs.coppa).to.equal(1);
      config.resetConfig();
    });
    it('should pick up the config value of coppa & only set it in the request if its true', function () {
      config.setConfig({'coppa': false});
      const request = spec.buildRequests(validBidRequestsNoSizes, validBidderRequest.bidderRequest);
      const payload = JSON.parse(request.data);
      expect(utils.deepAccess(payload, 'regs.coppa')).to.be.undefined;
      config.resetConfig();
    });
    it('should handle oz_omp_floor correctly', function () {
      config.setConfig({'ozone': {'oz_omp_floor': 1.56}});
      const request = spec.buildRequests(validBidRequestsNoSizes, validBidderRequest.bidderRequest);
      const payload = JSON.parse(request.data);
      expect(utils.deepAccess(payload, 'ext.ozone.oz_omp_floor')).to.equal(1.56);
      config.resetConfig();
    });
    it('should ignore invalid oz_omp_floor values', function () {
      config.setConfig({'ozone': {'oz_omp_floor': '1.56'}});
      const request = spec.buildRequests(validBidRequestsNoSizes, validBidderRequest.bidderRequest);
      const payload = JSON.parse(request.data);
      expect(utils.deepAccess(payload, 'ext.ozone.oz_omp_floor')).to.be.undefined;
      config.resetConfig();
    });
    it('should should contain a unique page view id in the auction request which persists across calls', function () {
      let request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      let payload = JSON.parse(request.data);
      expect(utils.deepAccess(payload, 'ext.ozone.pv')).to.be.a('string');
      request = spec.buildRequests(validBidRequests1OutstreamVideo2020, validBidderRequest.bidderRequest);
      let payload2 = JSON.parse(request.data);
      expect(utils.deepAccess(payload2, 'ext.ozone.pv')).to.be.a('string');
      expect(utils.deepAccess(payload2, 'ext.ozone.pv')).to.equal(utils.deepAccess(payload, 'ext.ozone.pv'));
    });
    it('should indicate that the whitelist was used when it contains valid data', function () {
      config.setConfig({'ozone': {'oz_whitelist_adserver_keys': ['oz_ozappnexus_pb', 'oz_ozappnexus_imp_id']}});
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.ext.ozone.oz_kvp_rw).to.equal(1);
      config.resetConfig();
    });
    it('should indicate that the whitelist was not used when it contains no data', function () {
      config.setConfig({'ozone': {'oz_whitelist_adserver_keys': []}});
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.ext.ozone.oz_kvp_rw).to.equal(0);
      config.resetConfig();
    });
    it('should indicate that the whitelist was not used when it is not set in the config', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.ext.ozone.oz_kvp_rw).to.equal(0);
    });
    it('should have openrtb video params', function() {
      let allowed = ['mimes', 'minduration', 'maxduration', 'protocols', 'w', 'h', 'startdelay', 'placement', 'linearity', 'skip', 'skipmin', 'skipafter', 'sequence', 'battr', 'maxextended', 'minbitrate', 'maxbitrate', 'boxingallowed', 'playbackmethod', 'playbackend', 'delivery', 'pos', 'companionad', 'api', 'companiontype', 'ext'];
      const request = spec.buildRequests(validBidRequests1OutstreamVideo2020, validBidderRequest.bidderRequest);
      const payload = JSON.parse(request.data);
      const vid = (payload.imp[0].video);
      const keys = Object.keys(vid);
      for (let i = 0; i < keys.length; i++) {
        expect(allowed).to.include(keys[i]);
      }
      expect(payload.imp[0].video.ext).to.include({'context': 'outstream'});
    });
  });

  describe('interpretResponse', function () {
    it('should build bid array', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(result.length).to.equal(1);
    });

    it('should have all relevant fields', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      const bid = result[0];
      expect(bid.cpm).to.equal(validResponse.body.seatbid[0].bid[0].cpm);
      expect(bid.width).to.equal(validResponse.body.seatbid[0].bid[0].width);
      expect(bid.height).to.equal(validResponse.body.seatbid[0].bid[0].height);
    });

    it('should build bid array with gdpr', function () {
      let validBR = JSON.parse(JSON.stringify(bidderRequestWithFullGdpr.bidderRequest));
      validBR.gdprConsent = {'gdprApplies': 1, 'consentString': 'This is the gdpr consent string'};
      const request = spec.buildRequests(validBidRequests, validBR); // works the old way, with GDPR not enforced by default
      const result = spec.interpretResponse(validResponse, request);
      expect(result.length).to.equal(1);
    });

    it('should build bid array with only partial gdpr', function () {
      var validBidderRequestWithGdpr = bidderRequestWithPartialGdpr.bidderRequest;
      validBidderRequestWithGdpr.gdprConsent = {'gdprApplies': 1, 'consentString': 'This is the gdpr consent string'};
      const request = spec.buildRequests(validBidRequests, validBidderRequestWithGdpr);
    });

    it('should fail ok if no seatbid in server response', function () {
      const result = spec.interpretResponse({}, {});
      expect(result).to.be.an('array');
      expect(result).to.be.empty;
    });

    it('should fail ok if seatbid is not an array', function () {
      const result = spec.interpretResponse({'body': {'seatbid': 'nothing_here'}}, {});
      expect(result).to.be.an('array');
      expect(result).to.be.empty;
    });

    it('should have video renderer for outstream video', function () {
      const request = spec.buildRequests(validBidRequests1OutstreamVideo2020, validBidderRequest1OutstreamVideo2020.bidderRequest);
      const result = spec.interpretResponse(getCleanValidVideoResponse(), validBidderRequest1OutstreamVideo2020);
      const bid = result[0];
      expect(bid.renderer).to.be.an.instanceOf(Renderer);
    });

    it('should have NO video renderer for instream video', function () {
      let instreamRequestsObj = JSON.parse(JSON.stringify(validBidRequests1OutstreamVideo2020));
      instreamRequestsObj[0].mediaTypes.video.context = 'instream';
      let instreamBidderReq = JSON.parse(JSON.stringify(validBidderRequest1OutstreamVideo2020));
      instreamBidderReq.bidderRequest.bids[0].mediaTypes.video.context = 'instream';
      const request = spec.buildRequests(instreamRequestsObj, validBidderRequest1OutstreamVideo2020.bidderRequest);
      const result = spec.interpretResponse(getCleanValidVideoResponse(), instreamBidderReq);
      const bid = result[0];
      expect(bid.hasOwnProperty('renderer')).to.be.false;
    });

    it('should correctly parse response where there are more bidders than ad slots', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const result = spec.interpretResponse(validBidResponse1adWith2Bidders, request);
      expect(result.length).to.equal(2);
    });

    it('should have a ttl of 600', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(result[0].ttl).to.equal(300);
    });

    it('should handle oz_omp_floor_dollars correctly, inserting 1 as necessary', function () {
      config.setConfig({'ozone': {'oz_omp_floor': 0.01}});
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_omp')).to.equal('1');
      config.resetConfig();
    });
    it('should handle oz_omp_floor_dollars correctly, inserting 0 as necessary', function () {
      config.setConfig({'ozone': {'oz_omp_floor': 2.50}});
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_omp')).to.equal('0');
      config.resetConfig();
    });
    it('should handle missing oz_omp_floor_dollars correctly, inserting nothing', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_omp')).to.be.undefined;
    });
    it('should handle ext.bidder.ozone.floor correctly, setting flr & rid as necessary', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      let vres = JSON.parse(JSON.stringify(validResponse));
      vres.body.seatbid[0].bid[0].ext.bidder.ozone = {floor: 1, ruleId: 'ZjbsYE1q'};
      const result = spec.interpretResponse(vres, request);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_flr')).to.equal(1);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_rid')).to.equal('ZjbsYE1q');
      config.resetConfig();
    });
    it('should handle ext.bidder.ozone.floor correctly, inserting 0 as necessary', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      let vres = JSON.parse(JSON.stringify(validResponse));
      vres.body.seatbid[0].bid[0].ext.bidder.ozone = {floor: 0, ruleId: 'ZjbXXE1q'};
      const result = spec.interpretResponse(vres, request);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_flr')).to.equal(0);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_rid')).to.equal('ZjbXXE1q');
      config.resetConfig();
    });
    it('should handle ext.bidder.ozone.floor correctly, inserting nothing as necessary', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      let vres = JSON.parse(JSON.stringify(validResponse));
      vres.body.seatbid[0].bid[0].ext.bidder.ozone = {};
      const result = spec.interpretResponse(vres, request);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_flr', null)).to.equal(null);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_rid', null)).to.equal(null);
      config.resetConfig();
    });
    it('should handle ext.bidder.ozone.floor correctly, when bidder.ozone is not there', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      let vres = JSON.parse(JSON.stringify(validResponse));
      const result = spec.interpretResponse(vres, request);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_flr', null)).to.equal(null);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_rid', null)).to.equal(null);
      config.resetConfig();
    });
    it('should handle a valid whitelist, removing items not on the list & leaving others', function () {
      config.setConfig({'ozone': {'oz_whitelist_adserver_keys': ['oz_appnexus_crid', 'oz_appnexus_adId']}});
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_adv')).to.be.undefined;
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_adId')).to.equal('2899ec066a91ff8-0-0');
      config.resetConfig();
    });
    it('should ignore a whitelist if enhancedAdserverTargeting is false', function () {
      config.setConfig({'ozone': {'oz_whitelist_adserver_keys': ['oz_appnexus_crid', 'oz_appnexus_imp_id'], 'enhancedAdserverTargeting': false}});
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_adv')).to.be.undefined;
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_imp_id')).to.be.undefined;
      config.resetConfig();
    });
    it('should correctly handle enhancedAdserverTargeting being false', function () {
      config.setConfig({'ozone': {'enhancedAdserverTargeting': false}});
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_adv')).to.be.undefined;
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_imp_id')).to.be.undefined;
      config.resetConfig();
    });
    it('should add flr into ads request if floor exists in the auction response', function () {
      const request = spec.buildRequests(validBidRequestsMulti, validBidderRequest.bidderRequest);
      let validres = JSON.parse(JSON.stringify(validResponse2Bids));
      validres.body.seatbid[0].bid[0].ext.bidder.ozone = {'floor': 1};
      const result = spec.interpretResponse(validres, request);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_flr')).to.equal(1);
      expect(utils.deepAccess(result[1].adserverTargeting, 'oz_appnexus_flr', '')).to.equal('');
    });
    it('should add rid into ads request if ruleId exists in the auction response', function () {
      const request = spec.buildRequests(validBidRequestsMulti, validBidderRequest.bidderRequest);
      let validres = JSON.parse(JSON.stringify(validResponse2Bids));
      validres.body.seatbid[0].bid[0].ext.bidder.ozone = {'ruleId': 123};
      const result = spec.interpretResponse(validres, request);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_appnexus_rid')).to.equal(123);
      expect(utils.deepAccess(result[1].adserverTargeting, 'oz_appnexus_rid', '')).to.equal('');
    });
    it('should add oz_ozappnexus_sid (cid value) for all appnexus bids', function () {
      const request = spec.buildRequests(validBidRequestsMulti, validBidderRequest.bidderRequest);
      let validres = JSON.parse(JSON.stringify(validResponse2BidsSameAdunit));
      const result = spec.interpretResponse(validres, request);
      expect(utils.deepAccess(result[0].adserverTargeting, 'oz_ozappnexus_sid')).to.equal(result[0].cid);
    });
    it('should add unique adId values to each bid', function() {
      const request = spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      let validres = JSON.parse(JSON.stringify(validResponse2BidsSameAdunit));
      const result = spec.interpretResponse(validres, request);
      expect(result.length).to.equal(1);
      expect(result[0]['price']).to.equal(0.9);
      expect(result[0]['adserverTargeting']['oz_ozappnexus_adId']).to.equal('2899ec066a91ff8-0-1');
    });
    it('should correctly process an auction with 2 adunits & multiple bidders one of which bids for both adslots', function() {
      let validres = JSON.parse(JSON.stringify(multiResponse1));
      let request = spec.buildRequests(multiRequest1, multiBidderRequest1.bidderRequest);
      let result = spec.interpretResponse(validres, request);
      expect(result.length).to.equal(4); // one of the 5 bids will have been removed
      expect(result[1]['price']).to.equal(0.521);
      expect(result[1]['impid']).to.equal('3025f169863b7f8');
      expect(result[1]['id']).to.equal('18552976939844999');
      expect(result[1]['adserverTargeting']['oz_ozappnexus_adId']).to.equal('3025f169863b7f8-0-2');
      // change the bid values so a different second bid for an impid by the same bidder gets dropped
      validres = JSON.parse(JSON.stringify(multiResponse1));
      validres.body.seatbid[0].bid[1].price = 1.1;
      validres.body.seatbid[0].bid[1].cpm = 1.1;
      request = spec.buildRequests(multiRequest1, multiBidderRequest1.bidderRequest);
      result = spec.interpretResponse(validres, request);
      expect(result[1]['price']).to.equal(1.1);
      expect(result[1]['impid']).to.equal('3025f169863b7f8');
      expect(result[1]['id']).to.equal('18552976939844681');
      expect(result[1]['adserverTargeting']['oz_ozappnexus_adId']).to.equal('3025f169863b7f8-0-1');
    });
  });

  describe('userSyncs', function () {
    it('should fail gracefully if no server response', function () {
      const result = spec.getUserSyncs('bad', false, gdpr1);
      expect(result).to.be.empty;
    });
    it('should fail gracefully if server response is empty', function () {
      const result = spec.getUserSyncs('bad', [], gdpr1);
      expect(result).to.be.empty;
    });
    it('should append the various values if they exist', function() {
      // get the cookie bag populated
      spec.buildRequests(validBidRequests, validBidderRequest.bidderRequest);
      const result = spec.getUserSyncs({iframeEnabled: true}, 'good server response', gdpr1);
      expect(result).to.be.an('array');
      expect(result[0].url).to.include('publisherId=9876abcd12-3');
      expect(result[0].url).to.include('siteId=1234567890');
      expect(result[0].url).to.include('gdpr=1');
      expect(result[0].url).to.include('gdpr_consent=BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA');
    });
  });

  describe('video object utils', function () {
    it('should find width & height from video object', function () {
      let obj = {'playerSize': [640, 480], 'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = getWidthAndHeightFromVideoObject(obj);
      expect(result.w).to.equal(640);
      expect(result.h).to.equal(480);
    });
    it('should find null from bad video object', function () {
      let obj = {'playerSize': [], 'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = getWidthAndHeightFromVideoObject(obj);
      expect(result).to.be.null;
    });
    it('should find null from bad video object2', function () {
      let obj = {'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = getWidthAndHeightFromVideoObject(obj);
      expect(result).to.be.null;
    });
    it('should find null from bad video object3', function () {
      let obj = {'playerSize': 'should be an array', 'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = getWidthAndHeightFromVideoObject(obj);
      expect(result).to.be.null;
    });
    it('should find that player size is nested', function () {
      let obj = {'playerSize': [[640, 480]], 'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = getWidthAndHeightFromVideoObject(obj);
      expect(result.w).to.equal(640);
      expect(result.h).to.equal(480);
    });
    it('should fail if player size is 2 x nested', function () {
      let obj = {'playerSize': [[[640, 480]]], 'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = getWidthAndHeightFromVideoObject(obj);
      expect(result).to.be.null;
    });
    it('should find that player size is nested', function () {
      let obj = {'playerSize': [[640, 480]], 'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = playerSizeIsNestedArray(obj);
      expect(result).to.be.true;
    });
    it('should find null from bad video object', function () {
      let obj = {'playerSize': [], 'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = playerSizeIsNestedArray(obj);
      expect(result).to.be.null;
    });
    it('should find null from bad video object2', function () {
      let obj = {'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = playerSizeIsNestedArray(obj);
      expect(result).to.be.null;
    });
    it('should find null from bad video object3', function () {
      let obj = {'playerSize': 'should be an array', 'mimes': ['video/mp4'], 'context': 'outstream'};
      const result = playerSizeIsNestedArray(obj);
      expect(result).to.be.null;
    });
  });

  describe('default size', function () {
    it('should should return default sizes if no obj is sent', function () {
      let obj = '';
      const result = defaultSize(obj);
      expect(result.defaultHeight).to.equal(250);
      expect(result.defaultWidth).to.equal(300);
    });
  });

  describe('getGranularityKeyName', function() {
    it('should return a string granularity as-is', function() {
      const result = getGranularityKeyName('', 'this is it', '');
      expect(result).to.equal('this is it');
    });
    it('should return "custom" for a mediaTypeGranularity object', function() {
      const result = getGranularityKeyName('', {}, '');
      expect(result).to.equal('custom');
    });
    it('should return "custom" for a mediaTypeGranularity object', function() {
      const result = getGranularityKeyName('', false, 'string buckets');
      expect(result).to.equal('string buckets');
    });
  });

  describe('getGranularityObject', function() {
    it('should return an object as-is', function() {
      const result = getGranularityObject('', {'name': 'mark'}, '', '');
      expect(result.name).to.equal('mark');
    });
    it('should return an object as-is', function() {
      const result = getGranularityObject('', false, 'custom', {'name': 'rupert'});
      expect(result.name).to.equal('rupert');
    });
  });

  describe('blockTheRequest', function() {
    it('should return true if oz_request is false', function() {
      config.setConfig({'ozone': {'oz_request': false}});
      let result = spec.blockTheRequest(bidderRequestWithFullGdpr);
      expect(result).to.be.true;
      config.resetConfig();
    });
    it('should return false if oz_request is true', function() {
      config.setConfig({'ozone': {'oz_request': true}});
      let result = spec.blockTheRequest(bidderRequestWithFullGdpr);
      expect(result).to.be.false;
      config.resetConfig();
    });
  });
  describe('makeLotameObjectFromOverride', function() {
    it('should update an object with valid lotame data', function () {
      let objLotameOverride = {'oz_lotametpid': '1234', 'oz_lotameid': '12345', 'oz_lotamepid': '123456'};
      let result = spec.makeLotameObjectFromOverride(
        objLotameOverride,
        {'Profile': {'pid': 'originalpid', 'tpid': 'originaltpid', 'Audiences': {'Audience': [{'id': 'aud1'}]}}}
      );
      expect(result.Profile.Audiences.Audience).to.be.an('array');
      expect(result.Profile.Audiences.Audience[0]).to.be.an('object');
      expect(result.Profile.Audiences.Audience[0]).to.deep.include({'id': '12345', 'abbr': '12345'});
    });
    it('should return the original object if it seems weird', function () {
      let objLotameOverride = {'oz_lotametpid': '1234', 'oz_lotameid': '12345', 'oz_lotamepid': '123456'};
      let objLotameOriginal = {'Profile': {'pid': 'originalpid', 'tpid': 'originaltpid', 'somethingstrange': [{'id': 'aud1'}]}};
      let result = spec.makeLotameObjectFromOverride(
        objLotameOverride,
        objLotameOriginal
      );
      expect(result).to.equal(objLotameOriginal);
    });
  });
  describe('lotameDataIsValid', function() {
    it('should allow a valid minimum lotame object', function() {
      let obj = {'Profile': {'pid': '', 'tpid': '', 'Audiences': {'Audience': []}}};
      let result = spec.isLotameDataValid(obj);
      expect(result).to.be.true;
    });
    it('should allow a valid lotame object', function() {
      let obj = {'Profile': {'pid': '12345', 'tpid': '45678', 'Audiences': {'Audience': [{'id': '1234', 'abbr': '567'}, {'id': '9999', 'abbr': '1111'}]}}};
      let result = spec.isLotameDataValid(obj);
      expect(result).to.be.true;
    });
    it('should disallow a lotame object without an Audience.id', function() {
      let obj = {'Profile': {'tpid': '', 'pid': '', 'Audiences': {'Audience': [{'abbr': 'marktest'}]}}};
      let result = spec.isLotameDataValid(obj);
      expect(result).to.be.false;
    });
  });
  describe('getPageId', function() {
    it('should return the same Page ID for multiple calls', function () {
      let result = spec.getPageId();
      expect(result).to.be.a('string');
      let result2 = spec.getPageId();
      expect(result2).to.equal(result);
    });
  });
  describe('getBidRequestForBidId', function() {
    it('should locate a bid inside a bid array', function () {
      let result = spec.getBidRequestForBidId('2899ec066a91ff8', validBidRequestsMulti);
      expect(result.testId).to.equal(1);
      result = spec.getBidRequestForBidId('2899ec066a91ff0', validBidRequestsMulti);
      expect(result.testId).to.equal(2);
    });
  });
  describe('getVideoContextForBidId', function() {
    it('should locate the video context inside a bid', function () {
      let result = spec.getVideoContextForBidId('2899ec066a91ff8', validBidRequestsWithNonBannerMediaTypesAndValidOutstreamVideo);
      expect(result).to.equal('outstream');
    });
  });
  describe('getLotameOverrideParams', function() {
    it('should get 3 valid lotame params that exist in GET params', function () {
      // mock the getGetParametersAsObject function to simulate GET parameters for lotame overrides:
      spec.getGetParametersAsObject = function() {
        return {'oz_lotameid': '123abc', 'oz_lotamepid': 'pid123', 'oz_lotametpid': 'tpid123'};
      };
      let result = spec.getLotameOverrideParams();
      expect(Object.keys(result).length).to.equal(3);
    });
    it('should get only 1 valid lotame param that exists in GET params', function () {
      // mock the getGetParametersAsObject function to simulate GET parameters for lotame overrides:
      spec.getGetParametersAsObject = function() {
        return {'oz_lotameid': '123abc', 'xoz_lotamepid': 'pid123', 'xoz_lotametpid': 'tpid123'};
      };
      let result = spec.getLotameOverrideParams();
      expect(Object.keys(result).length).to.equal(1);
    });
  });
  describe('unpackVideoConfigIntoIABformat', function() {
    it('should correctly unpack a usual video config', function () {
      let mediaTypes = {
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        context: 'outstream',
        testKey: 'parent value'
      };
      let bid_params_video = {
        skippable: true,
        playback_method: ['auto_play_sound_off'],
        playbackmethod: 2, /* start on load, no sound */
        minduration: 5,
        maxduration: 60,
        skipmin: 5,
        skipafter: 5,
        testKey: 'child value'
      };
      let result = spec.unpackVideoConfigIntoIABformat(mediaTypes, bid_params_video);
      expect(result.mimes).to.be.an('array').that.includes('video/mp4');
      expect(result.ext.context).to.equal('outstream');
      expect(result.ext.skippable).to.be.true; // note - we add skip in a different step: addVideoDefaults
      expect(result.ext.testKey).to.equal('child value');
    });
  });
  describe('addVideoDefaults', function() {
    it('should correctly add video defaults', function () {
      let mediaTypes = {
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        context: 'outstream',
      };
      let bid_params_video = {
        skippable: true,
        playback_method: ['auto_play_sound_off'],
        playbackmethod: 2, /* start on load, no sound */
        minduration: 5,
        maxduration: 60,
        skipmin: 5,
        skipafter: 5,
        testKey: 'child value'
      };
      let result = spec.addVideoDefaults({}, mediaTypes, mediaTypes);
      expect(result.placement).to.equal(3);
      expect(result.skip).to.equal(0);
      result = spec.addVideoDefaults({}, mediaTypes, bid_params_video);
      expect(result.skip).to.equal(1);
    });
    it('should correctly add video defaults including skippable in parent', function () {
      let mediaTypes = {
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        context: 'outstream',
        skippable: true
      };
      let bid_params_video = {
        playback_method: ['auto_play_sound_off'],
        playbackmethod: 2, /* start on load, no sound */
        minduration: 5,
        maxduration: 60,
        skipmin: 5,
        skipafter: 5,
        testKey: 'child value'
      };
      let result = spec.addVideoDefaults({}, mediaTypes, bid_params_video);
      expect(result.placement).to.equal(3);
      expect(result.skip).to.equal(1);
    });
  });
  describe('removeSingleBidderMultipleBids', function() {
    it('should remove the multi bid by ozappnexus for adslot 2d30e86db743a8', function() {
      let validres = JSON.parse(JSON.stringify(multiResponse1));
      expect(validres.body.seatbid[0].bid.length).to.equal(3);
      expect(validres.body.seatbid[0].seat).to.equal('ozappnexus');
      let response = spec.removeSingleBidderMultipleBids(validres.body.seatbid);
      expect(response.length).to.equal(2);
      expect(response[0].bid.length).to.equal(2);
      expect(response[0].seat).to.equal('ozappnexus');
      expect(response[1].bid.length).to.equal(2);
    });
  });
});
