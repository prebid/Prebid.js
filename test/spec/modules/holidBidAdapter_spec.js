import { expect } from 'chai'
import { spec } from 'modules/holidBidAdapter.js'

describe('holidBidAdapterTests', () => {
  const bidRequestData = {
    bidder: 'holid',
    adUnitCode: 'test-div',
    bidId: 'bid-id',
    auctionId: 'test-id',
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
  }

  describe('isBidRequestValid', () => {
    const bid = JSON.parse(JSON.stringify(bidRequestData))

    it('should return true', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true)
    })

    it('should return false when required params are not passed', () => {
      const bid = JSON.parse(JSON.stringify(bidRequestData))
      delete bid.params.adUnitID

      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })
  })

  describe('buildRequests', () => {
    const bid = JSON.parse(JSON.stringify(bidRequestData))
    const request = spec.buildRequests([bid], bid)
    const payload = JSON.parse(request[0].data)

    it('should include ext in imp', () => {
      expect(payload.imp[0].ext).to.exist
      expect(payload.imp[0].ext).to.deep.equal({
        prebid: { storedrequest: { id: '12345' } },
      })
    })

    it('should include banner format in imp', () => {
      expect(payload.imp[0].banner).to.exist
      expect(payload.imp[0].banner).to.deep.equal({
        format: [{ w: 300, h: 250 }],
      })
    })

    it('should include ortb2 first party data', () => {
      expect(payload.device.w).to.equal(1860)
      expect(payload.device.h).to.equal(410)
      expect(payload.user.ext.consent).to.equal('G4ll0p1ng_Un1c0rn5')
      expect(payload.regs.gdpr).to.equal(1)
    })
  })

  describe('interpretResponse', () => {
    const serverResponse = {
      body: {
        id: 'test-id',
        cur: 'USD',
        seatbid: [
          {
            bid: [
              {
                id: 'testbidid',
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
    }

    const interpretedResponse = spec.interpretResponse(
      serverResponse,
      bidRequestData
    )

    it('should interpret response', () => {
      expect(interpretedResponse[0].requestId).to.equal(bidRequestData.bidId)
      expect(interpretedResponse[0].cpm).to.equal(
        serverResponse.body.seatbid[0].bid[0].price
      )
      expect(interpretedResponse[0].ad).to.equal(
        serverResponse.body.seatbid[0].bid[0].adm
      )
      expect(interpretedResponse[0].creativeId).to.equal(
        serverResponse.body.seatbid[0].bid[0].crid
      )
      expect(interpretedResponse[0].width).to.equal(
        serverResponse.body.seatbid[0].bid[0].w
      )
      expect(interpretedResponse[0].height).to.equal(
        serverResponse.body.seatbid[0].bid[0].h
      )
      expect(interpretedResponse[0].currency).to.equal(serverResponse.body.cur)
    })
  })

  describe('getUserSyncs', () => {
    it('should return user sync', () => {
      const optionsType = {
        iframeEnabled: true,
        pixelEnabled: true,
      }
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
      ]
      const gdprConsent = {
        gdprApplies: 1,
        consentString: 'dkj49Sjmfjuj34as:12jaf90123hufabidfy9u23brfpoig',
      }
      const uspConsent = 'mkjvbiniwot4827obfoy8sdg8203gb'
      const expectedUserSyncs = [
        {
          type: 'iframe',
          url: 'https://null.holid.io/sync.html?bidders=%5B%22test%20seat%201%22%2C%22test%20seat%202%22%5D&gdpr=1&gdpr_consent=dkj49Sjmfjuj34as:12jaf90123hufabidfy9u23brfpoig&usp_consent=mkjvbiniwot4827obfoy8sdg8203gb&type=iframe',
        },
      ]

      const userSyncs = spec.getUserSyncs(
        optionsType,
        serverResponse,
        gdprConsent,
        uspConsent
      )

      expect(userSyncs).to.deep.equal(expectedUserSyncs)
    })

    it('should return empty user syncs when responsetimemillis is not defined', () => {
      const optionsType = {
        iframeEnabled: true,
        pixelEnabled: true,
      }
      const serverResponse = [
        {
          body: {
            ext: {},
          },
        },
      ]
      const gdprConsent = {
        gdprApplies: 1,
        consentString: 'dkj49Sjmfjuj34as:12jaf90123hufabidfy9u23brfpoig',
      }
      const uspConsent = 'mkjvbiniwot4827obfoy8sdg8203gb'
      const expectedUserSyncs = []

      const userSyncs = spec.getUserSyncs(
        optionsType,
        serverResponse,
        gdprConsent,
        uspConsent
      )

      expect(userSyncs).to.deep.equal(expectedUserSyncs)
    })
  })
})
