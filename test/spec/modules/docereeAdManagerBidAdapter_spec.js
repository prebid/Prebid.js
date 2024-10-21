import { expect } from 'chai';
import { spec } from '../../../modules/docereeAdManagerBidAdapter.js';
import { config } from '../../../src/config.js';

describe('docereeadmanager', function () {
  config.setConfig({
    docereeadmanager: {
      user: {
        data: {
          email: '',
          firstname: '',
          lastname: '',
          mobile: '',
          specialization: '',
          organization: '',
          hcpid: '',
          dob: '',
          gender: '',
          city: '',
          state: '',
          country: '',
          hashedhcpid: '',
          hashedemail: '',
          hashedmobile: '',
          userid: '',
          zipcode: '',
          userconsent: '',
        },
      },
    },
  });
  let bid = {
    bidId: 'testing',
    bidder: 'docereeadmanager',
    params: {
      placementId: 'DOC-19-1',
      gdpr: '1',
      gdprconsent:
        'CPQfU1jPQfU1jG0AAAENAwCAAAAAAAAAAAAAAAAAAAAA.IGLtV_T9fb2vj-_Z99_tkeYwf95y3p-wzhheMs-8NyZeH_B4Wv2MyvBX4JiQKGRgksjLBAQdtHGlcTQgBwIlViTLMYk2MjzNKJrJEilsbO2dYGD9Pn8HT3ZCY70-vv__7v3ff_3g',
    },
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
    serverRequest = serverRequest[0];
    it('Creates a ServerRequest object with method, URL and data', function () {
      expect(serverRequest).to.exist;
      expect(serverRequest.method).to.exist;
      expect(serverRequest.url).to.exist;
      expect(serverRequest.data).to.exist;
    });
    it('Returns POST method', function () {
      expect(serverRequest.method).to.equal('POST');
    });
    it('Returns valid URL', function () {
      expect(serverRequest.url).to.equal('https://dai.doceree.com/drs/quest');
    });
  });
  describe('interpretResponse', function () {
    it('Should interpret banner response', function () {
      const banner = {
        body: {
          cpm: 3.576,
          currency: 'USD',
          width: 250,
          height: 300,
          ad: '<html><h3>I am an ad</h3></html>',
          ttl: 30,
          creativeId: 'div-1',
          netRevenue: false,
          bidderCode: '123',
          dealId: 232,
          requestId: '123',
          meta: {
            brandId: null,
            advertiserDomains: ['https://dai.doceree.com/drs/quest'],
          },
        },
      };
      let bannerResponses = spec.interpretResponse(banner);
      expect(bannerResponses).to.be.an('array').that.is.not.empty;
      let dataItem = bannerResponses[0];
      expect(dataItem).to.have.all.keys(
        'requestId',
        'cpm',
        'width',
        'height',
        'ad',
        'ttl',
        'netRevenue',
        'currency',
        'mediaType',
        'creativeId',
        'meta'
      );
      expect(dataItem.requestId).to.equal('123');
      expect(dataItem.cpm).to.equal(3.576);
      expect(dataItem.width).to.equal(250);
      expect(dataItem.height).to.equal(300);
      expect(dataItem.ad).to.equal('<html><h3>I am an ad</h3></html>');
      expect(dataItem.ttl).to.equal(30);
      expect(dataItem.netRevenue).to.be.true;
      expect(dataItem.currency).to.equal('USD');
      expect(dataItem.creativeId).to.equal('div-1');
      expect(dataItem.meta.advertiserDomains).to.be.an('array').that.is.not
        .empty;
    });
  });
});
