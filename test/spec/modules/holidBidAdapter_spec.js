import { expect } from 'chai';
import { spec } from 'modules/holidBidAdapter.js';

describe('holidBidAdapterTests', () => {
  const bidderRequest = {
    bidderRequestId: 'test-id'
  };

  const bidRequestData = {
    bidder: 'holid',
    adUnitCode: 'test-div',
    bidId: 'bid-id',
    params: { adUnitID: '12345' },
    mediaTypes: { banner: {} },
    sizes: [[300, 250]],
    ortb2: {
      site: {
        publisher: {
          domain: 'https://foo.bar',
        }
      },
      regs: {
        gdpr: 1,
      },
      user: {
        ext: {
          consent: 'G4ll0p1ng_Un1c0rn5',
        }
      },
      device: {
        h: 410,
        w: 1860,
      }
    }
  };

  describe('isBidRequestValid', () => {
    const bid = JSON.parse(JSON.stringify(bidRequestData));

    it('should return true', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      const bid = JSON.parse(JSON.stringify(bidRequestData));
      delete bid.params.adUnitID;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    const bid = JSON.parse(JSON.stringify(bidRequestData));
    const request = spec.buildRequests([bid], bidderRequest);
    const payload = JSON.parse(request[0].data);

    it('should include id in request', () => {
      expect(payload.id).to.equal('test-id');
    });

    it('should include ext in imp', () => {
      expect(payload.imp[0].ext).to.deep.equal({
        prebid: { storedrequest: { id: '12345' } },
      });
    });

    it('should include ext in request', () => {
      expect(payload.ext).to.deep.equal({
        prebid: { storedrequest: { id: '12345' } },
      });
    });

    it('should include banner format in imp', () => {
      expect(payload.imp[0].banner).to.deep.equal({
        format: [{ w: 300, h: 250 }],
      });
    });

    it('should include ortb2 first party data', () => {
      expect(payload.device.w).to.equal(1860);
      expect(payload.device.h).to.equal(410);
      expect(payload.user.ext.consent).to.equal('G4ll0p1ng_Un1c0rn5');
      expect(payload.regs.gdpr).to.equal(1);
    });
  });

  describe('interpretResponse', () => {
    // Add impid: 'bid-id' so requestId matches bidRequestData.bidId
    const serverResponse = {
      body: {
        id: 'test-id',
        cur: 'USD',
        seatbid: [
          {
            bid: [
              {
                id: 'testbidid',
                impid: 'bid-id',
                price: 0.4,
                adm: 'test-ad',
                adid: 789456,
                crid: 1234,
                w: 300,
                h: 250,
              },
            ],
          },
        ],
      },
    };

    const interpretedResponse = spec.interpretResponse(serverResponse, bidRequestData);

    it('should interpret response', () => {
      expect(interpretedResponse[0].requestId).to.equal(bidRequestData.bidId);
      expect(interpretedResponse[0].cpm).to.equal(
        serverResponse.body.seatbid[0].bid[0].price
      );
      expect(interpretedResponse[0].ad).to.equal(
        serverResponse.body.seatbid[0].bid[0].adm
      );
      expect(interpretedResponse[0].creativeId).to.equal(
        serverResponse.body.seatbid[0].bid[0].crid
      );
      expect(interpretedResponse[0].width).to.equal(
        serverResponse.body.seatbid[0].bid[0].w
      );
      expect(interpretedResponse[0].height).to.equal(
        serverResponse.body.seatbid[0].bid[0].h
      );
      expect(interpretedResponse[0].currency).to.equal(serverResponse.body.cur);
    });

    it('should map adomain to meta.advertiserDomains and preserve existing meta fields', () => {
      const serverResponseWithAdomain = {
        body: {
          id: 'test-id',
          cur: 'USD',
          seatbid: [
            {
              bid: [
                {
                  id: 'testbidid-2',
                  impid: 'bid-id',
                  price: 0.55,
                  adm: '<div>ad</div>',
                  crid: 'cr-2',
                  w: 300,
                  h: 250,
                  // intentionally mixed-case + protocol + www to test normalization
                  adomain: ['https://Holid.se', 'www.Example.COM'],
                  ext: {
                    prebid: {
                      meta: {
                        networkId: 42
                      }
                    }
                  }
                }
              ]
            }
          ]
        }
      };

      const out = spec.interpretResponse(serverResponseWithAdomain, bidRequestData);
      expect(out).to.have.length(1);
      expect(out[0].requestId).to.equal('bid-id');

      // critical assertion: advertiserDomains normalized and present
      expect(out[0].meta).to.have.property('advertiserDomains');
      expect(out[0].meta.advertiserDomains).to.deep.equal(['holid.se', 'example.com']);

      // ensure any existing meta (e.g., networkId) is preserved
      expect(out[0].meta.networkId).to.equal(42);
    });
  });

  describe('getUserSyncs', () => {
    it('should return user sync', () => {
      const optionsType = {
        iframeEnabled: true,
        pixelEnabled: true,
      };
      const serverResponse = [
        {
          body: {
            ext: {
              responsetimemillis: {
                'test seat 1': 2,
                'test seat 2': 1,
              },
            },
          },
        },
      ];
      const gdprConsent = {
        gdprApplies: 1,
        consentString: 'dkj49Sjmfjuj34as:12jaf90123hufabidfy9u23brfpoig',
      };
      const uspConsent = 'mkjvbiniwot4827obfoy8sdg8203gb';

      // Updated 'usp_consent' to 'us_privacy' to match adapter code
      const expectedUserSyncs = [
        {
          type: 'image',
          url: 'https://track.adform.net/Serving/TrackPoint/?pm=2992097&lid=132720821',
        },
        {
          type: 'iframe',
          url: 'https://null.holid.io/sync.html?bidders=%5B%22test%20seat%201%22%2C%22test%20seat%202%22%5D&gdpr=1&gdpr_consent=dkj49Sjmfjuj34as%3A12jaf90123hufabidfy9u23brfpoig&us_privacy=mkjvbiniwot4827obfoy8sdg8203gb&type=iframe',
        },
      ];

      const userSyncs = spec.getUserSyncs(
        optionsType,
        serverResponse,
        gdprConsent,
        uspConsent
      );

      expect(userSyncs).to.deep.equal(expectedUserSyncs);
    });

    it('should return base user syncs when responsetimemillis is not defined', () => {
      const optionsType = {
        iframeEnabled: true,
        pixelEnabled: true,
      };
      const serverResponse = [
        {
          body: {
            ext: {},
          },
        },
      ];
      const gdprConsent = {
        gdprApplies: 1,
        consentString: 'dkj49Sjmfjuj34as:12jaf90123hufabidfy9u23brfpoig',
      };
      const uspConsent = 'mkjvbiniwot4827obfoy8sdg8203gb';

      const expectedUserSyncs = [
        {
          type: 'image',
          url: 'https://track.adform.net/Serving/TrackPoint/?pm=2992097&lid=132720821',
        },
      ];

      const userSyncs = spec.getUserSyncs(
        optionsType,
        serverResponse,
        gdprConsent,
        uspConsent
      );

      expect(userSyncs).to.deep.equal(expectedUserSyncs);
    });
  });
});
