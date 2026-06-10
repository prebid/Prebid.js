import { expect } from 'chai';
import { spec } from 'modules/dasBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('dasBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const validBid = {
      params: {
        site: 'site1',
        area: 'area1',
        slot: 'slot1',
        network: 'network1'
      }
    };

    it('should return true when required params are present', function () {
      expect(spec.isBidRequestValid(validBid)).to.be.true;
    });

    it('should return false when required params are missing', function () {
      expect(spec.isBidRequestValid({})).to.be.false;
      expect(spec.isBidRequestValid({ params: {} })).to.be.false;
      expect(spec.isBidRequestValid({ params: { site: 'site1' } })).to.be.false;
      expect(spec.isBidRequestValid({ params: { area: 'area1' } })).to.be.false;
      expect(spec.isBidRequestValid({ params: { slot: 'slot1' } })).to.be.false;
    });

    it('should return true with additional optional params', function () {
      const bidWithOptional = {
        params: {
          site: 'site1',
          area: 'area1',
          slot: 'slot1',
          network: 'network1',
          customParams: {
            param1: 'value1'
          },
          pageContext: {
            du: 'https://example.com',
            dr: 'https://referrer.com',
            dv: '1.0',
            keyWords: ['key1', 'key2'],
            capping: 'cap1',
            keyValues: {
              key1: 'value1'
            }
          }
        }
      };
      expect(spec.isBidRequestValid(bidWithOptional)).to.be.true;
    });

    it('should return false when params is undefined', function () {
      expect(spec.isBidRequestValid()).to.be.false;
    });

    it('should return false when required params are empty strings', function () {
      const bidWithEmptyStrings = {
        params: {
          site: '',
          area: '',
          slot: ''
        }
      };
      expect(spec.isBidRequestValid(bidWithEmptyStrings)).to.be.false;
    });

    it('should return false when required params are non-string values', function () {
      const bidWithNonStringValues = {
        params: {
          site: 123,
          area: true,
          slot: {}
        }
      };
      expect(spec.isBidRequestValid(bidWithNonStringValues)).to.be.false;
    });

    it('should return false when params is null', function () {
      const bidWithNullParams = {
        params: null
      };
      expect(spec.isBidRequestValid(bidWithNullParams)).to.be.false;
    });

    it('should return true with minimal valid params', function () {
      const minimalBid = {
        params: {
          site: 'site1',
          area: 'area1',
          slot: 'slot1',
          network: 'network1'
        }
      };
      expect(spec.isBidRequestValid(minimalBid)).to.be.true;
    });

    it('should return false with partial required params', function () {
      const partialBids = [
        { params: { site: 'site1', area: 'area1' } },
        { params: { site: 'site1', slot: 'slot1' } },
        { params: { area: 'area1', slot: 'slot1' } }
      ];

      partialBids.forEach(bid => {
        expect(spec.isBidRequestValid(bid)).to.be.false;
      });
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [{
      bidId: 'bid123',
      params: {
        site: 'site1',
        area: 'area1',
        slot: 'slot1',
        network: 'network1',
        pageContext: {
          du: 'https://example.com',
          dr: 'https://referrer.com',
          dv: '1.0',
          keyWords: ['key1', 'key2'],
          capping: 'cap1',
          keyValues: { key1: 'value1' }
        }
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      }
    }];

    const bidderRequest = {
      bidderRequestId: 'reqId123',
      timeout: 1000,
      refererInfo: {
        page: 'https://example.com',
        ref: 'https://referrer.com'
      },
      gdprConsent: {
        consentString: 'consent123',
        gdprApplies: true
      },
      ortb2: {
        site: {}
      }
    };

    it('should return proper request object', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);

      expect(request.method).to.equal('GET');
      expect(request.options.withCredentials).to.be.true;
      expect(request.options.crossOrigin).to.be.true;

      expect(request.url).to.include('https://csr.onet.pl/network1/bid?data=');
      const urlParts = request.url.split('?');
      expect(urlParts.length).to.equal(2);

      const params = new URLSearchParams(urlParts[1]);
      expect(params.has('data')).to.be.true;

      const payload = JSON.parse(decodeURIComponent(params.get('data')));
      expect(payload.id).to.equal('reqId123');
      expect(payload.imp[0].id).to.equal('bid123');
      expect(payload.imp[0].tagid).to.equal('slot1');
      expect(payload.imp[0].banner.format[0]).to.deep.equal({ w: 300, h: 250 });
    });

    it('should use GET method when URL is under 8192 characters', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.method).to.equal('GET');
      expect(request.url).to.include('?data=');
      expect(request.data).to.be.undefined;
    });

    it('should switch to POST method when URL exceeds 8192 characters', function () {
      // Create a large bid request that will result in URL > 8k characters
      const largeBidRequests = [];
      for (let i = 0; i < 50; i++) {
        largeBidRequests.push({
          bidId: `bid${i}`.repeat(20), // Make bid IDs longer
          params: {
            site: `site${i}`.repeat(50),
            area: `area${i}`.repeat(50),
            slot: `slot${i}`.repeat(50),
            network: 'network1',
            pageContext: {
              du: `https://very-long-url-example-${i}.com`.repeat(10),
              dr: `https://very-long-referrer-url-${i}.com`.repeat(10),
              dv: `version-${i}`.repeat(20),
              keyWords: Array(20).fill(`keyword${i}`),
              capping: `cap${i}`.repeat(20),
              keyValues: {
                [`key${i}`]: `value${i}`.repeat(50)
              }
            },
            customParams: {
              [`param${i}`]: `value${i}`.repeat(50)
            }
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [728, 90], [970, 250]]
            }
          }
        });
      }

      const request = spec.buildRequests(largeBidRequests, bidderRequest);

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://csr.onet.pl/network1/bid');
      expect(request.data).to.be.a('string');

      // Check if data is valid JSON (not URL-encoded form data)
      const payload = JSON.parse(request.data);
      expect(payload.id).to.equal('reqId123');
      expect(payload.imp).to.be.an('array');
      expect(request.options.customHeaders['Content-Type']).to.equal('text/plain');
    });

    it('should create valid POST data format', function () {
      // Create a request that will trigger POST
      const largeBidRequests = Array(50).fill(0).map((_, i) => ({
        bidId: `bid${i}`.repeat(20),
        params: {
          site: `site${i}`.repeat(50),
          area: `area${i}`.repeat(50),
          slot: `slot${i}`.repeat(50),
          network: 'network1',
          pageContext: {
            du: `https://very-long-url-example-${i}.com`.repeat(10),
            dr: `https://very-long-referrer-url-${i}.com`.repeat(10),
            keyWords: Array(10).fill(`keyword${i}`)
          }
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      }));

      const request = spec.buildRequests(largeBidRequests, bidderRequest);

      expect(request.method).to.equal('POST');

      // Parse the POST data as JSON (not URL-encoded)
      const payload = JSON.parse(request.data);
      expect(payload.id).to.equal('reqId123');
      expect(payload.imp).to.be.an('array').with.length(50);
      expect(payload.ext.network).to.equal('network1');
    });

    it('should set withCredentials to false when adbeta flag is present', function () {
      const bidRequestsWithAdbeta = [{
        bidId: 'bid123',
        params: {
          site: 'site1',
          area: 'area1',
          slot: 'slot1',
          network: 'network1',
          adbeta: 'l1021885!slot.nativestd',
          pageContext: {}
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      }];

      const bidderRequestWithAdbeta = {
        bidderRequestId: 'reqId123',
        ortb2: {},
        adbeta: true
      };

      const request = spec.buildRequests(bidRequestsWithAdbeta, bidderRequestWithAdbeta);

      expect(request.options.withCredentials).to.be.false;
    });

    describe('interpretResponse', function () {
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: 'bid123',
              price: 3.5,
              w: 300,
              h: 250,
              adm: '<creative>',
              crid: 'crid123',
              mtype: 1,
              adomain: ['advertiser.com']
            }]
          }],
          cur: 'USD'
        }
      };

      it('should return proper bid response', function () {
        const bidResponses = spec.interpretResponse(serverResponse);

        expect(bidResponses).to.be.an('array').with.lengthOf(1);
        expect(bidResponses[0]).to.deep.include({
          requestId: 'bid123',
          cpm: 3.5,
          currency: 'USD',
          width: 300,
          height: 250,
          ad: '<creative>',
          creativeId: 'crid123',
          netRevenue: true,
          ttl: 300,
          mediaType: 'banner'
        });
        expect(bidResponses[0].meta.advertiserDomains).to.deep.equal(['advertiser.com']);
      });

      it('should return empty array when no valid responses', function () {
        expect(spec.interpretResponse({ body: null })).to.be.an('array').that.is.empty;
        expect(spec.interpretResponse({ body: {} })).to.be.an('array').that.is.empty;
        expect(spec.interpretResponse({ body: { seatbid: [] } })).to.be.an('array').that.is.empty;
      });

      it('should return proper bid response for native', function () {
        const nativeResponse = {
          body: {
            seatbid: [{
              bid: [{
                impid: 'bid123',
                price: 3.5,
                w: 1,
                h: 1,
                adm: JSON.stringify({
                  fields: {
                    Body: 'Ruszyła sprzedaż mieszkań przy Metrze Dworzec Wileński',
                    Calltoaction: 'SPRAWDŹ',
                    Headline: 'Gotowe mieszkania w świetnej lokalizacji (test)',
                    Image: 'https://ocdn.eu/example.jpg',
                    Sponsorlabel: 'tak',
                    Thirdpartyclicktracker: '',
                    Thirdpartyimpressiontracker: '',
                    Thirdpartyimpressiontracker2: '',
                    borderColor: '#CECECE',
                    click: 'https://mieszkaniaprzymetrodworzec.pl',
                    responsive: 'nie'
                  },
                  tplCode: '1746213/Native-In-Feed',
                  meta: {
                    inIFrame: false,
                    autoscale: 0,
                    width: '1',
                    height: '1',
                    adid: 'das,1778361,669261',
                    actioncount: 'https://csr.onet.pl/eclk/...',
                    slot: 'right2',
                    adclick: 'https://csr.onet.pl/clk/...',
                    container_wrapper: '<div id="[CREATIVE_APPEND_THIS]"><div style="...">REKLAMA</div></div>',
                    prebid_native: true
                  }
                }),
                mtype: 4
              }]
            }],
            cur: 'USD'
          }
        };

        const bidResponses = spec.interpretResponse(nativeResponse);

        expect(bidResponses).to.be.an('array').with.lengthOf(1);
        expect(bidResponses[0]).to.deep.include({
          requestId: 'bid123',
          cpm: 3.5,
          currency: 'USD',
          width: 1,
          height: 1,
          native: {
            title: 'Gotowe mieszkania w świetnej lokalizacji (test)',
            body: 'Ruszyła sprzedaż mieszkań przy Metrze Dworzec Wileński',
            cta: 'SPRAWDŹ',
            image: {
              url: 'https://ocdn.eu/example.jpg',
              width: '1',
              height: '1'
            },
            icon: {
              url: '',
              width: '1',
              height: '1'
            },
            clickUrl: 'https://csr.onet.pl/clk/...https://mieszkaniaprzymetrodworzec.pl',
            body2: '',
            sponsoredBy: '',
            clickTrackers: [],
            impressionTrackers: [],
            javascriptTrackers: [],
            sendTargetingKeys: false
          },
          netRevenue: true,
          ttl: 300,
          mediaType: 'native'
        });

        expect(bidResponses[0]).to.not.have.property('ad');
      });
    });

    it('should return empty object when adm in a native response is not JSON', function () {
      const nativeResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: 'bad1',
              price: 2.0,
              w: 1,
              h: 1,
              adm: 'not-a-json-string',
              mtype: 4
            }]
          }],
          cur: 'USD'
        }
      };

      const bidResponses = spec.interpretResponse(nativeResponse);
      expect(bidResponses[0].native).to.deep.equal({});
    });

    it('should return empty object when adm in a native response is missing required fields/meta', function () {
      const nativeResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: 'bad2',
              price: 2.0,
              w: 1,
              h: 1,
              adm: JSON.stringify({ fields: {} }),
              mtype: 4
            }]
          }],
          cur: 'USD'
        }
      };

      const bidResponses = spec.interpretResponse(nativeResponse);
      expect(bidResponses[0].native).to.deep.equal({});
    });

    it('should return empty object when adm in a native response is empty JSON object', function () {
      const nativeResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: 'bad3',
              price: 2.0,
              w: 1,
              h: 1,
              adm: JSON.stringify({}),
              mtype: 4
            }]
          }],
          cur: 'USD'
        }
      };

      const bidResponses = spec.interpretResponse(nativeResponse);
      expect(bidResponses[0].native).to.deep.equal({});
    });

    it('should return empty object when adm in a native response is null or missing', function () {
      const nativeResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: 'bad4',
              price: 2.0,
              w: 1,
              h: 1,
              adm: null,
              mtype: 4
            }]
          }],
          cur: 'USD'
        }
      };

      const bidResponses = spec.interpretResponse(nativeResponse);
      expect(bidResponses[0].native).to.deep.equal({});
    });
  });
});
