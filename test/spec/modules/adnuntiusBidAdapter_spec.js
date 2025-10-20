import {expect} from 'chai';
import {spec} from 'modules/adnuntiusBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import {deepClone, getUnixTimestampFromNow} from 'src/utils.js';
import {getStorageManager} from 'src/storageManager.js';
import {getGlobal} from '../../../src/prebidGlobal.js';
import {getWinDimensions} from '../../../src/utils.js';

import {getGlobalVarName} from '../../../src/buildOptions.js';

describe('adnuntiusBidAdapter', function () {
  const sandbox = sinon.createSandbox();
  const URL = 'https://ads.adnuntius.delivery/i?tzo=';
  const EURO_URL = 'https://europe.delivery.adnuntius.com/i?tzo=';
  const usi = utils.generateUUID()

  const meta = [{ key: 'valueless' }, { value: 'keyless' }, { key: 'voidAuIds' }, { key: 'voidAuIds', value: [{ auId: '11118b6bc', exp: getUnixTimestampFromNow() }, { exp: getUnixTimestampFromNow(1) }] }, { key: 'valid-withnetwork', value: 'also-valid-network', network: 'the-network', exp: getUnixTimestampFromNow(1) }, { key: 'valid', value: 'also-valid', exp: getUnixTimestampFromNow(1) }, { key: 'expired', value: 'fwefew', exp: getUnixTimestampFromNow() }, { key: 'usi', value: 'should be skipped because timestamp', exp: getUnixTimestampFromNow(), network: 'adnuntius' }, { key: 'usi', value: usi, exp: getUnixTimestampFromNow(100), network: 'adnuntius' }, { key: 'usi', value: 'should be skipped because timestamp', exp: getUnixTimestampFromNow() }]
  let storage;

  before(() => {
    getGlobal().bidderSettings = {
      adnuntius: {
        storageAllowed: true
      }
    };
    storage = getStorageManager({ bidderCode: 'adnuntius' });
    resetExpectedUrls();
  });

  beforeEach(() => {
    storage.setDataInLocalStorage('adn.metaData', JSON.stringify(meta));
    resetExpectedUrls();
  });

  afterEach(function () {
    config.resetConfig();
    config.setBidderConfig({ bidders: [] });
    localStorage.removeItem('adn.metaData');
    sandbox.restore();
    resetExpectedUrls();
  });

  after(() => {
    getGlobal().bidderSettings = {};
    resetExpectedUrls();
  });

  const tzo = new Date().getTimezoneOffset();
  const prebidVersion = getGlobal().version;

  let viewport;
  let ENDPOINT_URL_BASE;
  let ENDPOINT_URL;
  let LOCALHOST_URL;
  let ENDPOINT_URL_NOCOOKIE;
  let ENDPOINT_URL_SEGMENTS;
  let ENDPOINT_URL_CONSENT;

  function resetExpectedUrls() {
    const winDimensions = getWinDimensions();
    viewport = winDimensions.innerWidth + 'x' + winDimensions.innerHeight;
    ENDPOINT_URL_BASE = `${URL}${tzo}&format=prebid&pbv=${prebidVersion}&viewport=${viewport}`;
    ENDPOINT_URL = `${ENDPOINT_URL_BASE}&userId=${usi}`;
    LOCALHOST_URL = `http://localhost:8078/i?tzo=${tzo}&format=prebid&pbv=${prebidVersion}&viewport=${viewport}&userId=${usi}`;
    ENDPOINT_URL_NOCOOKIE = `${ENDPOINT_URL_BASE}&userId=${usi}&noCookies=true`;
    ENDPOINT_URL_SEGMENTS = `${ENDPOINT_URL_BASE}&segments=segment1,segment2,segment3&userId=${usi}`;
    ENDPOINT_URL_CONSENT = `${EURO_URL}${tzo}&format=prebid&pbv=${prebidVersion}&consentString=consentString&gdpr=1&viewport=${viewport}&userId=${usi}`;
  }

  function expectUrlsEqual(actual, expected) {
    const a = utils.parseUrl(actual);
    const e = utils.parseUrl(expected);
    expect(a.protocol + '://' + a.host + a.pathname).to.equal(e.protocol + '://' + e.host + e.pathname);
    const sortEntries = obj => Object.entries(obj).sort();
    const sortedExpectations = sortEntries(a.search);
    const sortedActuals = sortEntries(e.search);
    for (let i = 0; i < sortedExpectations.length; i++) {
      const expectation = sortedExpectations[i];
      const actual = sortedActuals[i];

      const expectationAsString = expectation[0] + ":" + expectation[1];
      const actualAsString = actual[0] + ":" + actual[1];
      expect(expectationAsString).to.equal(actualAsString);
    }
    expect(sortedExpectations.length).to.equal(sortedActuals.length);
  }

  const adapter = newBidder(spec);

  const bidderRequests = [
    {
      bidId: 'adn-000000000008b6bc',
      bidder: 'adnuntius',
      params: {
        auId: '000000000008b6bc',
        targetId: '123',
        network: 'adnuntius',
        maxDeals: 1
      },
      mediaTypes: {
        banner: {
          sizes: [[640, 480], [600, 400]],
        }
      },
    },
    {
      bidId: 'adn-0000000000000551',
      bidder: 'adnuntius',
      params: {
        auId: '0000000000000551',
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
      bidId: 'adn-0000000000000551',
      bidder: 'adnuntius',
      params: {
        auId: '0000000000000551',
        network: 'adnuntius',
      },
      mediaTypes: {
        video: {
          playerSize: [640, 480],
          context: 'instream'
        }
      },
    }
  ];

  const legacyNativeBidderRequest = {bid: [
    {
      bidId: 'adn-0000000000000551',
      bidder: 'adnuntius',
      params: {
        auId: '0000000000000551',
        network: 'adnuntius',
      },
      mediaTypes: {
        native: {
          sizes: [[200, 200], [300, 300]],
          image: {
            required: true,
            sizes: [250, 250]
          }
        }
      }
    }]};

  const nativeBidderRequest = {bid: [
    {
      bidId: 'adn-0000000000000551',
      bidder: 'adnuntius',
      params: {
        auId: '0000000000000551',
        network: 'adnuntius',
      },
      mediaTypes: {
        native: {
          sizes: [[200, 200], [300, 300]],
          ortb: {
            assets: [{
              id: 1,
              required: 1,
              img: {
                type: 3,
                w: 250,
                h: 250,
              }
            }]
          }
        }
      },
    }
  ]};

  const multiBidAndFormatRequest = {
    bid: [{
      bidder: 'adnuntius',
      bidId: '3a602680158a85',
      params: {
        auId: '381535',
        network: '1287',
        bidType: 'netBid',
      },
      mediaTypes: {
        banner: {
          sizes: [[200, 200]]
        },
        video: {
          playerSize: [200, 200],
          context: 'instream'
        }
      }
    },
    {
      bidder: 'adnuntius',
      bidId: 'fewwef',
      params: {
        auId: '381535',
        network: '1287',
        bidType: 'netBid',
        targetId: 'fred',
      },
      mediaTypes: {
        banner: {
          sizes: [[200, 200]]
        },
        video: {
          playerSize: [200, 200],
          context: 'instream'
        },
        native: {
          ortb: {
            assets: [{
              id: 1,
              required: 1,
              img: {
                type: 3,
                w: 150,
                h: 50,
              }
            }]
          }
        }
      }
    },
    {
      bidder: 'adnuntius',
      bidId: 'pol',
      params: {
        auId: '381535',
        network: '1287',
        bidType: 'netBid',
        targetId: 'alt',
      },
      mediaTypes: {
        banner: {
          sizes: [[200, 200]]
        },
        video: {
          playerSize: [200, 200],
          context: 'instream'
        },
        native: {
          ortb: {
            assets: [{
              id: 1,
              required: 1,
              img: {
                type: 3,
                w: 150,
                h: 50,
              }
            }]
          }
        }
      }
    }]
  };

  const multiBidderRequest = [
    {
      bidId: 'adn-0000000000000551',
      bidder: 'adnuntius',
      params: {
        auId: '0000000000000551',
        network: 'adnuntius',
      },
      mediaTypes: {
        video: {
          playerSize: [640, 480],
          context: 'instream'
        },
        banner: {
          sizes: [[1640, 1480], [1600, 1400]],
        }
      },
    }
  ];

  const singleBidRequest = {
    bid: [
      {
        bidder: 'adnuntius',
        bidId: 'adn-0000000000000551',
      }
    ]
  };

  const videoBidRequest = {
    bid: videoBidderRequest,
    bidder: 'adnuntius',
    params: {
      bidType: 'justsomestuff-error-handling'
    }
  };

  const deals = [
    {
      'destinationUrlEsc': 'http%3A%2F%2Fads.adnuntius.delivery%2Fc%2FyQtMUwYBn5P4v72WJMqLW4z7uJOBFXJTfjoRyz0z_wsAAAAQCtjQz9kbGWD4nuZy3q6HaCYxq6Lckz2kThplNb227EJdQ5032jcIGkf-UrPmXCU2EbXVaQ3Ok6_FNLuIDTONJyx6ZZCB10wGqA3OaSe1EqwQp84u1_5iQZAWDk73UYf7_vcIypn7ev-SICZ3qaevb2jYSRqTVZx6AiBZQQGlzlOOrbZU9AU1F-JwTds-YV3qtJHGlxI2peWFIuxFlOYyeX9Kzg%3Fct%3D673%26r%3Dhttp%253A%252F%252Fadnuntius.com',
      'assets': {
        'Image': {
          'cdnId': 'https://cdn.adnuntius.com/cdn/iBgqruUNbaUb2hmD3vws7WTi84jg_WB_-VOF_FeOZ7A.png',
          'width': '640',
          'height': '480'
        }
      },
      'text': {},
      'choices': {},
      'clickUrl': 'https://ads.adnuntius.delivery/c/yQtMUwYBn5P4v72WJMqLW4z7uJOBFXJTfjoRyz0z_wsAAAAQCtjQz9kbGWD4nuZy3q6HaCYxq6Lckz2kThplNb227EJdQ5032jcIGkf-UrPmXCU2EbXVaQ3Ok6_FNLuIDTONJyx6ZZCB10wGqA3OaSe1EqwQp84u1_5iQZAWDk73UYf7_vcIypn7ev-SICZ3qaevb2jYSRqTVZx6AiBZQQGlzlOOrbZU9AU1F-JwTds-YV3qtJHGlxI2peWFIuxFlOYyeX9Kzg',
      'urls': {
        'destination': 'https://ads.adnuntius.delivery/c/yQtMUwYBn5P4v72WJMqLW4z7uJOBFXJTfjoRyz0z_wsAAAAQCtjQz9kbGWD4nuZy3q6HaCYxq6Lckz2kThplNb227EJdQ5032jcIGkf-UrPmXCU2EbXVaQ3Ok6_FNLuIDTONJyx6ZZCB10wGqA3OaSe1EqwQp84u1_5iQZAWDk73UYf7_vcIypn7ev-SICZ3qaevb2jYSRqTVZx6AiBZQQGlzlOOrbZU9AU1F-JwTds-YV3qtJHGlxI2peWFIuxFlOYyeX9Kzg?ct=673&r=http%3A%2F%2Fadnuntius.com'
      },
      'urlsEsc': {
        'destination': 'https%3A%2F%2Fads.adnuntius.delivery%2Fc%2FyQtMUwYBn5P4v72WJMqLW4z7uJOBFXJTfjoRyz0z_wsAAAAQCtjQz9kbGWD4nuZy3q6HaCYxq6Lckz2kThplNb227EJdQ5032jcIGkf-UrPmXCU2EbXVaQ3Ok6_FNLuIDTONJyx6ZZCB10wGqA3OaSe1EqwQp84u1_5iQZAWDk73UYf7_vcIypn7ev-SICZ3qaevb2jYSRqTVZx6AiBZQQGlzlOOrbZU9AU1F-JwTds-YV3qtJHGlxI2peWFIuxFlOYyeX9Kzg%3Fct%3D673%26r%3Dhttp%253A%252F%252Fadnuntius.com'
      },
      'advertiserDomains': ['fred.com', 'george.com'],
      'destinationUrls': {
        'destination': 'https://adnuntius.com'
      },
      'cpm': {
        'amount': 9,
        'currency': 'USD'
      },
      'bid': {
        'amount': 0.009,
        'currency': 'USD'
      },
      'grossBid': {
        'amount': 0.009,
        'currency': 'USD'
      },
      'netBid': {
        'amount': 0.0081,
        'currency': 'USD'
      },
      'dealId': 'abc123xyz',
      'impressionTrackingUrls': [],
      'impressionTrackingUrlsEsc': [],
      'adId': 'adn-id-1064238860',
      'selectedColumn': '0',
      'selectedColumnPosition': '0',
      'renderedPixel': 'https://ads.adnuntius.delivery/b/yQtMUwYBn5P4v72WJMqLW4z7uJOBFXJTfjoRyz0z_wsAAAAQCtjQz9kbGWD4nuZy3q6HaCYxq6Lckz2kThplNb227EJdQ5032jcIGkf-UrPmXCU2EbXVaQ3Ok6_FNLuIDTONJyx6ZZCB10wGqA3OaSe1EqwQp84u1_5iQZAWDk73UYf7_vcIypn7ev-SICZ3qaevb2jYSRqTVZx6AiBZQQGlzlOOrbZU9AU1F-JwTds-YV3qtJHGlxI2peWFIuxFlOYyeX9Kzg.html',
      'renderedPixelEsc': 'http%3A%2F%2Fads.adnuntius.delivery%2Fb%2FyQtMUwYBn5P4v72WJMqLW4z7uJOBFXJTfjoRyz0z_wsAAAAQCtjQz9kbGWD4nuZy3q6HaCYxq6Lckz2kThplNb227EJdQ5032jcIGkf-UrPmXCU2EbXVaQ3Ok6_FNLuIDTONJyx6ZZCB10wGqA3OaSe1EqwQp84u1_5iQZAWDk73UYf7_vcIypn7ev-SICZ3qaevb2jYSRqTVZx6AiBZQQGlzlOOrbZU9AU1F-JwTds-YV3qtJHGlxI2peWFIuxFlOYyeX9Kzg.html',
      'visibleUrl': 'https://ads.adnuntius.delivery/s?rt=yQtMUwYBn5P4v72WJMqLW4z7uJOBFXJTfjoRyz0z_wsAAAAQCtjQz9kbGWD4nuZy3q6HaCYxq6Lckz2kThplNb227EJdQ5032jcIGkf-UrPmXCU2EbXVaQ3Ok6_FNLuIDTONJyx6ZZCB10wGqA3OaSe1EqwQp84u1_5iQZAWDk73UYf7_vcIypn7ev-SICZ3qaevb2jYSRqTVZx6AiBZQQGlzlOOrbZU9AU1F-JwTds-YV3qtJHGlxI2peWFIuxFlOYyeX9Kzg',
      'visibleUrlEsc': 'http%3A%2F%2Fads.adnuntius.delivery%2Fs%3Frt%3DyQtMUwYBn5P4v72WJMqLW4z7uJOBFXJTfjoRyz0z_wsAAAAQCtjQz9kbGWD4nuZy3q6HaCYxq6Lckz2kThplNb227EJdQ5032jcIGkf-UrPmXCU2EbXVaQ3Ok6_FNLuIDTONJyx6ZZCB10wGqA3OaSe1EqwQp84u1_5iQZAWDk73UYf7_vcIypn7ev-SICZ3qaevb2jYSRqTVZx6AiBZQQGlzlOOrbZU9AU1F-JwTds-YV3qtJHGlxI2peWFIuxFlOYyeX9Kzg',
      'viewUrl': 'https://ads.adnuntius.delivery/v?rt=yQtMUwYBn5P4v72WJMqLW4z7uJOBFXJTfjoRyz0z_wsAAAAQCtjQz9kbGWD4nuZy3q6HaCYxq6Lckz2kThplNb227EJdQ5032jcIGkf-UrPmXCU2EbXVaQ3Ok6_FNLuIDTONJyx6ZZCB10wGqA3OaSe1EqwQp84u1_5iQZAWDk73UYf7_vcIypn7ev-SICZ3qaevb2jYSRqTVZx6AiBZQQGlzlOOrbZU9AU1F-JwTds-YV3qtJHGlxI2peWFIuxFlOYyeX9Kzg',
      'viewUrlEsc': 'http%3A%2F%2Fads.adnuntius.delivery%2Fv%3Frt%3DyQtMUwYBn5P4v72WJMqLW4z7uJOBFXJTfjoRyz0z_wsAAAAQCtjQz9kbGWD4nuZy3q6HaCYxq6Lckz2kThplNb227EJdQ5032jcIGkf-UrPmXCU2EbXVaQ3Ok6_FNLuIDTONJyx6ZZCB10wGqA3OaSe1EqwQp84u1_5iQZAWDk73UYf7_vcIypn7ev-SICZ3qaevb2jYSRqTVZx6AiBZQQGlzlOOrbZU9AU1F-JwTds-YV3qtJHGlxI2peWFIuxFlOYyeX9Kzg',
      'rt': 'yQtMUwYBn5P4v72WJMqLW4z7uJOBFXJTfjoRyz0z_wsAAAAQCtjQz9kbGWD4nuZy3q6HaCYxq6Lckz2kThplNb227EJdQ5032jcIGkf-UrPmXCU2EbXVaQ3Ok6_FNLuIDTONJyx6ZZCB10wGqA3OaSe1EqwQp84u1_5iQZAWDk73UYf7_vcIypn7ev-SICZ3qaevb2jYSRqTVZx6AiBZQQGlzlOOrbZU9AU1F-JwTds-YV3qtJHGlxI2peWFIuxFlOYyeX9Kzg',
      'creativeWidth': '640',
      'creativeHeight': '480',
      'creativeId': 's90t0q03pm',
      'lineItemId': 'cr3hnkkxhnkw9ldy',
      'layoutId': 'buyers_network_image_layout_1',
      'layoutName': 'Image',
      'layoutExternalReference': '',
      'html': "<!DOCTYPE html>\n<html>\n<head>\n    <meta charset=\"utf-8\">\n    <style media=\"all\">\n        html, body, .responseCtr {\n            margin: 0;\n            padding: 0;\n            outline: 0;\n            border: 0;\n            overflow: hidden;\n        }\n\n        .responseCtr {\n            display: inline-block;\n            line-height: 0;\n            vertical-align: top;\n        }\n\n        .responseCtr a {\n            line-height: 0;\n        }\n\n        .responseCtr *, .responseCtr a * {\n            line-height: normal;\n        }\n\n        .responseCtr .contentWrapperPerItem {\n            margin: 0;\n            padding: 0;\n            outline: 0;\n            border: 0;\n            display: inline-block;\n            line-height: 0;\n            vertical-align: top;\n        }\n\n        a img {\n            border: none;\n            outline: none;\n        }\n\n        img {\n            margin: 0;\n            padding: 0;\n        }\n\n        /* need this displayNone class to ensure images are preloaded for smooth transition */\n        img.displayNone {\n            position: absolute;\n            top: -99999px;\n            left: -99999px;\n        }\n\n        .contentWrapperTrailer {\n            clear: both;\n        }\n    </style>\n    <script src=\"https://cdn.adnuntius.com/adn.js\"></script>\n</head>\n<body>\n<div id=\"adn-rsp--91674201\" class=\"responseCtr\">\n<div class=\"contentWrapperPerItem\" id=\"adn-id-1064238860\" data-line-item-id=\"cr3hnkkxhnkw9ldy\" data-creative-id=\"s90t0q03pm\" data-creative-width=\"100\" data-creative-height=\"30\" data-response-token=\"yQtMUwYBn5P4v72WJMqLW4z7uJOBFXJTfjoRyz0z_wsAAAAQCtjQz9kbGWD4nuZy3q6HaCYxq6Lckz2kThplNb227EJdQ5032jcIGkf-UrPmXCU2EbXVaQ3Ok6_FNLuIDTONJyx6ZZCB10wGqA3OaSe1EqwQp84u1_5iQZAWDk73UYf7_vcIypn7ev-SICZ3qaevb2jYSRqTVZx6AiBZQQGlzlOOrbZU9AU1F-JwTds-YV3qtJHGlxI2peWFIuxFlOYyeX9Kzg\"><a rel=\"nofollow\" target=\"_top\" href=\"https://ads.adnuntius.delivery/c/yQtMUwYBn5P4v72WJMqLW4z7uJOBFXJTfjoRyz0z_wsAAAAQCtjQz9kbGWD4nuZy3q6HaCYxq6Lckz2kThplNb227EJdQ5032jcIGkf-UrPmXCU2EbXVaQ3Ok6_FNLuIDTONJyx6ZZCB10wGqA3OaSe1EqwQp84u1_5iQZAWDk73UYf7_vcIypn7ev-SICZ3qaevb2jYSRqTVZx6AiBZQQGlzlOOrbZU9AU1F-JwTds-YV3qtJHGlxI2peWFIuxFlOYyeX9Kzg?ct=673&r=http%3A%2F%2Fadnuntius.com\"><img src=\"https://cdn.adnuntius.com/cdn/iBgqruUNbaUb2hmD3vws7WTi84jg_WB_-VOF_FeOZ7A.png\" width=\"728\" height=\"90\" alt=\"\"/></a><div class=\"contentWrapperTrailer\"></div></div>\n</div><script>\n            //<![CDATA[\n            (function() {\n                var impTrackers = [];impTrackers.push(\"https://ads.adnuntius.delivery/b/yQtMUwYBn5P4v72WJMqLW4z7uJOBFXJTfjoRyz0z_wsAAAAQCtjQz9kbGWD4nuZy3q6HaCYxq6Lckz2kThplNb227EJdQ5032jcIGkf-UrPmXCU2EbXVaQ3Ok6_FNLuIDTONJyx6ZZCB10wGqA3OaSe1EqwQp84u1_5iQZAWDk73UYf7_vcIypn7ev-SICZ3qaevb2jYSRqTVZx6AiBZQQGlzlOOrbZU9AU1F-JwTds-YV3qtJHGlxI2peWFIuxFlOYyeX9Kzg.html\");var body = document.getElementsByTagName(\"body\")[0];\n                for (var i = 0; i < impTrackers.length; i++) {\n                    var impTracker = impTrackers[i];\n                    var ifr = document.createElement(\"iframe\");\n                    ifr.src = impTracker + (impTracker.match(/\\?/) ? '&' : '?') + 'cb=' + Math.random();\n                    ifr.setAttribute(\"scrolling\", \"no\");\n                    ifr.setAttribute(\"frameborder\", \"0\");\n                    ifr.setAttribute(\"width\", \"1\");\n                    ifr.setAttribute(\"height\", \"1\");\n                    ifr.setAttribute(\"style\", \"position:absolute;top:-10000px;left:-100000px;\");\n                    body.appendChild(ifr);\n                }\n            })();\n            //]]>\n            </script>\n    \n<script>\n//<![CDATA[\n(function() {\n    var matchedAdCount = 1;\n    if (window.adn && adn.inIframe && adn.inIframe.processAdResponse) {\n        return adn.inIframe.processAdResponse({ matchedAdCount: matchedAdCount });\n    }\n    window.adn = window.adn || {};\n    adn.calls = adn.calls || [];\n    adn.calls.push(function() {\n        adn.inIframe.processAdResponse({ matchedAdCount: matchedAdCount });\n    });\n})();\n//]]>\n</script></body>\n</html>",
      'renderTemplate': '<a rel="nofollow" target="_top" href="{{{urls.destination.url}}}"><img src="{{{assets.Image.cdnId}}}" width="{{assets.Image.width}}" height="{{assets.Image.height}}" alt=""/></a>'
    }
  ];

  const nativeResponseBody = [
    {
      'auId': '0000000000000551',
      'targetId': 'adn-0000000000000551',
      'nativeJson': {
        'ortb': {
          'link': {
            'url': 'https://whatever.com'
          },
          'assets': [
            {
              'id': 1,
              'required': 1,
              'img': {
                'url': 'http://something.com/something.png'
              }
            }]
        }
      },
      'matchedAdCount': 1,
      'responseId': '',
      'ads': [
        {
          'advertiserDomains': ['adnuntius.com'],
          'creativeWidth': 640,
          'creativeHeight': 640,
          'cpm': {
            'amount': 2000,
            'currency': 'NOK'
          },
          'bid': {
            'amount': 2,
            'currency': 'NOK'
          },
          'grossBid': {
            'amount': 2,
            'currency': 'NOK'
          },
          'netBid': {
            'amount': 2,
            'currency': 'NOK'
          },
          'cost': {
            'amount': 2,
            'currency': 'NOK'
          },
          'assets': {
            'img': {
              'cdnId': 'http://localhost:8079/cdn/9urJusYWpjFDLcpOwfejrkWlLP1heM3vWIJjuHk48BQ.mp4',
              'width': '1920',
              'height': '1080'
            }
          },
        }
      ]
    }
  ];

  const nativeResponse = {
    body: {
      'adUnits': nativeResponseBody
    }
  };

  const nativeMultiFormatResponseBody = JSON.parse(JSON.stringify(nativeResponseBody[0]));
  nativeMultiFormatResponseBody.auId = '0000000000381535';
  nativeMultiFormatResponseBody.targetId = 'alt-native';

  const multiFormatServerResponse = {
    body: {
      'adUnits': [
        {
          'auId': '0000000000381535',
          'targetId': '3a602680158a85-video',
          'vastXml': '<VAST </Ad>\n</VAST>',
          'matchedAdCount': 1,
          'responseId': 'adn-rsp-453419729',
          'ads': [
            {
              'cpm': {
                'amount': 12500.0,
                'currency': 'NOK'
              },
              'bid': {
                'amount': 5,
                'currency': 'NOK'
              },
              'grossBid': {
                'amount': 5,
                'currency': 'NOK'
              },
              'netBid': {
                'amount': 5,
                'currency': 'NOK'
              },
              'cost': {
                'amount': 5,
                'currency': 'NOK'
              },
              creativeWidth: 200,
              creativeHeight: 240,
              'adId': 'adn-id-615465411',
              'vastXml': '<Ad </Ad>'
            }
          ]
        },
        {
          'auId': '0000000000381535',
          'targetId': 'fred-video',
          'vastXml': '<VAST \n</VAST>',
          'matchedAdCount': 1,
          'responseId': 'adn-rsp--1809523040',
          'ads': [
            {
              'cpm': {
                'amount': 1500.0,
                'currency': 'NOK'
              },
              'bid': {
                'amount': 1.5,
                'currency': 'NOK'
              },
              'grossBid': {
                'amount': 1.5,
                'currency': 'NOK'
              },
              'netBid': {
                'amount': 1.5,
                'currency': 'NOK'
              },
              'cost': {
                'amount': 1.5,
                'currency': 'NOK'
              },
              creativeWidth: 200,
              creativeHeight: 240,
              'adId': 'adn-id-344789675',
              'selectedColumn': '0',
              'selectedColumnPosition': '0',
              'vastXml': '<Ad id=\'adn-id-344789675\'></InLine>\n</Ad>',
            }
          ]
        },
        nativeMultiFormatResponseBody,
        {
          'auId': '0000000000381535',
          'targetId': '3a602680158a85',
          'html': '\u003C!DOCTYPE html\u003E\n\n\u003C/html\u003E',
          'matchedAdCount': 0,
          'responseId': '',
          'ads': []
        },
        {
          'auId': '0000000000381535',
          'renderOption': 'DIV',
          'targetId': 'fred',
          'html': '\u003C!DOCTYPE html\u003E\n\u003C\u003E\n\u003C/html\u003E',
          'matchedAdCount': 1,
          'responseId': 'adn-rsp-1620340740',
          'ads': [
            {
              'destinationUrlEsc': '',
              'cpm': {
                'amount': 1250.0,
                'currency': 'NOK'
              },
              creativeWidth: 200,
              creativeHeight: 240,
              'bid': {
                'amount': 1.75,
                'currency': 'NOK'
              },
              'grossBid': {
                'amount': 1.75,
                'currency': 'NOK'
              },
              'netBid': {
                'amount': 1.75,
                'currency': 'NOK'
              },
              'cost': {
                'amount': 1.75,
                'currency': 'NOK'
              },
              'html': '\u003Ca \'\u003E\u003C/script\u003E',
            }
          ]
        },
        {
          'auId': '0000000000381535',
          'renderOption': 'DIV',
          'targetId': 'alt',
          'html': '\u003C!DOCTYPE html\u003E\n\u003C\u003E\n\u003C/html\u003E',
          'matchedAdCount': 1,
          'responseId': 'adn-rsp-1620340740',
          'ads': [
            {
              'destinationUrlEsc': '',
              'cpm': {
                'amount': 1000.0,
                'currency': 'NOK'
              },
              creativeWidth: 200,
              creativeHeight: 240,
              'bid': {
                'amount': 1.75,
                'currency': 'NOK'
              },
              'grossBid': {
                'amount': 1.75,
                'currency': 'NOK'
              },
              'netBid': {
                'amount': 1.75,
                'currency': 'NOK'
              },
              'cost': {
                'amount': 1.75,
                'currency': 'NOK'
              },
              'html': '\u003Ca \'\u003E\u003C/script\u003E',
            }
          ]
        }
      ],
      'network': '1287',
      'keywords': []
    }
  };

  const serverResponse = {
    body: {
      'adUnits': [
        {
          'auId': '0000000000000551',
          'targetId': 'adn-0000000000000551',
          'html': "<!DOCTYPE html>\n<html>\n<head>\n    <meta charset=\"utf-8\">\n    <style media=\"all\">\n        html, body, .responseCtr {\n            margin: 0;\n            padding: 0;\n            outline: 0;\n            border: 0;\n            overflow: hidden;\n        }\n\n        .responseCtr {\n            display: inline-block;\n            line-height: 0;\n            vertical-align: top;\n        }\n\n        .responseCtr a {\n            line-height: 0;\n        }\n\n        .responseCtr *, .responseCtr a * {\n            line-height: normal;\n        }\n\n        .responseCtr .contentWrapperPerItem {\n            margin: 0;\n            padding: 0;\n            outline: 0;\n            border: 0;\n            display: inline-block;\n            line-height: 0;\n            vertical-align: top;\n        }\n\n        a img {\n            border: none;\n            outline: none;\n        }\n\n        img {\n            margin: 0;\n            padding: 0;\n        }\n\n        /* need this displayNone class to ensure images are preloaded for smooth transition */\n        img.displayNone {\n            position: absolute;\n            top: -99999px;\n            left: -99999px;\n        }\n\n        .contentWrapperTrailer {\n            clear: both;\n        }\n    </style>\n    <script src=\"https://cdn.adnuntius.com/adn.js\"></script>\n</head>\n<body>\n<div id=\"adn-rsp--229633088\" class=\"responseCtr\">\n<div class=\"contentWrapperPerItem\" id=\"adn-id-1488629603\" data-line-item-id=\"cr3hnkkxhnkw9ldy\" data-creative-id=\"s90t0q03pm\" data-creative-width=\"100\" data-creative-height=\"30\" data-response-token=\"5Mu-vFVsaf4dWWx8uyZoV7Mz0sPkF1_j9bSupMwX8dMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxqqTYxj2sS0FkMriztxcORshj3zRbT0KsV7XnDXE0F-OsHX7Ok6_FNLuIDTOMJyx6ZZCB10wGqA3OaSe1Eq9D85h8gP1gGsobC0KsAISm_PYNkJ6ve6qZLnB79fX6XHLYSRqTBM8sBCRXQAetnVzeo7AHoQhkFeouS444YA_q4JCTlRI2peWFIuxFlOYyeX9Kzg\"><a rel=\"nofollow\" target=\"_top\" href=\"https://ads.adnuntius.delivery/c/5Mu-vFVsaf4dWWx8uyZoV7Mz0sPkF1_j9bSupMwX8dMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxqqTYxj2sS0FkMriztxcORshj3zRbT0KsV7XnDXE0F-OsHX7Ok6_FNLuIDTOMJyx6ZZCB10wGqA3OaSe1Eq9D85h8gP1gGsobC0KsAISm_PYNkJ6ve6qZLnB79fX6XHLYSRqTBM8sBCRXQAetnVzeo7AHoQhkFeouS444YA_q4JCTlRI2peWFIuxFlOYyeX9Kzg?ct=673&r=http%3A%2F%2Fadnuntius.com\"><img src=\"https://cdn.adnuntius.com/cdn/iBgqruUNbaUb2hmD3vws7WTi84jg_WB_-VOF_FeOZ7A.png\" width=\"728\" height=\"90\" alt=\"\"/></a><div class=\"contentWrapperTrailer\"></div></div>\n</div><script>\n            //<![CDATA[\n            (function() {\n                var impTrackers = [];impTrackers.push(\"https://ads.adnuntius.delivery/b/5Mu-vFVsaf4dWWx8uyZoV7Mz0sPkF1_j9bSupMwX8dMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxqqTYxj2sS0FkMriztxcORshj3zRbT0KsV7XnDXE0F-OsHX7Ok6_FNLuIDTOMJyx6ZZCB10wGqA3OaSe1Eq9D85h8gP1gGsobC0KsAISm_PYNkJ6ve6qZLnB79fX6XHLYSRqTBM8sBCRXQAetnVzeo7AHoQhkFeouS444YA_q4JCTlRI2peWFIuxFlOYyeX9Kzg.html\");var body = document.getElementsByTagName(\"body\")[0];\n                for (var i = 0; i < impTrackers.length; i++) {\n                    var impTracker = impTrackers[i];\n                    var ifr = document.createElement(\"iframe\");\n                    ifr.src = impTracker + (impTracker.match(/\\?/) ? '&' : '?') + 'cb=' + Math.random();\n                    ifr.setAttribute(\"scrolling\", \"no\");\n                    ifr.setAttribute(\"frameborder\", \"0\");\n                    ifr.setAttribute(\"width\", \"1\");\n                    ifr.setAttribute(\"height\", \"1\");\n                    ifr.setAttribute(\"style\", \"position:absolute;top:-10000px;left:-100000px;\");\n                    body.appendChild(ifr);\n                }\n            })();\n            //]]>\n            </script>\n    \n<script>\n//<![CDATA[\n(function() {\n    var matchedAdCount = 1;\n    if (window.adn && adn.inIframe && adn.inIframe.processAdResponse) {\n        return adn.inIframe.processAdResponse({ matchedAdCount: matchedAdCount });\n    }\n    window.adn = window.adn || {};\n    adn.calls = adn.calls || [];\n    adn.calls.push(function() {\n        adn.inIframe.processAdResponse({ matchedAdCount: matchedAdCount });\n    });\n})();\n//]]>\n</script></body>\n</html>",
          'matchedAdCount': 1,
          'responseId': 'adn-rsp--229633088',
          'deals': deals,
          'ads': [
            {
              'destinationUrlEsc': 'http%3A%2F%2Fads.adnuntius.delivery%2Fc%2F5Mu-vFVsaf4dWWx8uyZoV7Mz0sPkF1_j9bSupMwX8dMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxqqTYxj2sS0FkMriztxcORshj3zRbT0KsV7XnDXE0F-OsHX7Ok6_FNLuIDTOMJyx6ZZCB10wGqA3OaSe1Eq9D85h8gP1gGsobC0KsAISm_PYNkJ6ve6qZLnB79fX6XHLYSRqTBM8sBCRXQAetnVzeo7AHoQhkFeouS444YA_q4JCTlRI2peWFIuxFlOYyeX9Kzg%3Fct%3D673%26r%3Dhttp%253A%252F%252Fadnuntius.com',
              'assets': {
                'Image': {
                  'cdnId': 'https://cdn.adnuntius.com/cdn/iBgqruUNbaUb2hmD3vws7WTi84jg_WB_-VOF_FeOZ7A.png',
                  'width': '640',
                  'height': '480'
                }
              },
              'dealId': 'not-in-deal-array-here',
              'text': {},
              'choices': {},
              'clickUrl': 'https://ads.adnuntius.delivery/c/5Mu-vFVsaf4dWWx8uyZoV7Mz0sPkF1_j9bSupMwX8dMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxqqTYxj2sS0FkMriztxcORshj3zRbT0KsV7XnDXE0F-OsHX7Ok6_FNLuIDTOMJyx6ZZCB10wGqA3OaSe1Eq9D85h8gP1gGsobC0KsAISm_PYNkJ6ve6qZLnB79fX6XHLYSRqTBM8sBCRXQAetnVzeo7AHoQhkFeouS444YA_q4JCTlRI2peWFIuxFlOYyeX9Kzg',
              'urls': {
                'destination': 'https://ads.adnuntius.delivery/c/5Mu-vFVsaf4dWWx8uyZoV7Mz0sPkF1_j9bSupMwX8dMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxqqTYxj2sS0FkMriztxcORshj3zRbT0KsV7XnDXE0F-OsHX7Ok6_FNLuIDTOMJyx6ZZCB10wGqA3OaSe1Eq9D85h8gP1gGsobC0KsAISm_PYNkJ6ve6qZLnB79fX6XHLYSRqTBM8sBCRXQAetnVzeo7AHoQhkFeouS444YA_q4JCTlRI2peWFIuxFlOYyeX9Kzg?ct=673&r=http%3A%2F%2Fadnuntius.com'
              },
              'urlsEsc': {
                'destination': 'http%3A%2F%2Fads.adnuntius.delivery%2Fc%2F5Mu-vFVsaf4dWWx8uyZoV7Mz0sPkF1_j9bSupMwX8dMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxqqTYxj2sS0FkMriztxcORshj3zRbT0KsV7XnDXE0F-OsHX7Ok6_FNLuIDTOMJyx6ZZCB10wGqA3OaSe1Eq9D85h8gP1gGsobC0KsAISm_PYNkJ6ve6qZLnB79fX6XHLYSRqTBM8sBCRXQAetnVzeo7AHoQhkFeouS444YA_q4JCTlRI2peWFIuxFlOYyeX9Kzg%3Fct%3D673%26r%3Dhttp%253A%252F%252Fadnuntius.com'
              },
              'destinationUrls': {
                'destination': 'https://adnuntius.com'
              },
              'cpm': {
                'amount': 9,
                'currency': 'USD'
              },
              'bid': {
                'amount': 0.009,
                'currency': 'USD'
              },
              'grossBid': {
                'amount': 0.009,
                'currency': 'USD'
              },
              'netBid': {
                'amount': 0.0081,
                'currency': 'USD'
              },
              'impressionTrackingUrls': [],
              'impressionTrackingUrlsEsc': [],
              'adId': 'adn-id-1488629603',
              'selectedColumn': '0',
              'selectedColumnPosition': '0',
              'renderedPixel': 'https://ads.adnuntius.delivery/b/5Mu-vFVsaf4dWWx8uyZoV7Mz0sPkF1_j9bSupMwX8dMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxqqTYxj2sS0FkMriztxcORshj3zRbT0KsV7XnDXE0F-OsHX7Ok6_FNLuIDTOMJyx6ZZCB10wGqA3OaSe1Eq9D85h8gP1gGsobC0KsAISm_PYNkJ6ve6qZLnB79fX6XHLYSRqTBM8sBCRXQAetnVzeo7AHoQhkFeouS444YA_q4JCTlRI2peWFIuxFlOYyeX9Kzg.html',
              'renderedPixelEsc': 'http%3A%2F%2Fads.adnuntius.delivery%2Fb%2F5Mu-vFVsaf4dWWx8uyZoV7Mz0sPkF1_j9bSupMwX8dMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxqqTYxj2sS0FkMriztxcORshj3zRbT0KsV7XnDXE0F-OsHX7Ok6_FNLuIDTOMJyx6ZZCB10wGqA3OaSe1Eq9D85h8gP1gGsobC0KsAISm_PYNkJ6ve6qZLnB79fX6XHLYSRqTBM8sBCRXQAetnVzeo7AHoQhkFeouS444YA_q4JCTlRI2peWFIuxFlOYyeX9Kzg.html',
              'visibleUrl': 'https://ads.adnuntius.delivery/s?rt=5Mu-vFVsaf4dWWx8uyZoV7Mz0sPkF1_j9bSupMwX8dMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxqqTYxj2sS0FkMriztxcORshj3zRbT0KsV7XnDXE0F-OsHX7Ok6_FNLuIDTOMJyx6ZZCB10wGqA3OaSe1Eq9D85h8gP1gGsobC0KsAISm_PYNkJ6ve6qZLnB79fX6XHLYSRqTBM8sBCRXQAetnVzeo7AHoQhkFeouS444YA_q4JCTlRI2peWFIuxFlOYyeX9Kzg',
              'visibleUrlEsc': 'http%3A%2F%2Fads.adnuntius.delivery%2Fs%3Frt%3D5Mu-vFVsaf4dWWx8uyZoV7Mz0sPkF1_j9bSupMwX8dMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxqqTYxj2sS0FkMriztxcORshj3zRbT0KsV7XnDXE0F-OsHX7Ok6_FNLuIDTOMJyx6ZZCB10wGqA3OaSe1Eq9D85h8gP1gGsobC0KsAISm_PYNkJ6ve6qZLnB79fX6XHLYSRqTBM8sBCRXQAetnVzeo7AHoQhkFeouS444YA_q4JCTlRI2peWFIuxFlOYyeX9Kzg',
              'viewUrl': 'https://ads.adnuntius.delivery/v?rt=5Mu-vFVsaf4dWWx8uyZoV7Mz0sPkF1_j9bSupMwX8dMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxqqTYxj2sS0FkMriztxcORshj3zRbT0KsV7XnDXE0F-OsHX7Ok6_FNLuIDTOMJyx6ZZCB10wGqA3OaSe1Eq9D85h8gP1gGsobC0KsAISm_PYNkJ6ve6qZLnB79fX6XHLYSRqTBM8sBCRXQAetnVzeo7AHoQhkFeouS444YA_q4JCTlRI2peWFIuxFlOYyeX9Kzg',
              'viewUrlEsc': 'http%3A%2F%2Fads.adnuntius.delivery%2Fv%3Frt%3D5Mu-vFVsaf4dWWx8uyZoV7Mz0sPkF1_j9bSupMwX8dMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxqqTYxj2sS0FkMriztxcORshj3zRbT0KsV7XnDXE0F-OsHX7Ok6_FNLuIDTOMJyx6ZZCB10wGqA3OaSe1Eq9D85h8gP1gGsobC0KsAISm_PYNkJ6ve6qZLnB79fX6XHLYSRqTBM8sBCRXQAetnVzeo7AHoQhkFeouS444YA_q4JCTlRI2peWFIuxFlOYyeX9Kzg',
              'rt': '5Mu-vFVsaf4dWWx8uyZoV7Mz0sPkF1_j9bSupMwX8dMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxqqTYxj2sS0FkMriztxcORshj3zRbT0KsV7XnDXE0F-OsHX7Ok6_FNLuIDTOMJyx6ZZCB10wGqA3OaSe1Eq9D85h8gP1gGsobC0KsAISm_PYNkJ6ve6qZLnB79fX6XHLYSRqTBM8sBCRXQAetnVzeo7AHoQhkFeouS444YA_q4JCTlRI2peWFIuxFlOYyeX9Kzg',
              'creativeWidth': '640',
              'creativeHeight': '480',
              'creativeId': 's90t0q03pm',
              'lineItemId': 'cr3hnkkxhnkw9ldy',
              'layoutId': 'buyers_network_image_layout_1',
              'layoutName': 'Image',
              'layoutExternalReference': '',
              'html': '<a rel="nofollow" target="_top" href="https://ads.adnuntius.delivery/c/5Mu-vFVsaf4dWWx8uyZoV7Mz0sPkF1_j9bSupMwX8dMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxqqTYxj2sS0FkMriztxcORshj3zRbT0KsV7XnDXE0F-OsHX7Ok6_FNLuIDTOMJyx6ZZCB10wGqA3OaSe1Eq9D85h8gP1gGsobC0KsAISm_PYNkJ6ve6qZLnB79fX6XHLYSRqTBM8sBCRXQAetnVzeo7AHoQhkFeouS444YA_q4JCTlRI2peWFIuxFlOYyeX9Kzg?ct=673&r=http%3A%2F%2Fadnuntius.com"><img src="https://cdn.adnuntius.com/cdn/iBgqruUNbaUb2hmD3vws7WTi84jg_WB_-VOF_FeOZ7A.png" width="728" height="90" alt=""/></a>',
              'renderTemplate': '<a rel="nofollow" target="_top" href="{{{urls.destination.url}}}"><img src="{{{assets.Image.cdnId}}}" width="{{assets.Image.width}}" height="{{assets.Image.height}}" alt=""/></a>'
            }
          ]
        },
        {
          'auId': '000000000008b6bc',
          'targetId': 'adn-000000000008b6bc',
          'matchedAdCount': 0,
          'responseId': 'adn-rsp-1460129238',
        }
      ],
      'metaData': {
        'usi': 'from-api-server dude',
        'voidAuIds': '00000000000abcde;00000000000fffff',
        'randomApiKey': 'randomApiValue'
      },
      'network': 'some-network-id'
    }
  }
  const serverVideoResponse = {
    body: {
      'adUnits': [
        {
          'auId': '0000000000000551',
          'targetId': 'adn-0000000000000551',
          'vastXml': '<VAST version=\\"3.0\\">\\n<Ad id=\\"adn-id-500662301\\">\\n    <InLine>\\n        <AdSystem>Adnuntius</AdSystem>\\n        <AdTitle>adn-id-500662301</AdTitle>\\n        <Impression></Impression>\\n        <Creatives>\\n            <Creative>\\n                <Linear>\\n                    <Duration>00:00:15</Duration>\\n                    <TrackingEvents>\\n                        <Tracking event=\\"creativeView\\"><![CDATA[http://localhost:8078/b/ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX.html]]></Tracking>\\n                        <Tracking event=\\"start\\"><![CDATA[http://localhost:8078/s?rt=ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX]]></Tracking>\\n                        <Tracking event=\\"firstQuartile\\"><![CDATA[https://localhost:8078/u?rt=ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX&customType=whatevs]]></Tracking>\\n                        <Tracking event=\\"midpoint\\"><![CDATA[http://localhost:8078/v?rt=ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX]]></Tracking>\\n                        <Tracking event=\\"thirdQuartile\\"><![CDATA[https://localhost:8078/u?rt=ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX&customType=whatevs]]></Tracking>\\n                        <Tracking event=\\"complete\\"><![CDATA[https://localhost:8078/u?rt=ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX&customType=whatevs]]></Tracking>\\n                    </TrackingEvents>\\n                    <VideoClicks>\\n                        <ClickThrough><![CDATA[http://adnuntius.com]]></ClickThrough>\\n                        <ClickTracking><![CDATA[http://localhost:8078/c/ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX]]></ClickTracking>\\n                    </VideoClicks>\\n                    <MediaFiles>\\n                        <MediaFile delivery=\\"progressive\\" type=\\"video/mp4\\" bitrate=\\"92421\\" width=\\"1920\\" height=\\"1080\\" scalable=\\"true\\" maintainAspectRatio=\\"true\\">\\n                            <![CDATA[http://localhost:8079/cdn/9urJusYWpjFDLcpOwfejrkWlLP1heM3vWIJjuHk48BQ.mp4]]>\\n                        </MediaFile>\\n                    </MediaFiles>\\n                </Linear>\\n            </Creative>\\n        </Creatives>\\n    </InLine>\\n</Ad>\\n</VAST>',
          'matchedAdCount': 1,
          'responseId': '',
          'deals': [
            {
              'destinationUrlEsc': '',
              'assets': {
                'Video': {
                  'cdnId': 'http://localhost:8079/cdn/9urJusYWpjFDLcpOwfejrkWlLP1heM3vWIJjuHk48BQ.mp4',
                  'width': '1920',
                  'height': '1080'
                }
              },
              'text': {
                'thirdQuartile': {
                  'content': 'whatevs',
                  'length': '7',
                  'minLength': '1',
                  'maxLength': '64'
                },
                'complete': {
                  'content': 'whatevs',
                  'length': '7',
                  'minLength': '1',
                  'maxLength': '64'
                },
                'firstQuartile': {
                  'content': 'whatevs',
                  'length': '7',
                  'minLength': '1',
                  'maxLength': '64'
                }
              },
              'choices': {},
              'clickUrl': 'http://localhost:8078/c/7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg',
              'urls': {
                'destinationUrl': 'http://localhost:8078/c/7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg?ct=682&r=http%3A%2F%2Fadnuntius.com'
              },
              'urlsEsc': {
                'destinationUrl': 'http%3A%2F%2Flocalhost%3A8078%2Fc%2F7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg%3Fct%3D682%26r%3Dhttp%253A%252F%252Fadnuntius.com'
              },
              'destinationUrls': {
                'destinationUrl': 'http://adnuntius.com'
              },
              'cpm': {
                'amount': 9,
                'currency': 'USD'
              },
              'bid': {
                'amount': 0.009,
                'currency': 'USD'
              },
              'grossBid': {
                'amount': 0.009,
                'currency': 'USD'
              },
              'netBid': {
                'amount': 0.0081,
                'currency': 'USD'
              },
              'dealId': 'abc123xyz',
              'impressionTrackingUrls': [],
              'impressionTrackingUrlsEsc': [],
              'adId': 'adn-id-1465065992',
              'selectedColumn': '0',
              'selectedColumnPosition': '0',
              'renderedPixel': 'http://localhost:8078/b/7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg.html',
              'renderedPixelEsc': 'http%3A%2F%2Flocalhost%3A8078%2Fb%2F7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg.html',
              'visibleUrl': 'http://localhost:8078/s?rt=7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg',
              'visibleUrlEsc': 'http%3A%2F%2Flocalhost%3A8078%2Fs%3Frt%3D7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg',
              'viewUrl': 'http://localhost:8078/v?rt=7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg',
              'viewUrlEsc': 'http%3A%2F%2Flocalhost%3A8078%2Fv%3Frt%3D7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg',
              'rt': '7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg',
              'creativeWidth': '640',
              'creativeHeight': '480',
              'creativeId': 'p6sqtvcgxczy258j',
              'lineItemId': 'cr3hnkkxhnkw9ldy',
              'layoutId': 'buyers_networkvast_single_format_layout',
              'layoutName': 'Vast (video upload)',
              'layoutExternalReference': '',
              'vastXml': '<VAST version="3.0">\n<Ad id="adn-id-1465065992">\n    <InLine>\n        <AdSystem>Adnuntius</AdSystem>\n        <AdTitle>adn-id-1465065992</AdTitle>\n        <Impression></Impression>\n        <Creatives>\n            <Creative>\n                <Linear>\n                    <Duration>00:00:15</Duration>\n                    <TrackingEvents>\n                        <Tracking event="creativeView"><![CDATA[http://localhost:8078/b/7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg.html]]></Tracking>\n                        <Tracking event="start"><![CDATA[http://localhost:8078/s?rt=7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg]]></Tracking>\n                        <Tracking event="firstQuartile"><![CDATA[https://localhost:8078/u?rt=7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg&customType=whatevs]]></Tracking>\n                        <Tracking event="midpoint"><![CDATA[http://localhost:8078/v?rt=7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg]]></Tracking>\n                        <Tracking event="thirdQuartile"><![CDATA[https://localhost:8078/u?rt=7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg&customType=whatevs]]></Tracking>\n                        <Tracking event="complete"><![CDATA[https://localhost:8078/u?rt=7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg&customType=whatevs]]></Tracking>\n                    </TrackingEvents>\n                    <VideoClicks>\n                        <ClickThrough><![CDATA[http://adnuntius.com]]></ClickThrough>\n                        <ClickTracking><![CDATA[http://localhost:8078/c/7MRhdEcIndSrWxWhFtMVVnDULl8BOwEaV6vi9558AbYAAAAQCtjQz9kbGWD4nuZy3q6HaCYx_6vZlT33ShgzYb616hZZSpoy2jkAHkGrB-XmXyJmEOCSQ0PLk6_FNLuCBzONJyx6ZZCB10wGqA3OaSe1EqMWoJp41f83FcJLX0SpBoT1-qBbx5_8La-ULiAnqaGtMRDYSRqTBZh5DCANFQWnm1fa8rEE9VRgRORwTNxvZFjq5JCSkEQ2peWFIuxFlOYyeX9Kzg]]></ClickTracking>\n                    </VideoClicks>\n                    <MediaFiles>\n                        <MediaFile delivery="progressive" type="video/mp4" bitrate="92421" width="1920" height="1080" scalable="true" maintainAspectRatio="true">\n                            <![CDATA[http://localhost:8079/cdn/9urJusYWpjFDLcpOwfejrkWlLP1heM3vWIJjuHk48BQ.mp4]]>\n                        </MediaFile>\n                    </MediaFiles>\n                </Linear>\n            </Creative>\n        </Creatives>\n    </InLine>\n</Ad>\n</VAST>',
              'renderTemplate': '<Ad id="{{adId}}">\n    <InLine>\n        <AdSystem>Adnuntius</AdSystem>\n        <AdTitle>{{{adId}}}</AdTitle>\n        <Impression></Impression>\n        <Creatives>\n            <Creative>{{#ifEquals vastVersion "4.0"}}\n                <UniversalAdId idRegistry="unknown" idValue="unknown"></UniversalAdId>{{/ifEquals}}\n                <Linear>\n                    <Duration>{{assets.Video.duration}}</Duration>\n                    <TrackingEvents>\n                        <Tracking event="creativeView"><![CDATA[{{{renderedPixel}}}]]></Tracking>\n                        <Tracking event="start"><![CDATA[{{{visibleUrl}}}]]></Tracking>{{#unless preview}}{{#each impressionTrackingUrls}}\n                        <Tracking event="start"><![CDATA[{{{this}}}]]></Tracking>{{/each}}{{/unless}}{{#if text.firstQuartile.content}}\n                        <Tracking event="firstQuartile"><![CDATA[https://{{{adServerHost}}}/u?rt={{{rt}}}&customType={{text.firstQuartile.content}}]]></Tracking>{{/if}}\n                        <Tracking event="midpoint"><![CDATA[{{{viewUrl}}}]]></Tracking>{{#if text.thirdQuartile.content}}\n                        <Tracking event="thirdQuartile"><![CDATA[https://{{{adServerHost}}}/u?rt={{{rt}}}&customType={{text.thirdQuartile.content}}]]></Tracking>{{/if}}{{#if text.complete.content}}\n                        <Tracking event="complete"><![CDATA[https://{{{adServerHost}}}/u?rt={{{rt}}}&customType={{text.complete.content}}]]></Tracking>{{/if}}\n                    </TrackingEvents>\n                    <VideoClicks>\n                        <ClickThrough><![CDATA[{{{urls.destinationUrl.destinationUrl}}}]]></ClickThrough>\n                        <ClickTracking><![CDATA[{{{clickUrl}}}]]></ClickTracking>\n                    </VideoClicks>\n                    <MediaFiles>\n                        <MediaFile delivery="progressive" type="{{assets.Video.mimeType}}" bitrate="{{assets.Video.bps}}" width="{{assets.Video.width}}" height="{{assets.Video.height}}" scalable="true" maintainAspectRatio="true">\n                            <![CDATA[{{{assets.Video.cdnId}}}]]>\n                        </MediaFile>\n                    </MediaFiles>\n                </Linear>\n            </Creative>\n        </Creatives>\n    </InLine>\n</Ad>'
            }
          ],
          'ads': [
            {
              'destinationUrlEsc': '',
              'dealId': 'not-in-deal-array',
              'assets': {
                'Video': {
                  'cdnId': 'http://localhost:8079/cdn/9urJusYWpjFDLcpOwfejrkWlLP1heM3vWIJjuHk48BQ.mp4',
                  'width': '1920',
                  'height': '1080'
                }
              },
              'text': {
                'thirdQuartile': {
                  'content': 'whatevs',
                  'length': '7',
                  'minLength': '1',
                  'maxLength': '64'
                },
                'complete': {
                  'content': 'whatevs',
                  'length': '7',
                  'minLength': '1',
                  'maxLength': '64'
                },
                'firstQuartile': {
                  'content': 'whatevs',
                  'length': '7',
                  'minLength': '1',
                  'maxLength': '64'
                }
              },
              'choices': {},
              'clickUrl': 'http://localhost:8078/c/ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX',
              'urls': {
                'destinationUrl': 'http://localhost:8078/c/ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX?ct=682&r=http%3A%2F%2Fadnuntius.com'
              },
              'urlsEsc': {
                'destinationUrl': 'http%3A%2F%2Flocalhost%3A8078%2Fc%2FZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX%3Fct%3D682%26r%3Dhttp%253A%252F%252Fadnuntius.com'
              },
              'destinationUrls': {
                'destinationUrl': 'http://adnuntius.com'
              },
              'cpm': {
                'amount': 9,
                'currency': 'USD'
              },
              'bid': {
                'amount': 0.009,
                'currency': 'USD'
              },
              'grossBid': {
                'amount': 0.009,
                'currency': 'USD'
              },
              'netBid': {
                'amount': 0.0081,
                'currency': 'USD'
              },
              'impressionTrackingUrls': [],
              'impressionTrackingUrlsEsc': [],
              'adId': 'adn-id-500662301',
              'selectedColumn': '0',
              'selectedColumnPosition': '0',
              'renderedPixel': 'http://localhost:8078/b/ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX.html',
              'renderedPixelEsc': 'http%3A%2F%2Flocalhost%3A8078%2Fb%2FZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX.html',
              'visibleUrl': 'http://localhost:8078/s?rt=ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX',
              'visibleUrlEsc': 'http%3A%2F%2Flocalhost%3A8078%2Fs%3Frt%3DZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX',
              'viewUrl': 'http://localhost:8078/v?rt=ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX',
              'viewUrlEsc': 'http%3A%2F%2Flocalhost%3A8078%2Fv%3Frt%3DZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX',
              'rt': 'ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX',
              'creativeWidth': '640',
              'creativeHeight': '480',
              'creativeId': 'p6sqtvcgxczy258j',
              'lineItemId': 'cr3hnkkxhnkw9ldy',
              'layoutId': 'buyers_networkvast_single_format_layout',
              'layoutName': 'Vast (video upload)',
              'layoutExternalReference': '',
              'vastXml': '<Ad id="adn-id-500662301">\n    <InLine>\n        <AdSystem>Adnuntius</AdSystem>\n        <AdTitle>adn-id-500662301</AdTitle>\n        <Impression></Impression>\n        <Creatives>\n            <Creative>\n                <Linear>\n                    <Duration>00:00:15</Duration>\n                    <TrackingEvents>\n                        <Tracking event="creativeView"><![CDATA[http://localhost:8078/b/ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX.html]]></Tracking>\n                        <Tracking event="start"><![CDATA[http://localhost:8078/s?rt=ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX]]></Tracking>\n                        <Tracking event="firstQuartile"><![CDATA[https://localhost:8078/u?rt=ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX&customType=whatevs]]></Tracking>\n                        <Tracking event="midpoint"><![CDATA[http://localhost:8078/v?rt=ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX]]></Tracking>\n                        <Tracking event="thirdQuartile"><![CDATA[https://localhost:8078/u?rt=ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX&customType=whatevs]]></Tracking>\n                        <Tracking event="complete"><![CDATA[https://localhost:8078/u?rt=ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX&customType=whatevs]]></Tracking>\n                    </TrackingEvents>\n                    <VideoClicks>\n                        <ClickThrough><![CDATA[http://adnuntius.com]]></ClickThrough>\n                        <ClickTracking><![CDATA[http://localhost:8078/c/ZxGSsEJ8IzI8iCTQ17fHxnE29-y7VILLg2CLjhEbphMAAAAQCtjQz9kbGWD4nuZy3q6HaCYxpfXelzygS0s1MLax6koIS8pnjDAOShX4CbPkDyIzELe5BlfLk6_FNLuCBzOMJyx6ZZCB10wGqA3OaSe1EqpGosot0vsyFMtIWRWtUoKk-aANx531KaOWLyonoP2uC6UpxkXRUJ8iVCcMF1KmmAfe9rNYplI0E-ErHtVvZgm7uZeal_VymQxr0zkhjS_bW0PX]]></ClickTracking>\n                    </VideoClicks>\n                    <MediaFiles>\n                        <MediaFile delivery="progressive" type="video/mp4" bitrate="92421" width="1920" height="1080" scalable="true" maintainAspectRatio="true">\n                            <![CDATA[http://localhost:8079/cdn/9urJusYWpjFDLcpOwfejrkWlLP1heM3vWIJjuHk48BQ.mp4]]>\n                        </MediaFile>\n                    </MediaFiles>\n                </Linear>\n            </Creative>\n        </Creatives>\n    </InLine>\n</Ad>',
              'renderTemplate': '<Ad id="{{adId}}">\n    <InLine>\n        <AdSystem>Adnuntius</AdSystem>\n        <AdTitle>{{{adId}}}</AdTitle>\n        <Impression></Impression>\n        <Creatives>\n            <Creative>{{#ifEquals vastVersion "4.0"}}\n                <UniversalAdId idRegistry="unknown" idValue="unknown"></UniversalAdId>{{/ifEquals}}\n                <Linear>\n                    <Duration>{{assets.Video.duration}}</Duration>\n                    <TrackingEvents>\n                        <Tracking event="creativeView"><![CDATA[{{{renderedPixel}}}]]></Tracking>\n                        <Tracking event="start"><![CDATA[{{{visibleUrl}}}]]></Tracking>{{#unless preview}}{{#each impressionTrackingUrls}}\n                        <Tracking event="start"><![CDATA[{{{this}}}]]></Tracking>{{/each}}{{/unless}}{{#if text.firstQuartile.content}}\n                        <Tracking event="firstQuartile"><![CDATA[https://{{{adServerHost}}}/u?rt={{{rt}}}&customType={{text.firstQuartile.content}}]]></Tracking>{{/if}}\n                        <Tracking event="midpoint"><![CDATA[{{{viewUrl}}}]]></Tracking>{{#if text.thirdQuartile.content}}\n                        <Tracking event="thirdQuartile"><![CDATA[https://{{{adServerHost}}}/u?rt={{{rt}}}&customType={{text.thirdQuartile.content}}]]></Tracking>{{/if}}{{#if text.complete.content}}\n                        <Tracking event="complete"><![CDATA[https://{{{adServerHost}}}/u?rt={{{rt}}}&customType={{text.complete.content}}]]></Tracking>{{/if}}\n                    </TrackingEvents>\n                    <VideoClicks>\n                        <ClickThrough><![CDATA[{{{urls.destinationUrl.destinationUrl}}}]]></ClickThrough>\n                        <ClickTracking><![CDATA[{{{clickUrl}}}]]></ClickTracking>\n                    </VideoClicks>\n                    <MediaFiles>\n                        <MediaFile delivery="progressive" type="{{assets.Video.mimeType}}" bitrate="{{assets.Video.bps}}" width="{{assets.Video.width}}" height="{{assets.Video.height}}" scalable="true" maintainAspectRatio="true">\n                            <![CDATA[{{{assets.Video.cdnId}}}]]>\n                        </MediaFile>\n                    </MediaFiles>\n                </Linear>\n            </Creative>\n        </Creatives>\n    </InLine>\n</Ad>'
            }
          ]
        },
        {
          'auId': '000000000008b6bc',
          'targetId': 'adn-000000000008b6bc',
          'matchedAdCount': 0,
          'responseId': 'adn-rsp-1460129238',
        }
      ]
    }
  }

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bidderRequests[0])).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('Test requests', function () {
      const winDimensions = getWinDimensions();
      const viewport = winDimensions.innerWidth + 'x' + winDimensions.innerHeight;
      const prebidVersion = window[getGlobalVarName()].version;
      const tzo = new Date().getTimezoneOffset();
      const ENDPOINT_URL = `https://ads.adnuntius.delivery/i?tzo=${tzo}&format=prebid&pbv=${prebidVersion}&viewport=${viewport}&userId=${usi}`;

      const bidderRequests = [
        {
          bidId: 'adn-000000000008b6bc',
          bidder: 'adnuntius',
          params: {
            auId: '000000000008b6bc',
            targetId: '123',
            network: 'adnuntius',
            maxDeals: 1
          },
          mediaTypes: {
            banner: {
              sizes: [[640, 480], [600, 400]],
            }
          },
        },
        {
          bidId: 'adn-0000000000000551',
          bidder: 'adnuntius',
          params: {
            auId: '0000000000000551',
            network: 'adnuntius',
          },
          mediaTypes: {
            banner: {
              sizes: [[1640, 1480], [1600, 1400]],
            }
          },
        }
      ];

      const request = spec.buildRequests(bidderRequests, {
        refererInfo: {
          canonicalUrl: 'https://canonical.com/page.html',
          page: 'https://canonical.com/something-else.html'
        }
      });

      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('bid');
      const bid = request[0].bid[0];
      expect(bid).to.have.property('bidId');
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, ENDPOINT_URL);
      expect(request[0]).to.have.property('data');
      expect(request[0].data).to.equal(JSON.stringify({
        adUnits: [
          {
            auId: '000000000008b6bc',
            targetId: '123',
            maxDeals: 1,
            dimensions: [[640, 480], [600, 400]]
          },
          {
            auId: '0000000000000551',
            targetId: 'adn-0000000000000551',
            dimensions: [[1640, 1480], [1600, 1400]]
          }
        ],
        context: 'https://canonical.com/something-else.html',
        canonical: 'https://canonical.com/page.html'
      }));
    });

    it('should pass for different end points in config', function () {
      config.setConfig({
        env: 'localhost',
        protocol: 'http'
      })
      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, { }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, LOCALHOST_URL);
    });

    it('Test specifying deal IDs', function () {
      const dealIdRequest = deepClone(bidderRequests);
      dealIdRequest[0].params.dealId = 'simplestringdeal';
      dealIdRequest[0].params.inventory = {
        pmp: {
          deals: [{id: '123', bidfloor: 12, bidfloorcur: 'USD'}]
        }
      };
      let request = spec.buildRequests(dealIdRequest, {});
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('bid');
      const bid = request[0].bid[0]
      expect(bid).to.have.property('bidId');
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, ENDPOINT_URL);
      expect(request[0]).to.have.property('data');
      expect(request[0].data).to.equal('{"adUnits":[{"auId":"000000000008b6bc","targetId":"123","dealId":"simplestringdeal","maxDeals":1,"dimensions":[[640,480],[600,400]]},{"auId":"0000000000000551","targetId":"adn-0000000000000551","dimensions":[[1640,1480],[1600,1400]]}]}');

      delete dealIdRequest[0].params.dealId;
      request = spec.buildRequests(dealIdRequest, {});
      expect(request[0].data).to.equal('{"adUnits":[{"auId":"000000000008b6bc","targetId":"123","dealId":[{"id":"123","bidfloor":12,"bidfloorcur":"USD"}],"maxDeals":1,"dimensions":[[640,480],[600,400]]},{"auId":"0000000000000551","targetId":"adn-0000000000000551","dimensions":[[1640,1480],[1600,1400]]}]}');
    });

    it('Test requests with no local storage', function () {
      storage.setDataInLocalStorage('adn.metaData', JSON.stringify([{}]));
      const request = spec.buildRequests(bidderRequests, {});
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('bid');
      const bid = request[0].bid[0]
      expect(bid).to.have.property('bidId');
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, ENDPOINT_URL_BASE);
      expect(request[0]).to.have.property('data');
      expect(request[0].data).to.equal('{"adUnits":[{"auId":"000000000008b6bc","targetId":"123","maxDeals":1,"dimensions":[[640,480],[600,400]]},{"auId":"0000000000000551","targetId":"adn-0000000000000551","dimensions":[[1640,1480],[1600,1400]]}]}');

      localStorage.removeItem('adn.metaData');
      const request2 = spec.buildRequests(bidderRequests, {});
      expect(request2.length).to.equal(1);
      expect(request2[0]).to.have.property('url');
      expectUrlsEqual(request2[0].url, ENDPOINT_URL_BASE);
    });

    it('Test request changes for voided au ids', function () {
      storage.setDataInLocalStorage('adn.metaData', JSON.stringify([{ key: 'voidAuIds', value: [{ auId: '11118b6bc', exp: getUnixTimestampFromNow(1) }, { auId: '0000000000000023', exp: getUnixTimestampFromNow(1) }] }]));
      const bRequests = bidderRequests.concat([{
        bidId: 'adn-11118b6bc',
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
      }]);
      bRequests.push({
        bidId: 'adn-23',
        bidder: 'adnuntius',
        params: {
          auId: '23',
          network: 'adnuntius',
        },
        mediaTypes: {
          banner: {
            sizes: [[1640, 1480], [1600, 1400]],
          }
        },
      });
      bRequests.push({
        bidId: 'adn-13',
        bidder: 'adnuntius',
        params: {
          auId: '13',
          network: 'adnuntius',
        },
        mediaTypes: {
          banner: {
            sizes: [[164, 140], [10, 1400]],
          }
        },
      });
      const request = spec.buildRequests(bRequests, {});
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('bid');
      const bid = request[0].bid[0]
      expect(bid).to.have.property('bidId');
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, ENDPOINT_URL_BASE);
      expect(request[0]).to.have.property('data');
      expect(request[0].data).to.equal('{"adUnits":[{"auId":"000000000008b6bc","targetId":"123","maxDeals":1,"dimensions":[[640,480],[600,400]]},{"auId":"0000000000000551","targetId":"adn-0000000000000551","dimensions":[[1640,1480],[1600,1400]]},{"auId":"13","targetId":"adn-13","dimensions":[[164,140],[10,1400]]}]}');
    });

    it('Test Video requests', function () {
      const request = spec.buildRequests(videoBidderRequest, {});
      expect(request.length).to.equal(1);

      const data = JSON.parse(request[0].data);
      expect(data.adUnits.length).to.equal(1);
      expect(data.adUnits[0].targetId).to.equal('adn-0000000000000551');
      expect(data.adUnits[0].adType).to.equal('VAST');

      expect(request[0]).to.have.property('bid');
      const bid = request[0].bid[0]
      expect(bid).to.have.property('bidId');
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, ENDPOINT_URL);
    });

    it('Test multiformat requests', function () {
      const request = spec.buildRequests(multiBidderRequest, {});
      expect(request.length).to.equal(1);
      expect(request.data)
      const data = JSON.parse(request[0].data);
      expect(data.adUnits.length).to.equal(2);
      expect(data.adUnits[0].targetId).to.equal('adn-0000000000000551');
      expect(data.adUnits[0]).not.to.have.property('adType');
      expect(data.adUnits[1].targetId).to.equal('adn-0000000000000551-video');
      expect(data.adUnits[1].adType).to.equal('VAST');
      expect(request[0]).to.have.property('bid');
      const bid = request[0].bid[0]
      expect(bid).to.have.property('bidId');
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, ENDPOINT_URL);
    });

    it('should pass segments if available in config and merge from targeting', function () {
      const ortb2 = {
        user: {
          data: [{
            name: 'adnuntius',
            segment: [{ id: 'segment1' }, { id: 'segment2' }, { invalidSegment: 'invalid' }, { id: 123 }, { id: ['3332'] }]
          },
          {
            name: 'other',
            segment: ['segment3']
          }]
        }
      };

      bidderRequests[0].params.targeting = {
        segments: ['merge-this', 'and-this']
      };

      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, { ortb2 }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expectUrlsEqual(request[0].url, ENDPOINT_URL_SEGMENTS.replace('segment3', 'segment3,merge-this,and-this'));

      delete bidderRequests[0].params.targeting;
    });

    function countMatches(actualArray, expectedValue) {
      return actualArray.filter(val => {
        return JSON.stringify(val) === JSON.stringify(expectedValue);
      }).length;
    }

    it('should pass site data ext as key values to ad server', function () {
      const ortb2 = {
        site: {
          ext: {
            data: {
              '12345': 'true',
              '45678': 'true',
              '9090': 'should-be-retained'
            }
          }
        }
      };
      bidderRequests[0].params.targeting = {
        kv: {
          'merge': ['this'],
          '9090': ['take it over']
        }
      };
      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, { ortb2 }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      const data = JSON.parse(request[0].data);
      expect(countMatches(data.adUnits[0].kv, {'9090': ['take it over']})).to.equal(1);
      expect(countMatches(data.adUnits[0].kv, {'merge': ['this']})).to.equal(1);
      expect(countMatches(data.adUnits[0].kv, {'9090': 'should-be-retained'})).to.equal(1);
      expect(countMatches(data.adUnits[0].kv, {'45678': 'true'})).to.equal(1);
      expect(countMatches(data.adUnits[0].kv, {'12345': 'true'})).to.equal(1);
      expect(data.adUnits[0].kv.length).to.equal(5);

      delete bidderRequests[0].params.targeting;
    });

    it('should pass site.ext.data and user.ext.data as key values to ad server with targeting in different format', function () {
      const ortb2 = {
        user: {
          ext: {
            data: {
              'from': 'user',
              '9090': 'from-user'
            }
          }
        },
        site: {
          ext: {
            data: {
              '12345': 'true',
              '45678': 'true',
              '9090': 'should-be-retained'
            }
          }
        }
      };
      bidderRequests[0].params.targeting = {
        kv: [
          {'merge': ['this']},
          {'9090': ['take it over']}
        ]
      };
      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, { ortb2 }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      const data = JSON.parse(request[0].data);
      expect(countMatches(data.adUnits[0].kv, {'from': 'user'})).to.equal(1);
      expect(countMatches(data.adUnits[0].kv, {'9090': 'from-user'})).to.equal(1);
      expect(countMatches(data.adUnits[0].kv, {'9090': ['take it over']})).to.equal(1);
      expect(countMatches(data.adUnits[0].kv, {'merge': ['this']})).to.equal(1);
      expect(countMatches(data.adUnits[0].kv, {'9090': 'should-be-retained'})).to.equal(1);
      expect(countMatches(data.adUnits[0].kv, {'45678': 'true'})).to.equal(1);
      expect(countMatches(data.adUnits[0].kv, {'12345': 'true'})).to.equal(1);
      expect(data.adUnits[0].kv.length).to.equal(7);

      delete bidderRequests[0].params.targeting;
    });

    it('should pass site data ext as key values to ad server even if no kv targeting specified in params.targeting', function () {
      const ortb2 = {
        site: {
          ext: {
            data: {
              '12345': 'true',
              '45678': 'true',
              '9090': 'should-be-retained'
            }
          }
        }
      };
      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, { ortb2 }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      const data = JSON.parse(request[0].data);
      expect(countMatches(data.adUnits[0].kv, {'9090': 'should-be-retained'})).to.equal(1);
      expect(countMatches(data.adUnits[0].kv, {'45678': 'true'})).to.equal(1);
      expect(countMatches(data.adUnits[0].kv, {'12345': 'true'})).to.equal(1);
      expect(data.adUnits[0].kv.length).to.equal(3);

      delete bidderRequests[0].params.targeting;
    });

    it('should skip passing site ext if missing', function () {
      const ortb2 = {
        site: {
          ext: {
          }
        }
      };

      delete bidderRequests[0].params.targeting;
      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, { ortb2 }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      const data = JSON.parse(request[0].data);
      expect(data.adUnits[0]).to.not.have.property('kv');
    });

    it('should skip passing site ext data if missing', function () {
      const ortb2 = {
        site: {
          ext: {
            data: {}
          }
        }
      };

      delete bidderRequests[0].params.targeting;
      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, { ortb2 }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      const data = JSON.parse(request[0].data);
      expect(data.adUnits[0]).to.not.have.property('kv');
    });

    it('should skip segments in config if not either id or array of strings', function () {
      const ortb2 = {
        user: {
          data: [{
            name: 'adnuntius',
            segment: [{ id: 'segment1' }, { id: 'segment2' }, { id: 'segment3' }]
          },
          {
            name: 'other',
            segment: [{
              notright: 'segment4'
            }]
          }],
        }
      };

      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, { ortb2 }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, ENDPOINT_URL_SEGMENTS);
    });
  });

  describe('user privacy', function () {
    it('should send GDPR Consent data if gdprApplies', function () {
      const request = spec.buildRequests(bidderRequests, { gdprConsent: { gdprApplies: true, consentString: 'consentString' } });
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, ENDPOINT_URL_CONSENT);
    });

    it('should not send GDPR Consent data if gdprApplies equals undefined', function () {
      const request = spec.buildRequests(bidderRequests, { gdprConsent: { gdprApplies: undefined, consentString: 'consentString' } });
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, ENDPOINT_URL);
    });

    it('should pass segments if available in config', function () {
      const ortb2 = {
        user: {
          data: [{
            name: 'adnuntius',
            segment: [{ id: 'segment1' }, { id: 'segment2' }]
          },
          {
            name: 'other',
            segment: ['segment3']
          }]
        }
      }

      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, { ortb2 }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, ENDPOINT_URL_SEGMENTS);
    });

    it('should skip segments in config if not either id or array of strings', function () {
      const ortb2 = {
        user: {
          data: [{
            name: 'adnuntius',
            segment: [{ id: 'segment1' }, { id: 'segment2' }, { id: 'segment3' }]
          },
          {
            name: 'other',
            segment: [{
              notright: 'segment4'
            }]
          }],
        }
      };

      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, { ortb2 }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expectUrlsEqual(request[0].url, ENDPOINT_URL_SEGMENTS);
    });

    it('should user user ID if present in ortb2.user.id field', function () {
      const ortb2 = {
        user: {
          id: usi
        }
      };

      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, { ortb2 }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expectUrlsEqual(request[0].url, ENDPOINT_URL);
    });

    it('should user in user', function () {
      config.setBidderConfig({
        bidders: ['adnuntius'],
      });

      const req = [
        {
          bidId: 'adn-000000000008b6bc',
          bidder: 'adnuntius',
          params: {
            auId: '000000000008b6bc',
            network: 'adnuntius'
          }
        }
      ];
      let request = config.runWithBidder('adnuntius', () => spec.buildRequests(req, { bids: req }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, `${ENDPOINT_URL_BASE}&userId=${usi}`);

      const ortb2 = {user: {ext: {eids: [{source: 'a', uids: [{id: '123', atype: 1}]}, {source: 'b', uids: [{id: '456', atype: 3, ext: {some: '1'}}]}]}}};
      request = config.runWithBidder('adnuntius', () => spec.buildRequests(req, { bids: req, ortb2: ortb2 }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, `${ENDPOINT_URL_BASE}&userId=${usi}&eids=%5B%7B%22source%22%3A%22a%22%2C%22uids%22%3A%5B%7B%22id%22%3A%22123%22%2C%22atype%22%3A1%7D%5D%7D%2C%7B%22source%22%3A%22b%22%2C%22uids%22%3A%5B%7B%22id%22%3A%22456%22%2C%22atype%22%3A3%2C%22ext%22%3A%7B%22some%22%3A%221%22%7D%7D%5D%7D%5D`);

      ortb2.user.id = "ortb2userid"
      request = config.runWithBidder('adnuntius', () => spec.buildRequests(req, { bids: req, ortb2: ortb2 }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, `${ENDPOINT_URL_BASE}&userId=ortb2userid&eids=%5B%7B%22source%22%3A%22a%22%2C%22uids%22%3A%5B%7B%22id%22%3A%22123%22%2C%22atype%22%3A1%7D%5D%7D%2C%7B%22source%22%3A%22b%22%2C%22uids%22%3A%5B%7B%22id%22%3A%22456%22%2C%22atype%22%3A3%2C%22ext%22%3A%7B%22some%22%3A%221%22%7D%7D%5D%7D%5D`);

      req[0].params.userId = 'different_user_id';
      request = config.runWithBidder('adnuntius', () => spec.buildRequests(req, { bids: req }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, `${ENDPOINT_URL_BASE}&userId=different_user_id`);

      const eids = [{source: 'pubcid', uids: [{id: '123', atype: 1}]}, {source: 'otherid', uids: [{id: '456', atype: 3, ext: {some: '1'}}]}];
      req[0].params.userId = 'different_user_id';
      req[0].params.userIdAsEids = eids;
      request = config.runWithBidder('adnuntius', () => spec.buildRequests(req, { bids: req }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expectUrlsEqual(request[0].url, `${ENDPOINT_URL_BASE}&userId=different_user_id&eids=` + encodeURIComponent(JSON.stringify(eids)));

      request = config.runWithBidder('adnuntius', () => spec.buildRequests(req, { bids: req, ortb2: ortb2 }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, `${ENDPOINT_URL_BASE}&userId=different_user_id&eids=` + encodeURIComponent(JSON.stringify(eids)));
    });

    it('should handle no user specified', function () {
      config.setBidderConfig({
        bidders: ['adnuntius'],
      });
      const req = [
        {
          bidId: 'adn-000000000008b6bc',
          bidder: 'adnuntius',
          params: {
            auId: '000000000008b6bc',
            network: 'adnuntius'
          }
        }
      ];
      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(req, { bids: req }));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, ENDPOINT_URL);
    });
  });

  describe('user privacy', function () {
    it('should send GDPR Consent data if gdprApplies', function () {
      const request = spec.buildRequests(bidderRequests, { gdprConsent: { gdprApplies: true, consentString: 'consentString' } });
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, ENDPOINT_URL_CONSENT);
    });

    it('should not send GDPR Consent data if gdprApplies equals undefined', function () {
      const request = spec.buildRequests(bidderRequests, { gdprConsent: { gdprApplies: undefined, consentString: 'consentString' } });
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, ENDPOINT_URL);
    });
  });

  describe('use cookie', function () {
    it('should send noCookie in url if set to false.', function () {
      config.setBidderConfig({
        bidders: ['adnuntius'],
        config: {
          useCookie: false,
          advertiserTransparency: true
        }
      });

      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, {}));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, ENDPOINT_URL_NOCOOKIE + '&advertiserTransparency=true');
    });
  });

  describe('validate auId', function () {
    it('should fail when auId is not hexadecimal', function () {
      const invalidRequest = {
        bidId: 'adn-000000000008b6bc',
        bidder: 'adnuntius',
        params: {
          auId: 'nothexadecimal',
        }
      };
      const valid = config.runWithBidder('adnuntius', () => spec.isBidRequestValid(invalidRequest));
      expect(valid).to.equal(false);
    });

    it('should pass when auId is  hexadecimal', function () {
      const invalidRequest = {
        bidId: 'adn-000000000008b6bc',
        bidder: 'adnuntius',
        params: {
          auId: '0123456789abcDEF',
        }
      };
      const valid = config.runWithBidder('adnuntius', () => spec.isBidRequestValid(invalidRequest));
      expect(valid).to.equal(true);
    });
  });

  describe('request deals', function () {
    it('Should set max deals.', function () {
      config.setBidderConfig({
        bidders: ['adnuntius']
      });

      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, {}));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, ENDPOINT_URL);
      expect(request[0]).to.have.property('data');
      const data = JSON.parse(request[0].data);
      expect(data.adUnits.length).to.equal(2);
      expect(bidderRequests[0].params.maxDeals).to.equal(1);
      expect(data.adUnits[0].maxDeals).to.equal(bidderRequests[0].params.maxDeals);
      expect(bidderRequests[1].params).to.not.have.property('maxBids');
      expect(data.adUnits[1].maxDeals).to.equal(undefined);
    });
    it('Should allow a maximum of 5 deals.', function () {
      config.setBidderConfig({
        bidders: ['adnuntius'],
      });
      const request = config.runWithBidder('adnuntius', () => spec.buildRequests([
        {
          bidId: 'adn-000000000008b6bc',
          bidder: 'adnuntius',
          params: {
            auId: '000000000008b6bc',
            network: 'adnuntius',
            maxDeals: 10
          }
        }
      ], {}));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expectUrlsEqual(request[0].url, ENDPOINT_URL);
      expect(request[0]).to.have.property('data');
      const data = JSON.parse(request[0].data);
      expect(data.adUnits.length).to.equal(1);
      expect(data.adUnits[0].maxDeals).to.equal(5);
    });
    it('Should allow a minimum of 0 deals.', function () {
      config.setBidderConfig({
        bidders: ['adnuntius'],
      });
      const request = config.runWithBidder('adnuntius', () => spec.buildRequests([
        {
          bidId: 'adn-000000000008b6bc',
          bidder: 'adnuntius',
          params: {
            auId: '000000000008b6bc',
            network: 'adnuntius',
            maxDeals: -1
          }
        }
      ], {}));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expectUrlsEqual(request[0].url, ENDPOINT_URL);
      expect(request[0]).to.have.property('data');
      const data = JSON.parse(request[0].data);
      expect(data.adUnits.length).to.equal(1);
      expect(data.adUnits[0].maxDeals).to.equal(undefined);
    });
    it('Should set max deals using bidder config.', function () {
      config.setBidderConfig({
        bidders: ['adnuntius'],
        config: {
          maxDeals: 2,
          useCookie: 'ignore-this',
          advertiserTransparency: 'ignore-this-as-well'
        }
      });

      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, {}));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expectUrlsEqual(request[0].url, ENDPOINT_URL + '&ds=2');
    });
    it('Should allow a maximum of 5 deals when using bidder config.', function () {
      config.setBidderConfig({
        bidders: ['adnuntius'],
        config: {
          maxDeals: 6
        }
      });

      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, {}));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      expectUrlsEqual(request[0].url, ENDPOINT_URL + '&ds=5');
    });
    it('Should allow a minimum of 0 deals when using bidder config.', function () {
      config.setBidderConfig({
        bidders: ['adnuntius'],
        config: {
          maxDeals: -1
        }
      });

      const request = config.runWithBidder('adnuntius', () => spec.buildRequests(bidderRequests, {}));
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url');
      // The maxDeals value is ignored because it is less than zero
      expectUrlsEqual(request[0].url, ENDPOINT_URL);
    });
  });

  describe('interpretResponse', function () {
    it('should return valid response when passed valid server response', function () {
      config.setBidderConfig({
        bidders: ['adnuntius'],
        config: {
          bidType: 'netBid',
          maxDeals: 1
        }
      });

      const interpretedResponse = config.runWithBidder('adnuntius', () => spec.interpretResponse(serverResponse, singleBidRequest));
      expect(interpretedResponse).to.have.lengthOf(2);

      const deal = serverResponse.body.adUnits[0].deals[0];
      expect(interpretedResponse[0].bidderCode).to.equal('adnuntius');
      expect(interpretedResponse[0].cpm).to.equal(deal.netBid.amount * 1000);
      expect(interpretedResponse[0].width).to.equal(Number(deal.creativeWidth));
      expect(interpretedResponse[0].height).to.equal(Number(deal.creativeHeight));
      expect(interpretedResponse[0].creativeId).to.equal(deal.creativeId);
      expect(interpretedResponse[0].currency).to.equal(deal.bid.currency);
      expect(interpretedResponse[0].netRevenue).to.equal(false);
      expect(interpretedResponse[0].meta).to.have.property('advertiserDomains');
      expect(interpretedResponse[0].meta.advertiserDomains).to.have.lengthOf(2);
      expect(interpretedResponse[0].meta.advertiserDomains[0]).to.equal('fred.com');
      expect(interpretedResponse[0].meta.advertiserDomains[1]).to.equal('george.com');
      expect(interpretedResponse[0].ad).to.equal(serverResponse.body.adUnits[0].deals[0].html);
      expect(interpretedResponse[0].ttl).to.equal(360);
      expect(interpretedResponse[0].dealId).to.equal('abc123xyz');
      expect(interpretedResponse[0].dealCount).to.equal(1);

      const ad = serverResponse.body.adUnits[0].ads[0];
      expect(interpretedResponse[1].bidderCode).to.equal('adnuntius');
      expect(interpretedResponse[1].cpm).to.equal(ad.netBid.amount * 1000);
      expect(interpretedResponse[1].width).to.equal(Number(ad.creativeWidth));
      expect(interpretedResponse[1].height).to.equal(Number(ad.creativeHeight));
      expect(interpretedResponse[1].creativeId).to.equal(ad.creativeId);
      expect(interpretedResponse[1].currency).to.equal(ad.bid.currency);
      expect(interpretedResponse[1].netRevenue).to.equal(false);
      expect(interpretedResponse[1].meta).to.have.property('advertiserDomains');
      expect(interpretedResponse[1].meta.advertiserDomains).to.have.lengthOf(1);
      expect(interpretedResponse[1].meta.advertiserDomains[0]).to.equal('adnuntius.com');
      expect(interpretedResponse[1].ad).to.equal(serverResponse.body.adUnits[0].html);
      expect(interpretedResponse[1].ttl).to.equal(360);
      expect(interpretedResponse[1].dealId).to.equal('not-in-deal-array-here');
      expect(interpretedResponse[1].dealCount).to.equal(0);

      const results = JSON.parse(storage.getDataFromLocalStorage('adn.metaData'));
      const usiEntry = results.find(entry => entry.key === 'usi' && entry.network === 'some-network-id');
      expect(usiEntry.key).to.equal('usi');
      expect(usiEntry.value).to.equal('from-api-server dude');
      expect(usiEntry.exp).to.be.greaterThan(getUnixTimestampFromNow(90));
      expect(usiEntry.network).to.equal('some-network-id')

      const voidAuIdsEntry = results.find(entry => entry.key === 'voidAuIds');
      expect(voidAuIdsEntry.key).to.equal('voidAuIds');
      expect(voidAuIdsEntry.exp).to.equal(undefined);
      expect(voidAuIdsEntry.value[0].auId).to.equal('00000000000abcde');
      expect(voidAuIdsEntry.value[0].exp).to.be.greaterThan(getUnixTimestampFromNow());
      expect(voidAuIdsEntry.value[0].exp).to.be.lessThan(getUnixTimestampFromNow(2));
      expect(voidAuIdsEntry.value[1].auId).to.equal('00000000000fffff');
      expect(voidAuIdsEntry.value[1].exp).to.be.greaterThan(getUnixTimestampFromNow());
      expect(voidAuIdsEntry.value[1].exp).to.be.lessThan(getUnixTimestampFromNow(2));

      const validEntry = results.find(entry => entry.key === 'valid');
      expect(validEntry.key).to.equal('valid');
      expect(validEntry.value).to.equal('also-valid');
      expect(validEntry.exp).to.be.greaterThan(getUnixTimestampFromNow());
      expect(validEntry.exp).to.be.lessThan(getUnixTimestampFromNow(2));

      const randomApiEntry = results.find(entry => entry.key === 'randomApiKey');
      expect(randomApiEntry.key).to.equal('randomApiKey');
      expect(randomApiEntry.value).to.equal('randomApiValue');
      expect(randomApiEntry.network).to.equal('some-network-id');
      expect(randomApiEntry.exp).to.be.greaterThan(getUnixTimestampFromNow(90));
    });

    it('should return valid response when passed valid multiformat server response', function () {
      config.setBidderConfig({
        bidders: ['adnuntius'],
        config: {
          bidType: 'netBid',
          maxDeals: 0
        }
      });

      const interpretedResponse = config.runWithBidder('adnuntius', () => spec.interpretResponse(multiFormatServerResponse, multiBidAndFormatRequest));
      expect(interpretedResponse).to.have.lengthOf(3);

      let ad = multiFormatServerResponse.body.adUnits[0].ads[0];
      expect(interpretedResponse[0].bidderCode).to.equal('adnuntius');
      expect(interpretedResponse[0].cpm).to.equal(ad.netBid.amount * 1000);
      expect(interpretedResponse[0].width).to.equal(Number(ad.creativeWidth));
      expect(interpretedResponse[0].height).to.equal(Number(ad.creativeHeight));
      expect(interpretedResponse[0].creativeId).to.equal(ad.creativeId);
      expect(interpretedResponse[0].currency).to.equal(ad.bid.currency);
      expect(interpretedResponse[0].netRevenue).to.equal(false);
      expect(interpretedResponse[0].ad).to.equal(multiFormatServerResponse.body.adUnits[0].html);
      expect(interpretedResponse[0].ttl).to.equal(360);

      ad = multiFormatServerResponse.body.adUnits[4].ads[0];
      expect(interpretedResponse[1].bidderCode).to.equal('adnuntius');
      expect(interpretedResponse[1].cpm).to.equal(ad.netBid.amount * 1000);
      expect(interpretedResponse[1].width).to.equal(Number(ad.creativeWidth));
      expect(interpretedResponse[1].height).to.equal(Number(ad.creativeHeight));
      expect(interpretedResponse[1].creativeId).to.equal(ad.creativeId);
      expect(interpretedResponse[1].currency).to.equal(ad.bid.currency);
      expect(interpretedResponse[1].netRevenue).to.equal(false);
      expect(interpretedResponse[1].ad).to.equal(multiFormatServerResponse.body.adUnits[4].html);
      expect(interpretedResponse[1].ttl).to.equal(360);

      ad = multiFormatServerResponse.body.adUnits[2].ads[0];
      expect(interpretedResponse[2].native).to.not.be.undefined;
      expect(interpretedResponse[2].bidderCode).to.equal('adnuntius');
      expect(interpretedResponse[2].cpm).to.equal(ad.netBid.amount * 1000);
      expect(interpretedResponse[2].width).to.equal(Number(ad.creativeWidth));
      expect(interpretedResponse[2].height).to.equal(Number(ad.creativeHeight));
      expect(interpretedResponse[2].creativeId).to.equal(ad.creativeId);
      expect(interpretedResponse[2].currency).to.equal(ad.bid.currency);
      expect(interpretedResponse[2].netRevenue).to.equal(false);
      expect(interpretedResponse[2].ttl).to.equal(360);
    });

    it('should not process valid response when passed alt bidder that is an adndeal', function () {
      const altBidder = {
        bid: [
          {
            bidder: 'adndeal1',
            bidId: 'adn-0000000000000551',
          }
        ]
      };
      serverResponse.body.adUnits[0].deals = [];
      delete serverResponse.body.metaData.voidAuIds; // test response with no voidAuIds

      const interpretedResponse = spec.interpretResponse(serverResponse, altBidder);
      expect(interpretedResponse).to.have.lengthOf(0);

      serverResponse.body.adUnits[0].deals = deals;
    });

    it('should return valid response when passed alt bidder', function () {
      const altBidder = {
        bid: [
          {
            bidder: 'adn-alt',
            bidId: 'adn-0000000000000551',
            params: {
              bidType: 'netBid'
            }
          }
        ]
      };
      serverResponse.body.adUnits[0].deals = [];

      const interpretedResponse = spec.interpretResponse(serverResponse, altBidder);
      expect(interpretedResponse).to.have.lengthOf(1);

      const ad = serverResponse.body.adUnits[0].ads[0];
      expect(interpretedResponse[0].bidderCode).to.equal('adn-alt');
      expect(interpretedResponse[0].cpm).to.equal(ad.netBid.amount * 1000);
      expect(interpretedResponse[0].width).to.equal(Number(ad.creativeWidth));
      expect(interpretedResponse[0].height).to.equal(Number(ad.creativeHeight));
      expect(interpretedResponse[0].creativeId).to.equal(ad.creativeId);
      expect(interpretedResponse[0].currency).to.equal(ad.bid.currency);
      expect(interpretedResponse[0].netRevenue).to.equal(false);
      expect(interpretedResponse[0].meta).to.have.property('advertiserDomains');
      expect(interpretedResponse[0].meta.advertiserDomains).to.have.lengthOf(1);
      expect(interpretedResponse[0].meta.advertiserDomains[0]).to.equal('adnuntius.com');
      expect(interpretedResponse[0].ad).to.equal(serverResponse.body.adUnits[0].html);
      expect(interpretedResponse[0].ttl).to.equal(360);
      expect(interpretedResponse[0].dealId).to.equal('not-in-deal-array-here');
      expect(interpretedResponse[0].dealCount).to.equal(0);

      serverResponse.body.adUnits[0].deals = deals;
    });
  });

  describe('interpretVideoResponse', function () {
    it('should return valid response when passed valid server response', function () {
      const interpretedResponse = spec.interpretResponse(serverVideoResponse, videoBidRequest);
      const ad = serverVideoResponse.body.adUnits[0].ads[0]
      const deal = serverVideoResponse.body.adUnits[0].deals[0]
      expect(interpretedResponse).to.have.lengthOf(2);

      expect(interpretedResponse[0].bidderCode).to.equal('adnuntius');
      expect(interpretedResponse[0].cpm).to.equal(deal.bid.amount * 1000);
      expect(interpretedResponse[0].width).to.equal(Number(deal.creativeWidth));
      expect(interpretedResponse[0].height).to.equal(Number(deal.creativeHeight));
      expect(interpretedResponse[0].creativeId).to.equal(deal.creativeId);
      expect(interpretedResponse[0].currency).to.equal(deal.bid.currency);
      expect(interpretedResponse[0].netRevenue).to.equal(false);
      expect(interpretedResponse[0].meta).to.have.property('advertiserDomains');
      expect(interpretedResponse[0].meta.advertiserDomains).to.have.lengthOf(1);
      expect(interpretedResponse[0].meta.advertiserDomains[0]).to.equal('adnuntius.com');
      expect(interpretedResponse[0].vastXml).to.equal(deal.vastXml);
      expect(interpretedResponse[0].dealId).to.equal('abc123xyz');
      expect(interpretedResponse[0].dealCount).to.equal(1);

      expect(interpretedResponse[1].bidderCode).to.equal('adnuntius');
      expect(interpretedResponse[1].cpm).to.equal(ad.bid.amount * 1000);
      expect(interpretedResponse[1].width).to.equal(Number(ad.creativeWidth));
      expect(interpretedResponse[1].height).to.equal(Number(ad.creativeHeight));
      expect(interpretedResponse[1].creativeId).to.equal(ad.creativeId);
      expect(interpretedResponse[1].currency).to.equal(ad.bid.currency);
      expect(interpretedResponse[1].netRevenue).to.equal(false);
      expect(interpretedResponse[1].meta).to.have.property('advertiserDomains');
      expect(interpretedResponse[1].meta.advertiserDomains).to.have.lengthOf(1);
      expect(interpretedResponse[1].meta.advertiserDomains[0]).to.equal('adnuntius.com');
      expect(interpretedResponse[1].vastXml).to.equal(serverVideoResponse.body.adUnits[0].vastXml);
      expect(interpretedResponse[1].dealId).to.equal('not-in-deal-array');
      expect(interpretedResponse[1].dealCount).to.equal(0);
    });
  });

  describe('Native ads handling', function () {
    it('should pass requests on correctly', function () {
      const request = spec.buildRequests(nativeBidderRequest.bid, {});
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('bid');
      expect(request[0]).to.have.property('data');
      expect(request[0].data).to.equal('{"adUnits":[{"auId":"0000000000000551","targetId":"adn-0000000000000551","adType":"NATIVE","nativeRequest":{"ortb":{"assets":[{"id":1,"required":1,"img":{"type":3,"w":250,"h":250}}]}},"dimensions":[[200,200],[300,300]]}]}');
    });

    it('should return valid response when passed valid server response', function () {
      const interpretedResponse = spec.interpretResponse(nativeResponse, nativeBidderRequest);
      const ad = nativeResponse.body.adUnits[0].ads[0]
      expect(interpretedResponse).to.have.lengthOf(1);

      expect(interpretedResponse[0].bidderCode).to.equal('adnuntius');
      expect(interpretedResponse[0].cpm).to.equal(ad.bid.amount * 1000);
      expect(interpretedResponse[0].width).to.equal(Number(ad.creativeWidth));
      expect(interpretedResponse[0].height).to.equal(Number(ad.creativeHeight));
      expect(interpretedResponse[0].creativeId).to.equal(ad.creativeId);
      expect(interpretedResponse[0].currency).to.equal(ad.bid.currency);
      expect(interpretedResponse[0].netRevenue).to.equal(false);
      expect(interpretedResponse[0].meta).to.have.property('advertiserDomains');
      expect(interpretedResponse[0].meta.advertiserDomains).to.have.lengthOf(1);
      expect(interpretedResponse[0].meta.advertiserDomains[0]).to.equal('adnuntius.com');
      expect(interpretedResponse[0].vastXml).to.equal(ad.vastXml);
      expect(JSON.stringify(interpretedResponse[0].native.ortb)).to.equal('{"link":{"url":"https://whatever.com"},"assets":[{"id":1,"required":1,"img":{"url":"http://something.com/something.png"}}]}');
    });

    it('should pass legacy requests on correctly', function () {
      const request = spec.buildRequests(legacyNativeBidderRequest.bid, {});
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('bid');
      expect(request[0]).to.have.property('data');
      expect(request[0].data).to.equal('{"adUnits":[{"auId":"0000000000000551","targetId":"adn-0000000000000551","adType":"NATIVE","nativeRequest":{"ortb":{"ver":"1.2","assets":[{"id":0,"required":1,"img":{"type":3,"w":250,"h":250}}],"eventtrackers":[{"event":1,"methods":[1]},{"event":2,"methods":[1]}]}},"dimensions":[[200,200],[300,300]]}]}');
    });

    it('should return valid legacy response when passed valid server response', function () {
      const interpretedResponse = spec.interpretResponse(nativeResponse, legacyNativeBidderRequest);
      const ad = nativeResponse.body.adUnits[0].ads[0]
      expect(interpretedResponse).to.have.lengthOf(1);

      expect(interpretedResponse[0].bidderCode).to.equal('adnuntius');
      expect(interpretedResponse[0].cpm).to.equal(ad.bid.amount * 1000);
      expect(interpretedResponse[0].width).to.equal(Number(ad.creativeWidth));
      expect(interpretedResponse[0].height).to.equal(Number(ad.creativeHeight));
      expect(interpretedResponse[0].creativeId).to.equal(ad.creativeId);
      expect(interpretedResponse[0].currency).to.equal(ad.bid.currency);
      expect(interpretedResponse[0].netRevenue).to.equal(false);
      expect(interpretedResponse[0].meta).to.have.property('advertiserDomains');
      expect(interpretedResponse[0].meta.advertiserDomains).to.have.lengthOf(1);
      expect(interpretedResponse[0].meta.advertiserDomains[0]).to.equal('adnuntius.com');
      expect(interpretedResponse[0].vastXml).to.equal(ad.vastXml);
      expect(JSON.stringify(interpretedResponse[0].native)).to.equal('{"clickUrl":"https://whatever.com","icon":{"url":"http://something.com/something.png"},"impressionTrackers":[]}');
    });
  });
});
