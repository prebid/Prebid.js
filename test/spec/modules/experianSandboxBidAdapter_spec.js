import { newBidder } from '../../../src/adapters/bidderFactory';
import { experianSandboxBidderSpec } from 'modules/experianSandboxBidAdapter.js';
describe('experianSandboxBidAdapter', () => {
  const adapter = newBidder(experianSandboxBidderSpec);

  describe('isValidRequest', () => {
    const validBid = {
      bidder: 'expSandbox',
      params: {
        sandboxUrl: 'https://rtid-sample-bidder-lq4sckwqxa-uc.a.run.app/bidder/decrypt_and_bid'
      }
    }
    const invalidBid = {
      bidder: 'expSandbox',
      params: {}
    }

    it('should return true if the bid has the env param set', () => {
      expect(experianSandboxBidderSpec.isBidRequestValid(validBid)).to.equal(true);
    })
    it('should return false if the bid does not have the env param set', () => {
      expect(experianSandboxBidderSpec.isBidRequestValid(invalidBid)).to.equal(false)
    })
  })

  describe('buildRequests', () => {
    it('should make POST request to correct endpoint with rtid key and data', () => {
      const requests = experianSandboxBidderSpec.buildRequests([{
        bidder: 'expSandbox',
        params: {
          sandboxUrl: 'https://rtid-sample-bidder-lq4sckwqxa-uc.a.run.app/bidder/decrypt_and_bid'
        }
      }], { ortb2: { experianRtidKey: 'test-key', experianRtidData: 'IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg==' } })

      expect(requests).to.deep.equal([{
        method: 'POST',
        url: 'https://rtid-sample-bidder-lq4sckwqxa-uc.a.run.app/bidder/decrypt_and_bid',
        data: '{"rtid-data":{"key":"test-key","data":"IkhlbGxvLCB3b3JsZC4gSGVsbG8sIHdvcmxkLiBIZWxsbywgd29ybGQuIg=="}}'
      }])
    })
  })

  describe('interpretResponse', () => {
    it('always returns empty array', () => {
      expect(experianSandboxBidderSpec.interpretResponse()).to.deep.equal([])
    })
  })
})
