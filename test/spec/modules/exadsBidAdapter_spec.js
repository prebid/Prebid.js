import { expect } from 'chai';
import { spec, imps } from 'modules/exadsBidAdapter.js';
import { BANNER, NATIVE, VIDEO } from '../../../src/mediaTypes.js';

describe('exadsBidAdapterTest', function () {
  const bidder = 'exadsadserver';

  const partners = {
    RTB_2_4: 'rtb_2_4'
  }

  const imageBanner = {
    mediaTypes: {
      banner: {
        sizes: [300, 250]
      }
    },
    bidder: bidder,
    params: {
      zoneId: 5147485,
      fid: '829a896f011475d505a0d89cfdd1af8d9cdb07ff',
      partner: partners.RTB_2_4,
      siteId: '12345',
      catIab: ['IAB25-3'],
      userIp: '0.0.0.0',
      userId: '',
      country: 'IRL',
      impressionId: '123456',
      keywords: 'lifestyle, humour',
      bidfloor: 0.00000011,
      bidfloorcur: 'EUR',
      mimes: ['image/jpg'],
      image_output: 'html',
      endpoint: 'test.com'
    }
  };

  const native = {
    mediaTypes: {
      native: {
        ortb: {
          assets: [{
            id: 3,
            required: 1,
            title: {
              len: 124
            }
          },
          {
            id: 2,
            data: {
              type: 1,
              len: 50
            }
          },
          {
            id: 1,
            required: 1,
            img: {
              type: 3,
              w: 300,
              h: 300,
            }
          }]
        }
      },
    },
    bidder: bidder,
    params: {
      zoneId: 5147485,
      fid: '829a896f011475d505a0d89cfdd1af8d9cdb07ff',
      partner: partners.RTB_2_4,
      siteId: '12345',
      catIab: ['IAB25-3'],
      userIp: '0.0.0.0',
      userId: '',
      country: 'IRL',
      impressionId: '123456',
      keywords: 'lifestyle, humour',
      bidfloor: 0.00000011,
      bidfloorcur: 'EUR',
      native: {
        plcmtcnt: 4,
      },
      endpoint: 'test.com'
    }
  };

  const instream = {
    mediaTypes: {
      video: {
        mimes: ['video/mp4'],
        protocols: [3, 6],
      }
    },
    bidder: bidder,
    params: {
      zoneId: 5147485,
      fid: '829a896f011475d505a0d89cfdd1af8d9cdb07ff',
      partner: partners.RTB_2_4,
      siteId: '12345',
      catIab: ['IAB25-3'],
      userIp: '0.0.0.0',
      userId: '',
      country: 'IRL',
      impressionId: '123456',
      keywords: 'lifestyle, humour',
      bidfloor: 0.00000011,
      bidfloorcur: 'EUR',
      stream: {
        video: {
          mimes: ['video/mp4']
        },
        protocols: [
          3,
          6
        ],
        ext: {
          video_cta: 0
        }
      },
      endpoint: 'test.com',
    }
  };

  describe('bidRequestValidity', function () {
    it('bidRequest with all mandatory params for banner ad-format', function () {
      expect(spec.isBidRequestValid(imageBanner)).to.equal(true);
    });

    it('bidRequest with all mandatory params for native ad-format', function () {
      expect(spec.isBidRequestValid(native));
    });

    it('bidRequest with all mandatory params for instream ad-format', function () {
      expect(spec.isBidRequestValid(instream)).to.equal(true);
    });

    it('bidRequest with wrong bidder code', function () {
      expect(spec.isBidRequestValid({
        ...imageBanner,
        bidder: 'not_exadsadserver'
      })).to.eql(false);
    });

    it('bidRequest with wrong partner', function () {
      expect(spec.isBidRequestValid({
        ...imageBanner,
        params: {
          ...imageBanner.params,
          partner: 'not_rtb_2_4'
        }
      })).to.eql(false);
    });

    it('bidRequest without params', function () {
      expect(spec.isBidRequestValid({
        bidder: bidder,
        params: { }
      })).to.equal(false);
    });
  });

  describe('bidRequest for banner ad-format', function () {
    const bidRequests = [imageBanner];

    it('bidRequest HTTP method', function () {
      const requests = spec.buildRequests(bidRequests, {});
      requests.forEach(function(requestItem) {
        expect(requestItem.method).to.equal('POST');
      });
    });
  });

  describe('bidRequest for native ad-format', function () {
    const bidRequests = [native];

    it('bidRequest HTTP method', function () {
      const requests = spec.buildRequests(bidRequests, {});
      requests.forEach(function(requestItem) {
        expect(requestItem.method).to.equal('POST');
      });
    });
  });

  describe('bidRequest for instream ad-format', function () {
    const bidRequests = [instream];

    it('bidRequest HTTP method', function () {
      const requests = spec.buildRequests(bidRequests, {});
      requests.forEach(function(requestItem) {
        expect(requestItem.method).to.equal('POST');
      });
    });
  });

  describe('interpretResponse', function () {
    beforeEach(() => {
      imps.set('270544423272657', 'rtb_2_4');
    });

    it('Test banner interpretResponse', function () {
      const serverResponse = {
        body: {
          'id': '2d2a496527398e',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '8f7fa506af97bc193e7bf099d8ed6930bd50aaf1',
                  'impid': '270544423272657',
                  'price': 0.0045000000000000005,
                  'adm': '<?xml version="1.0"?>\n<ad><imageAd><clickUrl><![CDATA[https://syndication.exads.rocks/click.php?d=H4sIAAAAAAAAAz1Ou27DQAz7FS9ZD5JOuseYpUDRoUt_wPD56qBxEsROkQL8.F7coKAGiRQJBgnkUwY5w7Sul2Xn9zt5abOOy.qG8wwQOJIoKeeAqT8d5nETsjnx3gkHx1GRsprn6GGsUZPBKAHKEHBoIQRPdBdrcQ2AWIIOxrloIc1JWjzz4Gv1JUeVWunxSpj7U_85zuNpdeO9L4u7noevZUskdMdDbU1_jmM33ebz7dphMz0gJp45P7csBGz8U35A_7e02VqtP0q24_Vjj28mvL.hZBqqFcslp1AqcW8WVKKPfSpV6y83F5ofSgEAAA--]]></clickUrl><imgUrl><![CDATA[https://syndication.exads.rocks/cimp.php?data=TVRjd01qUXdOREU1Tm54aE5UZGxPRGhrT0dGalkyWmtNV1kzTWpsbFl6WmtZV1V3TldSa00yRTFPQS0tfC9saWJyYXJ5LzMyMTY3L2NiMzg4N2NjZTM3NzEwMTliY2QzOWQ1NjAwZDQwYzg0ZTc5NTg5YzYuanBnfGh0dHBzfDk1LjIzMy4yMTYuMTc0fElUQXw0MXxoYW5pbWUuY29tfDMyMTY3fDcyMDQ1NHw5MjMwOTh8NTE0NzQ4NXw1MDh8NjI2MDM4OXw4OTQ1MzE3M3wxNnwyfDB8MHwyNTh8MHwwLjV8OTB8VVNEfFVTRHwxfDF8MjF8MzAweDI1MHwxfElUQXx8fDR8MXx8fDRjNTE5ZDRkMDQ5ODIxOTYxMWMzZmYzZDk3NDJmZjAwfDF8MHxtYW5hZ2VtZW50LmV4YWRzLnJvY2tzfDB8MHwwfDAuMDV8MXwwfGV4Y2hhbmdlX2Jhbm5lcnwwfDB8MjUyMzExOXwtMXwwfDI1MjM5MjB8fHwwfDB8fDB8MHwwfDB8MHwwfDF8MHx8OHwxfE1vemlsbGEvNS4wIChNYWNpbnRvc2g7IEludGVsIE1hYyBPUyBYIDEwXzE1XzcpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xMTkuMC4wLjAgU2FmYXJpLzUzNy4zNnx8MjR8MHwwfDJ8MHx8fE9LfGYzYzg4Yjk1NWRjYjVkODg1NTk3OGQzNjczZGZiZjFh]]></imgUrl></imageAd></ad>\n',
                  'ext': {
                    'btype': 1,
                    'asset_mime_type': [
                      'image/jpeg',
                      'image/jpg'
                    ]
                  },
                  'nurl': 'http://rtb.exads.rocks/not.php?zid=5147485&data=TVRjd01qUXdOREU1Tm54aE5UZGxPRGhrT0dGalkyWmtNV1kzTWpsbFl6WmtZV1V3TldSa00yRTFPQS0tfDIwMjMtMTItMTIgMTM6MDM6MTZ8OTUuMjMzLjIxNi4xNzR8SVRBfDQxfGhhbmltZS5jb218MzIxNjd8NzIwNDU0fDkyMzA5OHw1MTQ3NDg1fDUwOHw2MjYwMzg5fDg5NDUzMTczfDE2fDJ8MHwwfDI1OHwwfDB8MHxVU0R8VVNEfDF8MXwyMXwzMDB4MjUwfDF8SVRBfHwwfDR8MXwwfDY1NzhhMDY0YmE4ZjI2Ljg5MDA3NDE0MjY0MTExMDg1OHw0YzUxOWQ0ZDA0OTgyMTk2MTFjM2ZmM2Q5NzQyZmYwMHxtYW5hZ2VtZW50LmV4YWRzLnJvY2tzfDB8MHwwfDB8MmQyYTQ5NjUyNzM5OGV8MHw0MHwwfFdJTk5FUnx8MXwwLjcyfDB8MHwyfDB8MHwwfDI1MjMxMTl8LTF8MHwyNTIzOTIwfHx8fDB8MHwwfHx8fDB8MHwwfDF8MHwwfDh8MXwwfDB8MHwyfHx8MHx8T0t8Zjk4NzUzNjc4YjIyYmVkOTBlMTg5NDJmNWU1NDIyZDI-',
                  'cid': '6260389',
                  'crid': '89453173',
                  'adomain': [
                    'test.com'
                  ],
                  'w': 300,
                  'h': 250,
                  'attr': [
                    12
                  ]
                }
              ]
            }
          ],
          'cur': 'USD'
        }
      };

      const bidResponses = spec.interpretResponse(serverResponse, {
        data: JSON.stringify({
          'id': '2d2a496527398e',
          'at': 1,
          'imp': [
            {
              'id': '270544423272657',
              'bidfloor': 1.1e-7,
              'bidfloorcur': 'EUR',
              'banner': {
                'w': 300,
                'h': 250
              }
            }
          ],
          'site': {
            'id': '12345',
            'domain': 'management.exads.rocks',
            'cat': [
              'IAB25-3'
            ],
            'page': 'https://management.exads.rocks/prebidJS-client-RTB-banner.html',
            'keywords': 'lifestyle, humour'
          },
          'device': {
            'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'ip': '95.233.216.174',
            'geo': {
              'country': 'ITA'
            },
            'language': 'en',
            'os': 'MacOS',
            'js': 0,
            'ext': {
              'remote_addr': '',
              'x_forwarded_for': '',
              'accept_language': 'en-GB'
            }
          },
          'user': {
            'id': ''
          },
          'ext': {
            'sub': 0
          }
        })
      });

      expect(bidResponses).to.be.an('array').that.is.not.empty;

      const bid = serverResponse.body.seatbid[0].bid[0];
      const bidResponse = bidResponses[0];

      expect(bidResponse.mediaType).to.equal(BANNER);
      expect(bidResponse.width).to.equal(bid.w);
      expect(bidResponse.height).to.equal(bid.h);
    });

    it('Test native Ad interpretResponse', function () {
      const serverResponse = {
        body: {
          'id': '21dea1fc6c3e1b',
          'seatbid': [
            {
              'bid': [
                {
                  'id': 'cedc93987cd4a1e08fdfe97de97482d1ecc503ee',
                  'impid': '270544423272657',
                  'price': 0.0045000000000000005,
                  'adm': '{"native":{"link":{"url":"https:\\/\\/syndication.exads.rocks\\/click.php?d=H4sIAAAAAAAAA0WOO24DMQxEr6LGrUBJ1IelmwBGijS5gH4bb.JdG7uCkYKHj6wEDobFEI8cjNMODBkGafnc2m0_mONBv_RpdW8yXxdmYOVBIwRDwOe4zksdgKzUxkitnFQeORBaowKxVegxeLYQmFGxZuV6CDCrLmZtAyMSeZp8zDVO2ZRADrB4nIJPPhnsh8BLXONHXeraZP2OZZfbNX_tIwpY_FMxqBhU3Laa5vK5i3yZH2xrSayxzfcqzm25CB7RD2mrjVL050j3gr814Sl8ujDeenlkrR8vYzu9H_mugN9eWZHxlH2ilHVJPdH5qDAWkxIWN4UfogOxM2oBAAA-"},"eventtrackers":[{"event":1,"method":1,"url":"https:\\/\\/syndication.exads.rocks\\/cimp.php?data=TVRjd01qUXdPRE01TUh3ek5UWm1NakkyTWpnM1lqQmpPR1pqWm1SbVlUQmtNRGRoWm1VM09URXpNUS0tfC9saWJyYXJ5LzMyMTY3L2Y4NWVlODdjNGRmNWViMmNlMjdmMTBhNjRjNzlhMGUxYjY2NGVhMjMuanBnfGh0dHBzfDk1LjIzMy4yMTYuMTc0fElUQXw0MXxoYW5pbWUuY29tfDMyMTY3fDcyMDQ1NHw5MjMwOTh8NTE0NzQ4N3w1MDh8NjI2MDM5M3w4OTQ1MzE4OXwxNnwyfDB8MHwyNTh8MHwwLjV8OTB8VVNEfFVTRHwxfDF8MzR8fDF8SVRBfHx8NHwxfHx8NDQ5OTc5ZjdhY2VhZmMzZDg5NjA0ZDc0Zjg3YjdiMzR8MXwwfG1hbmFnZW1lbnQuZXhhZHMucm9ja3N8MHwwfDB8MC4wNXwxfDB8ZXhjaGFuZ2VfbmF0aXZlX2FkfDB8MHwyNTIzMTE5fC0xfDB8MjUyMzkyMHx8fDB8MHx8MHwwfDB8MHwwfDB8MXwwfHw4fDF8TW96aWxsYS81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfMTVfNykgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzExOS4wLjAuMCBTYWZhcmkvNTM3LjM2fHwyNHwyMnwwfDJ8MHx8fE9LfDQ3ZWFmNjZlN2RlOTFjZTkzZTExMDlkNDNmNzNmZDNl"}],"assets":[{"id":1,"title":{"text":"Title"}},{"id":2,"data":{"value":"Description"}},{"id":3,"img":{"url":"https:\\/\\/static.exads.rocks\\/library\\/32167\\/f85ee87c4df5eb2ce27f10a64c79a0e1b664ea23.jpg"}}]}}',
                  'ext': {
                    'btype': 1,
                    'asset_mime_type': [
                      'image/jpeg',
                      'image/jpg'
                    ]
                  },
                  'nurl': 'http://rtb.exads.rocks/not.php?zid=5147487&data=TVRjd01qUXdPRE01TUh3ek5UWm1NakkyTWpnM1lqQmpPR1pqWm1SbVlUQmtNRGRoWm1VM09URXpNUS0tfDIwMjMtMTItMTIgMTQ6MTM6MTB8OTUuMjMzLjIxNi4xNzR8SVRBfDQxfGhhbmltZS5jb218MzIxNjd8NzIwNDU0fDkyMzA5OHw1MTQ3NDg3fDUwOHw2MjYwMzkzfDg5NDUzMTg5fDE2fDJ8MHwwfDI1OHwwfDB8MHxVU0R8VVNEfDF8MXwzNHx8MXxJVEF8fDB8NHwxfDB8NjU3OGIwYzY2MDhiNjAuNzc4NjY2OTczMzI3Mzg0MzQwfDQ0OTk3OWY3YWNlYWZjM2Q4OTYwNGQ3NGY4N2I3YjM0fG1hbmFnZW1lbnQuZXhhZHMucm9ja3N8MHwwfDB8MHwyMWRlYTFmYzZjM2UxYnwwfDQwfDB8V0lOTkVSfHwxfDAuNzJ8MHwwfDJ8MHwwfDB8MjUyMzExOXwtMXwwfDI1MjM5MjB8fHx8MHwwfDB8fHx8MHwwfDB8MXwwfDB8OHwxfDB8MjJ8MHwyfHx8MHx8T0t8NmVmNGE1MTAwM2IwOGZiZGI2ZDMyOTVkNTQ2Y2U3YzM-',
                  'cid': '6260393',
                  'crid': '89453189',
                  'adomain': [
                    'test.com'
                  ],
                  'w': 300,
                  'h': 300,
                  'attr': []
                }
              ]
            }
          ],
          'cur': 'USD'
        }
      };

      const bidResponses = spec.interpretResponse(serverResponse, {
        data: JSON.stringify({
          'id': '21dea1fc6c3e1b',
          'at': 1,
          'imp': [
            {
              'id': '270544423272657',
              'bidfloor': 1.1e-7,
              'bidfloorcur': 'EUR',
              'native': {
                'request': '{"native":{"ver":"1.2","context":1,"contextsubtype":10,"plcmttype":4,"plcmtcnt":4,"assets":[{"id":1,"required":1,"title":{"len":124}},{"id":2,"data":{"type":1,"len":50}},{"id":3,"required":1,"img":{"type":3,"w":300,"h":300,"wmin":300,"hmin":300}}]}}',
                'ver': '1.2'
              }
            }
          ],
          'site': {
            'id': '12345',
            'domain': 'management.exads.rocks',
            'cat': [
              'IAB25-3'
            ],
            'page': 'https://management.exads.rocks/prebidJS-client-RTB-native.html'
          },
          'device': {
            'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'ip': '95.233.216.174',
            'geo': {
              'country': 'ITA'
            },
            'language': 'en',
            'os': 'MacOS',
            'js': 0,
            'ext': {
              'remote_addr': '',
              'x_forwarded_for': '',
              'accept_language': 'en-GB'
            }
          },
          'user': {
            'id': ''
          },
          'ext': {
            'sub': 0
          }
        })
      });

      expect(bidResponses).to.be.an('array').that.is.not.empty;

      const bid = serverResponse.body.seatbid[0].bid[0];
      const bidResponse = bidResponses[0];

      expect(bidResponse.mediaType).to.equal(NATIVE);
    });
    it('Test InStream Video interpretResponse', function () {
      const serverResponse = {
        body: {
          'id': '2218abc7ebca97',
          'seatbid': [
            {
              'bid': [
                {
                  'id': 'd2d2063517b126252f56e22767c53f936ff40411',
                  'impid': '270544423272657',
                  'price': 0.12474000000000002,
                  'adm': '<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="3.0">\n  <Ad id="6260395">\n    <InLine>\n      <AdSystem>exads.rocks</AdSystem>\n      <AdTitle/>\n      <Impression id="exotr"><![CDATA[https://syndication.exads.rocks/vregister.php?a=vimp&tracking_event=impression&idzone=5147489&bba631b1ed92f8fa6c0e1007700ed9eb=tsVuZ8uHLnt48tvHlq49PXLn64eddlTlK8E.fnru5c.e7lx7buPfpramslrpwzFQ.64G42JXrGHnM.nHXVBW4u_NVXKxI5m.xLBI5uamk1wNsN2uU1wVOU58.XHt31wNz2MxwVPuU59.XDp16a4G6oK3M_PLnw8.NcDeM0rmfXj079PHnXA20xW49NThn14eNcDbTEk7ED0ufbl24c_PXXA3axTAxXBNLn489OvPj5464G5qs.PbXA2zTNdU5Tny1wNtuWwNOZ8NcDbTFNMDlOfDXA3BVPny6.NdVjOfDXaxHY5nw3cOPPx21z2MxwVPuUr0sVuZ.eGuexmOCp9yldqymlyVrDNE8DW0xJOxA9Ku1ZTS5K1hmieBrcvafYlecXrmXnsZjgqfcpz463L2n2JXnF65l5XK7pqYs.OthtevCdzPn51uzUyMV564G5XK7pqYs.OtqayWunBeamB6CViPMVD7rfrrnXvXdmpuYpbcbXdmpz1wNz0zN2NVrtMVuPTU4Z8e2uemBqCV5eSZtyPPprfrrnqz466mqXHJV6XKpo7K4Jpc.F_DXZU5SvA3nw12UxrvsVP5u8ePd1ns34c8N.OHTqzwc7NN9OvHx34t.PDWuCSelyqqCaVeqtiuyrPjrgknpcqqgmlXgltYjgbXpcYqmlz4a6XHXKXKV6oK3F35qq5WJHM5GJWHnJHJa9zl7DdW6mZqKrWw2zHM1Fnw1wNzOuuU58NcDcbErcEry87DzmfDW5e41ZXBNKvXBI5nw1wNtsVsNOS1uU58NcDbTFNMDlK9U1lLTmfDXLNU1TBPXnw1wStTPSwVzLyTNuZ8NdblVa8kzbmfDXS49BNKu85NKxI4vA3ny68ufHj51z0zX4L1VsV2VZ7eOuBudimuVynPhragrwXecmlYkcXgbz5deXPzy4a5XK2GrIK8F56Zr8F68J3M9crlbDVkFeC89M1.C7blTVME9cE0uethtmOZqJe1ynPXBJPS5VVBNKuxHGvBLaxHA2vS4xVNLVnw11WM8s.Guqxnnnw11NUwT1r14TuZ66mqYJ615WJHM9dTVME9a9rlOetmma6pyle1ynPhrtpz4a4Ja3KZWI8.GuWZd2yVurPhrgbpcqnmlqgtcXjYwmsrz4a4G5LI64MZpXM.GuypyldpieeCV7PhrsqcpXaYnngleXdpcosclawz4a3JGII14Kp8.GupqmCetdtytiCPPxrqapgnrXtcpqgmlz462bKY89cDbDdrlNcFTlK7Da9eE7mfLjrgbnpmvwz4a4G5XK7pqYl68J3M.WuBtpiSdiB6VevCdzPhrprZXgltclrmpwXgbz101srwS2uS1zU4LysSOZ67bLIG8.Pfhy6cPHnx549PPDvz88u3br38M8.Lfnn1a4664JHKq2JJ8.Pfhy6cPHnx51tTTRQONTS1OS158YA-]]></Impression>\n      <Error><![CDATA[https://syndication.exads.rocks/vregister.php?a=vview&errorcode=[ERRORCODE]&idzone=5147489&dg=6260395-ITA-89453191-2-0-1-0-InLine]]></Error>\n      <Creatives>\n        <Creative sequence="1" id="89453191">\n          <Linear>\n            <Duration>00:00:20.32</Duration>\n            <TrackingEvents>\n              <Tracking id="prog_1" event="progress" offset="00:00:10.000"><![CDATA[https://syndication.exads.rocks/vregister.php?a=vview&tracking_event=progress&progress=00:00:10.000&idzone=5147489&bba631b1ed92f8fa6c0e1007700ed9eb=tsVuZ8uHLnt48tvHlq49PXLn64eddlTlK8E.fnru5c.e7lx7buPfpramslrpwzFQ.64G42JXrGHnM.nHXVBW4u_NVXKxI5m.xLBI5uamk1wNsN2uU1wVOU58.XHt31wNz2MxwVPuU59.XDp16a4G6oK3M_PLnw8.NcDeM0rmfXj079PHnXA20xW49NThn14eNcDbTEk7ED0ufbl24c_PXXA3axTAxXBNLn489OvPj5464G5qs.PbXA2zTNdU5Tny1wNtuWwNOZ8NcDbTFNMDlOfDXA3BVPny6.NdVjOfDXaxHY5nw3cOPPx21z2MxwVPuUr0sVuZ.eGuexmOCp9yldqymlyVrDNE8DW0xJOxA9Ku1ZTS5K1hmieBrcvafYlecXrmXnsZjgqfcpz463L2n2JXnF65l5XK7pqYs.OthtevCdzPn51uzUyMV564G5XK7pqYs.OtqayWunBeamB6CViPMVD7rfrrnXvXdmpuYpbcbXdmpz1wNz0zN2NVrtMVuPTU4Z8e2uemBqCV5eSZtyPPprfrrnqz466mqXHJV6XKpo7K4Jpc.F_DXZU5SvA3nw12UxrvsVP5u8ePd1ns34c8N.OHTqzwc7NN9OvHx34t.PDWuCSelyqqCaVeqtiuyrPjrgknpcqqgmlXgltYjgbXpcYqmlz4a6XHXKXKV6oK3F35qq5WJHM5GJWHnJHJa9zl7DdW6mZqKrWw2zHM1Fnw1wNzOuuU58NcDcbErcEry87DzmfDXbA25Mu5a5LXnrcppmpambcz1wNtsVsNOS1uU58NcDbTFNMDlK9U1lLTmfDXLNU1TBPXnw1wStTPSwVzLyTNuZ8NdblVa8kzbmfDXS49BNKu85NKxI4vA3ny68ufHj51z0zX4L1VsV2VZ7eOuBudimuVynPhragrwXecmlYkcXgbz5deXPzy4a5XK2GrIK8F56Zr8F68J3M9crlbDVkFeC89M1.C7blTVME9cE0uethtmOZqJe1ynPXBJPS5VVBNKuxHGvBLaxHA2vS4xVNLVnw11WM8s.Guqxnnnw11NUwT1r14TuZ66mqYJ615WJHM9dTVME9a9rlOetmma6pyle1ynPhrtpz4a4Ja3KZWI8.GuWZd2yVurPhrgbpcqnmlqgtcXjYwmsrz4a4G5LI64MZpXM.GtyRiCNeCqfPhrqapgnrXbcrYgjz8a6mqYJ617XKaoJpc.OuBthu1ymuCpyldhtevCdzPlx1wNz0zX4Z8NcDcrld01MS9eE7mfLXA20xJOxA9KvXhO5nw101srwS2uS1zU4LwN566a2V4JbXJa5qcF5WJHM9dtlkDefHvw5dOHjz488evHr46eePHh269_DPPi355NM8tdcEjlVbEk.fHvw5dOHjz4862ppooHGppanJa8.M-]]></Tracking>\n            </TrackingEvents>\n            <VideoClicks>\n              <ClickThrough><![CDATA[https://syndication.exads.rocks/click.php?d=H4sIAAAAAAAAAz1Pu27DMAz8lSxZBZJ6UWOWAkGHLv0BWVKaoLFTxE7RAvfxlY2gOA5HHHk8BglkkwdbowHnZfma9_awl5deS5sXU24jQOBI4kiTJpzzdBnbJiRvxFojHAxHB03OW04Mzy66PupJAccQcOgmBHAHIF5xYo6nIVRtWpWcH6iFUp1njVxVSx8kjHnKH21s02LaT66zud_K57xZEXbXy6lH_L223fkx3h73HbalFeLFMqcnS9JPr18EPPUV7p_pttdzOcjKZOuO7wd8M.HtFVp8jU24ZnauhCGm0jINNmcNQ2n0B7g2qHlHAQAA]]></ClickThrough>\n            </VideoClicks>\n            <MediaFiles>\n              <MediaFile delivery="progressive" type="video/mp4"><![CDATA[https://static.exads.rocks/library/32167/16aa53d680eccc10aa7b08b9648a95653b42025d.mp4]]></MediaFile>\n            </MediaFiles>\n            <Icons>\n              <Icon>\n                <IconClicks>\n                  <IconClickThrough>test.com</IconClickThrough>\n                </IconClicks>\n              </Icon>\n            </Icons>\n          </Linear>\n        </Creative>\n      </Creatives>\n    </InLine>\n  </Ad>\n</VAST>\n',
                  'ext': {
                    'btype': 1,
                    'asset_mime_type': [
                      'video/mp4'
                    ]
                  },
                  'nurl': 'http://rtb.exads.rocks/not.php?zid=5147489&data=TVRjd01qUXdPRGs0T1h3ek5EZzVOV1JqT1RjeE9XSmpaakF3TURrM05qUXpNelUwTURZek5EZzFZZy0tfDIwMjMtMTItMTIgMTQ6MjM6MDl8OTUuMjMzLjIxNi4xNzR8SVRBfDQxfGhhbmltZS5jb218MzIxNjd8NzIwNDU0fDkyMzA5OHw1MTQ3NDg5fDUwOHw2MjYwMzk1fDg5NDUzMTkxfDE2fDJ8MHwwfDI1OHwwfDB8MHxVU0R8VVNEfDF8MXwzOXx8MXxJVEF8fDE2fDR8MXwwfDY1NzhiMzFkOGFhODk0Ljk4OTYyNTI4OTcwNDAxNzA5fGYxMTdmYjZkOGU4ZDgwNDViMGU2Y2Q0NTE4NzFkODhjfG1hbmFnZW1lbnQuZXhhZHMucm9ja3N8MHwwfDB8MHwyMjE4YWJjN2ViY2E5N3wwfDQwfDB8V0lOTkVSfHwxfDAuNzJ8MHwwfDJ8MHwwfDB8MjUyMzExOXwtMXwwfDI1MjM5MjB8fHx8MHwwfDB8fHx8MHwwfDB8MXwwfDB8OHwxfDB8MjF8MHwyfHx8MHx8T0t8MDVjNmQwNzhjZDZjYmJmNDY1ZWJlZDY2ZWQyYzViZDM-',
                  'cid': '6260395',
                  'crid': '89453191',
                  'adomain': [
                    'test.com'
                  ],
                  'w': 0,
                  'h': 0,
                  'attr': []
                }
              ]
            }
          ],
          'cur': 'USD'
        }
      };

      const bidResponses = spec.interpretResponse(serverResponse, {
        data: JSON.stringify({
          'id': '2218abc7ebca97',
          'at': 1,
          'imp': [
            {
              'id': '270544423272657',
              'video': {
                'mimes': [
                  'video/mp4'
                ]
              },
              'protocols': [
                3,
                6
              ],
              'ext': {
                'video_cta': 0
              }
            }
          ],
          'site': {
            'id': '12345',
            'domain': 'management.exads.rocks',
            'cat': [
              'IAB25-3'
            ],
            'page': 'https://management.exads.rocks/prebidJS-client-RTB-InStreamVideo.html',
            'keywords': 'lifestyle, humour'
          },
          'device': {
            'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'ip': '95.233.216.174',
            'geo': {
              'country': 'ITA'
            },
            'language': 'en',
            'os': 'MacOS',
            'js': 0,
            'ext': {
              'remote_addr': '',
              'x_forwarded_for': '',
              'accept_language': 'en-GB'
            }
          },
          'user': {
            'id': ''
          },
          'ext': {
            'sub': 0
          }
        })
      });

      expect(bidResponses).to.be.an('array').that.is.not.empty;

      const bid = serverResponse.body.seatbid[0].bid[0];
      const bidResponse = bidResponses[0];

      expect(bidResponse.mediaType).to.equal(VIDEO);
    })
  });

  describe('onBidWon', function() {
    it('Should not create nurl request if bid is undefined', function() {
      const result = spec.onBidWon({});
      expect(result).to.be.undefined;
    })
  });

  describe('onTimeout', function () {
    it('should exists and be a function', () => {
      expect(spec.onTimeout).to.exist.and.to.be.a('function');
    });
  });
});
