import {expect} from 'chai';
import {spec} from 'modules/fluctBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';
import {config} from 'src/config';

describe('fluctAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      bidder: 'fluct',
      params: {
        dfpUnitCode: '/1000/dfp_unit_code',
        tagId: '10000:100000001',
        groupId: '1000000002',
      }
    };
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      const invalidBid = Object.assign({}, bid);
      delete invalidBid.params;
      invalidBid.params = {};
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return true when dfpUnitCode is not passed', function () {
      const invalidBid = Object.assign({}, bid);
      delete invalidBid.params;
      invalidBid.params = {
        tagId: '10000:100000001',
        groupId: '1000000002',
      };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(true);
    });

    it('should return false when groupId is not passed', function () {
      const invalidBid = Object.assign({}, bid);
      delete invalidBid.params;
      invalidBid.params = {
        dfpUnitCode: '/1000/dfp_unit_code',
        tagId: '10000:100000001',
      };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let sb;

    beforeEach(function () {
      sb = sinon.createSandbox();
    });

    afterEach(function () {
      sb.restore();
    });

    const bidRequests = [{
      bidder: 'fluct',
      params: {
        dfpUnitCode: '/100000/unit_code',
        tagId: '10000:100000001',
        groupId: '1000000002',
      },
      adUnitCode: '/10000/unit_code',
      sizes: [[300, 250], [336, 280]],
      bidId: '237f4d1a293f99',
      bidderRequestId: '1a857fa34c1c96',
      auctionId: 'a297d1aa-7900-4ce4-a0aa-caa8d46c4af7',
      transactionId: '00b2896c-2731-4f01-83e4-7a3ad5da13b6',
    }];
    const bidderRequest = {
      refererInfo: {
        page: 'http://example.com'
      }
    };

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.method).to.equal('POST');
    });

    it('sends bid request to ENDPOINT with query parameter', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.url).to.equal('https://hb.adingo.jp/prebid?dfpUnitCode=%2F100000%2Funit_code&tagId=10000%3A100000001&groupId=1000000002');
    });

    it('includes data.page by default', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.page).to.eql('http://example.com');
    });

    it('sends no transactionId by default', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.transactionId).to.eql(undefined);
    });

    it('sends ortb2Imp.ext.tid as transactionId', function () {
      const request = spec.buildRequests(bidRequests.map((req) => ({
        ...req,
        ortb2Imp: {
          ext: {
            tid: 'tid',
          }
        },
      })), bidderRequest)[0];
      expect(request.data.transactionId).to.eql('tid');
    });

    it('sends no gpid by default', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.gpid).to.eql(undefined);
    });

    it('sends ortb2Imp.ext.gpid as gpid', function () {
      const request = spec.buildRequests(bidRequests.map((req) => ({
        ...req,
        ortb2Imp: {
          ext: {
            gpid: 'gpid',
            data: {
              pbadslot: 'data-pbadslot',
              adserver: {
                adslot: 'data-adserver-adslot',
              },
            },
          },
        },
      })), bidderRequest)[0];
      expect(request.data.gpid).to.eql('gpid');
    });

    it('sends ortb2Imp.ext.gpid as gpid', function () {
      const request = spec.buildRequests(bidRequests.map((req) => ({
        ...req,
        ortb2Imp: {
          ext: {
            gpid: 'data-pbadslot',
            data: {
              adserver: {
                adslot: 'data-adserver-adslot',
              },
            },
          },
        },
      })), bidderRequest)[0];
      expect(request.data.gpid).to.eql('data-pbadslot');
    });

    it('sends ortb2Imp.ext.data.adserver.adslot as gpid', function () {
      const request = spec.buildRequests(bidRequests.map((req) => ({
        ...req,
        ortb2Imp: {
          ext: {
            data: {
              adserver: {
                adslot: 'data-adserver-adslot',
              },
            },
          },
        },
      })), bidderRequest)[0];
      expect(request.data.gpid).to.eql('data-adserver-adslot');
    });

    it('includes data.user.eids = [] by default', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.user.eids).to.eql([]);
    });

    it('includes no data.params.kv by default', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.params.kv).to.eql(undefined);
    });

    it('includes no data.schain by default', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.schain).to.eql(undefined);
    });

    it('includes no data.regs by default', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.regs).to.eql(undefined);
    });

    it('includes filtered user.eids if any exists', function () {
      const bidRequests2 = bidRequests.map(
        (bidReq) => Object.assign({}, bidReq, {
          userIdAsEids: [
            {
              source: 'foobar.com',
              uids: [
                { id: 'foobar-id' },
              ],
            },
            {
              source: 'adserver.org',
              uids: [
                { id: 'tdid' }
              ],
            },
            {
              source: 'criteo.com',
              uids: [
                { id: 'criteo-id' },
              ],
            },
            {
              source: 'intimatemerger.com',
              uids: [
                { id: 'imuid' },
              ],
            },
            {
              source: 'liveramp.com',
              uids: [
                { id: 'idl-env' },
              ],
            },
          ],
        })
      );
      const request = spec.buildRequests(bidRequests2, bidderRequest)[0];
      expect(request.data.user.eids).to.eql([
        {
          source: 'foobar.com',
          uids: [
            { id: 'foobar-id' },
          ],
        },
        {
          source: 'adserver.org',
          uids: [
            { id: 'tdid' },
          ],
        },
        {
          source: 'criteo.com',
          uids: [
            { id: 'criteo-id' },
          ],
        },
        {
          source: 'intimatemerger.com',
          uids: [
            { id: 'imuid' },
          ],
        },
        {
          source: 'liveramp.com',
          uids: [
            { id: 'idl-env' },
          ],
        },
      ]);
    });

    it('includes user.data if any exists', function () {
      const bidderRequest2 = Object.assign({}, bidderRequest, {
        ortb2: {
          user: {
            data: [
              {
                name: 'a1mediagroup.com',
                ext: {
                  segtax: 900,
                },
                segment: [
                  { id: 'seg-1' },
                  { id: 'seg-2' },
                ],
              },
            ],
            ext: {
              eids: [
                {
                  source: 'a1mediagroup.com',
                  uids: [
                    { id: 'aud-1' }
                  ],
                },
              ],
            },
          },
        },
      });
      const request = spec.buildRequests(bidRequests, bidderRequest2)[0];
      expect(request.data.user).to.eql({
        data: [
          {
            name: 'a1mediagroup.com',
            ext: {
              segtax: 900,
            },
            segment: [
              { id: 'seg-1' },
              { id: 'seg-2' },
            ],
          },
        ],
        eids: [
          {
            source: 'a1mediagroup.com',
            uids: [
              { id: 'aud-1' }
            ],
          },
        ],
      });
    });

    it('includes data.params.kv if any exists', function () {
      const bidRequests2 = bidRequests.map(
        (bidReq) => Object.assign({}, bidReq, {
          params: {
            kv: {
              imsids: ['imsid1', 'imsid2']
            }
          }
        })
      );
      const request = spec.buildRequests(bidRequests2, bidderRequest)[0];
      expect(request.data.params.kv).to.eql({
        imsids: ['imsid1', 'imsid2']
      });
    });

    it('includes data.schain if any exists', function () {
      // this should be done by schain.js
      const bidRequests2 = bidRequests.map(
        (bidReq) => Object.assign({}, bidReq, {
          ortb2: {
            source: {
              ext: {
                schain: {
                  ver: '1.0',
                  complete: 1,
                  nodes: [
                    {
                      asi: 'example.com',
                      sid: 'publisher-id',
                      hp: 1
                    }
                  ]
                }
              }
            }
          }
        })
      );
      const request = spec.buildRequests(bidRequests2, bidderRequest)[0];
      expect(request.data.schain).to.eql({
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'example.com',
            sid: 'publisher-id',
            hp: 1
          }
        ]
      });
    });

    it('includes data.regs.gdpr if bidderRequest.gdprConsent exists', function () {
      const request = spec.buildRequests(
        bidRequests,
        Object.assign({}, bidderRequest, {
          gdprConsent: {
            consentString: 'gdpr-consent-string',
            gdprApplies: true,
          },
        }),
      )[0];
      expect(request.data.regs.gdpr).to.eql({
        consent: 'gdpr-consent-string',
        gdprApplies: 1,
      });
    });

    it('includes data.regs.us_privacy if bidderRequest.uspConsent exists', function () {
      const request = spec.buildRequests(
        bidRequests,
        Object.assign({}, bidderRequest, {
          uspConsent: 'usp-consent-string',
        }),
      )[0];
      expect(request.data.regs.us_privacy).to.eql({
        consent: 'usp-consent-string',
      });
    });

    it('includes data.regs.coppa if config.getConfig("coppa") is true', function () {
      const cfg = {
        coppa: true,
      };
      sb.stub(config, 'getConfig').callsFake(key => cfg[key]);

      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.regs.coppa).to.eql(1);
    });

    it('includes data.regs.gpp.string and data.regs.gpp.sid if bidderRequest.gppConsent exists', function () {
      const request = spec.buildRequests(
        bidRequests,
        Object.assign({}, bidderRequest, {
          gppConsent: {
            gppString: 'gpp-consent-string',
            applicableSections: [1, 2, 3],
          },
        }),
      )[0];
      expect(request.data.regs.gpp.string).to.eql('gpp-consent-string');
      expect(request.data.regs.gpp.sid).to.eql([1, 2, 3]);
    });

    it('includes data.regs.gpp.string and data.regs.gpp.sid if bidderRequest.ortb2.regs.gpp exists', function () {
      const request = spec.buildRequests(
        bidRequests,
        Object.assign({}, bidderRequest, {
          ortb2: {
            regs: {
              gpp: 'gpp-consent-string',
              gpp_sid: [1, 2, 3],
            },
          },
        }),
      )[0];
      expect(request.data.regs.gpp.string).to.eql('gpp-consent-string');
      expect(request.data.regs.gpp.sid).to.eql([1, 2, 3]);
    });

    it('sends no instl as instl = 0', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.instl).to.eql(0);
    })

    it('sends ortb2Imp.instl as instl = 0', function () {
      const request = spec.buildRequests(bidRequests.map((req) => ({
        ...req,
        ortb2Imp: {
          instl: 0,
        },
      })), bidderRequest)[0];
      expect(request.data.instl).to.eql(0);
    });

    it('sends ortb2Imp.instl as instl', function () {
      const request = spec.buildRequests(bidRequests.map((req) => ({
        ...req,
        ortb2Imp: {
          instl: 1,
        },
      })), bidderRequest)[0];
      expect(request.data.instl).to.eql(1);
    });
  });

  describe('should interpretResponse', function() {
    const callBeaconSnippet = '<script type="application/javascript">' +
      '(function() { var img = new Image(); img.src = ' +
      '"https://i.adingo.jp/?test=1&et=hb&bidid=237f4d1a293f99"' +
      '})()</script>';

    it('should get correct bid response', function() {
      const bidRequest = {
        bidder: 'fluct',
        params: {
          dfpUnitCode: '/10000/unit_code',
          tagid: '10000:100000001',
          groupId: '1000000002',
        },
        adUnitCode: '/10000/unit_code',
        sizes: [[300, 250], [336, 280]],
        bidId: '237f4d1a293f99',
        bidderRequestId: '1a857fa34c1c96',
        auctionId: 'a297d1aa-7900-4ce4-a0aa-caa8d46c4af7',
        transactionId: '00b2896c-2731-4f01-83e4-7a3ad5da13b6',
      };

      const serverResponse = {
        body: {
          id: '237f4d1a293f99',
          cur: 'JPY',
          seatbid: [{
            bid: [{
              price: 100,
              w: 300,
              h: 250,
              adm: '<!-- test creative -->',
              burl: 'https://i.adingo.jp/?test=1&et=hb&bidid=237f4d1a293f99',
              crid: 'test_creative',
              adomain: ['test_adomain'],
            }]
          }],
          usersyncs: [
            {
              'type': 'image',
              'url': 'https://cs.adingo.jp/sync',
            },
          ],
        }
      };

      const expectedResponse = [
        {
          requestId: '237f4d1a293f99',
          currency: 'JPY',
          cpm: 100,
          netRevenue: true,
          width: 300,
          height: 250,
          creativeId: 'test_creative',
          ttl: 300,
          ad: '<!-- test creative -->' + callBeaconSnippet,
          meta: {
            advertiserDomains: ['test_adomain'],
          },
        }
      ];

      const result = spec.interpretResponse(serverResponse, bidRequest);
      expect(result).to.have.lengthOf(1);
      expect(result).to.deep.have.same.members(expectedResponse);
    });

    it('should get correct bid response with dealId', function() {
      const bidRequest = {
        bidder: 'fluct',
        params: {
          dfpUnitCode: '/10000/unit_code',
          tagid: '10000:100000001',
          groupId: '1000000002'
        },
        adUnitCode: '/10000/unit_code',
        sizes: [[300, 250], [336, 280]],
        bidId: '237f4d1a293f99',
        bidderRequestId: '1a857fa34c1c96',
        auctionId: 'a297d1aa-7900-4ce4-a0aa-caa8d46c4af7',
        transactionId: '00b2896c-2731-4f01-83e4-7a3ad5da13b6',
      };

      const serverResponse = {
        body: {
          id: '237f4d1a293f99',
          cur: 'JPY',
          seatbid: [{
            bid: [{
              price: 100,
              w: 300,
              h: 250,
              adm: '<!-- test creative -->',
              burl: 'https://i.adingo.jp/?test=1&et=hb&bidid=237f4d1a293f99',
              crid: 'test_creative',
              dealid: 'test_deal',
            }]
          }]
        }
      };

      const expectedResponse = [
        {
          requestId: '237f4d1a293f99',
          currency: 'JPY',
          cpm: 100,
          netRevenue: true,
          width: 300,
          height: 250,
          creativeId: 'test_creative',
          ttl: 300,
          ad: '<!-- test creative -->' + callBeaconSnippet,
          dealId: 'test_deal',
          meta: {
            advertiserDomains: [],
          },
        }
      ];

      const result = spec.interpretResponse(serverResponse, bidRequest);
      expect(result).to.have.lengthOf(1);
      expect(result).to.deep.have.same.members(expectedResponse);
    });

    it('should get empty response when bid server returns 204', function() {
      expect(spec.interpretResponse({})).to.be.empty;
    });
  });

  describe('getUserSyncs', function () {
    const syncOptions = {};
    const serverResponse = {
      body: {
        usersyncs: [
          {
            type: 'image',
            url: 'https://cs.adingo.jp/foo',
          },
          {
            type: 'image',
            url: 'https://cs.adingo.jp/bar',
          },
          {
            type: 'iframe',
            url: 'https://cs.adingo.jp/buz',
          },
        ],
      },
    };

    it('returns no user syncs if syncOption.pixelEnabled !== true and syncOption.iframeEnabled !== true', function () {
      const actual = spec.getUserSyncs(
        syncOptions,
        [serverResponse],
      );

      expect(actual).to.eql([]);
    });

    it('returns user syncs if syncOption.pixelEnabled === true', function () {
      const actual = spec.getUserSyncs(
        Object.assign({}, syncOptions, {
          pixelEnabled: true,
        }),
        [serverResponse],
      );

      expect(actual).to.eql([
        {
          type: 'image',
          url: 'https://cs.adingo.jp/foo',
        },
        {
          type: 'image',
          url: 'https://cs.adingo.jp/bar',
        },
      ]);
    });

    it('returns user syncs if syncOption.iframeEnabled === true', function () {
      const actual = spec.getUserSyncs(
        Object.assign({}, syncOptions, {
          iframeEnabled: true,
        }),
        [serverResponse],
      );

      expect(actual).to.eql([
        {
          type: 'iframe',
          url: 'https://cs.adingo.jp/buz',
        },
      ]);
    });
  });
});
