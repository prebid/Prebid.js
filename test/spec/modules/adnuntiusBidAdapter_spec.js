// import or require modules necessary for the test, e.g.:
import {expect} from 'chai'; // may prefer 'assert' in place of 'expect'
import {misc, spec} from 'modules/adnuntiusBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import {getStorageManager} from 'src/storageManager.js';
import {getGlobal} from '../../../src/prebidGlobal';

describe('adnuntiusBidAdapter', function() {
  const URL = 'https://ads.adnuntius.delivery/i?tzo=';
  const EURO_URL = 'https://europe.delivery.adnuntius.com/i?tzo=';
  const GVLID = 855;
  const usi = utils.generateUUID()
  const meta = [{key: 'valueless'}, {value: 'keyless'}, {key: 'voidAuIds'}, {key: 'voidAuIds', value: [{auId: '11118b6bc', exp: misc.getUnixTimestamp()}, {exp: misc.getUnixTimestamp(1)}]}, {key: 'valid', value: 'also-valid', exp: misc.getUnixTimestamp(1)}, {key: 'expired', value: 'fwefew', exp: misc.getUnixTimestamp()}, {key: 'usi', value: 'should be skipped because timestamp', exp: misc.getUnixTimestamp()}, {key: 'usi', value: usi, exp: misc.getUnixTimestamp(100)}, {key: 'usi', value: 'should be skipped because timestamp', exp: misc.getUnixTimestamp()}]
  let storage;

  beforeEach(() => {
    getGlobal().bidderSettings = {
      adnuntius: {
        storageAllowed: true
      }
    };

    storage = getStorageManager({gvlid: GVLID, bidderCode: 'adnuntius'});
    storage.setDataInLocalStorage('adn.meta', JSON.stringify(meta));
  });

  afterEach(function() {
    config.resetConfig();
    getGlobal().bidderSettings = {};
  });

  const tzo = new Date().getTimezoneOffset();
  const ENDPOINT_URL_BASE = `${URL}${tzo}&format=json`;
  const ENDPOINT_URL = `${ENDPOINT_URL_BASE}&userId=${usi}`;
  const ENDPOINT_URL_VIDEO = `${ENDPOINT_URL_BASE}&userId=${usi}&tt=vast4`;
  const ENDPOINT_URL_NOCOOKIE = `${ENDPOINT_URL_BASE}&userId=${usi}&noCookies=true`;
  const ENDPOINT_URL_SEGMENTS = `${ENDPOINT_URL_BASE}&segments=segment1,segment2,segment3&userId=${usi}`;
  const ENDPOINT_URL_CONSENT = `${EURO_URL}${tzo}&format=json&consentString=consentString&userId=${usi}`;
  const adapter = newBidder(spec);

  const bidderRequests = [
    {
      bidId: '123',
      bidder: 'adnuntius',
      params: {
        auId: '8b6bc',
        network: 'adnuntius',
      },
      mediaTypes: {
        banner: {
          sizes: [[640, 480], [600, 400]],
        }
      },
    },
    {
      bidId: '1235',
      bidder: 'adnuntius',
      params: {
        auId: '11118b6bc',
        network: 'adnuntius',
      },
      mediaTypes: {
        banner: {
          sizes: [[1640, 1480], [1600, 1400]],
        }
      },
    }
  ]

  const videoBidderRequest = [
    {
      bidId: '123',
      bidder: 'adnuntius',
      params: {
        auId: '8b6bc',
        network: 'adnuntius',
      },
      mediaTypes: {
        video: {
          playerSize: [640, 480],
          context: 'instream'
        }
      },
    }
  ]

  // const nativeBidderRequest = [
  //   {
  //     bidId: '123',
  //     bidder: 'adnuntius',
  //     params: {
  //       auId: '8b6bc',
  //       network: 'adnuntius',
  //     },
  //     mediaTypes: {
  //       native: {
  //         title: {
  //           required: true
  //         },
  //         image: {
  //           required: true
  //         },
  //         body: {
  //           required: true
  //         }
  //       }
  //     },
  //   }
  // ]

  const singleBidRequest = {
    bid: [
      {
        bidId: '123',
      }
    ]
  }

  const videoBidRequest = {
    bid: videoBidderRequest
  }

  // const nativeBidRequest = {
  //   bid: nativeBidderRequest
  // }

  const serverResponse = {
    body: {
      'adUnits': [
        {
          'auId': '000000000008b6bc',
          'targetId': '123',
          'html': '<h1>hi!</h1>',
          'matchedAdCount': 1,
          'responseId': 'adn-rsp-1460129238',
          'ads': [
            {
              'destinationUrlEsc': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fc%2F52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN%3Fct%3D2501%26r%3Dhttp%253A%252F%252Fgoogle.com',
              'assets': {
                'image': {
                  'cdnId': 'https://assets.adnuntius.com/oEmZa5uYjxENfA1R692FVn6qIveFpO8wUbpyF2xSOCc.jpg',
                  'width': '980',
                  'height': '120'
                }
              },
              'clickUrl': 'https://delivery.adnuntius.com/c/52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'urls': {
                'destination': 'https://delivery.adnuntius.com/c/52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN?ct=2501&r=http%3A%2F%2Fgoogle.com'
              },
              'urlsEsc': {
                'destination': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fc%2F52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN%3Fct%3D2501%26r%3Dhttp%253A%252F%252Fgoogle.com'
              },
              'destinationUrls': {
                'destination': 'http://google.com'
              },
              'cpm': {'amount': 5.0, 'currency': 'NOK'},
              'bid': {'amount': 0.005, 'currency': 'NOK'},
              'cost': {'amount': 0.005, 'currency': 'NOK'},
              'impressionTrackingUrls': [],
              'impressionTrackingUrlsEsc': [],
              'adId': 'adn-id-1347343135',
              'selectedColumn': '0',
              'selectedColumnPosition': '0',
              'renderedPixel': 'https://delivery.adnuntius.com/b/52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN.html',
              'renderedPixelEsc': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fb%2F52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN.html',
              'visibleUrl': 'https://delivery.adnuntius.com/s?rt=52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'visibleUrlEsc': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fs%3Frt%3D52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'viewUrl': 'https://delivery.adnuntius.com/v?rt=52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'viewUrlEsc': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fv%3Frt%3D52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'rt': '52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'creativeWidth': '980',
              'creativeHeight': '120',
              'creativeId': 'wgkq587vgtpchsx1',
              'lineItemId': 'scyjdyv3mzgdsnpf',
              'layoutId': 'sw6gtws2rdj1kwby',
              'layoutName': 'Responsive image'
            },

          ]
        },
        {
          'auId': '000000000008b6bc',
          'targetId': '456',
          'matchedAdCount': 0,
          'responseId': 'adn-rsp-1460129238',
        }
      ],
      'metaData': {
        'usi': 'from-api-server dude',
        'voidAuIds': '00000000000abcde;00000000000fffff',
        'randomApiKey': 'randomApiValue'
      }
    }
  }
  const serverVideoResponse = {
    body: {
      'adUnits': [
        {
          'auId': '000000000008b6bc',
          'targetId': '123',
          'html': '<h1>hi!</h1>',
          'matchedAdCount': 1,
          'responseId': 'adn-rsp-1460129238',
          'ads': [
            {
              'destinationUrlEsc': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fc%2F52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN%3Fct%3D2501%26r%3Dhttp%253A%252F%252Fgoogle.com',
              'assets': {
                'image': {
                  'cdnId': 'https://assets.adnuntius.com/oEmZa5uYjxENfA1R692FVn6qIveFpO8wUbpyF2xSOCc.jpg',
                  'width': '980',
                  'height': '120'
                }
              },
              'clickUrl': 'https://delivery.adnuntius.com/c/52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'urls': {
                'destination': 'https://delivery.adnuntius.com/c/52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN?ct=2501&r=http%3A%2F%2Fgoogle.com'
              },
              'urlsEsc': {
                'destination': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fc%2F52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN%3Fct%3D2501%26r%3Dhttp%253A%252F%252Fgoogle.com'
              },
              'destinationUrls': {
                'destination': 'http://google.com'
              },
              'cpm': {'amount': 5.0, 'currency': 'NOK'},
              'bid': {'amount': 0.005, 'currency': 'NOK'},
              'cost': {'amount': 0.005, 'currency': 'NOK'},
              'impressionTrackingUrls': [],
              'impressionTrackingUrlsEsc': [],
              'adId': 'adn-id-1347343135',
              'selectedColumn': '0',
              'selectedColumnPosition': '0',
              'renderedPixel': 'https://delivery.adnuntius.com/b/52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN.html',
              'renderedPixelEsc': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fb%2F52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN.html',
              'visibleUrl': 'https://delivery.adnuntius.com/s?rt=52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'visibleUrlEsc': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fs%3Frt%3D52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'viewUrl': 'https://delivery.adnuntius.com/v?rt=52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'viewUrlEsc': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fv%3Frt%3D52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'rt': '52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
              'creativeWidth': '980',
              'creativeHeight': '120',
              'creativeId': 'wgkq587vgtpchsx1',
              'lineItemId': 'scyjdyv3mzgdsnpf',
              'layoutId': 'sw6gtws2rdj1kwby',
              'layoutName': 'Responsive image'
            },

          ]
        },
        {
          'auId': '000000000008b6bc',
          'targetId': '456',
          'matchedAdCount': 0,
          'responseId': 'adn-rsp-1460129238',
        }
      ]
    }
  }
  // const serverNativeResponse = {
  //   body: {
  //     'adUnits': [
  //       {
  //         'auId': '000000000008b6bc',
  //         'targetId': '123',
  //         'html': '<h1>hi!</h1>',
  //         'matchedAdCount': 1,
  //         'responseId': 'adn-rsp-1460129238',
  //         'ads': [
  //           {
  //             'destinationUrlEsc': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fc%2F52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN%3Fct%3D2501%26r%3Dhttp%253A%252F%252Fgoogle.com',
  //             'assets': {
  //               'image': {
  //                 'cdnId': 'https://assets.adnuntius.com/K9rfXC6wJvgVuy4Fbt5P8oEEGXme9ZaP8BNDzz3OMGQ.jpg',
  //                 'width': '300',
  //                 'height': '250'
  //               }
  //             },
  //             'text': {
  //               'body': {
  //                 'content': 'Testing Native ad from Adnuntius',
  //                 'length': '32',
  //                 'minLength': '0',
  //                 'maxLength': '100'
  //               },
  //               'title': {
  //                 'content': 'Native Ad',
  //                 'length': '9',
  //                 'minLength': '5',
  //                 'maxLength': '100'
  //               }
  //             },
  //             'clickUrl': 'https://delivery.adnuntius.com/c/52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
  //             'urls': {
  //               'destination': 'https://delivery.adnuntius.com/c/52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN?ct=2501&r=http%3A%2F%2Fgoogle.com'
  //             },
  //             'urlsEsc': {
  //               'destination': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fc%2F52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN%3Fct%3D2501%26r%3Dhttp%253A%252F%252Fgoogle.com'
  //             },
  //             'destinationUrls': {
  //               'destination': 'http://google.com'
  //             },
  //             'cpm': { 'amount': 5.0, 'currency': 'NOK' },
  //             'bid': { 'amount': 0.005, 'currency': 'NOK' },
  //             'cost': { 'amount': 0.005, 'currency': 'NOK' },
  //             'impressionTrackingUrls': [],
  //             'impressionTrackingUrlsEsc': [],
  //             'adId': 'adn-id-1347343135',
  //             'selectedColumn': '0',
  //             'selectedColumnPosition': '0',
  //             'renderedPixel': 'https://delivery.adnuntius.com/b/52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN.html',
  //             'renderedPixelEsc': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fb%2F52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN.html',
  //             'visibleUrl': 'https://delivery.adnuntius.com/s?rt=52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
  //             'visibleUrlEsc': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fs%3Frt%3D52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
  //             'viewUrl': 'https://delivery.adnuntius.com/v?rt=52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
  //             'viewUrlEsc': 'https%3A%2F%2Fdelivery.adnuntius.com%2Fv%3Frt%3D52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
  //             'rt': '52AHNuxCqxB_Y9ZP9ERWkMBPCOha4zuV3aKn5cog5jsAAAAQCtjQz9kbGWD4nuZy3q6HaHGLB4-k_fySWECIOOmHKY6iokgHNFH-U57ew_-1QHlKnFr2NT8y4QK1oU5HxnDLbYPz-GmQ3C2JyxLGpKmIb-P-3bm7HYPEreNjPdhjRG51A8NGuc4huUhns7nEUejHuOjOHE5sV1zfYxCRWRx9wPDN9EUCC7KN',
  //             'creativeWidth': '980',
  //             'creativeHeight': '120',
  //             'creativeId': 'wgkq587vgtpchsx1',
  //             'lineItemId': 'scyjdyv3mzgdsnpf',
  //             'layoutId': 'sw6gtws2rdj1kwby',
  //             'layoutName': 'Responsive image'
  //           },

  //         ]
  //       },
  //       {
  //         'auId': '000000000008b6bc',
  //         'targetId': '456',
  //         'matchedAdCount': 0,
  //         'responseId': 'adn-rsp-1460129238',
  //       }
  //     ]
  //   }
  // }

  describe('inherited functions', function() {
    it('exists and is a function', function() {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function() {
    it('should return true when required params found', function() {
      expect(spec.isBidRequestValid(bidderRequests[0])).to.equal(true);
    });
  });

  describe('buildRequests', function() {
    it('Test requests', function() {
      const request = spec.buildRequests(bidderRequests, {});
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('bid');
      const bid = request[0].bid[0]
      expect(bid).to.have.property('bidId');
      expect(request[0]).to.have.property('url');
      expect(request[0].url).to.equal(ENDPOINT_URL);
      expect(request[0]).to.have.property('data');
      expect(request[0].data).to.equal('{"adUnits":[{"auId":"8b6bc","targetId":"123","dimensions":[[640,480],[600,400]]},{"auId":"11118b6bc","targetId":"1235","dimensions":[[1640,1480],[1600,1400]]}],"metaData":{"valid":"also-valid","usi":"' + usi + '"}}');
    });

    it('Test requests with no local storage', function() {
      storage.setDataInLocalStorage('adn.meta', JSON.stringify([{}]));
      const request = spec.buildRequests(bidderRequests, {});
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('bid');
      const bid = request[0].bid[0]
      expect(bid).to.have.property('bidId');
      expect(request[0]).to.have.property('url');
      expect(request[0].url).to.equal(ENDPOINT_URL_BASE);
      expect(request[0]).to.have.property('data');
      expect(request[0].data).to.equal('{"adUnits":[{"auId":"8b6bc","targetId":"123","dimensions":[[640,480],[600,400]]},{"auId":"11118b6bc","targetId":"1235","dimensions":[[1640,1480],[1600,1400]]}]}');

      localStorage.removeItem('adn.meta');
      const request2 = spec.buildRequests(bidderRequests, {});
      expect(request2.length).to.equal(1);
      expect(request2[0]).to.have.property('url');
      expect(request2[0].url).to.equal(ENDPOINT_URL_BASE);
    });

    it('Test request changes for voided au ids', function() {
      storage.setDataInLocalStorage('adn.meta', JSON.stringify([{key: 'voidAuIds', value: [{auId: '11118b6bc', exp: misc.getUnixTimestamp(1)}]}]));
      const request = spec.buildRequests(bidderRequests, {});
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('bid');
      const bid = request[0].bid[0]
      expect(bid).to.have.property('bidId');
      expect(request[0]).to.have.property('url');
      expect(request[0].url).to.equal(ENDPOINT_URL_BASE);
      expect(request[0]).to.have.property('data');
      expect(request[0].data).to.equal('{"adUnits":[{"auId":"8b6bc","targetId":"123","dimensions":[[640,480],[600,400]]}]}');
    });

    it('Test Video requests', function() {
      const request = spec.buildRequests(videoBidderRequest, {});
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('bid');
      const bid = request[0].bid[0]
      expect(bid).to.have.property('bidId');
      expect(request[0]).to.have.property('url');
      expect(request[0].url).to.equal(ENDPOINT_URL_VIDEO);
    });

    it('should pass segments if available in config', function() {
      const ortb2 = {
        user: {
          data: [{
            name: 'adnuntius',
            segment: [{id: 'segment1'}, {id: 'segment2'}]
          },
          {
            name: 'other',
            segment: ['segment3']
          }],
        }
      };

      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, {ortb2}));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expect(request[0].url).to.equal(ENDPOINT_URL_SEGMENTS);
    });

    it('should skip segments in config if not either id or array of strings', function() {
      const ortb2 = {
        user: {
          data: [{
            name: 'adnuntius',
            segment: [{id: 'segment1'}, {id: 'segment2'}, {id: 'segment3'}]
          },
          {
            name: 'other',
            segment: [{
              notright: 'segment4'
            }]
          }],
        }
      };

      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, {ortb2}));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expect(request[0].url).to.equal(ENDPOINT_URL_SEGMENTS);
    });
  });

  describe('user privacy', function() {
    it('should send GDPR Consent data if gdprApplies', function() {
      let request = spec.buildRequests(bidderRequests, {gdprConsent: {gdprApplies: true, consentString: 'consentString'}});
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expect(request[0].url).to.equal(ENDPOINT_URL_CONSENT);
    });

    it('should not send GDPR Consent data if gdprApplies equals undefined', function() {
      let request = spec.buildRequests(bidderRequests, {gdprConsent: {gdprApplies: undefined, consentString: 'consentString'}});
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expect(request[0].url).to.equal(ENDPOINT_URL);
    });

    it('should pass segments if available in config', function() {
      const ortb2 = {
        user: {
          data: [{
            name: 'adnuntius',
            segment: [{id: 'segment1'}, {id: 'segment2'}]
          },
          {
            name: 'other',
            segment: ['segment3']
          }],
        }
      }

      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, {ortb2}));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expect(request[0].url).to.equal(ENDPOINT_URL_SEGMENTS);
    });

    it('should skip segments in config if not either id or array of strings', function() {
      const ortb2 = {
        user: {
          data: [{
            name: 'adnuntius',
            segment: [{id: 'segment1'}, {id: 'segment2'}, {id: 'segment3'}]
          },
          {
            name: 'other',
            segment: [{
              notright: 'segment4'
            }]
          }],
        }
      };

      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, {ortb2}));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expect(request[0].url).to.equal(ENDPOINT_URL_SEGMENTS);
    });

    it('should user user ID if present in ortb2.user.id field', function() {
      const ortb2 = {
        user: {
          id: usi
        }
      };

      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, {ortb2}));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expect(request[0].url).to.equal(ENDPOINT_URL);
    });
  });

  describe('user privacy', function() {
    it('should send GDPR Consent data if gdprApplies', function() {
      let request = spec.buildRequests(bidderRequests, {gdprConsent: {gdprApplies: true, consentString: 'consentString'}});
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expect(request[0].url).to.equal(ENDPOINT_URL_CONSENT);
    });

    it('should not send GDPR Consent data if gdprApplies equals undefined', function() {
      let request = spec.buildRequests(bidderRequests, {gdprConsent: {gdprApplies: undefined, consentString: 'consentString'}});
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expect(request[0].url).to.equal(ENDPOINT_URL);
    });
  });

  describe('use cookie', function() {
    it('should send noCookie in url if set to false.', function() {
      config.setBidderConfig({
        bidders: ['adnuntius'],
        config: {
          useCookie: false
        }
      });

      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, {}));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expect(request[0].url).to.equal(ENDPOINT_URL_NOCOOKIE);
    });
  });

  describe('interpretResponse', function() {
    it('should return valid response when passed valid server response', function() {
      const interpretedResponse = spec.interpretResponse(serverResponse, singleBidRequest);
      const ad = serverResponse.body.adUnits[0].ads[0]
      expect(interpretedResponse).to.have.lengthOf(1);
      expect(interpretedResponse[0].cpm).to.equal(ad.cpm.amount);
      expect(interpretedResponse[0].width).to.equal(Number(ad.creativeWidth));
      expect(interpretedResponse[0].height).to.equal(Number(ad.creativeHeight));
      expect(interpretedResponse[0].creativeId).to.equal(ad.creativeId);
      expect(interpretedResponse[0].currency).to.equal(ad.bid.currency);
      expect(interpretedResponse[0].netRevenue).to.equal(false);
      expect(interpretedResponse[0].meta).to.have.property('advertiserDomains');
      expect(interpretedResponse[0].meta.advertiserDomains).to.have.lengthOf(1);
      expect(interpretedResponse[0].meta.advertiserDomains[0]).to.equal('google.com');
      expect(interpretedResponse[0].ad).to.equal(serverResponse.body.adUnits[0].html);
      expect(interpretedResponse[0].ttl).to.equal(360);

      const results = JSON.parse(storage.getDataFromLocalStorage('adn.meta'));
      const usiEntry = results.find(entry => entry.key === 'usi');
      expect(usiEntry.key).to.equal('usi');
      expect(usiEntry.value).to.equal('from-api-server dude');
      expect(usiEntry.exp).to.be.greaterThan(misc.getUnixTimestamp(90));

      const voidAuIdsEntry = results.find(entry => entry.key === 'voidAuIds');
      expect(voidAuIdsEntry.key).to.equal('voidAuIds');
      expect(voidAuIdsEntry.exp).to.equal(undefined);
      expect(voidAuIdsEntry.value[0].auId).to.equal('00000000000abcde');
      expect(voidAuIdsEntry.value[0].exp).to.be.greaterThan(misc.getUnixTimestamp());
      expect(voidAuIdsEntry.value[0].exp).to.be.lessThan(misc.getUnixTimestamp(2));
      expect(voidAuIdsEntry.value[1].auId).to.equal('00000000000fffff');
      expect(voidAuIdsEntry.value[1].exp).to.be.greaterThan(misc.getUnixTimestamp());
      expect(voidAuIdsEntry.value[1].exp).to.be.lessThan(misc.getUnixTimestamp(2));

      const validEntry = results.find(entry => entry.key === 'valid');
      expect(validEntry.key).to.equal('valid');
      expect(validEntry.value).to.equal('also-valid');
      expect(validEntry.exp).to.be.greaterThan(misc.getUnixTimestamp());
      expect(validEntry.exp).to.be.lessThan(misc.getUnixTimestamp(2));

      const randomApiEntry = results.find(entry => entry.key === 'randomApiKey');
      expect(randomApiEntry.key).to.equal('randomApiKey');
      expect(randomApiEntry.value).to.equal('randomApiValue');
      expect(randomApiEntry.exp).to.be.greaterThan(misc.getUnixTimestamp(90));
    });
  });
  describe('interpretVideoResponse', function() {
    it('should return valid response when passed valid server response', function() {
      const interpretedResponse = spec.interpretResponse(serverVideoResponse, videoBidRequest);
      const ad = serverVideoResponse.body.adUnits[0].ads[0]
      expect(interpretedResponse).to.have.lengthOf(1);
      expect(interpretedResponse[0].cpm).to.equal(ad.cpm.amount);
      expect(interpretedResponse[0].width).to.equal(Number(ad.creativeWidth));
      expect(interpretedResponse[0].height).to.equal(Number(ad.creativeHeight));
      expect(interpretedResponse[0].creativeId).to.equal(ad.creativeId);
      expect(interpretedResponse[0].currency).to.equal(ad.bid.currency);
      expect(interpretedResponse[0].netRevenue).to.equal(false);
      expect(interpretedResponse[0].meta).to.have.property('advertiserDomains');
      expect(interpretedResponse[0].meta.advertiserDomains).to.have.lengthOf(1);
      expect(interpretedResponse[0].meta.advertiserDomains[0]).to.equal('google.com');
      expect(interpretedResponse[0].vastXml).to.equal(serverVideoResponse.body.adUnits[0].vastXml);
    });
  });
  // describe('interpretNativeResponse', function () {
  //   it('should return valid response when passed valid server response', function () {
  //     const interpretedResponse = spec.interpretResponse(serverNativeResponse, nativeBidRequest);
  //     const ad = serverNativeResponse.body.adUnits[0].ads[0]
  //     expect(interpretedResponse).to.have.lengthOf(1);
  //     expect(interpretedResponse[0].cpm).to.equal(ad.cpm.amount);
  //     expect(interpretedResponse[0].width).to.equal(Number(ad.creativeWidth));
  //     expect(interpretedResponse[0].height).to.equal(Number(ad.creativeHeight));
  //     expect(interpretedResponse[0].creativeId).to.equal(ad.creativeId);
  //     expect(interpretedResponse[0].currency).to.equal(ad.bid.currency);
  //     expect(interpretedResponse[0].netRevenue).to.equal(false);
  //     expect(interpretedResponse[0].meta).to.have.property('advertiserDomains');
  //     expect(interpretedResponse[0].meta.advertiserDomains).to.have.lengthOf(1);
  //     expect(interpretedResponse[0].meta.advertiserDomains[0]).to.equal('google.com');
  //     expect(interpretedResponse[0].native.body).to.equal(serverNativeResponse.body.adUnits[0].ads[0].text.body.content);
  //   });
  // });
});
