import { expect } from 'chai'
import { spec } from 'modules/astraoneBidAdapter'

function getSlotConfigs(mediaTypes, params) {
  return {
    params: params,
    sizes: [],
    bidId: '2df8c0733f284e',
    bidder: 'astraone',
    mediaTypes: mediaTypes,
    transactionId: '31a58515-3634-4e90-9c96-f86196db1459'
  }
}

describe('AstraOne Adapter', function() {
  describe('isBidRequestValid method', function() {
    const PLACE_ID = '5af45ad34d506ee7acad0c26';
    const IMAGE_URL = 'https://creative.astraone.io/files/default_image-1-600x400.jpg';

    describe('returns true', function() {
      describe('when banner slot config has all mandatory params', () => {
        describe('and placement has the correct value', function() {
          const createBannerSlotConfig = placement => {
            return getSlotConfigs(
              { banner: {} },
              {
                placeId: PLACE_ID,
                imageUrl: IMAGE_URL,
                placement
              }
            )
          }
          const placements = ['inImage'];
          placements.forEach(placement => {
            it('should be ' + placement, function() {
              const isBidRequestValid = spec.isBidRequestValid(
                createBannerSlotConfig(placement)
              )
              expect(isBidRequestValid).to.equal(true)
            })
          })
        })
      })
    })
    describe('returns false', function() {
      describe('when params are not correct', function() {
        function createSlotconfig(params) {
          return getSlotConfigs({ banner: {} }, params)
        }
        it('does not have the placeId.', function() {
          const isBidRequestValid = spec.isBidRequestValid(
            createSlotconfig({
              imageUrl: IMAGE_URL,
              placement: 'inImage'
            })
          )
          expect(isBidRequestValid).to.equal(false)
        })
        it('does not have the imageUrl.', function() {
          const isBidRequestValid = spec.isBidRequestValid(
            createSlotconfig({
              placeId: PLACE_ID,
              placement: 'inImage'
            })
          )
          expect(isBidRequestValid).to.equal(false)
        })
        it('does not have the placement.', function() {
          const isBidRequestValid = spec.isBidRequestValid(
            createSlotconfig({
              placeId: PLACE_ID,
              imageUrl: IMAGE_URL,
            })
          )
          expect(isBidRequestValid).to.equal(false)
        })
        it('does not have a the correct placement.', function() {
          const isBidRequestValid = spec.isBidRequestValid(
            createSlotconfig({
              placeId: PLACE_ID,
              imageUrl: IMAGE_URL,
              placement: 'something'
            })
          )
          expect(isBidRequestValid).to.equal(false)
        })
      })
    })
  })

  describe('buildRequests method', function() {
    const bidderRequest = {
      refererInfo: { referer: 'referer' }
    }
    const mandatoryParams = {
      placeId: '5af45ad34d506ee7acad0c26',
      imageUrl: 'https://creative.astraone.io/files/default_image-1-600x400.jpg',
      placement: 'inImage'
    }
    const validBidRequests = [
      getSlotConfigs({ banner: {} }, mandatoryParams)
    ]
    it('Url params should be correct ', function() {
      const request = spec.buildRequests(validBidRequests, bidderRequest)
      expect(request.method).to.equal('POST')
      expect(request.url).to.equal('https://ssp.astraone.io/auction/prebid')
    })

    it('Common data request should be correct', function() {
      const request = spec.buildRequests(validBidRequests, bidderRequest)
      const data = JSON.parse(request.data)
      expect(Array.isArray(data.bidRequests)).to.equal(true)
      data.bidRequests.forEach(bid => {
        expect(bid.placeId).to.equal('5af45ad34d506ee7acad0c26')
        expect(typeof bid.imageUrl).to.equal('string')
      })
    })

    describe('GDPR params', function() {
      describe('when there are not consent management platform', function() {
        it('cmp should be false', function() {
          const request = spec.buildRequests(validBidRequests, bidderRequest)
          const data = JSON.parse(request.data)
          expect(data.cmp).to.equal(false)
        })
      })
      describe('when there are consent management platform', function() {
        it('cmps should be true and ga should not sended, when gdprApplies is undefined', function() {
          bidderRequest['gdprConsent'] = {
            gdprApplies: undefined,
            consentString: 'consentString'
          }
          const request = spec.buildRequests(validBidRequests, bidderRequest)
          const data = JSON.parse(request.data)
          expect(data.cmp).to.equal(true)
          expect(Object.keys(data).indexOf('data')).to.equal(-1)
          expect(data.cs).to.equal('consentString')
        })
        it('cmps should be true and all gdpr parameters should be sended, when there are gdprApplies', function() {
          bidderRequest['gdprConsent'] = {
            gdprApplies: true,
            consentString: 'consentString'
          }
          const request = spec.buildRequests(validBidRequests, bidderRequest)
          const data = JSON.parse(request.data)
          expect(data.cmp).to.equal(true)
          expect(data.ga).to.equal(true)
          expect(data.cs).to.equal('consentString')
        })
      })
    })

    describe('BidRequests params', function() {
      const request = spec.buildRequests(validBidRequests, bidderRequest)
      const data = JSON.parse(request.data)
      const bidRequests = data.bidRequests
      it('should request a Banner', function() {
        const bannerBid = bidRequests[0]
        expect(bannerBid.bidId).to.equal('2df8c0733f284e')
        expect(bannerBid.transactionId).to.equal('31a58515-3634-4e90-9c96-f86196db1459')
        expect(bannerBid.placeId).to.equal('5af45ad34d506ee7acad0c26')
      })
    })
  })

  describe('interpret response method', function() {
    it('should return a void array, when the server response have not got bids.', function() {
      const serverResponse = {
        body: []
      }
      const bids = spec.interpretResponse(serverResponse)
      expect(Array.isArray(bids)).to.equal(true)
      expect(bids.length).to.equal(0)
    })
    describe('when the server response return a bid', function() {
      describe('the bid is a banner', function() {
        it('should return a banner bid', function() {
          const serverResponse = {
            body: [
              {
                bidId: '2df8c0733f284e',
                price: 0.5,
                currency: 'USD',
                content: {
                  content: 'html',
                  actionUrls: {},
                  seanceId: '123123'
                },
                width: 100,
                height: 100,
                ttl: 360
              }
            ]
          }
          const bids = spec.interpretResponse(serverResponse)
          expect(bids.length).to.equal(1)
          expect(bids[0].requestId).to.equal('2df8c0733f284e')
          expect(bids[0].creativeId).to.equal('123123')
          expect(bids[0].cpm).to.equal(0.5)
          expect(bids[0].width).to.equal(100)
          expect(bids[0].height).to.equal(100)
          expect(bids[0].currency).to.equal('USD')
          expect(bids[0].netRevenue).to.equal(true)
          expect(typeof bids[0].ad).to.equal('string')
          expect(typeof bids[0].content).to.equal('object')
        })
      })
    })
  })
})
