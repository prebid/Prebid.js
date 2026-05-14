import { expect } from 'chai';
import {
  spec,
  buildBid,
  BLIINK_ENDPOINT_ENGINE,
  getMetaList,
  BLIINK_ENDPOINT_COOKIE_SYNC_IFRAME,
  getEffectiveConnectionType,
  getUserIds,
  GVL_ID,
} from 'modules/bliinkBidAdapter.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';

/**
 * @description Mockup bidRequest
 * @return {{
 * bidderWinsCount: number,
 * adUnitCode: string,
 * bidder: string,
 * src: string,
 * bidRequestsCount: number,
 * params: {tagId: string, placement: string},
 * bidId: string,
 * transactionId: string,
 * auctionId: string,
 * bidderRequestId: string,
 * bidderRequestsCount: number,
 * mediaTypes: {banner: {sizes: number[][]}},
 * sizes: number[][],
 * crumbs: {pubcid: string},
 * ortb2Imp: {ext: {data: {pbadslot: string}}}}}
 */

const w = (utils.canAccessWindowTop()) ? utils.getWindowTop() : utils.getWindowSelf();
const connectionType = getEffectiveConnectionType();
let domLoadingDuration = utils.getDomLoadingDuration(w).toString();
const getConfigBid = (placement) => {
  return {
    adUnitCode: '/19968336/test',
    auctionId: '6752b51c-dcd4-4001-85dc-885ab5c504cf',
    bidId: '2def0c5b2a7f6e',
    bidRequestsCount: 1,
    bidder: 'bliink',
    bidderRequestId: '1592eb20088b18',
    bidderRequestsCount: 1,
    bidderWinsCount: 0,
    crumbs: {
      pubcid: '55ffadc5-051f-428d-8ecc-dc585e0bde0d',
    },
    sizes: [[300, 250]],
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    ortb2Imp: {
      ext: {
        data: {
          pbadslot: '/19968336/test',
        },
      },
    },
    domLoadingDuration,
    ect: connectionType,
    params: {
      placement: placement,
      tagId: '14f30eca-85d2-11e8-9eed-0242ac120007',
      videoUrl: 'https://www.example.com/advideo.mp4',
      imageUrl: 'https://www.example.com/adimage.jpg',
    },
    src: 'client',
    transactionId: 'cc6678c4-9746-4082-b9e2-d8065d078ebf',
  };
};
const getConfigBannerBid = () => {
  return {
    creative: {
      banner: {
        adm: '',
        height: 250,
        width: 300,
      },
      media_type: 'banner',
      creativeId: 125,
    },
    price: 1,
    id: '810',
    token: 'token',
    mode: 'rtb',
    extras: {
      deal_id: '34567erty',
      transaction_id: '2def0c5b2a7f6e',
    },
    currency: 'EUR',
  };
};
const getConfigVideoBid = () => {
  return {
    creative: {
      video: {
        content: '<VAST></VAST>',
        height: 250,
        width: 300,
      },
      media_type: 'video',
      creativeId: 0,
    },
    price: 1,
    id: '8121',
    token: 'token',
    mode: 'rtb',
    extras: {
      deal_id: '34567ertyRTY',
      transaction_id: '2def0c5b2a7f6e',
    },
    currency: 'EUR',
  };
};

/**
 * @description Mockup response from engine.bliink.io/xxxx
 * @return {
 *  {
 *    viewability_percent_in_view: number,
 *    viewability_duration: number,
 *    ad_id: number,
 *    id: number,
 *    category: number,
 *    type: number,
 *    content: {
 *      creative: {
 *        adm: string
 *      }
 *    }
 *    }
 *    }
 *   }
 */
const getConfigCreative = () => {
  return {
    ad: '<iframe src="https://creative-stg.bliink.io/test-preview/index.html"></iframe>',
    mediaType: 'banner',
    cpm: 4,
    currency: 'EUR',
    creativeId: '34567erty',
    width: 300,
    height: 250,
    ttl: 300,
    netRevenue: true,
  };
};

const getConfigCreativeVideo = (isNoVast) => {
  return {
    mediaType: 'video',
    vastXml: isNoVast ? '' : '<VAST></VAST>',
    cpm: 0,
    currency: 'EUR',
    creativeId: '34567ertyaza',
    requestId: '6a204ce130280d',
    width: 300,
    height: 250,
    ttl: 300,
    netRevenue: true,
  };
};

/**
 * @description Mockup BuildRequest function
 * @return {{bidderRequestId: string, bidderCode: string, bids: {bidderWinsCount: number, adUnitCode: string, bidder: string, src: string, bidRequestsCount: number, params: {tagId: string, placement: string}, bidId: string, transactionId: string, auctionId: string, bidderRequestId: string, bidderRequestsCount: number, mediaTypes: {banner: {sizes: number[][]}}, sizes: number[][], crumbs: {pubcid: string}, ortb2Imp: {ext: {data: {pbadslot: string}}}}[], refererInfo: {referer: string, canonicalUrl: null, isAmp: boolean, reachedTop: boolean, numIframes: number}}}
 */
const getConfigBuildRequest = (placement) => {
  const buildRequest = {
    bidderRequestId: '164ddfd207e94d',
    bidderCode: 'bliink',
    bids: [getConfigBid(placement)],
    refererInfo: {
      canonicalUrl: null,
      isAmp: false,
      numIframes: 0,
      reachedTop: true,
      page: 'http://localhost:9999/integrationExamples/gpt/bliink-adapter.html?pbjs_debug=true',
    },
  };

  if (!placement) {
    return buildRequest;
  }

  return Object.assign(buildRequest, {
    params: {
      bids: [getConfigBid(placement)],
      placement: placement,
    },
  });
};

/**
 * @description Mockup response from API
 * @param noAd
 * @return {{mode: string, message: string}|{headers: {}, body: {mode: string, creative: {viewability_percent_in_view: number, viewability_duration: number, ad_id: number, adm: string, id: number, category: number, type: number}, token: string}}}
 */
const getConfigInterpretResponse = (noAd = false) => {
  if (noAd) {
    return {
      message: 'invalid tag',
      mode: 'no-ad',
    };
  }

  return {
    body: {
      ...getConfigCreative(),
      mode: 'ad',
      transactionId: '2def0c5b2a7f6e',
      token: SAMPLE_BID_EVENT_TOKEN,
    },
    headers: {},
  };
};

const SAMPLE_BID_EVENT_TOKEN = 'sample-bid-event-token';
const SAMPLE_VAST_EVENT_TOKEN = 'sample-vast-event-token';

/**
 * @description Mockup response from API for RTB creative
 * @param noAd
 * @return {{body: string} | {mode: string, message: string}}
 */
const getConfigInterpretResponseRTB = (noAd = false, isInvalidVast = false) => {
  if (noAd) {
    return {
      message: 'invalid tag',
      mode: 'no-ad',
    };
  }

  const validVast = `
  <VAST version="3">
    <Ad>
      <Wrapper>
        <AdSystem>BLIINK</AdSystem>
        <VASTAdTagURI>https://vast.bliink.io/p/508379d0-9f65-4198-8ba5-f61f2b51224f.xml</VASTAdTagURI>
        <Error>https://e.api.bliink.io/e?name=vast-error&token=${SAMPLE_VAST_EVENT_TOKEN}</Error>
        <Impression>https://e.api.bliink.io/e?name=impression&token=${SAMPLE_VAST_EVENT_TOKEN}</Impression>
        <Extensions><Price>1</Price><Currency>EUR</Currency>
      </Wrapper>
    </Ad>
  </VAST>
  `;
  const invalidVast = `
  <VASTZ version="3">
    <Ad>

    </Ad>
  </VAST>
  `;

  return {
    body: {
      bids: [
        {
          creative: {
            video: {
              content: isInvalidVast ? invalidVast : validVast,
              height: 250,
              width: 300,
            },
            media_type: 'video',
            creativeId: 0,
          },
          price: 0,
          id: '8121',
          token: 'token',
          mode: 'rtb',
          extras: {
            deal_id: '34567ertyaza',
            transaction_id: '2def0c5b2a7f6e',
          },
          currency: 'EUR',
        },
      ],
      userSyncs: [],
    },
  };
};

/**
 *
 *
 *
 * @description Below start tests for utils fonctions
 *
 *
 *
 */

const testsGetMetaList = [
  {
    title: 'Should return empty array if there are no parameters',
    args: {
      fn: getMetaList(),
    },
    want: [],
  },
  {
    title: 'Should return list of metas with name associated',
    args: {
      fn: getMetaList('test'),
    },
    want: [
      {
        key: 'name',
        value: 'test',
      },
      {
        key: 'name*',
        value: 'test',
      },
      {
        key: 'itemprop*',
        value: 'test',
      },
      {
        key: 'property',
        value: `'og:${'test'}'`,
      },
      {
        key: 'property',
        value: `'twitter:${'test'}'`,
      },
      {
        key: 'property',
        value: `'article:${'test'}'`,
      },
    ],
  },
];

describe('BLIINK Adapter getMetaList', function () {
  for (const test of testsGetMetaList) {
    it(test.title, () => {
      const res = test.args.fn;
      expect(res).to.eql(test.want);
    });
  }
});
const GetUserIds = [
  {
    title: 'Should return undefined if there are no parameters',
    args: {
      fn: getUserIds(),
    },
    want: undefined,
  },
  {
    title: 'Should return eids if exists',
    args: {
      fn: getUserIds([{
        userIdAsEids: [
          {
            'source': 'criteo.com',
            'uids': [
              {
                'id': 'testId',
                'atype': 1
              }
            ]
          }
        ]
      }]),
    },
    want: [
      {
        'source': 'criteo.com',
        'uids': [
          {
            'id': 'testId',
            'atype': 1
          }
        ]
      }
    ],
  },
];

describe('BLIINK Adapter getUserIds', function () {
  for (const test of GetUserIds) {
    it(test.title, () => {
      const res = test.args.fn;
      expect(res).to.eql(test.want);
    });
  }
});

/**
 * @description Array of tests used in describe function below
 * @type {[{args: {fn: (string|Document)}, want: string, title: string}, {args: {fn: (string|Document)}, want: string, title: string}]}
 */

/**
 *
 *
 *
 * @description End tests for utils fonctions
 *
 *
 *
 */

/**
 * @description Array of tests used in describe function below
 * @type {[{args: {fn}, want: boolean, title: string}, {args: {fn}, want: boolean, title: string}, {args: {fn}, want: boolean, title: string}]}
 */
const testsIsBidRequestValid = [
  {
    title: 'isBidRequestValid format not valid',
    args: {
      fn: spec.isBidRequestValid({}),
    },
    want: false,
  },
  {
    title: 'isBidRequestValid does not receive any bid',
    args: {
      fn: spec.isBidRequestValid(),
    },
    want: false,
  },
  {
    title: 'isBidRequestValid Receive a valid bid',
    args: {
      fn: spec.isBidRequestValid(getConfigBid('banner')),
    },
    want: true,
  },
];

describe('BLIINK Adapter isBidRequestValid', function () {
  for (const test of testsIsBidRequestValid) {
    it(test.title, () => {
      const res = test.args.fn;
      expect(res).to.eql(test.want);
    });
  }
});

const vastXml =
  getConfigInterpretResponseRTB().body.bids[0].creative.video.content;

const testsInterpretResponse = [
  {
    title: 'Should construct bid for video instream',
    args: {
      fn: spec.interpretResponse(getConfigInterpretResponseRTB(false)),
    },
    want: [
      {
        cpm: 0,
        currency: 'EUR',
        height: 250,
        width: 300,
        creativeId: '34567ertyaza',
        mediaType: 'video',
        netRevenue: true,
        requestId: '2def0c5b2a7f6e',
        ttl: 300,
        vastXml,
        vastUrl:
          'data:text/xml;charset=utf-8;base64,' +
          btoa(vastXml.replace(/\\"/g, '"')),
      },
    ],
  },
  {
    title: 'ServerResponse with message: invalid tag, return empty array',
    args: {
      fn: spec.interpretResponse(getConfigInterpretResponse(true)),
    },
    want: [],
  },
  {
    title: 'ServerResponse with mediaType banner',
    args: {
      fn: spec.interpretResponse({ body: { bids: [getConfigBannerBid()] } }),
    },
    want: [
      {
        ad: '',
        cpm: 1,
        creativeId: '34567erty',
        currency: 'EUR',
        height: 250,
        mediaType: 'banner',
        netRevenue: true,
        requestId: '2def0c5b2a7f6e',
        ttl: 300,
        width: 300,
      },
    ],
  },
  {
    title: 'ServerResponse with unhandled mediaType, return empty array',
    args: {
      fn: spec.interpretResponse({
        body: {
          bids: [
            {
              ...getConfigBannerBid(),
              creative: {
                unknown: {
                  adm: '',
                  height: 250,
                  width: 300,
                },
                media_type: 'unknown',
                creativeId: 125,
                requestId: '2def0c5b2a7f6e',
              },
            },
          ],
        },
      }),
    },
    want: [],
  },
];

describe('BLIINK Adapter interpretResponse', function () {
  for (const test of testsInterpretResponse) {
    it(test.title, () => {
      const res = test.args.fn;

      if (res) {
        expect(res).to.eql(test.want);
      }
    });
  }
});

/**
 * @description Array of tests used in describe function below
 * @type {[
 * {args:
 *  {fn: {
 *    cpm: number,
 *    netRevenue: boolean,
 *    ad, requestId,
 *    meta: {mediaType},
 *    width: number,
 *    currency: string,
 *    ttl: number,
 *    creativeId: number,
 *    height: number
 *      }
 *    }, want, title: string}]}
 */

const testsBuildBid = [
  {
    title: 'Should return null if no bid passed in parameters',
    args: {
      fn: buildBid(),
    },
    want: null,
  },
  {
    title: 'Input data must respect the output model',
    args: {
      fn: buildBid(
        { id: 1, test: '123' },
        { id: 2, test: '345' },
        false,
        false
      ),
    },
    want: null,
  },
  {
    title: 'input data respect the output model for video',
    args: {
      fn: buildBid(getConfigVideoBid('video'), getConfigCreativeVideo()),
    },
    want: {
      requestId: getConfigBid('video').bidId,
      cpm: 1,
      currency: 'EUR',
      mediaType: 'video',
      width: 300,
      height: 250,
      creativeId: getConfigVideoBid().extras.deal_id,
      netRevenue: true,
      vastXml: getConfigCreativeVideo().vastXml,
      vastUrl:
        'data:text/xml;charset=utf-8;base64,' +
        btoa(getConfigCreativeVideo().vastXml.replace(/\\"/g, '"')),
      ttl: 300,
    },
  },
  {
    title: 'use default height width output model for video',
    args: {
      fn: buildBid(
        {
          ...getConfigVideoBid('video'),
          creative: {
            video: {
              content: '<VAST></VAST>',
              height: null,
              width: null,
            },
            media_type: 'video',
            creativeId: getConfigVideoBid().extras.deal_id,
            requestId: '2def0c5b2a7f6e',
          },
        },
        getConfigCreativeVideo()
      ),
    },
    want: {
      requestId: getConfigBid('video').bidId,
      cpm: 1,
      currency: 'EUR',
      mediaType: 'video',
      width: 1,
      height: 1,
      creativeId: getConfigVideoBid().extras.deal_id,
      netRevenue: true,
      vastXml: getConfigCreativeVideo().vastXml,
      vastUrl:
        'data:text/xml;charset=utf-8;base64,' +
        btoa(getConfigCreativeVideo().vastXml.replace(/\\"/g, '"')),
      ttl: 300,
    },
  },
  {
    title: 'input data respect the output model for banner',
    args: {
      fn: buildBid(getConfigBannerBid()),
    },
    want: {
      requestId: getConfigBid('banner').bidId,
      cpm: 1,
      currency: 'EUR',
      mediaType: 'banner',
      width: 300,
      height: 250,
      creativeId: getConfigCreative().creativeId,
      ad: getConfigBannerBid().creative.banner.adm,
      ttl: 300,
      netRevenue: true,
    },
  },
];

describe('BLIINK Adapter buildBid', function () {
  for (const test of testsBuildBid) {
    it(test.title, () => {
      const res = test.args.fn;
      expect(res).to.eql(test.want);
    });
  }
});

/**
 * @description Array of tests used in describe function below
 * @type {[{args: {fn}, want, title: string}]}
 */
const testsBuildRequests = [
  {
    title: 'Should not build request, no bidder request exist',
    args: {
      fn: spec.buildRequests(),
    },
    want: null,
  },
  {
    title: 'Should build request if bidderRequest exist',
    args: {
      fn: spec.buildRequests([], getConfigBuildRequest('banner')),
    },
    want: {
      method: 'POST',
      url: BLIINK_ENDPOINT_ENGINE,
      data: {
        domLoadingDuration,
        ect: connectionType,
        keywords: '',
        pageDescription: '',
        pageTitle: '',
        pageUrl:
          'http://localhost:9999/integrationExamples/gpt/bliink-adapter.html',
        tags: [
          {
            transactionId: '2def0c5b2a7f6e',
            refresh: window.bliinkBid['14f30eca-85d2-11e8-9eed-0242ac120007'] || undefined,
            id: '14f30eca-85d2-11e8-9eed-0242ac120007',
            imageUrl: 'https://www.example.com/adimage.jpg',
            videoUrl: 'https://www.example.com/advideo.mp4',
            mediaTypes: ['banner'],
            sizes: [
              {
                h: 250,
                w: 300,
              },
            ],
          },
        ],
      },
    },
  },
  {
    title: 'Should build request width GDPR configuration',
    args: {
      fn: spec.buildRequests(
        [],
        Object.assign(getConfigBuildRequest('banner'), {
          gdprConsent: {
            gdprApplies: true,
            consentString: 'XXXX',
          },
        })
      ),
    },
    want: {
      method: 'POST',
      url: BLIINK_ENDPOINT_ENGINE,
      data: {
        domLoadingDuration,
        ect: connectionType,
        gdpr: true,
        gdprConsent: 'XXXX',
        pageDescription: '',
        pageTitle: '',
        keywords: '',
        pageUrl:
          'http://localhost:9999/integrationExamples/gpt/bliink-adapter.html',
        tags: [
          {
            transactionId: '2def0c5b2a7f6e',
            refresh: window.bliinkBid['14f30eca-85d2-11e8-9eed-0242ac120007'] || undefined,
            id: '14f30eca-85d2-11e8-9eed-0242ac120007',
            imageUrl: 'https://www.example.com/adimage.jpg',
            videoUrl: 'https://www.example.com/advideo.mp4',
            mediaTypes: ['banner'],
            sizes: [
              {
                h: 250,
                w: 300,
              },
            ],
          },
        ],
      },
    },
  },
  {
    title: 'Should build request width uspConsent if exists',
    args: {
      fn: spec.buildRequests(
        [],
        Object.assign(getConfigBuildRequest('banner'), {
          gdprConsent: {
            gdprApplies: true,
            consentString: 'XXXX',
          },
          uspConsent: 'uspConsent',
        })
      ),
    },
    want: {
      method: 'POST',
      url: BLIINK_ENDPOINT_ENGINE,
      data: {
        domLoadingDuration,
        ect: connectionType,
        gdpr: true,
        uspConsent: 'uspConsent',
        gdprConsent: 'XXXX',
        pageDescription: '',
        pageTitle: '',
        keywords: '',
        pageUrl:
          'http://localhost:9999/integrationExamples/gpt/bliink-adapter.html',
        tags: [
          {
            transactionId: '2def0c5b2a7f6e',
            refresh: window.bliinkBid['14f30eca-85d2-11e8-9eed-0242ac120007'] || undefined,
            id: '14f30eca-85d2-11e8-9eed-0242ac120007',
            imageUrl: 'https://www.example.com/adimage.jpg',
            videoUrl: 'https://www.example.com/advideo.mp4',
            mediaTypes: ['banner'],
            sizes: [
              {
                h: 250,
                w: 300,
              },
            ],
          },
        ],
      },
    },
  },
  {
    title: 'Should build request width schain if exists',
    args: {
      fn: spec.buildRequests(
        [
          {
            ortb2: {
              source: {
                ext: {
                  schain: {
                    ver: '1.0',
                    complete: 1,
                    nodes: [
                      {
                        asi: 'ssp.test',
                        sid: '00001',
                        hp: 1,
                      },
                    ],
                  }
                }
              }
            },
          },
        ],
        Object.assign(getConfigBuildRequest('banner'), {
          gdprConsent: {
            gdprApplies: true,
            consentString: 'XXXX',
          },
        })
      ),
    },
    want: {
      method: 'POST',
      url: BLIINK_ENDPOINT_ENGINE,
      data: {
        domLoadingDuration,
        ect: connectionType,
        gdpr: true,
        gdprConsent: 'XXXX',
        pageDescription: '',
        pageTitle: '',
        keywords: '',
        pageUrl:
          'http://localhost:9999/integrationExamples/gpt/bliink-adapter.html',
        schain: {
          ver: '1.0',
          complete: 1,
          nodes: [
            {
              asi: 'ssp.test',
              sid: '00001',
              hp: 1,
            },
          ],
        },
        tags: [
          {
            transactionId: '2def0c5b2a7f6e',
            refresh: window.bliinkBid['14f30eca-85d2-11e8-9eed-0242ac120007'] || undefined,
            id: '14f30eca-85d2-11e8-9eed-0242ac120007',
            imageUrl: 'https://www.example.com/adimage.jpg',
            videoUrl: 'https://www.example.com/advideo.mp4',
            mediaTypes: ['banner'],
            sizes: [
              {
                h: 250,
                w: 300,
              },
            ],
          },
        ],
      },
    },
  },
  {
    title: 'Should build request with eids if exists',
    args: {
      fn: spec.buildRequests(
        [
          {
            userIdAsEids: [
              {
                'source': 'criteo.com',
                'uids': [
                  {
                    'id': 'vG4RRF93V05LRlJUTVVOQTJJJTJGbG1rZWxEeDVvc0NXWE42TzJqU2hG',
                    'atype': 1
                  }
                ]
              },
              {
                'source': 'netid.de',
                'uids': [
                  {
                    'id': 'fH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg',
                    'atype': 1
                  }
                ]
              }
            ],
          },
        ],
        Object.assign(getConfigBuildRequest('banner'), {
          gdprConsent: {
            gdprApplies: true,
            consentString: 'XXXX',
          },
        })
      ),
    },
    want: {
      method: 'POST',
      url: BLIINK_ENDPOINT_ENGINE,
      data: {
        domLoadingDuration,
        ect: connectionType,
        gdpr: true,
        gdprConsent: 'XXXX',
        pageDescription: '',
        pageTitle: '',
        keywords: '',
        pageUrl:
          'http://localhost:9999/integrationExamples/gpt/bliink-adapter.html',
        eids: [
          {
            'source': 'criteo.com',
            'uids': [
              {
                'id': 'vG4RRF93V05LRlJUTVVOQTJJJTJGbG1rZWxEeDVvc0NXWE42TzJqU2hG',
                'atype': 1
              }
            ]
          },
          {
            'source': 'netid.de',
            'uids': [
              {
                'id': 'fH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg',
                'atype': 1
              }
            ]
          }
        ],
        tags: [
          {
            transactionId: '2def0c5b2a7f6e',
            refresh: window.bliinkBid['14f30eca-85d2-11e8-9eed-0242ac120007'] || undefined,
            id: '14f30eca-85d2-11e8-9eed-0242ac120007',
            imageUrl: 'https://www.example.com/adimage.jpg',
            videoUrl: 'https://www.example.com/advideo.mp4',
            mediaTypes: ['banner'],
            sizes: [
              {
                h: 250,
                w: 300,
              },
            ],
          },
        ],
      },
    },
  },
];

describe('BLIINK Adapter buildRequests', function () {
  for (const test of testsBuildRequests) {
    it(test.title, () => {
      const res = test.args.fn;
      expect(res).to.eql(test.want);
    });
  }
});

const getSyncOptions = (pixelEnabled = true, iframeEnabled = false) => {
  return {
    pixelEnabled,
    iframeEnabled,
  };
};

const getServerResponses = () => {
  return [
    {
      body: {
        bids: [],
        userSyncs: [
          {
            type: 'script',
            url: 'https://prg.smartadserver.com/ac?out=js&nwid=3392&siteid=305791&pgname=rg&fmtid=81127&tgt=[sas_target]&visit=m&tmstp=[timestamp]&clcturl=[countgo]',
          },
          {
            type: 'image',
            url: 'https://sync.smartadserver.com/getuid?nwid=3392&consentString=XXX&url=https%3A%2F%2Fcookiesync.api.bliink.io%2Fcookiesync%3Fpartner%3Dsmart%26uid%3D%5Bsas_uid%5D',
          },
        ],
      },
    },
  ];
};

const getGdprConsent = () => {
  return {
    gdprApplies: 1,
    consentString: 'XXX',
    apiVersion: 2,
  };
};

const testsGetUserSyncs = [
  {
    title: 'Should not have gdprConsent exist',
    args: {
      fn: spec.getUserSyncs(
        getSyncOptions(),
        getServerResponses(),
        getGdprConsent()
      ),
    },
    want: [
      {
        type: 'script',
        url: 'https://prg.smartadserver.com/ac?out=js&nwid=3392&siteid=305791&pgname=rg&fmtid=81127&tgt=[sas_target]&visit=m&tmstp=[timestamp]&clcturl=[countgo]',
      },
      {
        type: 'image',
        url: 'https://sync.smartadserver.com/getuid?nwid=3392&consentString=XXX&url=https%3A%2F%2Fcookiesync.api.bliink.io%2Fcookiesync%3Fpartner%3Dsmart%26uid%3D%5Bsas_uid%5D',
      },
    ],
  },
  {
    title: 'Should return iframe cookie sync if iframeEnabled',
    args: {
      fn: spec.getUserSyncs(
        getSyncOptions(true, true),
        getServerResponses(),
        getGdprConsent()
      ),
    },
    want: [
      {
        type: 'iframe',
        url: `${BLIINK_ENDPOINT_COOKIE_SYNC_IFRAME}?gdpr=${
          getGdprConsent().gdprApplies
        }&coppa=0&gdprConsent=${getGdprConsent().consentString}&apiVersion=${
          getGdprConsent().apiVersion
        }`,
      },
    ],
  },
  {
    title: 'ccpa',
    args: {
      fn: spec.getUserSyncs(
        getSyncOptions(true, true),
        getServerResponses(),
        getGdprConsent(),
        'ccpa-consent'
      ),
    },
    want: [
      {
        type: 'iframe',
        url: `${BLIINK_ENDPOINT_COOKIE_SYNC_IFRAME}?gdpr=${
          getGdprConsent().gdprApplies
        }&coppa=0&uspConsent=ccpa-consent&gdprConsent=${
          getGdprConsent().consentString
        }&apiVersion=${getGdprConsent().apiVersion}`,
      },
    ],
  },
  {
    title: 'Should output sync if no gdprConsent',
    args: {
      fn: spec.getUserSyncs(getSyncOptions(), getServerResponses()),
    },
    want: getServerResponses()[0].body.userSyncs,
  },
  {
    title: 'Should output empty array if no pixelEnabled',
    args: {
      fn: spec.getUserSyncs({}, getServerResponses()),
    },
    want: [],
  },
];

describe('BLIINK Adapter getUserSyncs', function () {
  for (const test of testsGetUserSyncs) {
    it(test.title, () => {
      const res = test.args.fn;
      expect(res).to.eql(test.want);
    });
  }
});

describe('BLIINK Adapter keywords & coppa true', function () {
  let querySelectorStub;
  let configStub;
  let originalTitle;

  beforeEach(() => {
    window.bliinkBid = {};
    const metaElement = document.createElement('meta');
    metaElement.name = 'keywords';
    metaElement.content = 'Bliink, Saber, Prebid';
    sinon.stub(utils, 'getDomLoadingDuration').returns(0);
    domLoadingDuration = '0';
    configStub = sinon.stub(config, 'getConfig');
    configStub.withArgs('coppa').returns(true);
    querySelectorStub = sinon.stub(document, 'querySelector').returns(metaElement);
    originalTitle = document.title;
    document.title = '';
  });

  afterEach(() => {
    querySelectorStub.restore();
    configStub.restore();
    utils.getDomLoadingDuration.restore();
    document.title = originalTitle;
  });

  it('Should build request with keyword and coppa true if exist', () => {
    expect(
      spec.buildRequests(
        [],
        Object.assign(getConfigBuildRequest('banner'), {
          gdprConsent: {
            gdprApplies: true,
            consentString: 'XXXX',
          },
        })
      )
    ).to.eql({
      method: 'POST',
      url: BLIINK_ENDPOINT_ENGINE,
      data: {
        domLoadingDuration,
        ect: getEffectiveConnectionType(),
        gdpr: true,
        coppa: 1,
        gdprConsent: 'XXXX',
        pageDescription: 'Bliink, Saber, Prebid',
        pageTitle: '',
        keywords: 'Bliink,Saber,Prebid',
        pageUrl:
          'http://localhost:9999/integrationExamples/gpt/bliink-adapter.html',
        tags: [
          {
            transactionId: '2def0c5b2a7f6e',
            id: '14f30eca-85d2-11e8-9eed-0242ac120007',
            imageUrl: 'https://www.example.com/adimage.jpg',
            videoUrl: 'https://www.example.com/advideo.mp4',
            mediaTypes: ['banner'],
            refresh: window.bliinkBid['14f30eca-85d2-11e8-9eed-0242ac120007'] || undefined,
            sizes: [
              {
                h: 250,
                w: 300,
              },
            ],
          },
        ],
      },
    });
  });
});

describe('getEffectiveConnectionType', () => {
  let navigatorStub;

  beforeEach(() => {
    if ('connection' in navigator) {
      navigatorStub = sinon.stub(navigator, 'connection').value({
        effectiveType: undefined,
      });
    }
  });

  afterEach(() => {
    if (navigatorStub) {
      navigatorStub.restore();
    }
  });
  if (navigatorStub) {
    it('should return "unsupported" when effective connection type is undefined', () => {
      const result = getEffectiveConnectionType();
      expect(result).to.equal('unsupported');
    });
  }
});

it('should expose gvlid', function () {
  expect(spec.gvlid).to.equal(GVL_ID);
});
