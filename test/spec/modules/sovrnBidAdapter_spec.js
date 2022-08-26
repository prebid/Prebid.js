import {expect} from 'chai'
import {spec} from 'modules/sovrnBidAdapter.js'
import {config} from 'src/config.js'
import * as utils from 'src/utils.js'

const ENDPOINT = `https://ap.lijit.com/rtb/bid?src=$$REPO_AND_VERSION$$`

const baseBidRequest = {
  bidder: 'sovrn',
  params: {
    tagid: 403370
  },
  adUnitCode: 'adunit-code',
  sizes: [
    [300, 250],
    [300, 600]
  ],
  bidId: '30b31c1838de1e',
  bidderRequestId: '22edbae2733bf6',
  auctionId: '1d1a030790a475',
}
const baseBidderRequest = {
  refererInfo: {
    page: 'http://example.com/page.html',
    domain: 'example.com',
  }
}

describe('sovrnBidAdapter', function() {
  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(baseBidRequest)).to.equal(true)
    })

    it('should return false when tagid not passed correctly', function () {
      const bidRequest = {
        ...baseBidRequest,
        params: {
          ...baseBidRequest.params,
          tagid: 'ABCD'
        },
      }

      expect(spec.isBidRequestValid(bidRequest)).to.equal(false)
    })

    it('should return false when require params are not passed', function () {
      const bidRequest = {
        ...baseBidRequest,
        params: {}
      }

      expect(spec.isBidRequestValid(bidRequest)).to.equal(false)
    })

    it('should return false when require video params are not passed', function () {
      const bidRequest = {
        ...baseBidRequest,
        mediaTypes: {
          'video': {
          }
        }
      }

      expect(spec.isBidRequestValid(bidRequest)).to.equal(false)
    })
  })

  describe('buildRequests', function () {
    describe('basic bid parameters', function() {
      const request = spec.buildRequests([baseBidRequest], baseBidderRequest)
      const payload = JSON.parse(request.data)

      it('sends bid request to our endpoint via POST', function () {
        expect(request.method).to.equal('POST')
      })

      it('attaches source and version to endpoint URL as query params', function () {
        expect(request.url).to.equal(ENDPOINT)
      })

      it('sets the proper banner object', function() {
        const bannerBidRequest = {
          ...baseBidRequest,
          mediaTypes: {
            banner: {}
          }
        }
        const request = spec.buildRequests([bannerBidRequest], baseBidderRequest)
        const payload = JSON.parse(request.data)
        const impression = payload.imp[0]

        expect(impression.banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}])
        expect(impression.banner.w).to.equal(1)
        expect(impression.banner.h).to.equal(1)
      })

      it('sets the proper video object with sizes defined', function() {
        const width = 300
        const height = 250
        const mimes = ['video/mp4', 'application/javascript']
        const protocols = [2, 5]
        const minduration = 5
        const maxduration = 60
        const startdelay = 0
        const videoBidRequest = {
          ...baseBidRequest,
          mediaTypes: {
            video: {
              mimes,
              protocols,
              playerSize: [[width, height], [360, 240]],
              minduration,
              maxduration,
              startdelay
            }
          }
        }
        const request = spec.buildRequests([videoBidRequest], baseBidderRequest)
        const payload = JSON.parse(request.data)
        const impression = payload.imp[0]

        expect(impression.video.w).to.equal(width)
        expect(impression.video.h).to.equal(height)
        expect(impression.video.mimes).to.have.same.members(mimes)
        expect(impression.video.protocols).to.have.same.members(protocols)
        expect(impression.video.minduration).to.equal(minduration)
        expect(impression.video.maxduration).to.equal(maxduration)
        expect(impression.video.startdelay).to.equal(startdelay)
      })

      it('sets the proper video object wihtout sizes defined but video sizes defined', function() {
        const width = 360
        const height = 240
        const mimes = ['video/mp4', 'application/javascript']
        const protocols = [2, 5]
        const minduration = 5
        const maxduration = 60
        const startdelay = 0
        const modifiedBidRequest = baseBidRequest;
        delete modifiedBidRequest.sizes;
        const videoBidRequest = {
          ...modifiedBidRequest,
          mediaTypes: {
            video: {
              mimes,
              protocols,
              playerSize: [[width, height], [360, 240]],
              minduration,
              maxduration,
              startdelay
            }
          }
        }
        const request = spec.buildRequests([videoBidRequest], baseBidderRequest)
        const payload = JSON.parse(request.data)
        const impression = payload.imp[0]

        expect(impression.video.w).to.equal(width)
        expect(impression.video.h).to.equal(height)
        expect(impression.video.mimes).to.have.same.members(mimes)
        expect(impression.video.protocols).to.have.same.members(protocols)
        expect(impression.video.minduration).to.equal(minduration)
        expect(impression.video.maxduration).to.equal(maxduration)
        expect(impression.video.startdelay).to.equal(startdelay)
      })

      it('gets correct site info', function() {
        expect(payload.site.page).to.equal('http://example.com/page.html')
        expect(payload.site.domain).to.equal('example.com')
      })

      it('includes the ad unit code in the request', function() {
        const impression = payload.imp[0]
        expect(impression.adunitcode).to.equal('adunit-code')
      })

      it('converts tagid to string', function () {
        expect(request.data).to.contain('"tagid":"403370"')
      })
    })

    it('accepts a single array as a size', function() {
      const singleSizeBidRequest = {
        ...baseBidRequest,
        params: {
          iv: 'vet'
        },
        sizes: [300, 250],
        mediaTypes: {
          banner: {}
        },
      }
      const request = spec.buildRequests([singleSizeBidRequest], baseBidderRequest)
      const payload = JSON.parse(request.data)
      const impression = payload.imp[0]

      expect(impression.banner.format).to.deep.equal([{w: 300, h: 250}])
      expect(impression.banner.w).to.equal(1)
      expect(impression.banner.h).to.equal(1)
    })

    it('sends \'iv\' as query param if present', function () {
      const ivBidRequest = {
        ...baseBidRequest,
        params: {
          iv: 'vet'
        }
      }
      const request = spec.buildRequests([ivBidRequest], baseBidderRequest)

      expect(request.url).to.contain('iv=vet')
    })

    it('sends gdpr info if exists', function () {
      const bidderRequest = {
        ...baseBidderRequest,
        bidderCode: 'sovrn',
        auctionId: '1d1a030790a475',
        bidderRequestId: '22edbae2733bf6',
        timeout: 3000,
        gdprConsent: {
          consentString: 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==',
          gdprApplies: true
        },
        bids: [baseBidRequest]
      }
      const { regs, user } = JSON.parse(spec.buildRequests([baseBidRequest], bidderRequest).data)

      expect(regs.ext.gdpr).to.exist.and.to.be.a('number')
      expect(regs.ext.gdpr).to.equal(1)
      expect(user.ext.consent).to.exist.and.to.be.a('string')
      expect(user.ext.consent).to.equal(bidderRequest.gdprConsent.consentString)
    })

    it('should send us_privacy if bidderRequest has a value for uspConsent', function () {
      const bidderRequest = {
        ...baseBidderRequest,
        bidderCode: 'sovrn',
        auctionId: '1d1a030790a475',
        bidderRequestId: '22edbae2733bf6',
        timeout: 3000,
        uspConsent: '1NYN',
        bids: [baseBidRequest]
      }
      const data = JSON.parse(spec.buildRequests([baseBidRequest], bidderRequest).data)

      expect(data.regs.ext['us_privacy']).to.equal(bidderRequest.uspConsent)
    })

    it('should add schain if present', function() {
      const schainRequest = {
        ...baseBidRequest,
        schain: {
          ver: '1.0',
          complete: 1,
          nodes: [
            {
              asi: 'directseller.com',
              sid: '00001',
              rid: 'BidRequest1',
              hp: 1
            }
          ]
        }
      }
      const schainRequests = [schainRequest, baseBidRequest]
      const data = JSON.parse(spec.buildRequests(schainRequests, baseBidderRequest).data)

      expect(data.source.ext.schain.nodes.length).to.equal(1)
    })

    it('should add eds to the bid request', function() {
      const criteoIdRequest = {
        ...baseBidRequest,
        userId: {
          criteoId: 'A_CRITEO_ID',
          tdid: 'SOMESORTOFID',
        }
      }
      const criteoIdRequests = [criteoIdRequest, baseBidRequest]
      const ext = JSON.parse(spec.buildRequests(criteoIdRequests, baseBidderRequest).data).user.ext
      const firstEID = ext.eids[0]
      const secondEID = ext.eids[1]

      expect(firstEID.source).to.equal('criteo.com')
      expect(firstEID.uids[0].id).to.equal('A_CRITEO_ID')
      expect(firstEID.uids[0].atype).to.equal(1)
      expect(secondEID.source).to.equal('adserver.org')
      expect(secondEID.uids[0].id).to.equal('SOMESORTOFID')
      expect(secondEID.uids[0].ext.rtiPartner).to.equal('TDID')
      expect(secondEID.uids[0].atype).to.equal(1)
      expect(ext.prebid_criteoid).to.equal('A_CRITEO_ID')
    })

    it('should ignore empty segments', function() {
      const request = spec.buildRequests([baseBidRequest], baseBidderRequest)
      const payload = JSON.parse(request.data)

      expect(payload.imp[0].ext).to.be.undefined
    })

    it('should pass the segments param value as trimmed deal ids array', function() {
      const segmentsRequest = {
        ...baseBidRequest,
        params: {
          segments: ' test1,test2 '
        }
      }
      const request = spec.buildRequests([segmentsRequest], baseBidderRequest)
      const deals = JSON.parse(request.data).imp[0].ext.deals

      expect(deals[0]).to.equal('test1')
      expect(deals[1]).to.equal('test2')
    })
    it('should use the floor provided from the floor module if present', function() {
      const floorBid = {
        ...baseBidRequest,
        getFloor: () => ({currency: 'USD', floor: 1.10}),
        params: {
          tagid: 1234,
          bidfloor: 2.00
        }
      }
      const request = spec.buildRequests([floorBid], baseBidderRequest)
      const payload = JSON.parse(request.data)

      expect(payload.imp[0].bidfloor).to.equal(1.10)
    })
    it('should use the floor from the param if there is no floor from the floor module', function() {
      const floorBid = {
        ...baseBidRequest,
        getFloor: () => ({})
      }
      floorBid.params = {
        tagid: 1234,
        bidfloor: 2.00
      }
      const request = spec.buildRequests([floorBid], baseBidderRequest)
      const impression = JSON.parse(request.data).imp[0]

      expect(impression.bidfloor).to.equal(2.00)
    })
    describe('First Party Data', function () {
      it('should provide first party data if provided', function() {
        const ortb2 = {
          site: {
            keywords: 'test keyword'
          },
          user: {
            data: 'some user data'
          }
        };

        const request = spec.buildRequests([baseBidRequest], {...baseBidderRequest, ortb2})
        const { user, site } = JSON.parse(request.data)

        expect(user.data).to.equal('some user data')
        expect(site.keywords).to.equal('test keyword')
        expect(site.page).to.equal('http://example.com/page.html')
        expect(site.domain).to.equal('example.com')
      })
      it('should append impression first party data', function () {
        const fpdBidRequest = {
          ...baseBidRequest,
          ortb2Imp: {
            ext: {
              data: {
                pbadslot: 'homepage-top-rect',
                adUnitSpecificAttribute: '123'
              }
            }
          }
        }
        const request = spec.buildRequests([fpdBidRequest], baseBidderRequest)
        const payload = JSON.parse(request.data)

        expect(payload.imp[0].ext.data.pbadslot).to.equal('homepage-top-rect')
        expect(payload.imp[0].ext.data.adUnitSpecificAttribute).to.equal('123')
      })
      it('should not overwrite deals when impression fpd is present', function() {
        const fpdBid = {
          ...baseBidRequest,
          params: {
            segments: 'seg1, seg2'
          },
          ortb2Imp: {
            ext: {
              data: {
                pbadslot: 'homepage-top-rect',
                adUnitSpecificAttribute: '123'
              }
            }
          }
        }
        const request = spec.buildRequests([fpdBid], baseBidderRequest)
        const impression = JSON.parse(request.data).imp[0]

        expect(impression.ext.data.pbadslot).to.equal('homepage-top-rect')
        expect(impression.ext.data.adUnitSpecificAttribute).to.equal('123')
        expect(impression.ext.deals).to.deep.equal(['seg1', 'seg2'])
      })
    })
  })

  describe('interpretResponse', function () {
    let response
    const baseResponse = {
      requestId: '263c448586f5a1',
      cpm: 0.45882675,
      width: 728,
      height: 90,
      creativeId: 'creativelycreatedcreativecreative',
      dealId: null,
      currency: 'USD',
      netRevenue: true,
      mediaType: 'banner',
      ttl: 90,
      meta: { advertiserDomains: [] },
      ad: decodeURIComponent(`<!-- Creative --><img src="<!-- NURL -->">`),
    }
    const videoBid = {
      id: 'a_403370_332fdb9b064040ddbec05891bd13ab28',
      crid: 'creativelycreatedcreativecreative',
      impid: '263c448586f5a1',
      price: 0.45882675,
      nurl: '',
      adm: '<VAST version="4.2" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns="http://www.iab.com/VAST">key%3Dvalue</VAST>',
      h: 480,
      w: 640
    }
    const bannerBid = {
      id: 'a_403370_332fdb9b064040ddbec05891bd13ab28',
      crid: 'creativelycreatedcreativecreative',
      impid: '263c448586f5a1',
      price: 0.45882675,
      nurl: '<!-- NURL -->',
      adm: '<!-- Creative -->',
      h: 90,
      w: 728
    }

    beforeEach(function () {
      response = {
        body: {
          id: '37386aade21a71',
          seatbid: [{
            bid: [{
              ...bannerBid
            }]
          }]
        }
      }
    })

    it('should get the correct bid response', function () {
      const expectedResponse = {
        requestId: '263c448586f5a1',
        cpm: 0.45882675,
        width: 728,
        height: 90,
        creativeId: 'creativelycreatedcreativecreative',
        dealId: null,
        currency: 'USD',
        netRevenue: true,
        mediaType: 'banner',
        ttl: 60000,
        meta: { advertiserDomains: [] },
        ad: decodeURIComponent(`<!-- Creative --><img src=<!-- NURL -->>`)
      }
      const result = spec.interpretResponse(response)

      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse))
    })

    it('crid should default to the bid id if not on the response', function () {
      delete response.body.seatbid[0].bid[0].crid

      const expectedResponse = {
        ...baseResponse,
        creativeId: response.body.seatbid[0].bid[0].id,
        ad: decodeURIComponent(`<!-- Creative --><img src="<!-- NURL -->">`),
      }
      const result = spec.interpretResponse(response)

      expect(result[0]).to.deep.equal(expectedResponse)
    })

    it('should get correct bid response when dealId is passed', function () {
      response.body.seatbid[0].bid[0].dealid = 'baking'
      const expectedResponse = {
        ...baseResponse,
        dealId: 'baking',
      }
      const result = spec.interpretResponse(response)

      expect(result[0]).to.deep.equal(expectedResponse)
    })

    it('should get correct bid response when ttl is set', function () {
      response.body.seatbid[0].bid[0].ext = { ttl: 480 }

      const expectedResponse = {
        ...baseResponse,
        ttl: 480,
      }
      const result = spec.interpretResponse(response)

      expect(result[0]).to.deep.equal(expectedResponse)
    })

    it('handles empty bid response', function () {
      const response = {
        body: {
          id: '37386aade21a71',
          seatbid: []
        }
      }
      const result = spec.interpretResponse(response)

      expect(result.length).to.equal(0)
    })

    it('should get the correct bid response with 2 different bids', function () {
      const expectedVideoResponse = {
        ...baseResponse,
        vastXml: decodeURIComponent(videoBid.adm)
      }
      delete expectedVideoResponse.ad

      const expectedBannerResponse = {
        ...baseResponse
      }

      response.body.seatbid = [{ bid: [bannerBid] }, { bid: [videoBid] }]
      const result = spec.interpretResponse(response)

      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedBannerResponse))
      expect(Object.keys(result[1])).to.deep.equal(Object.keys(expectedVideoResponse))
    })

    it('should get the correct bid response with 2 seatbid items', function () {
      const expectedResponse = {
        ...baseResponse
      }
      response.body.seatbid = [response.body.seatbid[0], response.body.seatbid[0]]

      const result = spec.interpretResponse(response)

      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse))
      expect(Object.keys(result[1])).to.deep.equal(Object.keys(expectedResponse))
    })
  })

  describe('interpretResponse video', function () {
    let videoResponse
    const bidAdm = '<VAST version="4.2" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns="http://www.iab.com/VAST">key%3Dvalue</VAST>'
    const decodedBidAdm = decodeURIComponent(bidAdm)
    const baseVideoResponse = {
      requestId: '263c448586f5a1',
      cpm: 0.45882675,
      width: 640,
      height: 480,
      creativeId: 'creativelycreatedcreativecreative',
      dealId: null,
      currency: 'USD',
      netRevenue: true,
      mediaType: 'video',
      ttl: 90,
      meta: { advertiserDomains: [] },
      vastXml: decodedBidAdm
    }

    beforeEach(function () {
      videoResponse = {
        body: {
          id: '37386aade21a71',
          seatbid: [{
            bid: [{
              id: 'a_403370_332fdb9b064040ddbec05891bd13ab28',
              crid: 'creativelycreatedcreativecreative',
              impid: '263c448586f5a1',
              price: 0.45882675,
              nurl: '',
              adm: bidAdm,
              h: 480,
              w: 640
            }]
          }]
        }
      }
    })

    it('should get the correct bid response', function () {
      const expectedResponse = {
        ...baseVideoResponse,
        ttl: 60000,
      }
      const result = spec.interpretResponse(videoResponse)

      expect(result[0]).to.have.deep.keys(expectedResponse)
    })

    it('crid should default to the bid id if not on the response', function () {
      delete videoResponse.body.seatbid[0].bid[0].crid

      const expectedResponse = {
        ...baseVideoResponse,
        creativeId: videoResponse.body.seatbid[0].bid[0].id,
      }
      const result = spec.interpretResponse(videoResponse)

      expect(result[0]).to.deep.equal(expectedResponse)
    })

    it('should get correct bid response when dealId is passed', function () {
      videoResponse.body.seatbid[0].bid[0].dealid = 'baking'
      const expectedResponse = {
        ...baseVideoResponse,
        dealId: 'baking',
      }
      const result = spec.interpretResponse(videoResponse)

      expect(result[0]).to.deep.equal(expectedResponse)
    })

    it('should get correct bid response when ttl is set', function () {
      videoResponse.body.seatbid[0].bid[0].ext = { 'ttl': 480 }

      const expectedResponse = {
        ...baseVideoResponse,
        ttl: 480,
      }
      const result = spec.interpretResponse(videoResponse)

      expect(result[0]).to.deep.equal(expectedResponse)
    })

    it('handles empty bid response', function () {
      const response = {
        body: {
          id: '37386aade21a71',
          seatbid: []
        }
      }
      const result = spec.interpretResponse(response)

      expect(result.length).to.equal(0)
    })
  })

  describe('getUserSyncs ', function() {
    const syncOptions = { iframeEnabled: true, pixelEnabled: false }
    const iframeDisabledSyncOptions = { iframeEnabled: false, pixelEnabled: false }
    const serverResponse = [
      {
        body: {
          id: '546956d68c757f',
          seatbid: [
            {
              bid: [
                {
                  id: 'a_448326_16c2ada014224bee815a90d2248322f5',
                  impid: '2a3826aae345f4',
                  price: 1.0099999904632568,
                  nurl: 'http://localhost/rtb/impression?bannerid=220958&campaignid=3890&rtb_tid=15588614-75d2-40ab-b27e-13d2127b3c2e&rpid=1295&seatid=seat1&zoneid=448326&cb=26900712&tid=a_448326_16c2ada014224bee815a90d2248322f5',
                  adm: 'yo a creative',
                  crid: 'cridprebidrtb',
                  w: 160,
                  h: 600
                },
                {
                  id: 'a_430392_beac4c1515da4576acf6cb9c5340b40c',
                  impid: '3cf96fd26ed4c5',
                  price: 1.0099999904632568,
                  nurl: 'http://localhost/rtb/impression?bannerid=220957&campaignid=3890&rtb_tid=5bc0e68b-3492-448d-a6f9-26fa3fd0b646&rpid=1295&seatid=seat1&zoneid=430392&cb=62735099&tid=a_430392_beac4c1515da4576acf6cb9c5340b40c',
                  adm: 'yo a creative',
                  crid: 'cridprebidrtb',
                  w: 300,
                  h: 250
                },
              ]
            }
          ],
          ext: {
            iid: 13487408,
            sync: {
              pixels: [
                {
                  url: 'http://idprovider1.com'
                },
                {
                  url: 'http://idprovider2.com'
                }
              ]
            }
          }
        },
        headers: {}
      }
    ]

    it('should return if iid present on server response & iframe syncs enabled', function() {
      const expectedReturnStatement = {
        type: 'iframe',
        url: 'https://ap.lijit.com/beacon?informer=13487408',
      }
      const returnStatement = spec.getUserSyncs(syncOptions, serverResponse)

      expect(returnStatement[0]).to.deep.equal(expectedReturnStatement)
    })

    it('should include gdpr consent string if present', function() {
      const gdprConsent = {
        gdprApplies: 1,
        consentString: 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A=='
      }
      const expectedReturnStatement = {
        type: 'iframe',
        url: `https://ap.lijit.com/beacon?gdpr_consent=${gdprConsent.consentString}&informer=13487408`,
      }

      const returnStatement = spec.getUserSyncs(syncOptions, serverResponse, gdprConsent, '')

      expect(returnStatement[0]).to.deep.equal(expectedReturnStatement)
    })

    it('should include us privacy string if present', function() {
      const uspString = '1NYN'
      const expectedReturnStatement = {
        type: 'iframe',
        url: `https://ap.lijit.com/beacon?us_privacy=${uspString}&informer=13487408`,
      }

      const returnStatement = spec.getUserSyncs(syncOptions, serverResponse, null, uspString)

      expect(returnStatement[0]).to.deep.equal(expectedReturnStatement)
    })

    it('should include all privacy strings if present', function() {
      const gdprConsent = {
        gdprApplies: 1,
        consentString: 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A=='
      }
      const uspString = '1NYN'
      const expectedReturnStatement = {
        type: 'iframe',
        url: `https://ap.lijit.com/beacon?gdpr_consent=${gdprConsent.consentString}&us_privacy=${uspString}&informer=13487408`,
      }

      const returnStatement = spec.getUserSyncs(syncOptions, serverResponse, gdprConsent, uspString)

      expect(returnStatement[0]).to.deep.equal(expectedReturnStatement)
    })

    it('should not return if iid missing on server response', function() {
      const returnStatement = spec.getUserSyncs(syncOptions, [])

      expect(returnStatement).to.be.empty
    })

    it('should not return if iframe syncs disabled', function() {
      const returnStatement = spec.getUserSyncs(iframeDisabledSyncOptions, serverResponse)

      expect(returnStatement).to.be.empty
    })

    it('should include pixel syncs', function() {
      const pixelEnabledOptions = { iframeEnabled: false, pixelEnabled: true }
      const otherResponce = {
        ...serverResponse,
        body: {
          ...serverResponse.body,
          ext: {
            iid: 13487408,
            sync: {
              pixels: [
                {
                  url: 'http://idprovider3.com'
                },
                {
                  url: 'http://idprovider4.com'
                }
              ]
            }
          }
        }
      }

      const returnStatement = spec.getUserSyncs(pixelEnabledOptions, [...serverResponse, otherResponce])

      expect(returnStatement.length).to.equal(4)
      expect(returnStatement).to.deep.include.members([
        { type: 'image', url: 'http://idprovider1.com' },
        { type: 'image', url: 'http://idprovider2.com' },
        { type: 'image', url: 'http://idprovider3.com' },
        { type: 'image', url: 'http://idprovider4.com' }
      ])
    })
  })

  describe('prebid 3 upgrade', function() {
    const bidRequest = {
      ...baseBidRequest,
      params: {
        tagid: '403370'
      },
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [300, 600]
          ]
        }
      },
    }
    const request = spec.buildRequests([bidRequest], baseBidderRequest)
    const payload = JSON.parse(request.data)

    it('gets sizes from mediaTypes.banner', function() {
      expect(payload.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}])
      expect(payload.imp[0].banner.w).to.equal(1)
      expect(payload.imp[0].banner.h).to.equal(1)
    })

    it('gets correct site info', function() {
      expect(payload.site.page).to.equal('http://example.com/page.html')
      expect(payload.site.domain).to.equal('example.com')
    })
  })
})
