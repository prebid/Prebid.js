import { expect, assert } from 'chai';
import { spec } from 'modules/kubientBidAdapter.js';
import { BANNER, VIDEO } from '../../../src/mediaTypes.js';
import {config} from '../../../src/config';

function encodeQueryData(data) {
  return Object.keys(data).map(function(key) {
    return [key, data[key]].map(encodeURIComponent).join('=');
  }).join('&');
}

describe('KubientAdapter', function () {
  let bidBanner = {
    bidId: '2dd581a2b6281d',
    bidder: 'kubient',
    bidderRequestId: '145e1d6a7837c9',
    params: {
      zoneid: '5678'
    },
    getFloor: function(params) {
      return {
        floor: 0,
        currency: 'USD'
      };
    },
    auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    transactionId: '3bb2f6da-87a6-4029-aeb0-bfe951372e62',
    schain: {
      ver: '1.1',
      complete: 1,
      nodes: [
        {
          asi: 'example.com',
          sid: '0',
          hp: 1,
          rid: 'bidrequestid',
          domain: 'example.com'
        }
      ]
    }
  };
  let bidVideo = {
    bidId: '1dd581a2b6281d',
    bidder: 'kubient',
    bidderRequestId: '245e1d6a7837c9',
    params: {
      zoneid: '5676'
    },
    getFloor: function(params) {
      return {
        floor: 1.0,
        currency: 'USD'
      };
    },
    auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d1',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [1]
      }
    },
    transactionId: '3bb2f6da-87a6-4029-aeb0-bfe951372e61',
    schain: {
      ver: '1.1',
      complete: 1,
      nodes: [
        {
          asi: 'example.com',
          sid: '0',
          hp: 1,
          rid: 'bidrequestid',
          domain: 'example.com'
        }
      ]
    }
  };
  let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
  let uspConsentData = '1YCC';
  let bidderRequest = {
    bidderCode: 'kubient',
    auctionId: 'fffffff-ffff-ffff-ffff-ffffffffffff',
    bidderRequestId: 'ffffffffffffff',
    start: 1472239426002,
    auctionStart: 1472239426000,
    timeout: 5000,
    refererInfo: {
      referer: 'http://www.example.com',
      reachedTop: true,
    },
    gdprConsent: {
      consentString: consentString,
      gdprApplies: true
    },
    uspConsent: uspConsentData
  };
  describe('buildRequestBanner', function () {
    beforeEach(function () {
      config.resetConfig();
    });
    it('Creates Banner 1 ServerRequest object with method, URL and data', function () {
      config.setConfig({'coppa': false});
      let serverRequests = spec.buildRequests([bidBanner], Object.assign({}, bidderRequest, {bids: [bidBanner]}));
      expect(serverRequests).to.be.an('array');
      for (let i = 0; i < serverRequests.length; i++) {
        let serverRequest = serverRequests[i];
        expect(serverRequest.method).to.be.a('string');
        expect(serverRequest.url).to.be.a('string');
        expect(serverRequest.data).to.be.a('string');
        expect(serverRequest.method).to.equal('POST');
        expect(serverRequest.url).to.equal('https://kssp.kbntx.ch/kubprebidjs');
        let data = JSON.parse(serverRequest.data);
        expect(data).to.be.an('object');
        expect(data).to.have.all.keys('v', 'requestId', 'adSlots', 'gdpr', 'referer', 'tmax', 'consent', 'consentGiven', 'uspConsent');
        expect(data.v).to.exist.and.to.be.a('string');
        expect(data.requestId).to.exist.and.to.be.a('string');
        expect(data.referer).to.be.a('string');
        expect(data.tmax).to.exist.and.to.be.a('number');
        expect(data.gdpr).to.exist.and.to.be.within(0, 1);
        expect(data.consent).to.equal(consentString);
        expect(data.uspConsent).to.exist.and.to.equal(uspConsentData);
        for (let j = 0; j < data['adSlots'].length; j++) {
          let adSlot = data['adSlots'][i];
          expect(adSlot).to.have.all.keys('bidId', 'zoneId', 'banner', 'schain');
          expect(adSlot.bidId).to.be.a('string').and.to.equal(bidBanner.bidId);
          expect(adSlot.zoneId).to.be.a('string').and.to.equal(bidBanner.params.zoneid);
          expect(adSlot.schain).to.be.an('object');
          expect(adSlot.banner).to.be.an('object');
        }
      }
    });
  });
  describe('buildRequestVideo', function () {
    beforeEach(function () {
      config.resetConfig();
    });
    it('Creates Video 1 ServerRequest object with method, URL and data', function () {
      config.setConfig({'coppa': false});
      let serverRequests = spec.buildRequests([bidVideo], Object.assign({}, bidderRequest, {bids: [bidVideo]}));
      expect(serverRequests).to.be.an('array');
      for (let i = 0; i < serverRequests.length; i++) {
        let serverRequest = serverRequests[i];
        expect(serverRequest.method).to.be.a('string');
        expect(serverRequest.url).to.be.a('string');
        expect(serverRequest.data).to.be.a('string');
        expect(serverRequest.method).to.equal('POST');
        expect(serverRequest.url).to.equal('https://kssp.kbntx.ch/kubprebidjs');
        let data = JSON.parse(serverRequest.data);
        expect(data).to.be.an('object');
        expect(data).to.have.all.keys('v', 'requestId', 'adSlots', 'gdpr', 'referer', 'tmax', 'consent', 'consentGiven', 'uspConsent');
        expect(data.v).to.exist.and.to.be.a('string');
        expect(data.requestId).to.exist.and.to.be.a('string');
        expect(data.referer).to.be.a('string');
        expect(data.tmax).to.exist.and.to.be.a('number');
        expect(data.gdpr).to.exist.and.to.be.within(0, 1);
        expect(data.consent).to.equal(consentString);
        expect(data.uspConsent).to.exist.and.to.equal(uspConsentData);
        for (let j = 0; j < data['adSlots'].length; j++) {
          let adSlot = data['adSlots'][i];
          expect(adSlot).to.have.all.keys('bidId', 'zoneId', 'floor', 'video', 'schain');
          expect(adSlot.bidId).to.be.a('string').and.to.equal(bidVideo.bidId);
          expect(adSlot.zoneId).to.be.a('string').and.to.equal(bidVideo.params.zoneid);
          expect(adSlot.floor).to.be.a('number');
          expect(adSlot.schain).to.be.an('object');
          expect(adSlot.video).to.be.an('object');
        }
      }
    });
  });
  describe('buildRequestBanner', function () {
    beforeEach(function () {
      config.resetConfig();
    });
    it('Creates Banner 2 ServerRequest object with method, URL and data with bidBanner', function () {
      config.setConfig({'coppa': true});
      let serverRequests = spec.buildRequests([bidBanner], Object.assign({}, bidderRequest, {bids: [bidBanner]}));
      expect(serverRequests).to.be.an('array');
      for (let i = 0; i < serverRequests.length; i++) {
        let serverRequest = serverRequests[i];
        expect(serverRequest.method).to.be.a('string');
        expect(serverRequest.url).to.be.a('string');
        expect(serverRequest.data).to.be.a('string');
        expect(serverRequest.method).to.equal('POST');
        expect(serverRequest.url).to.equal('https://kssp.kbntx.ch/kubprebidjs');
        let data = JSON.parse(serverRequest.data);
        expect(data).to.be.an('object');
        expect(data).to.have.all.keys('v', 'requestId', 'adSlots', 'gdpr', 'coppa', 'referer', 'tmax', 'consent', 'consentGiven', 'uspConsent');
        expect(data.v).to.exist.and.to.be.a('string');
        expect(data.requestId).to.exist.and.to.be.a('string');
        expect(data.coppa).to.be.a('number').and.to.equal(1);
        expect(data.referer).to.be.a('string');
        expect(data.tmax).to.exist.and.to.be.a('number');
        expect(data.gdpr).to.exist.and.to.be.within(0, 1);
        expect(data.consent).to.equal(consentString);
        expect(data.uspConsent).to.exist.and.to.equal(uspConsentData);
        for (let j = 0; j < data['adSlots'].length; j++) {
          let adSlot = data['adSlots'][i];
          expect(adSlot).to.have.all.keys('bidId', 'zoneId', 'banner', 'schain');
          expect(adSlot.bidId).to.be.a('string').and.to.equal(bidBanner.bidId);
          expect(adSlot.zoneId).to.be.a('string').and.to.equal(bidBanner.params.zoneid);
          expect(adSlot.schain).to.be.an('object');
          expect(adSlot.banner).to.be.an('object');
        }
      }
    });
  });
  describe('buildRequestVideo', function () {
    beforeEach(function () {
      config.resetConfig();
    });
    it('Creates Video 2 ServerRequest object with method, URL and data', function () {
      config.setConfig({'coppa': true});
      let serverRequests = spec.buildRequests([bidVideo], Object.assign({}, bidderRequest, {bids: [bidVideo]}));
      expect(serverRequests).to.be.an('array');
      for (let i = 0; i < serverRequests.length; i++) {
        let serverRequest = serverRequests[i];
        expect(serverRequest.method).to.be.a('string');
        expect(serverRequest.url).to.be.a('string');
        expect(serverRequest.data).to.be.a('string');
        expect(serverRequest.method).to.equal('POST');
        expect(serverRequest.url).to.equal('https://kssp.kbntx.ch/kubprebidjs');
        let data = JSON.parse(serverRequest.data);
        expect(data).to.be.an('object');
        expect(data).to.have.all.keys('v', 'requestId', 'adSlots', 'gdpr', 'coppa', 'referer', 'tmax', 'consent', 'consentGiven', 'uspConsent');
        expect(data.v).to.exist.and.to.be.a('string');
        expect(data.requestId).to.exist.and.to.be.a('string');
        expect(data.coppa).to.be.a('number').and.to.equal(1);
        expect(data.referer).to.be.a('string');
        expect(data.tmax).to.exist.and.to.be.a('number');
        expect(data.gdpr).to.exist.and.to.be.within(0, 1);
        expect(data.consent).to.equal(consentString);
        expect(data.uspConsent).to.exist.and.to.equal(uspConsentData);
        for (let j = 0; j < data['adSlots'].length; j++) {
          let adSlot = data['adSlots'][i];
          expect(adSlot).to.have.all.keys('bidId', 'zoneId', 'floor', 'video', 'schain');
          expect(adSlot.bidId).to.be.a('string').and.to.equal(bidVideo.bidId);
          expect(adSlot.zoneId).to.be.a('string').and.to.equal(bidVideo.params.zoneid);
          expect(adSlot.floor).to.be.a('number');
          expect(adSlot.schain).to.be.an('object');
          expect(adSlot.video).to.be.an('object');
        }
      }
    });
  });
  describe('isBidRequestValid', function () {
    beforeEach(function () {
      config.resetConfig();
    });
    it('Should return true when required params are found', function () {
      expect(spec.isBidRequestValid(bidBanner)).to.be.true;
      expect(spec.isBidRequestValid(bidVideo)).to.be.true;
    });
    it('Should return false when required params are not found', function () {
      expect(spec.isBidRequestValid(bidBanner)).to.be.true;
      expect(spec.isBidRequestValid(bidVideo)).to.be.true;
    });
    it('Should return false when params are not found', function () {
      delete bidBanner.params;
      expect(spec.isBidRequestValid(bidBanner)).to.be.false;
      delete bidVideo.params;
      expect(spec.isBidRequestValid(bidVideo)).to.be.false;
    });
  });
  describe('interpretResponse', function () {
    beforeEach(function () {
      config.resetConfig();
    });
    it('Should interpret response', function () {
      const serverResponse = {
        body:
          {
            seatbid: [
              {
                bid: [
                  {
                    bidId: '000',
                    price: 1.5,
                    adm: '<div>test</div>',
                    creativeId: 'creativeId',
                    w: 300,
                    h: 250,
                    cur: 'USD',
                    netRevenue: false,
                    ttl: 360,
                    meta: {adomain: ['google.com', 'yahoo.com']}
                  }
                ]
              }
            ]
          }
      };
      let bannerResponses = spec.interpretResponse(serverResponse);
      expect(bannerResponses).to.be.an('array').that.is.not.empty;
      let dataItem = bannerResponses[0];
      expect(dataItem).to.have.all.keys('requestId', 'cpm', 'ad', 'creativeId', 'width', 'height', 'currency', 'netRevenue', 'ttl', 'meta');
      expect(dataItem.requestId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].bidId);
      expect(dataItem.cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
      expect(dataItem.ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[0].adm);
      expect(dataItem.creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].creativeId);
      expect(dataItem.width).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].w);
      expect(dataItem.height).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].h);
      expect(dataItem.currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].cur);
      expect(dataItem.netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(serverResponse.body.seatbid[0].bid[0].netRevenue);
      expect(dataItem.ttl).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].ttl);
      expect(dataItem.meta).to.exist.and.to.be.a('object');
      expect(dataItem.meta.advertiserDomains).to.exist.and.to.be.a('array').and.to.equal(serverResponse.body.seatbid[0].bid[0].meta.adomain);
    });
    it('Should return no ad when not given a server response', function () {
      const ads = spec.interpretResponse(null);
      expect(ads).to.be.an('array').and.to.have.length(0);
    });
  });

  describe('interpretResponse Video', function () {
    beforeEach(function () {
      config.resetConfig();
    });
    it('Should interpret response', function () {
      const serverResponse = {
        body:
          {
            seatbid: [
              {
                bid: [
                  {
                    bidId: '000',
                    price: 1.5,
                    adm: '<div>test</div>',
                    creativeId: 'creativeId',
                    w: 300,
                    h: 250,
                    mediaType: VIDEO,
                    cur: 'USD',
                    netRevenue: false,
                    ttl: 360,
                    meta: {adomain: ['google.com', 'yahoo.com']}
                  }
                ]
              }
            ]
          }
      };
      let bannerResponses = spec.interpretResponse(serverResponse);
      expect(bannerResponses).to.be.an('array').that.is.not.empty;
      let dataItem = bannerResponses[0];
      expect(dataItem).to.have.all.keys('requestId', 'cpm', 'ad', 'creativeId', 'width', 'height', 'currency', 'netRevenue', 'ttl', 'meta', 'mediaType', 'vastXml');
      expect(dataItem.requestId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].bidId);
      expect(dataItem.cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
      expect(dataItem.ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[0].adm);
      expect(dataItem.creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].creativeId);
      expect(dataItem.width).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].w);
      expect(dataItem.height).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].h);
      expect(dataItem.currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].cur);
      expect(dataItem.netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(serverResponse.body.seatbid[0].bid[0].netRevenue);
      expect(dataItem.ttl).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].ttl);
      expect(dataItem.meta).to.exist.and.to.be.a('object');
      expect(dataItem.meta.advertiserDomains).to.exist.and.to.be.a('array').and.to.equal(serverResponse.body.seatbid[0].bid[0].meta.adomain);
      expect(dataItem.mediaType).to.exist.and.to.equal(VIDEO);
      expect(dataItem.vastXml).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].adm);
    });
    it('Should return no ad when not given a server response', function () {
      const ads = spec.interpretResponse(null);
      expect(ads).to.be.an('array').and.to.have.length(0);
    });
  });

  describe('getUserSyncs', function () {
    beforeEach(function () {
      config.resetConfig();
    });
    it('should register the sync image without gdpr', function () {
      let syncOptions = {
        pixelEnabled: true
      };
      let values = {};
      let serverResponses = null;
      let gdprConsent = {
        consentString: consentString
      };
      let uspConsent = null;
      config.setConfig({
        userSync: {
          filterSettings: {
            image: {
              bidders: '*',
              filter: 'include'
            }
          }
        }
      });
      let syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent);
      values['consent'] = consentString;
      expect(syncs).to.be.an('array').and.to.have.length(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.equal('https://matching.kubient.net/match/sp?' + encodeQueryData(values));
    });
    it('should register the sync image with gdpr', function () {
      let syncOptions = {
        pixelEnabled: true
      };
      let values = {};
      let serverResponses = null;
      let gdprConsent = {
        gdprApplies: true,
        consentString: consentString
      };
      let uspConsent = null;
      config.setConfig({
        userSync: {
          filterSettings: {
            image: {
              bidders: '*',
              filter: 'include'
            }
          }
        }
      });
      let syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent);
      values['gdpr'] = 1;
      values['consent'] = consentString;
      expect(syncs).to.be.an('array').and.to.have.length(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.equal('https://matching.kubient.net/match/sp?' + encodeQueryData(values));
    });
    it('should register the sync image with gdpr vendor', function () {
      let syncOptions = {
        pixelEnabled: true
      };
      let values = {};
      let serverResponses = null;
      let gdprConsent = {
        gdprApplies: true,
        consentString: consentString,
        apiVersion: 2,
        vendorData: {
          vendor: {
            consents: {
              794: 1
            }
          }
        }
      };
      let uspConsent = null;
      config.setConfig({
        userSync: {
          filterSettings: {
            image: {
              bidders: '*',
              filter: 'include'
            }
          }
        }
      });
      let syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent);
      values['gdpr'] = 1;
      values['consent'] = consentString;
      expect(syncs).to.be.an('array').and.to.have.length(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.equal('https://matching.kubient.net/match/sp?' + encodeQueryData(values));
    });
    it('should register the sync image without gdpr and with uspConsent', function () {
      let syncOptions = {
        pixelEnabled: true
      };
      let values = {};
      let serverResponses = null;
      let gdprConsent = {
        consentString: consentString
      };
      let uspConsent = '1YNN';
      config.setConfig({
        userSync: {
          filterSettings: {
            image: {
              bidders: '*',
              filter: 'include'
            }
          }
        }
      });
      let syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent);
      values['consent'] = consentString;
      values['usp'] = uspConsent;
      expect(syncs).to.be.an('array').and.to.have.length(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.equal('https://matching.kubient.net/match/sp?' + encodeQueryData(values));
    });
  })
});
