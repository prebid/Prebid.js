export function getMockEvents() {
  const ad = '<!-- Creative --><div>ad</div>';
  const auctionId = 'auction-000';

  return {
    gam: {
      slotRenderEnded: [
        {
          serviceName: 'publisher_ads',
          slot: mockGpt.makeSlot({ code: 'box' }),
          isEmpty: true,
          slotContentChanged: true,
          size: null,
          advertiserId: null,
          campaignId: null,
          creativeId: null,
          creativeTemplateId: null,
          labelIds: null,
          lineItemId: null,
          isBackfill: false,
        },
        {
          serviceName: 'publisher_ads',
          slot: mockGpt.makeSlot({ code: 'box' }),
          isEmpty: false,
          slotContentChanged: true,
          size: [1, 1],
          advertiserId: 12345,
          campaignId: 400000001,
          creativeId: 6789,
          creativeTemplateId: null,
          labelIds: null,
          lineItemId: 1011,
          isBackfill: false,
          yieldGroupIds: null,
          companyIds: null,
        },
        {
          serviceName: 'publisher_ads',
          slot: mockGpt.makeSlot({ code: 'box' }),
          isEmpty: false,
          slotContentChanged: true,
          size: [728, 90],
          advertiserId: 12346,
          campaignId: 299999000,
          creativeId: 6790,
          creativeTemplateId: null,
          labelIds: null,
          lineItemId: 1012,
          isBackfill: false,
          yieldGroupIds: null,
          companyIds: null,
        },
      ],
    },
    prebid: [{
      AUCTION_INIT: {
        auctionId,
        timestamp: 1680279732944,
        auctionStatus: 'inProgress',
        adUnits: [
          {
            code: '/19968336/header-bid-tag-0',
            mediaTypes: {
              banner: {
                sizes: [
                  [300, 250],
                  [300, 600],
                ],
              },
            },
            bids: [
              {
                bidder: 'bidder0',
                params: {
                  placementId: 12345678,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
              },
            ],
            sizes: [
              [300, 250],
              [300, 600],
            ],
            transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
            ortb2Imp: {
              ext: {
                tid: 'ef947609-7b55-4420-8407-599760d0e373',
                data: {
                  adserver: {
                    name: 'gam',
                    adslot: '/19968336/header-bid-tag-0',
                  },
                  pbadslot: '/19968336/header-bid-tag-0',
                },
                gpid: '/19968336/header-bid-tag-0',
              },
            },
          },
          {
            code: '/19968336/header-bid-tag-1',
            mediaTypes: {
              banner: {
                sizes: [
                  [728, 90],
                  [970, 250],
                ],
              },
            },
            bids: [
              {
                bidder: 'bidder0',
                params: {
                  placementId: 12345678,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
              },
            ],
            sizes: [
              [728, 90],
              [970, 250],
            ],
            transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
            ortb2Imp: {
              ext: {
                tid: 'abab4423-d962-41aa-adc7-0681f686c330',
                data: {
                  adserver: {
                    name: 'gam',
                    adslot: '/19968336/header-bid-tag-1',
                  },
                  pbadslot: '/19968336/header-bid-tag-1',
                },
                gpid: '/19968336/header-bid-tag-1',
              },
            },
          },
          {
            code: '/17118521/header-bid-tag-2',
            mediaTypes: {
              banner: {
                sizes: [[300, 250]],
              },
            },
            floors: {
              currency: 'USD',
              schema: {
                delimiter: '|',
                fields: ['mediaType', 'size'],
              },
              values: {
                'banner|300x250': 0.01,
              },
            },
            bids: [
              {
                bidder: '33across',
                params: {
                  siteId: 'dukr5O4SWr6iygaKkGJozW',
                  productId: 'siab',
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
              },
              {
                bidder: 'bidder0',
                params: {
                  placementId: 20216405,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
              },
            ],
            sizes: [[300, 250]],
            transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
            ortb2Imp: {
              ext: {
                tid: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
                data: {
                  adserver: {
                    name: 'gam',
                    adslot: '/17118521/header-bid-tag-2',
                  },
                  pbadslot: '/17118521/header-bid-tag-2',
                },
                gpid: '/17118521/header-bid-tag-2',
              },
            },
          },
        ],
        adUnitCodes: [
          '/19968336/header-bid-tag-0',
          '/19968336/header-bid-tag-1',
          '/17118521/header-bid-tag-2',
        ],
        bidderRequests: [
          {
            bidderCode: 'bidder0',
            auctionId,
            bidderRequestId: '196b58215c10dc9',
            bids: [
              {
                bidder: 'bidder0',
                params: {
                  placement_id: 12345678,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
                ortb2Imp: {
                  ext: {
                    tid: 'ef947609-7b55-4420-8407-599760d0e373',
                    data: {
                      adserver: {
                        name: 'gam',
                        adslot: '/19968336/header-bid-tag-0',
                      },
                      pbadslot: '/19968336/header-bid-tag-0',
                    },
                    gpid: '/19968336/header-bid-tag-0',
                  },
                },
                mediaTypes: {
                  banner: {
                    sizes: [
                      [300, 250],
                      [300, 600],
                    ],
                  },
                },
                adUnitCode: '/19968336/header-bid-tag-0',
                transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
                sizes: [
                  [300, 250],
                  [300, 600],
                ],
                bidId: '20661fc5fbb5d9b',
                bidderRequestId: '196b58215c10dc9',
                auctionId,
                src: 'client',
                bidRequestsCount: 1,
                bidderRequestsCount: 1,
                bidderWinsCount: 0,
                ortb2: {
                  site: {
                    page: 'https://site.example.com/pb.html',
                    domain: 'site.example.com',
                    publisher: {
                      domain: 'site.example.com',
                    },
                  },
                  device: {
                    w: 594,
                    h: 976,
                    dnt: 0,
                    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                    language: 'en',
                    sua: {
                      source: 2,
                      platform: {
                        brand: 'macOS',
                        version: ['13', '2', '1'],
                      },
                      browsers: [
                        {
                          brand: 'Google Chrome',
                          version: ['111', '0', '5563', '110'],
                        },
                        {
                          brand: 'Not(A:Brand',
                          version: ['8', '0', '0', '0'],
                        },
                        {
                          brand: 'Chromium',
                          version: ['111', '0', '5563', '110'],
                        },
                      ],
                      mobile: 0,
                      model: '',
                      bitness: '64',
                      architecture: 'arm',
                    },
                  },
                },
              },
              {
                bidder: 'bidder0',
                params: {
                  placement_id: 12345678,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
                ortb2Imp: {
                  ext: {
                    tid: 'abab4423-d962-41aa-adc7-0681f686c330',
                    data: {
                      adserver: {
                        name: 'gam',
                        adslot: '/19968336/header-bid-tag-1',
                      },
                      pbadslot: '/19968336/header-bid-tag-1',
                    },
                    gpid: '/19968336/header-bid-tag-1',
                  },
                },
                mediaTypes: {
                  banner: {
                    sizes: [
                      [728, 90],
                      [970, 250],
                    ],
                  },
                },
                adUnitCode: '/19968336/header-bid-tag-1',
                transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
                sizes: [
                  [728, 90],
                  [970, 250],
                ],
                bidId: '21ad295f40dd7ab',
                bidderRequestId: '196b58215c10dc9',
                auctionId,
                src: 'client',
                bidRequestsCount: 1,
                bidderRequestsCount: 1,
                bidderWinsCount: 0,
                ortb2: {
                  site: {
                    page: 'https://site.example.com/pb.html',
                    domain: 'site.example.com',
                    publisher: {
                      domain: 'site.example.com',
                    },
                  },
                  device: {
                    w: 594,
                    h: 976,
                    dnt: 0,
                    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                    language: 'en',
                    sua: {
                      source: 2,
                      platform: {
                        brand: 'macOS',
                        version: ['13', '2', '1'],
                      },
                      browsers: [
                        {
                          brand: 'Google Chrome',
                          version: ['111', '0', '5563', '110'],
                        },
                        {
                          brand: 'Not(A:Brand',
                          version: ['8', '0', '0', '0'],
                        },
                        {
                          brand: 'Chromium',
                          version: ['111', '0', '5563', '110'],
                        },
                      ],
                      mobile: 0,
                      model: '',
                      bitness: '64',
                      architecture: 'arm',
                    },
                  },
                },
              },
              {
                bidder: 'bidder0',
                params: {
                  placement_id: 20216405,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
                ortb2Imp: {
                  ext: {
                    tid: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
                    data: {
                      adserver: {
                        name: 'gam',
                        adslot: '/17118521/header-bid-tag-2',
                      },
                      pbadslot: '/17118521/header-bid-tag-2',
                    },
                    gpid: '/17118521/header-bid-tag-2',
                  },
                },
                mediaTypes: {
                  banner: {
                    sizes: [[300, 250]],
                  },
                },
                adUnitCode: '/17118521/header-bid-tag-2',
                transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
                sizes: [[300, 250]],
                bidId: '22108ac7b778717',
                bidderRequestId: '196b58215c10dc9',
                auctionId,
                src: 'client',
                bidRequestsCount: 1,
                bidderRequestsCount: 1,
                bidderWinsCount: 0,
                ortb2: {
                  site: {
                    page: 'https://site.example.com/pb.html',
                    domain: 'site.example.com',
                    publisher: {
                      domain: 'site.example.com',
                    },
                  },
                  device: {
                    w: 594,
                    h: 976,
                    dnt: 0,
                    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                    language: 'en',
                    sua: {
                      source: 2,
                      platform: {
                        brand: 'macOS',
                        version: ['13', '2', '1'],
                      },
                      browsers: [
                        {
                          brand: 'Google Chrome',
                          version: ['111', '0', '5563', '110'],
                        },
                        {
                          brand: 'Not(A:Brand',
                          version: ['8', '0', '0', '0'],
                        },
                        {
                          brand: 'Chromium',
                          version: ['111', '0', '5563', '110'],
                        },
                      ],
                      mobile: 0,
                      model: '',
                      bitness: '64',
                      architecture: 'arm',
                    },
                  },
                },
              },
            ],
            auctionStart: 1680279732944,
            timeout: 3000,
            refererInfo: {
              reachedTop: true,
              isAmp: false,
              numIframes: 0,
              stack: ['https://site.example.com/pb.html'],
              topmostLocation: 'https://site.example.com/pb.html',
              location: 'https://site.example.com/pb.html',
              canonicalUrl: null,
              page: 'https://site.example.com/pb.html',
              domain: 'site.example.com',
              ref: null,
              legacy: {
                reachedTop: true,
                isAmp: false,
                numIframes: 0,
                stack: ['https://site.example.com/pb.html'],
                referer: 'https://site.example.com/pb.html',
                canonicalUrl: null,
              },
            },
            ortb2: {
              site: {
                page: 'https://site.example.com/pb.html',
                domain: 'site.example.com',
                publisher: {
                  domain: 'site.example.com',
                },
              },
              device: {
                w: 594,
                h: 976,
                dnt: 0,
                ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                language: 'en',
                sua: {
                  source: 2,
                  platform: {
                    brand: 'macOS',
                    version: ['13', '2', '1'],
                  },
                  browsers: [
                    {
                      brand: 'Google Chrome',
                      version: ['111', '0', '5563', '110'],
                    },
                    {
                      brand: 'Not(A:Brand',
                      version: ['8', '0', '0', '0'],
                    },
                    {
                      brand: 'Chromium',
                      version: ['111', '0', '5563', '110'],
                    },
                  ],
                  mobile: 0,
                  model: '',
                  bitness: '64',
                  architecture: 'arm',
                },
              },
            },
            start: 1680279732963,
          }
        ],
        noBids: [],
        bidsReceived: [],
        bidsRejected: [],
        winningBids: [],
        timeout: 3000,
        seatNonBids: [],
        config: {
          publisherId: '1001',
        },
      },
      BID_REQUESTED: [{
        bidderCode: 'bidder0',
        auctionId,
        transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
        bids: [
          {
            bidder: 'bidder0',
            params: {
              placement_id: 12345678,
            },
            userId: {
              '33acrossId': {
                envelope:
                  'v1.0014',
              },
            },
            userIdAsEids: [
              {
                source: '33across.com',
                uids: [
                  {
                    id: 'v1.0014',
                    atype: 1,
                  },
                ],
              },
            ],
            crumbs: {
              pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
            },
            ortb2Imp: {
              ext: {
                tid: 'ef947609-7b55-4420-8407-599760d0e373',
                data: {
                  adserver: {
                    name: 'gam',
                    adslot: '/19968336/header-bid-tag-0',
                  },
                  pbadslot: '/19968336/header-bid-tag-0',
                },
                gpid: '/19968336/header-bid-tag-0',
              },
            },
            mediaTypes: {
              banner: {
                sizes: [
                  [300, 250],
                  [300, 600],
                ],
              },
            },
            adUnitCode: '/19968336/header-bid-tag-0',
            transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
            sizes: [
              [300, 250],
              [300, 600],
            ],
            bidId: '20661fc5fbb5d9b',
            bidderRequestId: '196b58215c10dc9',
            auctionId,
            src: 'client',
            bidRequestsCount: 1,
            bidderRequestsCount: 1,
            bidderWinsCount: 0,
            ortb2: {
              site: {
                page: 'https://site.example.com/pb.html',
                domain: 'site.example.com',
                publisher: {
                  domain: 'site.example.com',
                },
              },
              device: {
                w: 594,
                h: 976,
                dnt: 0,
                ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                language: 'en',
                sua: {
                  source: 2,
                  platform: {
                    brand: 'macOS',
                    version: ['13', '2', '1'],
                  },
                  browsers: [
                    {
                      brand: 'Google Chrome',
                      version: ['111', '0', '5563', '110'],
                    },
                    {
                      brand: 'Not(A:Brand',
                      version: ['8', '0', '0', '0'],
                    },
                    {
                      brand: 'Chromium',
                      version: ['111', '0', '5563', '110'],
                    },
                  ],
                  mobile: 0,
                  model: '',
                  bitness: '64',
                  architecture: 'arm',
                },
              },
            },
          },
          {
            bidder: 'bidder0',
            params: {
              placement_id: 12345678,
            },
            userId: {
              '33acrossId': {
                envelope:
                  'v1.0014',
              },
            },
            userIdAsEids: [
              {
                source: '33across.com',
                uids: [
                  {
                    id: 'v1.0014',
                    atype: 1,
                  },
                ],
              },
            ],
            crumbs: {
              pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
            },
            ortb2Imp: {
              ext: {
                tid: 'abab4423-d962-41aa-adc7-0681f686c330',
                data: {
                  adserver: {
                    name: 'gam',
                    adslot: '/19968336/header-bid-tag-1',
                  },
                  pbadslot: '/19968336/header-bid-tag-1',
                },
                gpid: '/19968336/header-bid-tag-1',
              },
            },
            mediaTypes: {
              banner: {
                sizes: [
                  [728, 90],
                  [970, 250],
                ],
              },
            },
            adUnitCode: '/19968336/header-bid-tag-1',
            transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
            sizes: [
              [728, 90],
              [970, 250],
            ],
            bidId: '21ad295f40dd7ab',
            bidderRequestId: '196b58215c10dc9',
            auctionId,
            src: 'client',
            bidRequestsCount: 1,
            bidderRequestsCount: 1,
            bidderWinsCount: 0,
            ortb2: {
              site: {
                page: 'https://site.example.com/pb.html',
                domain: 'site.example.com',
                publisher: {
                  domain: 'site.example.com',
                },
              },
              device: {
                w: 594,
                h: 976,
                dnt: 0,
                ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                language: 'en',
                sua: {
                  source: 2,
                  platform: {
                    brand: 'macOS',
                    version: ['13', '2', '1'],
                  },
                  browsers: [
                    {
                      brand: 'Google Chrome',
                      version: ['111', '0', '5563', '110'],
                    },
                    {
                      brand: 'Not(A:Brand',
                      version: ['8', '0', '0', '0'],
                    },
                    {
                      brand: 'Chromium',
                      version: ['111', '0', '5563', '110'],
                    },
                  ],
                  mobile: 0,
                  model: '',
                  bitness: '64',
                  architecture: 'arm',
                },
              },
            },
          },
          {
            bidder: 'bidder0',
            params: {
              placement_id: 20216405,
            },
            userId: {
              '33acrossId': {
                envelope:
                  'v1.0014',
              },
            },
            userIdAsEids: [
              {
                source: '33across.com',
                uids: [
                  {
                    id: 'v1.0014',
                    atype: 1,
                  },
                ],
              },
            ],
            crumbs: {
              pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
            },
            ortb2Imp: {
              ext: {
                tid: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
                data: {
                  adserver: {
                    name: 'gam',
                    adslot: '/17118521/header-bid-tag-2',
                  },
                  pbadslot: '/17118521/header-bid-tag-2',
                },
                gpid: '/17118521/header-bid-tag-2',
              },
            },
            mediaTypes: {
              banner: {
                sizes: [[300, 250]],
              },
            },
            adUnitCode: '/17118521/header-bid-tag-2',
            transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
            sizes: [[300, 250]],
            bidId: '22108ac7b778717',
            bidderRequestId: '196b58215c10dc9',
            auctionId,
            src: 'client',
            bidRequestsCount: 1,
            bidderRequestsCount: 1,
            bidderWinsCount: 0,
            ortb2: {
              site: {
                page: 'https://site.example.com/pb.html',
                domain: 'site.example.com',
                publisher: {
                  domain: 'site.example.com',
                },
              },
              device: {
                w: 594,
                h: 976,
                dnt: 0,
                ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                language: 'en',
                sua: {
                  source: 2,
                  platform: {
                    brand: 'macOS',
                    version: ['13', '2', '1'],
                  },
                  browsers: [
                    {
                      brand: 'Google Chrome',
                      version: ['111', '0', '5563', '110'],
                    },
                    {
                      brand: 'Not(A:Brand',
                      version: ['8', '0', '0', '0'],
                    },
                    {
                      brand: 'Chromium',
                      version: ['111', '0', '5563', '110'],
                    },
                  ],
                  mobile: 0,
                  model: '',
                  bitness: '64',
                  architecture: 'arm',
                },
              },
            },
          },
        ],
        auctionStart: 1680279732944,
        timeout: 3000,
        refererInfo: {
          reachedTop: true,
          isAmp: false,
          numIframes: 0,
          stack: ['https://site.example.com/pb.html'],
          topmostLocation: 'https://site.example.com/pb.html',
          location: 'https://site.example.com/pb.html',
          canonicalUrl: null,
          page: 'https://site.example.com/pb.html',
          domain: 'site.example.com',
          ref: null,
          legacy: {
            reachedTop: true,
            isAmp: false,
            numIframes: 0,
            stack: ['https://site.example.com/pb.html'],
            referer: 'https://site.example.com/pb.html',
            canonicalUrl: null,
          },
        },
        ortb2: {
          site: {
            page: 'https://site.example.com/pb.html',
            domain: 'site.example.com',
            publisher: {
              domain: 'site.example.com',
            },
          },
          device: {
            w: 594,
            h: 976,
            dnt: 0,
            ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
            language: 'en',
            sua: {
              source: 2,
              platform: {
                brand: 'macOS',
                version: ['13', '2', '1'],
              },
              browsers: [
                {
                  brand: 'Google Chrome',
                  version: ['111', '0', '5563', '110'],
                },
                {
                  brand: 'Not(A:Brand',
                  version: ['8', '0', '0', '0'],
                },
                {
                  brand: 'Chromium',
                  version: ['111', '0', '5563', '110'],
                },
              ],
              mobile: 0,
              model: '',
              bitness: '64',
              architecture: 'arm',
            },
          },
        },
        start: 1680279732963,
      }],
      BID_RESPONSE: [{
        bidderCode: 'bidder0',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        adId: '123456789abcdef',
        requestId: '20661fc5fbb5d9b',
        transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
        auctionId,
        mediaType: 'banner',
        source: 'client',
        cpm: 1.5,
        creativeId: 96846035,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        adUnitCode: '/19968336/header-bid-tag-0',
        bidder0: {
          buyerMemberId: 1234,
        },
        ad,
        adapterCode: 'bidder0',
        originalCpm: 1.5,
        originalCurrency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        bidder: 'bidder0',
        timeToRespond: 341,
        pbLg: '1.50',
        pbMg: '1.50',
        pbHg: '1.50',
        pbAg: '1.50',
        pbDg: '1.50',
        pbCg: '',
        size: '300x250',
        status: 'rendered',
        params: [
          {
            placementId: 12345678,
          },
        ],
      },
      {
        bidderCode: 'bidder0',
        width: 728,
        height: 90,
        statusMessage: 'Bid available',
        adId: '3969aa0dc284f9e',
        requestId: '21ad295f40dd7ab',
        transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
        auctionId,
        mediaType: 'banner',
        source: 'client',
        cpm: 1.5,
        creativeId: 98476543,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        adUnitCode: '/19968336/header-bid-tag-1',
        bidder0: {
          buyerMemberId: 1234,
        },
        ad,
        adapterCode: 'bidder0',
        originalCpm: 1.5,
        originalCurrency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        responseTimestamp: 1680279733305,
        requestTimestamp: 1680279732963,
        bidder: 'bidder0',
        timeToRespond: 342,
        pbLg: '1.50',
        pbMg: '1.50',
        pbHg: '1.50',
        pbAg: '1.50',
        pbDg: '1.50',
        pbCg: '',
        size: '728x90',
        status: 'targetingSet',
      }],
      BID_WON: [{
        bidderCode: 'bidder0',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        adId: '123456789abcdef',
        requestId: '20661fc5fbb5d9b',
        transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
        auctionId,
        mediaType: 'banner',
        source: 'client',
        cpm: 1.5,
        creativeId: 96846035,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        adUnitCode: '/19968336/header-bid-tag-0',
        bidder0: {
          buyerMemberId: 1234,
        },
        ad,
        adapterCode: 'bidder0',
        originalCpm: 1.5,
        originalCurrency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        responseTimestamp: 1680279733304,
        requestTimestamp: 1680279732963,
        bidder: 'bidder0',
        timeToRespond: 341,
        pbLg: '1.50',
        pbMg: '1.50',
        pbHg: '1.50',
        pbAg: '1.50',
        pbDg: '1.50',
        pbCg: '',
        size: '300x250',
        adserverTargeting: {
          bidder: 'bidder0',
          hb_adid: '123456789abcdef',
          hb_pb: '1.50',
          hb_size: '300x250',
          hb_source: 'client',
          hb_format: 'banner',
          hb_adomain: '',
          hb_acat: '',
        },
        status: 'rendered',
        params: [
          {
            placementId: 12345678,
          },
        ],
      },
      {
        bidderCode: 'bidder0',
        width: 728,
        height: 90,
        statusMessage: 'Bid available',
        adId: '3969aa0dc284f9e',
        requestId: '21ad295f40dd7ab',
        transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
        auctionId,
        mediaType: 'banner',
        source: 'client',
        cpm: 1.5,
        creativeId: 98476543,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        adUnitCode: '/19968336/header-bid-tag-1',
        bidder0: {
          buyerMemberId: 1234,
        },
        ad,
        adapterCode: 'bidder0',
        originalCpm: 1.5,
        originalCurrency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        responseTimestamp: 1680279733304,
        requestTimestamp: 1680279732963,
        bidder: 'bidder0',
        timeToRespond: 342,
        pbLg: '1.50',
        pbMg: '1.50',
        pbHg: '1.50',
        pbAg: '1.50',
        pbDg: '1.50',
        pbCg: '',
        size: '728x90',
        adserverTargeting: {
          bidder: 'bidder0',
          hb_adid: '3969aa0dc284f9e',
          hb_pb: '1.50',
          hb_size: '728x90',
          hb_source: 'client',
          hb_format: 'banner',
          hb_adomain: '',
          hb_acat: '',
        },
        status: 'rendered',
        params: [
          {
            placementId: 12345678,
          },
        ],
      },
      {
        bidderCode: 'bidder0',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        adId: '3969aa0dc284f9e',
        requestId: '15bef0b1fd2b2e',
        transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
        auctionId,
        mediaType: 'banner',
        source: 'client',
        cpm: 1.5,
        creativeId: 98476543,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        adUnitCode: '/17118521/header-bid-tag-2',
        bidder0: {
          buyerMemberId: 1234,
        },
        ad,
        adapterCode: 'bidder0',
        originalCpm: 1.5,
        originalCurrency: 'USD',
        floorData: {
          cpmAfterAdjustments: 1
        },
        responseTimestamp: 1680279733305,
        requestTimestamp: 1680279732963,
        bidder: 'bidder0',
        timeToRespond: 342,
        pbLg: '1.50',
        pbMg: '1.50',
        pbHg: '1.50',
        pbAg: '1.50',
        pbDg: '1.50',
        pbCg: '',
        size: '728x90',
        status: 'targetingSet',
      }],
      AUCTION_END: {
        auctionId,
        timestamp: 1680279732944,
        auctionEnd: 1680279733675,
        auctionStatus: 'completed',
        adUnits: [
          {
            code: '/19968336/header-bid-tag-0',
            mediaTypes: {
              banner: {
                sizes: [
                  [300, 250],
                  [300, 600],
                ],
              },
            },
            bids: [
              {
                bidder: 'bidder0',
                params: {
                  placementId: 12345678,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
              },
            ],
            sizes: [
              [300, 250],
              [300, 600],
            ],
            transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
            ortb2Imp: {
              ext: {
                tid: 'ef947609-7b55-4420-8407-599760d0e373',
                data: {
                  adserver: {
                    name: 'gam',
                    adslot: '/19968336/header-bid-tag-0',
                  },
                  pbadslot: '/19968336/header-bid-tag-0',
                },
                gpid: '/19968336/header-bid-tag-0',
              },
            },
          },
          {
            code: '/19968336/header-bid-tag-1',
            mediaTypes: {
              banner: {
                sizes: [
                  [728, 90],
                  [970, 250],
                ],
              },
            },
            bids: [
              {
                bidder: 'bidder0',
                params: {
                  placementId: 12345678,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
              },
            ],
            sizes: [
              [728, 90],
              [970, 250],
            ],
            transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
            ortb2Imp: {
              ext: {
                tid: 'abab4423-d962-41aa-adc7-0681f686c330',
                data: {
                  adserver: {
                    name: 'gam',
                    adslot: '/19968336/header-bid-tag-1',
                  },
                  pbadslot: '/19968336/header-bid-tag-1',
                },
                gpid: '/19968336/header-bid-tag-1',
              },
            },
          },
          {
            code: '/17118521/header-bid-tag-2',
            mediaTypes: {
              banner: {
                sizes: [[300, 250]],
              },
            },
            floors: {
              currency: 'USD',
              schema: {
                delimiter: '|',
                fields: ['mediaType', 'size'],
              },
              values: {
                'banner|300x250': 0.01,
              },
            },
            bids: [
              {
                bidder: '33across',
                params: {
                  siteId: 'dukr5O4SWr6iygaKkGJozW',
                  productId: 'siab',
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
              },
              {
                bidder: 'bidder0',
                params: {
                  placementId: 20216405,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
              },
            ],
            sizes: [[300, 250]],
            transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
            ortb2Imp: {
              ext: {
                tid: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
                data: {
                  adserver: {
                    name: 'gam',
                    adslot: '/17118521/header-bid-tag-2',
                  },
                  pbadslot: '/17118521/header-bid-tag-2',
                },
                gpid: '/17118521/header-bid-tag-2',
              },
            },
          },
        ],
        adUnitCodes: [
          '/19968336/header-bid-tag-0',
          '/19968336/header-bid-tag-1',
          '/17118521/header-bid-tag-2',
        ],
        bidderRequests: [
          {
            bidderCode: 'bidder0',
            auctionId,
            bidderRequestId: '196b58215c10dc9',
            bids: [
              {
                bidder: 'bidder0',
                params: {
                  placement_id: 12345678,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
                ortb2Imp: {
                  ext: {
                    tid: 'ef947609-7b55-4420-8407-599760d0e373',
                    data: {
                      adserver: {
                        name: 'gam',
                        adslot: '/19968336/header-bid-tag-0',
                      },
                      pbadslot: '/19968336/header-bid-tag-0',
                    },
                    gpid: '/19968336/header-bid-tag-0',
                  },
                },
                mediaTypes: {
                  banner: {
                    sizes: [
                      [300, 250],
                      [300, 600],
                    ],
                  },
                },
                adUnitCode: '/19968336/header-bid-tag-0',
                transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
                sizes: [
                  [300, 250],
                  [300, 600],
                ],
                bidId: '20661fc5fbb5d9b',
                bidderRequestId: '196b58215c10dc9',
                auctionId,
                src: 'client',
                bidRequestsCount: 1,
                bidderRequestsCount: 1,
                bidderWinsCount: 0,
                ortb2: {
                  site: {
                    page: 'https://site.example.com/pb.html',
                    domain: 'site.example.com',
                    publisher: {
                      domain: 'site.example.com',
                    },
                  },
                  device: {
                    w: 594,
                    h: 976,
                    dnt: 0,
                    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                    language: 'en',
                    sua: {
                      source: 2,
                      platform: {
                        brand: 'macOS',
                        version: ['13', '2', '1'],
                      },
                      browsers: [
                        {
                          brand: 'Google Chrome',
                          version: ['111', '0', '5563', '110'],
                        },
                        {
                          brand: 'Not(A:Brand',
                          version: ['8', '0', '0', '0'],
                        },
                        {
                          brand: 'Chromium',
                          version: ['111', '0', '5563', '110'],
                        },
                      ],
                      mobile: 0,
                      model: '',
                      bitness: '64',
                      architecture: 'arm',
                    },
                  },
                },
              },
              {
                bidder: 'bidder0',
                params: {
                  placement_id: 12345678,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
                ortb2Imp: {
                  ext: {
                    tid: 'abab4423-d962-41aa-adc7-0681f686c330',
                    data: {
                      adserver: {
                        name: 'gam',
                        adslot: '/19968336/header-bid-tag-1',
                      },
                      pbadslot: '/19968336/header-bid-tag-1',
                    },
                    gpid: '/19968336/header-bid-tag-1',
                  },
                },
                mediaTypes: {
                  banner: {
                    sizes: [
                      [728, 90],
                      [970, 250],
                    ],
                  },
                },
                adUnitCode: '/19968336/header-bid-tag-1',
                transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
                sizes: [
                  [728, 90],
                  [970, 250],
                ],
                bidId: '21ad295f40dd7ab',
                bidderRequestId: '196b58215c10dc9',
                auctionId,
                src: 'client',
                bidRequestsCount: 1,
                bidderRequestsCount: 1,
                bidderWinsCount: 0,
                ortb2: {
                  site: {
                    page: 'https://site.example.com/pb.html',
                    domain: 'site.example.com',
                    publisher: {
                      domain: 'site.example.com',
                    },
                  },
                  device: {
                    w: 594,
                    h: 976,
                    dnt: 0,
                    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                    language: 'en',
                    sua: {
                      source: 2,
                      platform: {
                        brand: 'macOS',
                        version: ['13', '2', '1'],
                      },
                      browsers: [
                        {
                          brand: 'Google Chrome',
                          version: ['111', '0', '5563', '110'],
                        },
                        {
                          brand: 'Not(A:Brand',
                          version: ['8', '0', '0', '0'],
                        },
                        {
                          brand: 'Chromium',
                          version: ['111', '0', '5563', '110'],
                        },
                      ],
                      mobile: 0,
                      model: '',
                      bitness: '64',
                      architecture: 'arm',
                    },
                  },
                },
              },
              {
                bidder: 'bidder0',
                params: {
                  placement_id: 20216405,
                },
                userId: {
                  '33acrossId': {
                    envelope:
                      'v1.0014',
                  },
                },
                userIdAsEids: [
                  {
                    source: '33across.com',
                    uids: [
                      {
                        id: 'v1.0014',
                        atype: 1,
                      },
                    ],
                  },
                ],
                crumbs: {
                  pubcid: 'badbbf35-1573-47c5-948e-70a63f9271f4',
                },
                ortb2Imp: {
                  ext: {
                    tid: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
                    data: {
                      adserver: {
                        name: 'gam',
                        adslot: '/17118521/header-bid-tag-2',
                      },
                      pbadslot: '/17118521/header-bid-tag-2',
                    },
                    gpid: '/17118521/header-bid-tag-2',
                  },
                },
                mediaTypes: {
                  banner: {
                    sizes: [[300, 250]],
                  },
                },
                adUnitCode: '/17118521/header-bid-tag-2',
                transactionId: 'b43e7487-0a52-4689-a0f7-d139d08b1f9f',
                sizes: [[300, 250]],
                bidId: '22108ac7b778717',
                bidderRequestId: '196b58215c10dc9',
                auctionId,
                src: 'client',
                bidRequestsCount: 1,
                bidderRequestsCount: 1,
                bidderWinsCount: 0,
                ortb2: {
                  site: {
                    page: 'https://site.example.com/pb.html',
                    domain: 'site.example.com',
                    publisher: {
                      domain: 'site.example.com',
                    },
                  },
                  device: {
                    w: 594,
                    h: 976,
                    dnt: 0,
                    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                    language: 'en',
                    sua: {
                      source: 2,
                      platform: {
                        brand: 'macOS',
                        version: ['13', '2', '1'],
                      },
                      browsers: [
                        {
                          brand: 'Google Chrome',
                          version: ['111', '0', '5563', '110'],
                        },
                        {
                          brand: 'Not(A:Brand',
                          version: ['8', '0', '0', '0'],
                        },
                        {
                          brand: 'Chromium',
                          version: ['111', '0', '5563', '110'],
                        },
                      ],
                      mobile: 0,
                      model: '',
                      bitness: '64',
                      architecture: 'arm',
                    },
                  },
                },
              },
            ],
            auctionStart: 1680279732944,
            timeout: 3000,
            refererInfo: {
              reachedTop: true,
              isAmp: false,
              numIframes: 0,
              stack: ['https://site.example.com/pb.html'],
              topmostLocation: 'https://site.example.com/pb.html',
              location: 'https://site.example.com/pb.html',
              canonicalUrl: null,
              page: 'https://site.example.com/pb.html',
              domain: 'site.example.com',
              ref: null,
              legacy: {
                reachedTop: true,
                isAmp: false,
                numIframes: 0,
                stack: ['https://site.example.com/pb.html'],
                referer: 'https://site.example.com/pb.html',
                canonicalUrl: null,
              },
            },
            ortb2: {
              site: {
                page: 'https://site.example.com/pb.html',
                domain: 'site.example.com',
                publisher: {
                  domain: 'site.example.com',
                },
              },
              device: {
                w: 594,
                h: 976,
                dnt: 0,
                ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                language: 'en',
                sua: {
                  source: 2,
                  platform: {
                    brand: 'macOS',
                    version: ['13', '2', '1'],
                  },
                  browsers: [
                    {
                      brand: 'Google Chrome',
                      version: ['111', '0', '5563', '110'],
                    },
                    {
                      brand: 'Not(A:Brand',
                      version: ['8', '0', '0', '0'],
                    },
                    {
                      brand: 'Chromium',
                      version: ['111', '0', '5563', '110'],
                    },
                  ],
                  mobile: 0,
                  model: '',
                  bitness: '64',
                  architecture: 'arm',
                },
              },
            },
            start: 1680279732963,
          }
        ],
        noBids: [ /* no need to populate */ ],
        bidsReceived: [
          {
            bidderCode: 'bidder0',
            width: 300,
            height: 250,
            statusMessage: 'Bid available',
            adId: '123456789abcdef',
            requestId: '20661fc5fbb5d9b',
            transactionId: 'ef947609-7b55-4420-8407-599760d0e373',
            auctionId,
            mediaType: 'banner',
            source: 'client',
            cpm: 1.5,
            creativeId: 96846035,
            currency: 'USD',
            netRevenue: true,
            ttl: 300,
            adUnitCode: '/19968336/header-bid-tag-0',
            bidder0: {
              buyerMemberId: 1234,
            },
            ad,
            adapterCode: 'bidder0',
            originalCpm: 1.5,
            originalCurrency: 'USD',
            floorData: {
              cpmAfterAdjustments: 1
            },
            bidder: 'bidder0',
            timeToRespond: 341,
            pbLg: '1.50',
            pbMg: '1.50',
            pbHg: '1.50',
            pbAg: '1.50',
            pbDg: '1.50',
            pbCg: '',
            size: '300x250',
            status: 'rendered',
            params: [
              {
                placementId: 12345678,
              },
            ],
          },
          {
            bidderCode: 'bidder0',
            width: 728,
            height: 90,
            statusMessage: 'Bid available',
            adId: '3969aa0dc284f9e',
            requestId: '21ad295f40dd7ab',
            transactionId: 'abab4423-d962-41aa-adc7-0681f686c330',
            auctionId,
            mediaType: 'banner',
            source: 'client',
            cpm: 1.5,
            creativeId: 98476543,
            currency: 'USD',
            netRevenue: true,
            ttl: 300,
            adUnitCode: '/19968336/header-bid-tag-1',
            bidder0: {
              buyerMemberId: 1234,
            },
            ad,
            adapterCode: 'bidder0',
            originalCpm: 1.5,
            originalCurrency: 'USD',
            floorData: {
              cpmAfterAdjustments: 1
            },
            responseTimestamp: 1680279733305,
            requestTimestamp: 1680279732963,
            bidder: 'bidder0',
            timeToRespond: 342,
            pbLg: '1.50',
            pbMg: '1.50',
            pbHg: '1.50',
            pbAg: '1.50',
            pbDg: '1.50',
            pbCg: '',
            size: '728x90',
            status: 'targetingSet',
          },
        ],
        bidsRejected: [],
        winningBids: [],
        timeout: 3000,
        seatNonBids: [],
      },
    }]
  };
}
