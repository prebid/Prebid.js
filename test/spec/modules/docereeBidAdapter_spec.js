import {expect} from 'chai';
import {spec} from '../../../modules/docereeBidAdapter.js';
import { config } from '../../../src/config.js';

describe('BidlabBidAdapter', function () {
  config.setConfig({
    doceree: {
      context: {
        data: {
          token: 'testing-token', // required
        }
      },
      user: {
        data: {
          gender: '',
          email: '',
          hashedEmail: '',
          firstName: '',
          lastName: '',
          npi: '',
          hashedNPI: '',
          city: '',
          zipCode: '',
          specialization: '',
        }
      }
    }
  });
  let bid = {
    bidId: 'testing',
    bidder: 'doceree',
    params: {
      placementId: 'DOC_7jm9j5eqkl0xvc5w',
      gdpr: '1',
      gdprConsent: 'CPQfU1jPQfU1jG0AAAENAwCAAAAAAAAAAAAAAAAAAAAA.IGLtV_T9fb2vj-_Z99_tkeYwf95y3p-wzhheMs-8NyZeH_B4Wv2MyvBX4JiQKGRgksjLBAQdtHGlcTQgBwIlViTLMYk2MjzNKJrJEilsbO2dYGD9Pn8HT3ZCY70-vv__7v3ff_3g'
    }
  };

  describe('isBidRequestValid', function () {
    it('Should return true if placementId is present', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('Should return false if placementId is not present', function () {
      delete bid.params.placementId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('isGdprConsentPresent', function () {
    it('Should return true if gdpr consent is present', function () {
      expect(spec.isGdprConsentPresent(bid)).to.be.true;
    });
  });

  describe('buildRequests', function () {
    let serverRequest = spec.buildRequests([bid]);
    serverRequest = serverRequest[0]
    it('Creates a ServerRequest object with method, URL and data', function () {
      expect(serverRequest).to.exist;
      expect(serverRequest.method).to.exist;
      expect(serverRequest.url).to.exist;
    });
    it('Returns GET method', function () {
      expect(serverRequest.method).to.equal('GET');
    });
    it('Returns valid URL', function () {
      expect(serverRequest.url).to.equal('https://bidder.doceree.com/v1/adrequest?id=DOC_7jm9j5eqkl0xvc5w&pubRequestedURL=undefined&loggedInUser=JTdCJTIyZ2VuZGVyJTIyJTNBJTIyJTIyJTJDJTIyZW1haWwlMjIlM0ElMjIlMjIlMkMlMjJoYXNoZWRFbWFpbCUyMiUzQSUyMiUyMiUyQyUyMmZpcnN0TmFtZSUyMiUzQSUyMiUyMiUyQyUyMmxhc3ROYW1lJTIyJTNBJTIyJTIyJTJDJTIybnBpJTIyJTNBJTIyJTIyJTJDJTIyaGFzaGVkTlBJJTIyJTNBJTIyJTIyJTJDJTIyY2l0eSUyMiUzQSUyMiUyMiUyQyUyMnppcENvZGUlMjIlM0ElMjIlMjIlMkMlMjJzcGVjaWFsaXphdGlvbiUyMiUzQSUyMiUyMiU3RA%3D%3D&prebidjs=true&requestId=testing&gdpr=1&gdpr_consent=CPQfU1jPQfU1jG0AAAENAwCAAAAAAAAAAAAAAAAAAAAA.IGLtV_T9fb2vj-_Z99_tkeYwf95y3p-wzhheMs-8NyZeH_B4Wv2MyvBX4JiQKGRgksjLBAQdtHGlcTQgBwIlViTLMYk2MjzNKJrJEilsbO2dYGD9Pn8HT3ZCY70-vv__7v3ff_3g&');
    });
  });
  describe('interpretResponse', function () {
    it('Should interpret banner response', function () {
      const banner = {
        body: {
          DIVID: 'DOC_7jm9j5eqkl0xvc5w',
          creativeType: 'banner',
          guid: 'G125fzC5NKl3FHeOT8yvL98ILfQS9TVUgk6Q',
          currency: 'USD',
          cpmBid: 2,
          height: '250',
          width: '300',
          ctaLink: 'https://doceree.com/',
          sourceURL: '',
          sourceHTML: '<div>test</div>',
          advertiserDomain: 'doceree.com',
        }
      };
      let bannerResponses = spec.interpretResponse(banner);
      expect(bannerResponses).to.be.an('array').that.is.not.empty;
      let dataItem = bannerResponses[0];
      expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'ad', 'ttl',
        'netRevenue', 'currency', 'mediaType', 'creativeId', 'meta');
      expect(dataItem.requestId).to.equal('G125fzC5NKl3FHeOT8yvL98ILfQS9TVUgk6Q');
      expect(dataItem.cpm).to.equal(2);
      expect(dataItem.width).to.equal(300);
      expect(dataItem.height).to.equal(250);
      expect(dataItem.ad).to.equal('<div>test</div>');
      expect(dataItem.ttl).to.equal(30);
      expect(dataItem.netRevenue).to.be.true;
      expect(dataItem.currency).to.equal('USD');
      expect(dataItem.creativeId).to.equal('DOC_7jm9j5eqkl0xvc5w');
      expect(dataItem.meta.advertiserDomains).to.be.an('array').that.is.not.empty;
      expect(dataItem.meta.advertiserDomains[0]).to.equal('doceree.com')
    });
  })
});
