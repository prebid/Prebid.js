import { expect } from 'chai';
import { spec, imps } from 'modules/exadsBidAdapter.js';
import { BANNER, NATIVE, VIDEO } from '../../../src/mediaTypes.js';

describe('exadsBidAdapterTest', function () {
  const bidder = 'exads';

  const partners = {
    ORTB_2_4: 'ortb_2_4'
  };

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
      partner: partners.ORTB_2_4,
      siteId: '12345',
      siteName: 'your-site.com',
      catIab: ['IAB25-3'],
      userIp: '0.0.0.0',
      userId: '',
      country: 'IRL',
      impressionId: '123456',
      keywords: 'lifestyle, humour',
      bidfloor: 0.00000011,
      bidfloorcur: 'EUR',
      bcat: ['IAB25', 'IAB7-39', 'IAB8-18', 'IAB8-5', 'IAB9-9'],
      badv: ['first.com', 'second.com'],
      mimes: ['image/jpg'],
      endpoint: 'test.com',
      dsa: {
        dsarequired: 3,
        pubrender: 0,
        datatopub: 2
      },
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
      partner: partners.ORTB_2_4,
      siteId: '12345',
      siteName: 'your-site.com',
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
      dsa: {
        pubrender: 0,
        datatopub: 2
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
      partner: partners.ORTB_2_4,
      siteId: '12345',
      siteName: 'your-site.com',
      catIab: ['IAB25-3'],
      userIp: '0.0.0.0',
      userId: '',
      country: 'IRL',
      impressionId: '123456',
      keywords: 'lifestyle, humour',
      bidfloor: 0.00000011,
      bidfloorcur: 'EUR',
      imp: {
        ext: {
          video_cta: 0
        }
      },
      dsa: {
        datatopub: 2
      },
      endpoint: 'test.com',
    }
  };

  describe('while validating bid request', function () {
    it('should check the validity of bidRequest with all mandatory params for banner ad-format', function () {
      expect(spec.isBidRequestValid(imageBanner)).to.equal(true);
    });

    it('should check the validity of a bidRequest with all mandatory params for native ad-format', function () {
      expect(spec.isBidRequestValid(native));
    });

    it('should check the validity of a bidRequest with all mandatory params for instream ad-format', function () {
      expect(spec.isBidRequestValid(instream)).to.equal(true);
    });

    it('should check the validity of a bidRequest with wrong partner', function () {
      expect(spec.isBidRequestValid({
        ...imageBanner,
        params: {
          ...imageBanner.params,
          partner: 'not_ortb_2_4'
        }
      })).to.eql(false);
    });

    it('should check the validity of a bidRequest without params', function () {
      expect(spec.isBidRequestValid({
        bidder: bidder,
        params: { }
      })).to.equal(false);
    });
  });

  describe('while building bid request for banner ad-format', function () {
    const bidRequests = [imageBanner];

    it('should make a bidRequest by HTTP method', function () {
      const requests = spec.buildRequests(bidRequests, {});
      requests.forEach(function(requestItem) {
        expect(requestItem.method).to.equal('POST');
      });
    });
  });

  describe('while building bid request for native ad-format', function () {
    const bidRequests = [native];

    it('should make a bidRequest by HTTP method', function () {
      const requests = spec.buildRequests(bidRequests, {});
      requests.forEach(function(requestItem) {
        expect(requestItem.method).to.equal('POST');
      });
    });
  });

  describe('while building bid request for instream ad-format', function () {
    const bidRequests = [instream];

    it('should make a bidRequest by HTTP method', function () {
      const requests = spec.buildRequests(bidRequests, {});
      requests.forEach(function(requestItem) {
        expect(requestItem.method).to.equal('POST');
      });
    });
  });

  describe('while interpreting bid response', function () {
    beforeEach(() => {
      imps.set('270544423272657', { adPartner: 'ortb_2_4', mediaType: null });
    });

    it('should test the banner interpretResponse', function () {
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
                  'adm': '<?xml version="1.0"?>\n<ad><imageAd><clickUrl><![CDATA[https://your-ad-network.com--]]></clickUrl><imgUrl><![CDATA[https://your-ad-network.com]]></imgUrl></imageAd></ad>\n',
                  'ext': {
                    'btype': 1,
                    'asset_mime_type': [
                      'image/jpeg',
                      'image/jpg'
                    ]
                  },
                  'nurl': 'http://your-ad-network.com/',
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
            'domain': 'your-ad-network.com',
            'cat': [
              'IAB25-3'
            ],
            'page': 'https://your-ad-network.com/prebidJS-client-RTB-banner.html',
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

    it('should test the native interpretResponse', function () {
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
                  'adm': '{"native":{"link":{"url":"https:\\/\\/your-ad-network.com"},"eventtrackers":[{"event":1,"method":1,"url":"https:\\/\\/your-ad-network.com"}],"assets":[{"id":1,"title":{"text":"Title"}},{"id":2,"data":{"value":"Description"}},{"id":3,"img":{"url":"https:\\/\\/your-ad-network.com\\/32167\\/f85ee87ea23.jpg"}}]}}',
                  'ext': {
                    'btype': 1,
                    'asset_mime_type': [
                      'image/jpeg',
                      'image/jpg'
                    ]
                  },
                  'nurl': 'http://your-ad-network.com',
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
            'domain': 'your-ad-network.com',
            'cat': [
              'IAB25-3'
            ],
            'page': 'https://your-ad-network.com/prebidJS-client-RTB-native.html'
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

      const bidResponse = bidResponses[0];

      expect(bidResponse.mediaType).to.equal(NATIVE);
    });

    it('should test the InStream Video interpretResponse', function () {
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
                  'adm': '<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="3.0">\n  <Ad id="6260395">\n    <InLine>\n      <AdSystem>your-ad-network.com</AdSystem>\n      <AdTitle/>\n      <Impression id="exotr"><![CDATA[https://your-ad-network.com]]></Impression>\n      <Error><![CDATA[https://your-ad-network.com]]></Error>\n      <Creatives>\n        <Creative sequence="1" id="89453191">\n          <Linear>\n            <Duration>00:00:20.32</Duration>\n            <TrackingEvents>\n              <Tracking id="prog_1" event="progress" offset="00:00:10.000"><![CDATA[your-ad-network.com]]></Tracking>\n            </TrackingEvents>\n            <VideoClicks>\n              <ClickThrough><![CDATA[https://your-ad-network.com]]></ClickThrough>\n            </VideoClicks>\n            <MediaFiles>\n              <MediaFile delivery="progressive" type="video/mp4"><![CDATA[https://your-ad-network.com/16aa53d680eccc1025d.mp4]]></MediaFile>\n            </MediaFiles>\n            <Icons>\n              <Icon>\n                <IconClicks>\n                  <IconClickThrough>test.com</IconClickThrough>\n                </IconClicks>\n              </Icon>\n            </Icons>\n          </Linear>\n        </Creative>\n      </Creatives>\n    </InLine>\n  </Ad>\n</VAST>\n',
                  'ext': {
                    'btype': 1,
                    'asset_mime_type': [
                      'video/mp4'
                    ]
                  },
                  'nurl': 'http://your-ad-network.com',
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
            'domain': 'your-ad-network.com',
            'cat': [
              'IAB25-3'
            ],
            'page': 'https://your-ad-network.com/prebidJS-client-RTB-InStreamVideo.html',
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

      const bidResponse = bidResponses[0];

      expect(bidResponse.mediaType).to.equal(VIDEO);
    });
  });

  describe('checking dsa information', function() {
    it('should add dsa information to the request via bidderRequest.params.dsa', function () {
      const bidRequests = [imageBanner];

      const requests = spec.buildRequests(bidRequests, {});

      requests.forEach(function(requestItem) {
        const payload = JSON.parse(requestItem.data);

        expect(payload.regs.ext.dsa).to.exist;
        expect(payload.regs.ext.dsa.dsarequired).to.equal(3);
        expect(payload.regs.ext.dsa.pubrender).to.equal(0);
        expect(payload.regs.ext.dsa.datatopub).to.equal(2);
      });
    });

    it('should test the dsa interpretResponse', function () {
      const dsaResponse = {
        'behalf': '...',
        'paid': '...',
        'transparency': [
          {
            'params': [
              2
            ]
          }
        ],
        'adrender': 0
      };

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
                  'adm': '<?xml version="1.0"?>\n<ad><imageAd><clickUrl><![CDATA[https://your-ad-network.com--]]></clickUrl><imgUrl><![CDATA[https://your-ad-network.com]]></imgUrl></imageAd></ad>\n',
                  'ext': {
                    'btype': 1,
                    'asset_mime_type': [
                      'image/jpeg',
                      'image/jpg'
                    ],
                    'dsa': dsaResponse
                  },
                  'nurl': 'http://your-ad-network.com/',
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
            'domain': 'your-ad-network.com',
            'cat': [
              'IAB25-3'
            ],
            'page': 'https://your-ad-network.com/prebidJS-client-RTB-banner.html',
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
          },
          'regs': {
            'ext': {
              'dsa': {
                'dsarequired': 3,
                'pubrender': 0,
                'datatopub': 2
              }
            }
          }
        })
      });

      expect(bidResponses).to.be.an('array').that.is.not.empty;
      const bidResponse = bidResponses[0];
      expect(bidResponse.meta).to.exist;
      expect(bidResponse.meta.dsa).to.exist;
      expect(bidResponse.meta.dsa).equal(dsaResponse);
    });
  });

  describe('on getting the win event', function() {
    it('should not create nurl request if bid is undefined', function() {
      const result = spec.onBidWon({});
      expect(result).to.be.undefined;
    });
  });

  describe('checking timeut', function () {
    it('should exists and be a function', () => {
      expect(spec.onTimeout).to.exist.and.to.be.a('function');
    });
  });
});
