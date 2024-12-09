import { expect } from 'chai';
import { END_POINT, SYNC_URL, spec, createUserSyncs } from 'modules/bidmaticBidAdapter.js';
import { deepClone, deepSetValue, mergeDeep } from '../../../src/utils';

const expectedImp = {
  'secure': 1,
  'id': '2eb89f0f062afe',
  'banner': {
    'topframe': 0,
    'format': [
      {
        'w': 300,
        'h': 250
      },
      {
        'w': 300,
        'h': 600
      }
    ]
  },
  'bidfloor': 0,
  'bidfloorcur': 'USD',
  'tagid': 'div-gpt-ad-1460505748561-0'
}

describe('Bidmatic Bid Adapter', () => {
  const GPID_RTB_EXT = {
    'ortb2Imp': {
      'ext': {
        'gpid': 'gpId',
      }
    },
  }
  const FLOOR_RTB_EXT = {
    'ortb2Imp': {
      bidfloor: 1
    },
  }
  const DEFAULT_BID_REQUEST = {
    'id': '10bb57ee-712f-43e9-9769-b26d03df8a39',
    'bidder': 'bidmatic',
    'params': {
      'source': 886409,
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
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'transactionId': '7d79850b-70aa-4c0f-af95-c1def0452825',
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
    'bidId': '2eb89f0f062afe',
    'bidderRequestId': '1ae6c8e18f8462',
    'auctionId': '1286637c-51bc-4fdd-8e35-2435ec11775a',
    'ortb2': {}
  };

  describe('adapter interface', () => {
    const bidRequest = deepClone(DEFAULT_BID_REQUEST);

    it('should validate params', () => {
      expect(spec.isBidRequestValid({
        params: {
          source: 1
        }
      })).to.equal(true, 'source param must be a number');

      expect(spec.isBidRequestValid({
        params: {
          source: '1'
        }
      })).to.equal(false, 'source param must be a number');

      expect(spec.isBidRequestValid({})).to.equal(false, 'source param must be a number');
    });

    it('should build hb request', () => {
      const [ortbRequest] = spec.buildRequests([bidRequest], {
        bids: [bidRequest]
      });

      expect(ortbRequest.data.imp[0]).to.deep.equal(expectedImp);
      expect(ortbRequest.data.cur).to.deep.equal(['USD']);
    });

    it('should request with source in url', () => {
      const [ortbRequest] = spec.buildRequests([bidRequest], {
        bids: [bidRequest]
      });
      expect(ortbRequest.url).to.equal(`${END_POINT}?source=886409`);
    });

    it('should split http reqs by sources', () => {
      const bidRequest2 = mergeDeep(deepClone(DEFAULT_BID_REQUEST), {
        params: {
          source: 1111
        }
      });
      const [ortbRequest1, ortbRequest2] = spec.buildRequests([bidRequest2, bidRequest, bidRequest2], {
        bids: [bidRequest2, bidRequest, bidRequest2]
      });
      expect(ortbRequest1.url).to.equal(`${END_POINT}?source=1111`);
      expect(ortbRequest1.data.imp.length).to.eq(2)
      expect(ortbRequest2.url).to.equal(`${END_POINT}?source=886409`);
      expect(ortbRequest2.data.imp.length).to.eq(1)
    });

    it('should grab bid floor info', () => {
      const [ortbRequest] = spec.buildRequests([bidRequest], {
        bids: [bidRequest]
      });

      expect(ortbRequest.data.imp[0].bidfloor).eq(0)
      expect(ortbRequest.data.imp[0].bidfloorcur).eq('USD')
    });

    it('should grab bid floor info from exts', () => {
      const bidRequest = mergeDeep(deepClone(DEFAULT_BID_REQUEST), FLOOR_RTB_EXT);
      const [ortbRequest] = spec.buildRequests([bidRequest], {
        bids: [bidRequest]
      });

      expect(ortbRequest.data.imp[0].bidfloor).eq(1)
    });

    it('should grab bid floor info from params', () => {
      const bidRequest = mergeDeep(deepClone(DEFAULT_BID_REQUEST), {
        params: {
          bidfloor: 2
        }
      });
      const [ortbRequest] = spec.buildRequests([bidRequest], {
        bids: [bidRequest]
      });

      expect(ortbRequest.data.imp[0].bidfloor).eq(2)
    });

    it('should set gpid as tagid', () => {
      const bidRequest = mergeDeep(deepClone(DEFAULT_BID_REQUEST), GPID_RTB_EXT);
      const [ortbRequest] = spec.buildRequests([bidRequest], {
        bids: [bidRequest]
      });

      expect(ortbRequest.data.imp[0].tagid).eq(GPID_RTB_EXT.ortb2Imp.ext.gpid)
    });
  })

  describe('syncs creation', () => {
    const syncOptions = { iframeEnabled: true };

    it('should not operate without syncs enabled', () => {
      const syncs = createUserSyncs({});
      expect(syncs).to.eq(undefined);
    });

    it('should call uniq and unused sources only', () => {
      const sources = { 111: 0, 222: 0, 333: 1 }
      const syncs = createUserSyncs(sources, syncOptions);

      expect(syncs.length).to.eq(2);

      expect(syncs[0].type).to.eq('iframe');
      expect(syncs[0].url).to.eq(`${SYNC_URL}?aid=111`);
      expect(syncs[1].type).to.eq('iframe');
      expect(syncs[1].url).to.eq(`${SYNC_URL}?aid=222`);

      expect(sources[111]).to.eq(1);
      expect(sources[222]).to.eq(1);

      const syncs2 = createUserSyncs(sources, syncOptions);
      expect(syncs2.length).to.eq(0);
    });

    it('should add consent info', () => {
      const [{ url: syncUrl }] = createUserSyncs(
        { 111: 0 },
        syncOptions,
        { gdprApplies: true, consentString: '111' },
        'yyy',
        { gppString: '222', applicableSections: [1, 2] });

      expect(syncUrl.includes('gdpr=1&gdpr_consent=111')).to.eq(true);
      expect(syncUrl.includes('usp=yyy')).to.eq(true);
      expect(syncUrl.includes('gpp=222&gpp_sid=1,2')).to.eq(true);
    });
  })

  describe('response interpreter', () => {
    const SERVER_RESPONSE = {
      'body': {
        'id': '10bb57ee-712f-43e9-9769-b26d03df8a39',
        'seatbid': [
          {
            'bid': [
              {
                'id': 'c5BsBD5QHHgx4aS8',
                'impid': '2eb89f0f062afe',
                'price': 1,
                'adid': 'BDhclfXLcGzRMeV',
                'adm': '123',
                'adomain': [
                  'https://test.com'
                ],
                'crid': 'display_300x250',
                'w': 300,
                'h': 250,
              }
            ],
            'seat': '1'
          }
        ],
        'cur': 'USD'
      },
      'headers': {}
    }

    it('should return empty results', () => {
      const [req] = spec.buildRequests([deepClone(DEFAULT_BID_REQUEST)], {
        bids: [deepClone(DEFAULT_BID_REQUEST)]
      })
      const result = spec.interpretResponse(null, {
        data: req.data
      })

      expect(result.length).to.eq(0);
    });
    it('should detect media type based on adm', () => {
      const [req] = spec.buildRequests([deepClone(DEFAULT_BID_REQUEST)], {
        bids: [deepClone(DEFAULT_BID_REQUEST)]
      })
      const result = spec.interpretResponse(SERVER_RESPONSE, {
        data: req.data
      })

      expect(result.length).to.eq(1);
      expect(result[0].mediaType).to.eq('banner')
    });
    it('should detect video adm', () => {
      const bidRequest = mergeDeep(deepClone(DEFAULT_BID_REQUEST), {
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250]
            ]
          },
          video: {
            playerSize: [640, 480]
          }
        }
      })
      const bannerResponse = deepClone(SERVER_RESPONSE);
      const [ortbReq] = spec.buildRequests([bidRequest], {
        bids: [bidRequest]
      })
      deepSetValue(bannerResponse, 'body.seatbid.0.bid.0.adm', '<vast></vast>');
      const result = spec.interpretResponse(bannerResponse, {
        data: ortbReq.data
      })

      expect(result.length).to.eq(1);
      expect(result[0].mediaType).to.eq('video')
    });

    it('should detect banner adm', () => {
      const bidRequest = mergeDeep(deepClone(DEFAULT_BID_REQUEST), {
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250]
            ]
          },
          video: {
            playerSize: [640, 480]
          }
        }
      })
      const bannerResponse = deepClone(SERVER_RESPONSE);
      const [ortbReq] = spec.buildRequests([bidRequest], {
        bids: [bidRequest]
      })
      const result = spec.interpretResponse(bannerResponse, {
        data: ortbReq.data
      })

      expect(result.length).to.eq(1);
      expect(result[0].mediaType).to.eq('banner')
    });
  })
})
