import { config } from 'src/config.js';
import { expect } from 'chai';
import { spec } from 'modules/yieldlabBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const DEFAULT_REQUEST = () => ({
  bidder: 'yieldlab',
  params: {
    adslotId: '1111',
    supplyId: '2222',
    targeting: {
      key1: 'value1',
      key2: 'value2',
      notDoubleEncoded: 'value3,value4',
    },
    customParams: {
      extraParam: true,
      foo: 'bar',
    },
    extId: 'abc',
    iabContent: {
      id: 'foo_id',
      episode: '99',
      title: 'foo_title,bar_title',
      series: 'foo_series',
      season: 's1',
      artist: 'foo bar',
      genre: 'baz',
      isrc: 'CC-XXX-YY-NNNNN',
      url: 'http://foo_url.de',
      cat: ['cat1', 'cat2,ppp', 'cat3|||//'],
      context: '7',
      keywords: ['k1,', 'k2..'],
      live: '0',
    },
  },
  bidderRequestId: '143346cf0f1731',
  auctionId: '2e41f65424c87c',
  adUnitCode: 'adunit-code',
  bidId: '2d925f27f5079f',
  sizes: [728, 90],
  userIdAsEids: [{
    source: 'netid.de',
    uids: [{
      id: 'fH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg',
      atype: 1,
    }],
  }, {
    source: 'digitrust.de',
    uids: [{
      id: 'd8aa10fa-d86c-451d-aad8-5f16162a9e64',
      atype: 2,
    }],
  }],
  schain: {
    ver: '1.0',
    complete: 1,
    nodes: [
      {
        asi: 'indirectseller.com',
        sid: '1',
        hp: 1,
      },
      {
        asi: 'indirectseller2.com',
        name: 'indirectseller2 name with comma , and bang !',
        sid: '2',
        hp: 1,
      },
    ],
  },
});

const VIDEO_REQUEST = () => Object.assign(DEFAULT_REQUEST(), {
  mediaTypes: {
    video: {
      playerSize: [[640, 480]],
      context: 'instream',
    },
  },
});

const NATIVE_REQUEST = () => Object.assign(DEFAULT_REQUEST(), {
  mediaTypes: {
    native: {},
  },
});

const IAB_REQUEST = () => Object.assign(DEFAULT_REQUEST(), {
  params: {
    adslotId: '1111',
    supplyId: '2222',
    iabContent: {
      id: 'foo',
      episode: '99',
      title: 'bar',
      series: 'baz',
      season: 's01',
      artist: 'foobar',
      genre: 'barbaz',
      isrc: 'CC-XXX-YY-NNNNN',
      url: 'https://foo.test',
      cat: ['cat1', 'cat2,ppp', 'cat3|||//'],
      context: '2',
      keywords: ['k1', 'k2', 'k3', 'k4'],
      live: '0',
      album: 'foo',
      cattax: '3',
      prodq: 2,
      contentrating: 'foo',
      userrating: 'bar',
      qagmediarating: 2,
      sourcerelationship: 1,
      len: 12345,
      language: 'en',
      embeddable: 0,
      producer: {
        id: 'foo',
        name: 'bar',
        cattax: 532,
        cat: [1, 'foo', true],
        domain: 'producer.test',
      },
      data: {
        id: 'foo',
        name: 'bar',
        segment: [{
          name: 'foo',
          value: 'bar',
          ext: {
            foo: {
              bar: 'bar',
            },
          },
        }, {
          name: 'foo2',
          value: 'bar2',
          ext: {
            test: {
              nums: {
                int: 123,
                float: 123.123,
              },
              bool: true,
              string: 'foo2',
            },
          },
        }],
      },
      network: {
        id: 'foo',
        name: 'bar',
        domain: 'network.test',
      },
      channel: {
        id: 'bar',
        name: 'foo',
        domain: 'channel.test',
      },
    },
  },
});

const RESPONSE = {
  advertiser: 'yieldlab',
  curl: 'https://www.yieldlab.de',
  format: 0,
  id: 1111,
  price: 1,
  pid: 2222,
  adsize: '728x90',
  adtype: 'BANNER',
};

const NATIVE_RESPONSE = Object.assign({}, RESPONSE, {
  adtype: 'NATIVE',
  native: {
    link: {
      url: 'https://www.yieldlab.de',
    },
    assets: [
      {
        id: 1,
        title: {
          text: 'This is a great headline',
        },
      },
      {
        id: 2,
        img: {
          url: 'https://localhost:8080/yl-logo100x100.jpg',
          w: 100,
          h: 100,
          type: 3,
        },
      },
      {
        id: 3,
        data: {
          value: 'Native body value',
        },
      },
      {
        id: 4,
        img: {
          url: 'https://localhost:8080/assets/favicon/favicon-16x16.png',
          w: 16,
          h: 16,
          type: 1,
        },
      },
    ],
    imptrackers: [
      'http://localhost:8080/ve?d=ODE9ZSY2MTI1MjAzNjMzMzYxPXN0JjA0NWUwZDk0NTY5Yi05M2FiLWUwZTQtOWFjNy1hYWY0MzFiZj1kaXQmMj12',
      'http://localhost:8080/md/1111/9efa4e76-2030-4f04-bb9f-322541f8d611?mdata=false&pvid=false&ids=x:1',
      'http://localhost:8080/imp?s=13216&d=2171514&a=12548955&ts=1633363025216&tid=fb134faa-7ca9-4e0e-ba39-b96549d0e540&l=0',
    ],
  },
});

const VIDEO_RESPONSE = Object.assign({}, RESPONSE, {
  adtype: 'VIDEO',
});

const PVID_RESPONSE = Object.assign({}, VIDEO_RESPONSE, {
  pvid: '43513f11-55a0-4a83-94e5-0ebc08f54a2c',
});

const DIGITAL_SERVICES_ACT_RESPONSE = Object.assign({}, RESPONSE, {
  dsa: {
    behalf: 'some-behalf',
    paid: 'some-paid',
    transparency: [{
      domain: 'test.com',
      dsaparams: [1, 2, 3]
    }],
    adrender: 1
  }
});

const DIGITAL_SERVICES_ACT_CONFIG = {
  ortb2: {
    regs: {
      ext: {
        dsa: {
          dsarequired: '1',
          pubrender: '2',
          datatopub: '3',
          transparency: [{
            domain: 'test.com',
            dsaparams: [1, 2, 3]
          }]
        },
      }
    },
  }
}

const REQPARAMS = {
  json: true,
  ts: 1234567890,
};

const REQPARAMS_GDPR = Object.assign({}, REQPARAMS, {
  gdpr: true,
  consent: 'BN5lERiOMYEdiAKAWXEND1AAAAE6DABACMA',
});

const REQPARAMS_IAB_CONTENT = Object.assign({}, REQPARAMS, {
  iab_content: 'id%3Afoo_id%2Cepisode%3A99%2Ctitle%3Afoo_title%252Cbar_title%2Cseries%3Afoo_series%2Cseason%3As1%2Cartist%3Afoo%2520bar%2Cgenre%3Abaz%2Cisrc%3ACC-XXX-YY-NNNNN%2Curl%3Ahttp%253A%252F%252Ffoo_url.de%2Ccat%3Acat1%7Ccat2%252Cppp%7Ccat3%257C%257C%257C%252F%252F%2Ccontext%3A7%2Ckeywords%3Ak1%252C%7Ck2..%2Clive%3A0',
});

describe('yieldlabBidAdapter', () => {
  describe('instantiation from spec', () => {
    it('is working properly', () => {
      const yieldlabBidAdapter = newBidder(spec);
      expect(yieldlabBidAdapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    it('should return true when all required parameters are found', () => {
      const request = {
        params: {
          adslotId: '1111',
          supplyId: '2222',
        },
      };
      expect(spec.isBidRequestValid(request)).to.equal(true);
    });

    it('should return false when required parameters are missing', () => {
      expect(spec.isBidRequestValid({})).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    const bidRequests = [DEFAULT_REQUEST()];

    describe('default functionality', () => {
      let request;

      before(() => {
        request = spec.buildRequests(bidRequests);
      });

      it('sends bid request to ENDPOINT via GET', () => {
        expect(request.method).to.equal('GET');
      });

      it('returns a list of valid requests', () => {
        expect(request.validBidRequests).to.eql(bidRequests);
      });

      it('passes single-encoded targeting to bid request', () => {
        expect(request.url).to.include('t=key1%3Dvalue1%26key2%3Dvalue2%26notDoubleEncoded%3Dvalue3%2Cvalue4');
      });

      it('passes userids to bid request', () => {
        expect(request.url).to.include('ids=netid.de%3AfH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg%2Cdigitrust.de%3Ad8aa10fa-d86c-451d-aad8-5f16162a9e64');
      });

      it('passes atype to bid request', () => {
        expect(request.url).to.include('atypes=netid.de%3A1%2Cdigitrust.de%3A2');
      });

      it('passes extra params to bid request', () => {
        expect(request.url).to.include('extraParam=true&foo=bar');
      });

      it('passes unencoded schain string to bid request', () => {
        expect(request.url).to.include('schain=1.0,1!indirectseller.com,1,1,,,,!indirectseller2.com,2,1,,indirectseller2%20name%20with%20comma%20%2C%20and%20bang%20%21,,');
      });

      it('passes iab_content string to bid request', () => {
        expect(request.url).to.include('iab_content=id%3Afoo_id%2Cepisode%3A99%2Ctitle%3Afoo_title%252Cbar_title%2Cseries%3Afoo_series%2Cseason%3As1%2Cartist%3Afoo%2520bar%2Cgenre%3Abaz%2Cisrc%3ACC-XXX-YY-NNNNN%2Curl%3Ahttp%253A%252F%252Ffoo_url.de%2Ccat%3Acat1%7Ccat2%252Cppp%7Ccat3%257C%257C%257C%252F%252F%2Ccontext%3A7%2Ckeywords%3Ak1%252C%7Ck2..%2Clive%3A0');
      });

      it('passes correct size to bid request', () => {
        expect(request.url).to.include('728x90');
      });

      it('passes external id to bid request', () => {
        expect(request.url).to.include('id=abc');
      });
    });

    describe('iab_content handling', () => {
      const siteConfig = {
        ortb2: {
          site: {
            content: {
              id: 'id_from_config',
            },
          },
        },
      };

      beforeEach(() => {
        config.setConfig(siteConfig);
      });

      afterEach(() => {
        config.resetConfig();
      });

      it('generates iab_content string from bidder params', () => {
        const request = spec.buildRequests(bidRequests);
        expect(request.url).to.include('iab_content=id%3Afoo_id%2Cepisode%3A99%2Ctitle%3Afoo_title%252Cbar_title%2Cseries%3Afoo_series%2Cseason%3As1%2Cartist%3Afoo%2520bar%2Cgenre%3Abaz%2Cisrc%3ACC-XXX-YY-NNNNN%2Curl%3Ahttp%253A%252F%252Ffoo_url.de%2Ccat%3Acat1%7Ccat2%252Cppp%7Ccat3%257C%257C%257C%252F%252F%2Ccontext%3A7%2Ckeywords%3Ak1%252C%7Ck2..%2Clive%3A0');
      });

      it('generates iab_content string from first party data if not provided in bidder params', () => {
        const requestWithoutIabContent = DEFAULT_REQUEST();
        delete requestWithoutIabContent.params.iabContent;

        const request = spec.buildRequests([{...requestWithoutIabContent, ...siteConfig}]);
        expect(request.url).to.include('iab_content=id%3Aid_from_config');
      });

      it('flattens the iabContent, encodes the values, joins the keywords into one value, and than encodes the iab_content request param ', () => {
        const expectedIabContentValue = encodeURIComponent(
          'id:foo,' +
          'episode:99,' +
          'title:bar,' +
          'series:baz,' +
          'season:s01,' +
          'artist:foobar,' +
          'genre:barbaz,' +
          'isrc:CC-XXX-YY-NNNNN,' +
          'url:https%3A%2F%2Ffoo.test,' +
          'cat:cat1|cat2%2Cppp|cat3%7C%7C%7C%2F%2F,' +
          'context:2,' +
          'keywords:k1|k2|k3|k4,' +
          'live:0,' +
          'album:foo,' +
          'cattax:3,' +
          'prodq:2,' +
          'contentrating:foo,' +
          'userrating:bar,' +
          'qagmediarating:2,' +
          'sourcerelationship:1,' +
          'len:12345,' +
          'language:en,' +
          'embeddable:0,' +
          'producer.id:foo,' +
          'producer.name:bar,' +
          'producer.cattax:532,' +
          'cat:1|foo|true,' +
          'producer.domain:producer.test,' +
          'data.id:foo,data.name:bar,' +
          'data.segment.0.name:foo,' +
          'data.segment.0.value:bar,' +
          'data.segment.0.ext.foo.bar:bar,' +
          'data.segment.1.name:foo2,' +
          'data.segment.1.value:bar2,' +
          'data.segment.1.ext.test.nums.int:123,' +
          'data.segment.1.ext.test.nums.float:123.123,' +
          'data.segment.1.ext.test.bool:true,' +
          'data.segment.1.ext.test.string:foo2,' +
          'network.id:foo,network.name:bar,' +
          'network.domain:network.test,' +
          'channel.id:bar,' +
          'channel.name:foo,' +
          'channel.domain:channel.test'
        );
        const request = spec.buildRequests([IAB_REQUEST()], REQPARAMS);
        expect(request.url).to.include('iab_content=' + expectedIabContentValue);
      });
    });

    it('passes unencoded schain string to bid request when complete == 0', () => {
      const schainRequest = DEFAULT_REQUEST();
      schainRequest.schain.complete = 0; //
      const request = spec.buildRequests([schainRequest]);
      expect(request.url).to.include('schain=1.0,0!indirectseller.com,1,1,,,,!indirectseller2.com,2,1,,indirectseller2%20name%20with%20comma%20%2C%20and%20bang%20%21,,');
    });

    it('passes encoded referer to bid request', () => {
      const refererRequest = spec.buildRequests(bidRequests, {
        refererInfo: {
          canonicalUrl: undefined,
          numIframes: 0,
          reachedTop: true,
          page: 'https://www.yieldlab.de/test?with=querystring',
          stack: ['https://www.yieldlab.de/test?with=querystring'],
        },
      });

      expect(refererRequest.url).to.include('pubref=https%3A%2F%2Fwww.yieldlab.de%2Ftest%3Fwith%3Dquerystring');
    });

    it('passes gdpr flag and consent if present', () => {
      const gdprRequest = spec.buildRequests(bidRequests, {
        gdprConsent: {
          consentString: 'BN5lERiOMYEdiAKAWXEND1AAAAE6DABACMA',
          gdprApplies: true,
        },
      });

      expect(gdprRequest.url).to.include('consent=BN5lERiOMYEdiAKAWXEND1AAAAE6DABACMA');
      expect(gdprRequest.url).to.include('gdpr=true');
    });

    describe('sizes handling', () => {
      it('passes correct size to bid request for mediaType banner', () => {
        const bannerRequest = DEFAULT_REQUEST();
        bannerRequest.mediaTypes = {
          banner: {
            sizes: [[123, 456]],
          },
        };

        // when mediaTypes is present it has precedence over the sizes field (728, 90)
        let request = spec.buildRequests([bannerRequest], REQPARAMS);
        expect(request.url).to.include('sizes');
        expect(request.url).to.include('123x456');

        bannerRequest.mediaTypes.banner.sizes = [123, 456];
        request = spec.buildRequests([bannerRequest], REQPARAMS);
        expect(request.url).to.include('123x456');

        bannerRequest.mediaTypes.banner.sizes = [[123, 456], [320, 240]];
        request = spec.buildRequests([bannerRequest], REQPARAMS);
        expect(request.url).to.include('123x456');
        expect(request.url).to.include('320x240');
      });

      it('passes correct sizes to bid request when mediaType is not present', () => {
        // information is taken from the top level sizes field
        const sizesRequest = DEFAULT_REQUEST();

        let request = spec.buildRequests([sizesRequest], REQPARAMS);
        expect(request.url).to.include('sizes');
        expect(request.url).to.include('728x90');

        sizesRequest.sizes = [[728, 90]];
        request = spec.buildRequests([sizesRequest], REQPARAMS);
        expect(request.url).to.include('728x90');

        sizesRequest.sizes = [[728, 90], [320, 240]];
        request = spec.buildRequests([sizesRequest], REQPARAMS);
        expect(request.url).to.include('728x90');
      });

      it('does not pass the sizes parameter for mediaType video', () => {
        const videoRequest = VIDEO_REQUEST();

        let request = spec.buildRequests([videoRequest], REQPARAMS);
        expect(request.url).to.not.include('sizes');
      });

      it('does not pass the sizes parameter for mediaType native', () => {
        const nativeRequest = NATIVE_REQUEST();

        let request = spec.buildRequests([nativeRequest], REQPARAMS);
        expect(request.url).to.not.include('sizes');
      });
    });

    describe('Digital Services Act handling', () => {
      beforeEach(() => {
        config.setConfig(DIGITAL_SERVICES_ACT_CONFIG);
      });

      afterEach(() => {
        config.resetConfig();
      });

      it('does pass dsarequired parameter', () => {
        let request = spec.buildRequests([DEFAULT_REQUEST()], { ...REQPARAMS, ...DIGITAL_SERVICES_ACT_CONFIG });
        expect(request.url).to.include('dsarequired=1');
      });

      it('does pass dsapubrender parameter', () => {
        let request = spec.buildRequests([DEFAULT_REQUEST()], { ...REQPARAMS, ...DIGITAL_SERVICES_ACT_CONFIG });
        expect(request.url).to.include('dsapubrender=2');
      });

      it('does pass dsadatatopub parameter', () => {
        let request = spec.buildRequests([DEFAULT_REQUEST()], { ...REQPARAMS, ...DIGITAL_SERVICES_ACT_CONFIG });
        expect(request.url).to.include('dsadatatopub=3');
      });

      it('does pass dsadomain parameter', () => {
        let request = spec.buildRequests([DEFAULT_REQUEST()], { ...REQPARAMS, ...DIGITAL_SERVICES_ACT_CONFIG });
        expect(request.url).to.include('dsadomain=test.com');
      });

      it('does pass encoded dsaparams parameter', () => {
        let request = spec.buildRequests([DEFAULT_REQUEST()], { ...REQPARAMS, ...DIGITAL_SERVICES_ACT_CONFIG });
        expect(request.url).to.include('dsaparams=1%2C2%2C3');
      });

      it('does pass multiple transparencies in dsatransparency param', () => {
        const DSA_CONFIG_WITH_MULTIPLE_TRANSPARENCIES = {
          ortb2: {
            regs: {
              ext: {
                dsa: {
                  dsarequired: '1',
                  pubrender: '2',
                  datatopub: '3',
                  transparency: [
                    {
                      domain: 'test.com',
                      dsaparams: [1, 2, 3]
                    },
                    {
                      domain: 'example.com',
                      dsaparams: [4, 5, 6]
                    }
                  ]
                }
              }
            }
          }
        };

        config.setConfig(DSA_CONFIG_WITH_MULTIPLE_TRANSPARENCIES);

        let request = spec.buildRequests([DEFAULT_REQUEST()], { ...REQPARAMS, ...DSA_CONFIG_WITH_MULTIPLE_TRANSPARENCIES });

        expect(request.url).to.include('dsatransparency=test.com~1_2_3~~example.com~4_5_6');
        expect(request.url).to.not.include('dsadomain');
        expect(request.url).to.not.include('dsaparams');
      });
    });

    describe('google topics handling', () => {
      afterEach(() => {
        config.resetConfig();
      });

      it('does pass segtax, segclass, segments for google topics data', () => {
        const GOOGLE_TOPICS_DATA = {
          ortb2: {
            user: {
              data: [
                {
                  ext: {
                    segtax: 600,
                    segclass: 'v1',
                  },
                  segment: [
                    {id: '717'}, {id: '808'},
                  ]
                }
              ]
            },
          },
        }
        config.setConfig(GOOGLE_TOPICS_DATA);
        const request = spec.buildRequests([DEFAULT_REQUEST()], { ...REQPARAMS, ...GOOGLE_TOPICS_DATA });
        expect(request.url).to.include('segtax=600&segclass=v1&segments=717%2C808');
      });

      it('does not pass topics params for invalid topics data', () => {
        const INVALID_TOPICS_DATA = {
          ortb2: {
            user: {
              data: [
                {
                  segment: []
                },
                {
                  segment: [{id: ''}]
                },
                {
                  segment: [{id: null}]
                },
                {
                  segment: [{id: 'dummy'}, {id: '123'}]
                },
                {
                  ext: {
                    segtax: 600,
                    segclass: 'v1',
                  },
                  segment: [
                    {
                      name: 'dummy'
                    }
                  ]
                },
              ]
            }
          }
        };

        config.setConfig(INVALID_TOPICS_DATA);
        let request = spec.buildRequests([DEFAULT_REQUEST()], { ...REQPARAMS, ...INVALID_TOPICS_DATA });

        expect(request.url).to.not.include('segtax');
        expect(request.url).to.not.include('segclass');
        expect(request.url).to.not.include('segments');
      });
    });
  });

  describe('interpretResponse', () => {
    let bidRequest;

    before(() => {
      bidRequest = DEFAULT_REQUEST();
    });

    it('handles nobid responses', () => {
      expect(spec.interpretResponse({body: {}}, {validBidRequests: []}).length).to.equal(0);
      expect(spec.interpretResponse({body: []}, {validBidRequests: []}).length).to.equal(0);
    });

    it('should get correct bid response', () => {
      const result = spec.interpretResponse({body: [RESPONSE]}, {validBidRequests: [bidRequest], queryParams: REQPARAMS});

      expect(result[0].requestId).to.equal('2d925f27f5079f');
      expect(result[0].cpm).to.equal(0.01);
      expect(result[0].width).to.equal(728);
      expect(result[0].height).to.equal(90);
      expect(result[0].creativeId).to.equal('1111');
      expect(result[0].dealId).to.equal(2222);
      expect(result[0].currency).to.equal('EUR');
      expect(result[0].netRevenue).to.equal(false);
      expect(result[0].ttl).to.equal(300);
      expect(result[0].referrer).to.equal('');
      expect(result[0].meta.advertiserDomains).to.equal('yieldlab');
      expect(result[0].ad).to.include('<script src="https://ad.yieldlab.net/d/1111/2222/?ts=');
      expect(result[0].ad).to.include('&id=abc');
    });

    it('should append gdpr parameters to adtag', () => {
      const result = spec.interpretResponse({body: [RESPONSE]}, {validBidRequests: [bidRequest], queryParams: REQPARAMS_GDPR});

      expect(result[0].ad).to.include('&gdpr=true');
      expect(result[0].ad).to.include('&consent=BN5lERiOMYEdiAKAWXEND1AAAAE6DABACMA');
    });

    it('should append iab_content to adtag', () => {
      const result = spec.interpretResponse({body: [RESPONSE]}, {validBidRequests: [bidRequest], queryParams: REQPARAMS_IAB_CONTENT});
      expect(result[0].ad).to.include('&iab_content=id%3Afoo_id%2Cepisode%3A99%2Ctitle%3Afoo_title%252Cbar_title%2Cseries%3Afoo_series%2Cseason%3As1%2Cartist%3Afoo%2520bar%2Cgenre%3Abaz%2Cisrc%3ACC-XXX-YY-NNNNN%2Curl%3Ahttp%253A%252F%252Ffoo_url.de%2Ccat%3Acat1%7Ccat2%252Cppp%7Ccat3%257C%257C%257C%252F%252F%2Ccontext%3A7%2Ckeywords%3Ak1%252C%7Ck2..%2Clive%3A0');
    });

    it('should get correct bid response when passing more than one size', () => {
      const REQUEST2 = Object.assign(DEFAULT_REQUEST(), {
        sizes: [
          [800, 250],
          [728, 90],
          [970, 90],
        ],
      });
      const result = spec.interpretResponse({body: [RESPONSE]}, {validBidRequests: [REQUEST2], queryParams: REQPARAMS});

      expect(result[0].requestId).to.equal('2d925f27f5079f');
      expect(result[0].cpm).to.equal(0.01);
      expect(result[0].width).to.equal(728);
      expect(result[0].height).to.equal(90);
      expect(result[0].creativeId).to.equal('1111');
      expect(result[0].dealId).to.equal(2222);
      expect(result[0].currency).to.equal('EUR');
      expect(result[0].netRevenue).to.equal(false);
      expect(result[0].ttl).to.equal(300);
      expect(result[0].referrer).to.equal('');
      expect(result[0].meta.advertiserDomains).to.equal('yieldlab');
      expect(result[0].ad).to.include('<script src="https://ad.yieldlab.net/d/1111/2222/?ts=');
      expect(result[0].ad).to.include('&id=abc');
    });

    it('should add vastUrl when type is video', () => {
      const result = spec.interpretResponse({body: [VIDEO_RESPONSE]}, {validBidRequests: [VIDEO_REQUEST()], queryParams: REQPARAMS});

      expect(result[0].requestId).to.equal('2d925f27f5079f');
      expect(result[0].cpm).to.equal(0.01);
      expect(result[0].mediaType).to.equal('video');
      expect(result[0].vastUrl).to.include('https://ad.yieldlab.net/d/1111/2222/?ts=');
      expect(result[0].vastUrl).to.include('&id=abc');
    });

    it('should add adUrl and native assets when type is Native', () => {
      const result = spec.interpretResponse({body: [NATIVE_RESPONSE]}, {validBidRequests: [NATIVE_REQUEST()], queryParams: REQPARAMS});
      expect(result[0].requestId).to.equal('2d925f27f5079f');
      expect(result[0].cpm).to.equal(0.01);
      expect(result[0].mediaType).to.equal('native');
      expect(result[0].adUrl).to.include('https://ad.yieldlab.net/d/1111/2222/?ts=');
      expect(result[0].native.title).to.equal('This is a great headline');
      expect(result[0].native.body).to.equal('Native body value');
      expect(result[0].native.image.url).to.equal('https://localhost:8080/yl-logo100x100.jpg');
      expect(result[0].native.image.width).to.equal(100);
      expect(result[0].native.image.height).to.equal(100);
      expect(result[0].native.icon.url).to.equal('https://localhost:8080/assets/favicon/favicon-16x16.png');
      expect(result[0].native.icon.width).to.equal(16);
      expect(result[0].native.icon.height).to.equal(16);
      expect(result[0].native.clickUrl).to.equal('https://www.yieldlab.de');
      expect(result[0].native.impressionTrackers.length).to.equal(3);
      expect(result[0].native.assets.length).to.equal(4);
      const titleAsset = result[0].native.assets.find(asset => 'title' in asset);
      const imageAsset = result[0].native.assets.find((asset) => {
        return asset?.img?.type === 3;
      });
      const iconAsset = result[0].native.assets.find((asset) => {
        return asset?.img?.type === 1;
      });
      const bodyAsset = result[0].native.assets.find(asset => 'data' in asset);
      expect(titleAsset).to.exist.and.to.have.nested.property('id', 1)
      expect(imageAsset).to.exist.and.to.have.nested.property('id', 2)
      expect(bodyAsset).to.exist.and.to.have.nested.property('id', 3)
      expect(iconAsset).to.exist.and.to.have.nested.property('id', 4)
    });

    it('should add adUrl and default native assets when type is Native', () => {
      const NATIVE_RESPONSE_2 = Object.assign({}, NATIVE_RESPONSE, {
        native: {
          link: {
            url: 'https://www.yieldlab.de',
          },
          assets: [],
          imptrackers: [],
        },
      });
      const result = spec.interpretResponse({body: [NATIVE_RESPONSE_2]}, {validBidRequests: [NATIVE_REQUEST()], queryParams: REQPARAMS});

      expect(result[0].requestId).to.equal('2d925f27f5079f');
      expect(result[0].cpm).to.equal(0.01);
      expect(result[0].mediaType).to.equal('native');
      expect(result[0].adUrl).to.include('https://ad.yieldlab.net/d/1111/2222/?ts=');
      expect(result[0].native.title).to.equal('');
      expect(result[0].native.body).to.equal('');
      expect(result[0].native.image.url).to.equal('');
      expect(result[0].native.image.width).to.equal(0);
      expect(result[0].native.image.height).to.equal(0);
    });

    it('should not add icon if not present in the native response', () => {
      const NATIVE_RESPONSE_WITHOUT_ICON = Object.assign({}, NATIVE_RESPONSE, {
        native: {
          link: {
            url: 'https://www.yieldlab.de',
          },
          assets: [
            {
              id: 1,
              title: {
                text: 'This is a great headline',
              }
            }
          ],
          imptrackers: [],
        },
      });
      const result = spec.interpretResponse({body: [NATIVE_RESPONSE_WITHOUT_ICON]}, {validBidRequests: [NATIVE_REQUEST()], queryParams: REQPARAMS});
      expect(result[0].native.hasOwnProperty('icon')).to.be.false;
      expect(result[0].native.title).to.equal('This is a great headline');
    });

    it('should append gdpr parameters to vastUrl', () => {
      const result = spec.interpretResponse({body: [VIDEO_RESPONSE]}, {validBidRequests: [VIDEO_REQUEST()], queryParams: REQPARAMS_GDPR});

      expect(result[0].vastUrl).to.include('&gdpr=true');
      expect(result[0].vastUrl).to.include('&consent=BN5lERiOMYEdiAKAWXEND1AAAAE6DABACMA');
    });

    it('should add renderer if outstream context', () => {
      const OUTSTREAM_REQUEST = Object.assign(DEFAULT_REQUEST(), {
        mediaTypes: {
          video: {
            playerSize: [[640, 480]],
            context: 'outstream',
          },
        },
      });
      const result = spec.interpretResponse({body: [VIDEO_RESPONSE]}, {validBidRequests: [OUTSTREAM_REQUEST], queryParams: REQPARAMS});

      expect(result[0].renderer.id).to.equal('2d925f27f5079f');
      expect(result[0].renderer.url).to.equal('https://ad.adition.com/dynamic.ad?a=o193092&ma_loadEvent=ma-start-event');
      expect(result[0].width).to.equal(640);
      expect(result[0].height).to.equal(480);
    });

    it('should add pvid to adtag urls when present', () => {
      const result = spec.interpretResponse({body: [PVID_RESPONSE]}, {validBidRequests: [VIDEO_REQUEST()], queryParams: REQPARAMS});

      expect(result[0].ad).to.include('&pvid=43513f11-55a0-4a83-94e5-0ebc08f54a2c');
      expect(result[0].vastUrl).to.include('&pvid=43513f11-55a0-4a83-94e5-0ebc08f54a2c');
    });

    it('should append iab_content to vastUrl', () => {
      const result = spec.interpretResponse({body: [VIDEO_RESPONSE]}, {validBidRequests: [VIDEO_REQUEST()], queryParams: REQPARAMS_IAB_CONTENT});
      expect(result[0].vastUrl).to.include('&iab_content=id%3Afoo_id%2Cepisode%3A99%2Ctitle%3Afoo_title%252Cbar_title%2Cseries%3Afoo_series%2Cseason%3As1%2Cartist%3Afoo%2520bar%2Cgenre%3Abaz%2Cisrc%3ACC-XXX-YY-NNNNN%2Curl%3Ahttp%253A%252F%252Ffoo_url.de%2Ccat%3Acat1%7Ccat2%252Cppp%7Ccat3%257C%257C%257C%252F%252F%2Ccontext%3A7%2Ckeywords%3Ak1%252C%7Ck2..%2Clive%3A0');
    });

    it('should get digital services act object in matched bid response', () => {
      const result = spec.interpretResponse({body: [DIGITAL_SERVICES_ACT_RESPONSE]}, {validBidRequests: [{...DEFAULT_REQUEST(), ...DIGITAL_SERVICES_ACT_CONFIG}], queryParams: REQPARAMS});

      expect(result[0].requestId).to.equal('2d925f27f5079f');
      expect(result[0].meta.dsa.behalf).to.equal('some-behalf');
      expect(result[0].meta.dsa.paid).to.equal('some-paid');
      expect(result[0].meta.dsa.transparency[0].domain).to.equal('test.com');
      expect(result[0].meta.dsa.transparency[0].dsaparams).to.deep.equal([1, 2, 3]);
      expect(result[0].meta.dsa.adrender).to.equal(1);
    });
  });

  describe('getUserSyncs', () => {
    const syncOptions = {
      iframeEnabled: true,
      pixelEnabled: false,
    };
    const expectedUrlSnippets = ['https://ad.yieldlab.net/d/6846326/766/2x2?', 'ts=', 'type=h'];

    it('should return user sync as expected', () => {
      const bidRequest = {
        gdprConsent: {
          consentString: 'BN5lERiOMYEdiAKAWXEND1AAAAE6DABACMA',
          gdprApplies: true,
        },
        uspConsent: '1YYY',
      };
      const sync = spec.getUserSyncs(syncOptions, [], bidRequest.gdprConsent, bidRequest.uspConsent);
      expect(expectedUrlSnippets.every(urlSnippet => sync[0].url.includes(urlSnippet)));
      expect(sync[0].url).to.have.string('gdpr=' + Number(bidRequest.gdprConsent.gdprApplies));
      expect(sync[0].url).to.have.string('gdpr_consent=' + bidRequest.gdprConsent.consentString);
      // USP consent should be ignored
      expect(sync[0].url).not.have.string('usp_consent=');
      expect(sync[0].type).to.have.string('iframe');
    });

    it('should return user sync even without gdprApplies in gdprConsent', () => {
      const gdprConsent = {
        consentString: 'BN5lERiOMYEdiAKAWXEND1AAAAE6DABACMA',
      };
      const sync = spec.getUserSyncs(syncOptions, [], gdprConsent, undefined);
      expect(expectedUrlSnippets.every(urlSnippet => sync[0].url.includes(urlSnippet)));
      expect(sync[0].url).to.have.string('gdpr_consent=' + gdprConsent.consentString);
      expect(sync[0].url).not.have.string('gdpr=');
      expect(sync[0].type).to.have.string('iframe');
    });
  });

  describe('getBidFloor', function () {
    let bidRequest, bidRequest2, currency, floor;
    const getFloor = () => {
      return {
        currency: currency,
        floor: floor,
      };
    };

    it('should add valid bid floor in the format floor={adslotId}:{floorPriceInCents}[, ...]', () => {
      bidRequest = Object.assign(DEFAULT_REQUEST(), {
        getFloor: () => {
          return {
            currency: 'EUR',
            floor: 1.33,
          };
        }});
      bidRequest2 = Object.assign(DEFAULT_REQUEST(), {
        params: {
          adslotId: 2222,
        },
        getFloor: () => {
          return {
            currency: 'EUR',
            floor: 2.99,
          };
        },
      });
      const result = spec.buildRequests([bidRequest, bidRequest2], REQPARAMS);
      expect(result).to.have.nested.property('queryParams.floor', '1111:133,2222:299');
    });

    it('should round the floor price up', () => {
      currency = 'EUR';
      floor = 0.745;
      bidRequest = Object.assign(DEFAULT_REQUEST(), {getFloor});
      const result = spec.buildRequests([bidRequest], REQPARAMS);
      expect(result).to.have.nested.property('queryParams.floor', '1111:75');
    });

    it('should round the floor price down', () => {
      currency = 'EUR';
      floor = 0.034;
      bidRequest = Object.assign(DEFAULT_REQUEST(), {getFloor});
      const result = spec.buildRequests([bidRequest], REQPARAMS);
      expect(result).to.have.nested.property('queryParams.floor', '1111:3');
    });

    it('should not add empty bid floor', () => {
      bidRequest = Object.assign(DEFAULT_REQUEST(), {
        getFloor: () => {
          return {};
        }});
      const result = spec.buildRequests([bidRequest], REQPARAMS);
      expect(result).not.to.have.nested.property('queryParams.floor');
    });

    it('should not add bid floor when currency is not matching', () => {
      currency = 'USD';
      floor = 1.33;
      bidRequest = Object.assign(DEFAULT_REQUEST(), {getFloor});
      const result = spec.buildRequests([bidRequest], REQPARAMS);
      expect(result).not.to.have.nested.property('queryParams.floor');
    });
  });
});
