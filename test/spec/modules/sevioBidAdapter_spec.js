import { expect } from 'chai';
import { spec } from 'modules/sevioBidAdapter.js';
import { config } from 'src/config.js';
const ENDPOINT_URL = 'https://req.adx.ws/prebid';

describe('sevioBidAdapter', function () {
  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'sevio',
      'params': {
        zone: 'zoneId'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[728, 90]]
        }
      },
      'adUnitCode': 'adunit-code',
      'bidId': '1234asdf1234',
      'bidderRequestId': '1234asdf1234asdf',
      'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf120'
    };
    it('should return true where required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'sevio',
        'params': {
          zone: 'zoneId'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[728, 90]]
          }
        },
        'bidId': '3e16f4cbbca2b',
        'bidderRequestId': '2d0e47e3ddc744',
        'auctionId': 'fb56cc83-bc64-4c44-a9b8-34fec672b592',
      },
      {
        'bidder': 'sevio',
        'params': {
          zone: 'zoneId'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[728, 90]]
          }
        },
        'adUnitCode': 'adunit-sevio-2nd',
        'bidId': '3a7e104573c543"',
        'bidderRequestId': '250799bbf223c6',
        'auctionId': '0b29430c-b25f-487a-b90c-68697a01f4e6',
      }
    ];

    let bidderRequests = {
      'refererInfo': {
        'numIframes': 0,
        'reachedTop': true,
        'referer': 'https://example.com',
        'stack': ['https://example.com']
      }
    };

    const request = spec.buildRequests(bidRequests, bidderRequests);
    it('sends bid request to our endpoint via POST', function () {
      expect(request[0].method).to.equal('POST');
      expect(request[1].method).to.equal('POST');
    });
    it('attaches source and version to endpoint URL as query params', function () {
      expect(request[0].url).to.equal(ENDPOINT_URL);
      expect(request[1].url).to.equal(ENDPOINT_URL);
    });
  });

  describe('interpretResponse', function () {
    let bidRequest = [
      {
        'method': 'POST',
        'url': ENDPOINT_URL,
        'data': {
          'zone': 'zoneId',
          'width': '728',
          'height': '90',
          'bidId': 'bidId123',
          'referer': 'www.example.com'
        }
      }
    ];
    let serverResponse = {
      body: {
        "bids": [
          {
            "requestId": "3e16f4cbbca2b",
            "cpm": 5.0,
            "currency": "EUR",
            "width": 728,
            "height": 90,
            "creativeId": "b38d1ea7-36ea-410a-801a-0673b8ed8201",
            "ad": "<html lang='en'><h3>I am an ad</h3></html>",
            "ttl": 300,
            "netRevenue": false,
            "mediaType": "BANNER",
            "meta": {
              "advertiserDomains": [
                "none.com"
              ]
            }
          }
        ],
        "userSyncs": [
          {
            "url": "https://example.com/dmp/profile/?pid=12718&sg=SEVIO_CGE",
            "type": "image"
          }
        ]
      }
    };
    it('should get the correct bid response', function () {
      let expectedResponse = [{
        'requestId': '3e16f4cbbca2b',
        'cpm': 5.0,
        'width': 728,
        'height': 90,
        'creativeId': 'b38d1ea7-36ea-410a-801a-0673b8ed8201',
        'currency': 'EUR',
        'netRevenue': true,
        'ttl': 3000,
        'ad': '<html lang="en"><h3>I am an ad</h3></html>',
        'mediaType': 'banner',
        'meta': {'advertiserDomains': ['none.com']}
      }];
      let result = spec.interpretResponse(serverResponse, bidRequest[0]);

      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));
    });

    it('should get the correct bid response for the native case', function () {
      let expectedResponseNative = [{
        requestId: '36e835f6cbfca38',
        cpm: 5,
        currency: 'EUR',
        width: 1,
        height: 1,
        creativeId: '28cf46ce-fe57-4417-acd6-285db604aa30',
        ad: '{"ver":"1.2","assets":[{"id":1,"img":{"type":3,"url":"https://delivery.targetblankdev.com/bc42a192-9413-458b-ad88-f93ce023eacb/native/assets/4336011f-2076-4122-acb9-60f0478311eb/28cf46ce-fe57-4417-acd6-285db604aa30/552e9483-5ba6-46ed-b014-c61e80d8f9d1.png"}},{"id":2,"title":{"text":"TestAdNative","len":12}},{"id":4,"data":{"type":2,"value":"Test Ad Native"}}],"link":{"url":"https://work.targetblankdev.com/ad-server-e?data=o4rIvHAEkHlT9_ItFWCiBfQDNUkLHzkjLF9uPkIArQZiqBg_bWdNjmhGDU96MmBAI3UURTDIZ4CuqYA90CazeB7gVUwZboKeJXp8MIMiLQEzxaUQh6qsFjBoVFbn6H0qq7neZUEX82NuPcgwNzsThJnING6uFzUUCrlgAGncJQc68DMldAFqxTrgsSHpAhyF00-LCUF1eblyoT03R6RWIEpBl1O85VE9MeRPV5BHDaIjYVT7wWUSLXa40_mr_tUpFST6oDwVEFldoYQruwm07gjxLLLjnymoj9QXUuSTgGYwPFwW6wqG0p67xaGuGNB8J08AUweUujghsXHf_iSbkqfhO1LilHa_YrZ0UXzZSjRRWOX_sPVLs6Wta4RsEl3KMKVsVlgSLV6j0Okbw2cP6GztzMbURlz2C3jX2veaOsKxvajdqU5U1VLPYaRBAp-RDhuGKTbBHTe83bqgvgwebcEzcqQk-gAAAAA&integrity=3Yj4qCKUgBQPCshcNy2FPHD3Upsj8M5GOQ8E4ORetqI"},"eventtrackers":[{"event":1,"method":1,"url":"https://work.targetblankdev.com/ad-server-e?data=gS4Wtf5CrSPsZHjTBW1mDkQ1TP6aDOWpxpBQrUEfS4u8zrPxIBN1RFHJR5HdEKIKSdLjXZojo-lwz87xbP-ABPgD90lpjBeL-KOVOgvvwBy92VYCLZPvbsgYxJd_BFSiiz2UvwathNDkSsWChylm6t8sbIF62Qe540dhb3T1cI_Ben_qkgqrobPSHbAyBRKsje_twgWYf2TJFKsKmQYq5zSwgCnZKpMgZ0nFqUitx7DPjiZrGTFZxZ66J3ArskkREs6N0nPy4H5y2zFNepzAorp-pLONDHWSFkbQNzqNZqZgUJ_8XracHjL5_VDDwmz392xnx6_Kf1a6ezDRJyfp3k7ZJoGA5U4Wx5z4S7SelueaXZYgnHv--skg7P3pIXc7veM6nfXQD-GDmC0sDdrRgFbJCwCHBdkvurEcFASxIiBOaH8FOu2quxAth0dEoEHFpwKd_bJdAcXZFfUt4URDy43hQAQAAAAA&integrity=fP4SzYcSbOv8RbHcTT5xsC0fmeftmjv51PV_8G7-Wy0"},{"event":2,"method":1,"url":"https://work.targetblankdev.com/ad-server-e?data=PMO9Lc4-g0OGvzRglK8_72bWOZumt1Hgvy-ifNC3VT5iJ3PEBt1FD96vxr8w_Oy4E0BMXXHlDABkXelqcS6a1HJTdR8u-BncqZ8lycFkrVg9wMFNiorbpVxzpM5lgaj-uUEH7oYreDCXD_qK_5OzQaJp3rHgXjtyUZEaXimv6Bgu-hBeUYimezBT5Ba9IJJ1YDMdgdY-pFIU4ND1-kQN11KYTwikW37IWX-q8zZMwM3m78KsgKnY_OkJzy-0JJUeKkmRv7awNoBBOmhjmY7qHbDcVcwG5GQp4b0zJTm9bg6zHxIIYKsYqdQzXUjqL94rQ1M113QrGW9p9U11W0fSpX3VbHL0EtSrnoAo8d9xTjQ2nc5OsJOlDbYXakVO_GEiGtqK1kMUtBkQzjctCB_TyatPj_f7GZ-Vjuema9bTQUwKybco4Gmfu32GpsDKlPL4j3sMahH1W55zTrjOl2f4SkVyrXpTTpWS8Ifxl6Gq-xvYm7vixStI6gAAAAA&integrity=hDyA0PinLzMdhwKbV6BOJVTUn3xP9UQSDqf6JebKFhQ"}]}',
        ttl: 300,
        netRevenue: false,
        mediaType: 'NATIVE',
        meta: {
          advertiserDomains: "example.com"
        },
        bidder: 'sevio',
        native: {
          "image": "https://example.com/image.png",
          "image_width": 0,
          "image_height": 0,
          "title": "TestAdNative",
          "body": "Test Ad Native",
          "clickUrl": "https://example.com/ad-server-e?data=rYe8nbAM5c5zq5NcGi0xXHqGPRSwg9NdOtXo8HW7MBdZO6niYSCmNsZqZDU6PDs9jVqmCux1S-phDpqQodyDvLfMMFomYzBMfo6O9A9Zbjy_tDB-cEUwMbeiifLkXixiYbfWReUMm4VCErRUggbh-aZvd9HEpiSKQVxdzmL7_zJh0ZxCBPz6p6ukHQr_OqNcSeJvXK0UnFgvOT460CvfsZRwiXJ7PlOyJIrKJcllKMbQCnXRvnuXgZ7md-JLuorEF1zr2mU_a-1KvEkuPjdRZXGhgx68IZ1X7nBah-bbh_a3RD5_-nfOs5Sgm-osdxAxqAP90YFhHJSFubBlOvVaGJCEvpwz2hQAkkFoumfx1DkXLTbwFQBgi_mnXZssXz9RPQ-uzes7Hrpv2vWvtXcQtZcXkDLVc8vno1KQnaGTdING9ASNDMb0FwRHQqLH18lRxiAvtWZuAAqL3y2K2OClxKESDwRfCQAAAAA&integrity=1q8zuOP0wR6HFL22B0EcXl8a1FhqB4dYakIdamrH4TM",
          "impressionTrackers": [
            "https://example.com/ad-server-e?data=Q0uIkM00KhPFH-kwwFyX0xng6t1ZzDT-7TFojIwp1kSUAZRMxWAwpkifMKIv5xVteKcn_TStODvcIk2DFNBsLH68EBXiXtzlSuqrkRNhRXCshvuIuEpi7p18OFtztv0p42_D-LqnD0qaeVQP_UJ7Vxbi2cchLD6WxswYGafQ6hbuIw9bDXbx_FFzlTd3v99mq5YzZSyr6A26sKRr4FQz7F-1nXlXqln7MVUEDtbkbumxw8FfzIZsP04u4bWFnMd0pWCAwmp4z0ZwAfsMWquUlOf2eZVls-9dwdssB6PxjmkLIp3TRwMwiT2aNALf0sIMCH1gkyTl12ircYgjX9urxSGx3e1GoTlPQvdQZM9_WQyct8MJYh_HCRF_ZDGsPUtGT8f9MkttjWZUG1aXboPbL1EntUzzjM8XMb5vHnu4fOuVkAFY6jF7y4JLnq07dKnxB3e2mxQCuVFqw0i6u9IFo5i4PmQAAAAA&integrity=2iKlABjSJ08PWsZwavEV4fvFabbRW3MN5EcXyBdg4VE"
          ],
          "viewableTrackers": [
            "https://example.com/ad-server-e?data=yMc4kfll-AQy3mUXZIl1xA2JjMlgm73j3HoGmqofgXVcVe1Q3wS6GD9ic0upRjeat_rLEP_aNrBevQsEUulH9F9JzFYDrkQavrGlhmHbddFnAx4mDrFK1N50uWR4oFmhl-V1RZ6PMrNeCLSH5KV8nDRsl5bCYG3YNBu6A65w-VJZpxfavNSHZfhDkDRvxSM6cYlstqlgg-dXp6jYdFS8w2SXIb8KgrxPN18Zw4T6wCqd0OGTDcO2ylQzjsvFeRrdBkkIyLlvovkfnYOYaLsyoAOclOMNaoDwmOhTLqCZr6IPrieLP4VyrsussbkIhBBSNvVr7KwNpLptTj3JqX6dSazTTm3FSojqCp8o6PoE072QmX6xmMK_Mm1XIJq9jtCxRER2s9VLkaWyzksgDmFeHzrnHurmDQ52BxA6m4DYQ9_txrMfxy5kK5lb73Qls2bcLzF2oosqRRCg2SWXomwKSkOkovxM7kxh_eIhYcZyxRO0wq5fILlMXgAAAAA&integrity=9QYkbMgRLGjGxBY2sO3VeZqyR5CF2sJHkGvPp6V6AeM"
          ],
          "adTemplate": "<div class=\"sponsored-post\">\n                       <img src=\"##image##\" />\n                        <div class=\"content\">\n                            <h1>\n                                <a href=\"##clickUrl##\" target=\"_blank\" class=\"pb-click\">##title##</a>\n                            </h1>\n                            <p>##body##</p>\n                            <div class=\"attribution\">##title##</div>\n                        </div>\n                    </div>"
        }
      }];
      let serverResponseNative = {
        body: {
          "bids": [
            {
              "requestId": "36e835f6cbfca38",
              "cpm": 5.0,
              "currency": "EUR",
              "width": 1,
              "height": 1,
              "creativeId": "28cf46ce-fe57-4417-acd6-285db604aa30",
              "ad": "{\"ver\":\"1.2\",\"assets\":[{\"id\":1,\"img\":{\"type\":3,\"url\":\"https://example.com/image.png\"}},{\"id\":2,\"title\":{\"text\":\"TestAdNative\",\"len\":12}},{\"id\":4,\"data\":{\"type\":2,\"value\":\"Test Ad Native\"}}],\"link\":{\"url\":\"https://example.com/ad-server-e?data=o4rIvHAEkHlT9_ItFWCiBfQDNUkLHzkjLF9uPkIArQZiqBg_bWdNjmhGDU96MmBAI3UURTDIZ4CuqYA90CazeB7gVUwZboKeJXp8MIMiLQEzxaUQh6qsFjBoVFbn6H0qq7neZUEX82NuPcgwNzsThJnING6uFzUUCrlgAGncJQc68DMldAFqxTrgsSHpAhyF00-LCUF1eblyoT03R6RWIEpBl1O85VE9MeRPV5BHDaIjYVT7wWUSLXa40_mr_tUpFST6oDwVEFldoYQruwm07gjxLLLjnymoj9QXUuSTgGYwPFwW6wqG0p67xaGuGNB8J08AUweUujghsXHf_iSbkqfhO1LilHa_YrZ0UXzZSjRRWOX_sPVLs6Wta4RsEl3KMKVsVlgSLV6j0Okbw2cP6GztzMbURlz2C3jX2veaOsKxvajdqU5U1VLPYaRBAp-RDhuGKTbBHTe83bqgvgwebcEzcqQk-gAAAAA&integrity=3Yj4qCKUgBQPCshcNy2FPHD3Upsj8M5GOQ8E4ORetqI\"},\"eventtrackers\":[{\"event\":1,\"method\":1,\"url\":\"https://example.com/ad-server-e?data=gS4Wtf5CrSPsZHjTBW1mDkQ1TP6aDOWpxpBQrUEfS4u8zrPxIBN1RFHJR5HdEKIKSdLjXZojo-lwz87xbP-ABPgD90lpjBeL-KOVOgvvwBy92VYCLZPvbsgYxJd_BFSiiz2UvwathNDkSsWChylm6t8sbIF62Qe540dhb3T1cI_Ben_qkgqrobPSHbAyBRKsje_twgWYf2TJFKsKmQYq5zSwgCnZKpMgZ0nFqUitx7DPjiZrGTFZxZ66J3ArskkREs6N0nPy4H5y2zFNepzAorp-pLONDHWSFkbQNzqNZqZgUJ_8XracHjL5_VDDwmz392xnx6_Kf1a6ezDRJyfp3k7ZJoGA5U4Wx5z4S7SelueaXZYgnHv--skg7P3pIXc7veM6nfXQD-GDmC0sDdrRgFbJCwCHBdkvurEcFASxIiBOaH8FOu2quxAth0dEoEHFpwKd_bJdAcXZFfUt4URDy43hQAQAAAAA&integrity=fP4SzYcSbOv8RbHcTT5xsC0fmeftmjv51PV_8G7-Wy0\"},{\"event\":2,\"method\":1,\"url\":\"https://example.com/ad-server-e?data=PMO9Lc4-g0OGvzRglK8_72bWOZumt1Hgvy-ifNC3VT5iJ3PEBt1FD96vxr8w_Oy4E0BMXXHlDABkXelqcS6a1HJTdR8u-BncqZ8lycFkrVg9wMFNiorbpVxzpM5lgaj-uUEH7oYreDCXD_qK_5OzQaJp3rHgXjtyUZEaXimv6Bgu-hBeUYimezBT5Ba9IJJ1YDMdgdY-pFIU4ND1-kQN11KYTwikW37IWX-q8zZMwM3m78KsgKnY_OkJzy-0JJUeKkmRv7awNoBBOmhjmY7qHbDcVcwG5GQp4b0zJTm9bg6zHxIIYKsYqdQzXUjqL94rQ1M113QrGW9p9U11W0fSpX3VbHL0EtSrnoAo8d9xTjQ2nc5OsJOlDbYXakVO_GEiGtqK1kMUtBkQzjctCB_TyatPj_f7GZ-Vjuema9bTQUwKybco4Gmfu32GpsDKlPL4j3sMahH1W55zTrjOl2f4SkVyrXpTTpWS8Ifxl6Gq-xvYm7vixStI6gAAAAA&integrity=hDyA0PinLzMdhwKbV6BOJVTUn3xP9UQSDqf6JebKFhQ\"}]}",
              "ttl": 300,
              "netRevenue": false,
              "mediaType": "NATIVE",
              "meta": {
                "advertiserDomains": [
                  "example.com"
                ]
              }
            }
          ],
          "userSyncs": [
            {
              "url": "https://dmp.adform.net/dmp/profile/?pid=12718&sg=SEVIO_CGE",
              "type": "image"
            }
          ]
        }
      };

      let result = spec.interpretResponse(serverResponseNative);
      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponseNative));
    })

    it('should use bidRequest.params.keywords when provided', function () {
      const singleBidRequest = [
        {
          bidder: 'sevio',
          params: {
            zone: 'zoneId',
            keywords: ['play', 'games']
          },
          mediaTypes: {
            banner: { sizes: [[728, 90]] }
          },
          bidId: 'bid-kw',
          bidderRequestId: 'br-kw',
          auctionId: 'auc-kw'
        }
      ];
      const bidderRequest = {
        refererInfo: {
          numIframes: 0,
          reachedTop: true,
          referer: 'https://example.com',
          stack: ['https://example.com']
        }
      };

      const requests = spec.buildRequests(singleBidRequest, bidderRequest);
      expect(requests).to.be.an('array').that.is.not.empty;
      expect(requests[0].data).to.have.property('keywords');
      expect(requests[0].data.keywords).to.have.property('tokens');
      expect(requests[0].data.keywords.tokens).to.deep.equal(['play', 'games']);
    });
  });

  it('should prefer ortb2.site.keywords when present on bidderRequest', function () {
    const singleBidRequest = [
      {
        bidder: 'sevio',
        params: {
          zone: 'zoneId'
        },
        mediaTypes: {
          banner: { sizes: [[300, 250]] }
        },
        bidId: 'bid-kw-ortb',
        bidderRequestId: 'br-kw-ortb',
        auctionId: 'auc-kw-ortb'
      }
    ];
    const bidderRequestWithOrtb = {
      refererInfo: {
        numIframes: 0,
        reachedTop: true,
        referer: 'https://example.com',
        stack: ['https://example.com']
      },
      ortb2: {
        site: {
          keywords: ['keyword1', 'keyword2']
        }
      }
    };

    const requests = spec.buildRequests(singleBidRequest, bidderRequestWithOrtb);
    expect(requests).to.be.an('array').that.is.not.empty;
    expect(requests[0].data).to.have.property('keywords');
    expect(requests[0].data.keywords).to.have.property('tokens');
    expect(requests[0].data.keywords.tokens).to.deep.equal(['keyword1', 'keyword2']);
  });

  // Minimal env shims some helpers rely on
  Object.defineProperty(window, 'visualViewport', {
    value: { width: 1200, height: 800 },
    configurable: true
  });
  Object.defineProperty(window, 'screen', {
    value: { width: 1920, height: 1080 },
    configurable: true
  });

  function mkBid(overrides) {
    return Object.assign({
      bidId: 'bid-1',
      bidder: 'sevio',
      params: { zone: 'zone-123', referenceId: 'ref-abc', keywords: ['k1', 'k2'] },
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      refererInfo: { page: 'https://example.com/page', referer: 'https://referrer.example' },
      userIdAsEids: []
    }, overrides || {});
  }

  const baseBidderRequest = {
    timeout: 1200,
    refererInfo: { page: 'https://example.com/page', referer: 'https://referrer.example' },
    gdprConsent: { consentString: 'TCF-STRING' },
    uspConsent: { uspString: '1NYN' },
    gppConsent: { consentString: 'GPP-STRING' },
    ortb2: { device: {}, ext: {} }
  };

  describe('Sevio adapter helper coverage via buildRequests (JS)', () => {
    let stubs = [];

    afterEach(() => {
      while (stubs.length) stubs.pop().restore();
      document.title = '';
      document.head.innerHTML = '';
      try {
        Object.defineProperty(navigator, 'connection', { value: undefined, configurable: true });
      } catch (e) {}
    });

    it('getReferrerInfo → data.referer', () => {
      const out = spec.buildRequests([mkBid()], baseBidderRequest);
      expect(out).to.have.lengthOf(1);
      expect(out[0].data.referer).to.equal('https://example.com/page');
    });

    it('getPageTitle prefers top.title; falls back to og:title (top document)', () => {
      window.top.document.title = 'Doc Title';
      let out = spec.buildRequests([mkBid()], baseBidderRequest);
      expect(out[0].data.pageTitle).to.equal('Doc Title');

      window.top.document.title = '';
      const meta = window.top.document.createElement('meta');
      meta.setAttribute('property', 'og:title');
      meta.setAttribute('content', 'OG Title');
      window.top.document.head.appendChild(meta);

      out = spec.buildRequests([mkBid()], baseBidderRequest);
      expect(out[0].data.pageTitle).to.equal('OG Title');

      meta.remove();
    });

    it('getPageTitle cross-origin fallback (window.top throws) uses local document.*', function () {
      document.title = 'Local Title';

      // In jsdom, window.top === window; try to simulate cross-origin by throwing from getter.
      let restored = false;
      try {
        const original = Object.getOwnPropertyDescriptor(window, 'top');
        Object.defineProperty(window, 'top', {
          configurable: true,
          get() { throw new Error('cross-origin'); }
        });
        const out = spec.buildRequests([mkBid()], baseBidderRequest);
        expect(out[0].data.pageTitle).to.equal('Local Title');
        Object.defineProperty(window, 'top', original);
        restored = true;
      } catch (e) {
        // Environment didn’t allow redefining window.top; skip this case
        this.skip();
      } finally {
        if (!restored) {
          try { Object.defineProperty(window, 'top', { value: window, configurable: true }); } catch (e) {}
        }
      }
    });

    it('computeTTFB via navigation entries (top.performance) and cached within call', () => {
      const perfTop = window.top.performance;

      const original = perfTop.getEntriesByType;
      Object.defineProperty(perfTop, 'getEntriesByType', {
        configurable: true, writable: true,
        value: (type) => (type === 'navigation' ? [{ responseStart: 152, requestStart: 100 }] : [])
      });

      const out = spec.buildRequests([mkBid({ bidId: 'A' }), mkBid({ bidId: 'B' })], baseBidderRequest);
      expect(out).to.have.lengthOf(2);
      expect(out[0].data.timeToFirstByte).to.equal('52');
      expect(out[1].data.timeToFirstByte).to.equal('52');

      Object.defineProperty(perfTop, 'getEntriesByType', { configurable: true, writable: true, value: original });
    });

    it('computeTTFB falls back to top.performance.timing when no navigation entries', () => {
      const perfTop = window.top.performance;
      const originalGetEntries = perfTop.getEntriesByType;
      const originalTimingDesc = Object.getOwnPropertyDescriptor(perfTop, 'timing');

      Object.defineProperty(perfTop, 'getEntriesByType', {
        configurable: true, writable: true, value: () => []
      });

      Object.defineProperty(perfTop, 'timing', {
        configurable: true,
        value: { responseStart: 250, requestStart: 200 }
      });

      const out = spec.buildRequests([mkBid()], baseBidderRequest);
      expect(out[0].data.timeToFirstByte).to.equal('50');

      Object.defineProperty(perfTop, 'getEntriesByType', {
        configurable: true, writable: true, value: originalGetEntries
      });
      if (originalTimingDesc) {
        Object.defineProperty(perfTop, 'timing', originalTimingDesc);
      } else {
        Object.defineProperty(perfTop, 'timing', { configurable: true, value: undefined });
      }
    });

    it('handles multiple sizes correctly', function () {
      const multiSizeBidRequests = [
        {
          bidder: 'sevio',
          params: { zone: 'zoneId' },
          mediaTypes: {
            banner: {
              sizes: [
                [300, 250],
                [728, 90],
                [160, 600],
              ]
            }
          },
          bidId: 'multi123',
        }
      ];

      const bidderRequests = {
        refererInfo: {
          numIframes: 0,
          reachedTop: true,
          referer: 'https://example.com',
          stack: ['https://example.com']
        }
      };

      const request = spec.buildRequests(multiSizeBidRequests, bidderRequests);
      const sizes = request[0].data.ads[0].sizes;

      expect(sizes).to.deep.equal([
        { width: 300, height: 250 },
        { width: 728, height: 90 },
        { width: 160, height: 600 },
      ]);
    });
  });

  describe('currency handling', function () {
    let bidRequests;
    let bidderRequests;

    beforeEach(function () {
      bidRequests = [{
        bidder: 'sevio',
        params: { zone: 'zoneId' },
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        bidId: '123'
      }];

      bidderRequests = {
        refererInfo: {
          referer: 'https://example.com',
          page: 'https://example.com',
        }
      };
    });

    afterEach(function () {
      if (typeof config.resetConfig === 'function') {
        config.resetConfig();
      } else if (typeof config.setConfig === 'function') {
        config.setConfig({ currency: null });
      }
    });

    it('includes EUR currency when EUR is set in prebid config', function () {
      config.setConfig({
        currency: {
          adServerCurrency: 'EUR'
        }
      });

      const req = spec.buildRequests(bidRequests, bidderRequests);
      const payload = req[0].data;

      expect(payload.currency).to.equal('EUR');
    });

    it('includes GBP currency when GBP is set in prebid config', function () {
      config.setConfig({
        currency: {
          adServerCurrency: 'GBP'
        }
      });

      const req = spec.buildRequests(bidRequests, bidderRequests);
      const payload = req[0].data;

      expect(payload.currency).to.equal('GBP');
    });

    it('does NOT include currency when no currency config is set', function () {
      const req = spec.buildRequests(bidRequests, bidderRequests);
      const payload = req[0].data;

      expect(payload).to.not.have.property('currency');
    });
  });
});
